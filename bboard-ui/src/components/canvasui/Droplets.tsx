"use client";

import {
  useEffect,
  useRef,
  type ReactNode,
  type CSSProperties,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DropletsOptions {
  intensity?: number;
  speed?: number;
  scale?: number;
  dropWidth?: number;
  dropLength?: number;
  refraction?: number;
  blur?: number;
  vignette?: number;
  fallSpeed?: number;
  wiggle?: number;
  staticDrops?: number;
  interactive?: boolean;
  interactionRadius?: number;
  interactionStrength?: number;
  interactionDistortion?: number;
  tint?: [number, number, number];
  tintStrength?: number;
  className?: string;
}

export interface DropletsProps extends DropletsOptions {
  children?: ReactNode;
  style?: CSSProperties;
}

// ─── Shaders ──────────────────────────────────────────────────────────────────

const VERT = `#version 300 es
precision highp float;
in vec2 a_pos;
out vec2 v_uv;
void main(){
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_scene;
uniform sampler2D u_rain;
uniform vec2  u_resolution;
uniform float u_time;
uniform float u_intensity;
uniform float u_speed;
uniform float u_scale;
uniform float u_dropWidth;
uniform float u_dropLength;
uniform float u_refraction;
uniform float u_blur;
uniform float u_vignette;
uniform float u_fallSpeed;
uniform float u_wiggle;
uniform float u_staticDrops;
uniform float u_interactionRadius;
uniform float u_interactionStrength;
uniform float u_interactionDistortion;
uniform vec3  u_tint;
uniform float u_tintStrength;
uniform vec2  u_pointer;
uniform float u_pointerActive;
uniform int   u_pass;

float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float hash1(float n){ return fract(sin(n)*43758.5453); }

float fallingDrop(vec2 uv, vec2 center, float w, float h){
  vec2 d = uv - center;
  float ellipse = (d.x*d.x)/(w*w) + (d.y*d.y)/(h*h);
  return smoothstep(1.0, 0.6, ellipse);
}

float staticBead(vec2 uv, vec2 center, float r){
  return smoothstep(r, r*0.5, length(uv-center));
}

vec4 rainPass(vec2 uv){
  float aspect = u_resolution.x / u_resolution.y;
  vec2 st = uv * vec2(aspect, 1.0) * u_scale * 6.0;
  float t = u_time * u_speed * 0.4;
  float accum = 0.0;
  vec2  normal = vec2(0.0);

  float numStreaks = mix(2.0, 22.0, u_intensity);
  for(float i=0.0; i<22.0; i++){
    if(i >= numStreaks) break;
    float seed = i * 17.43 + 0.5;
    float col  = floor(hash1(seed) * 8.0);
    float cx   = (col + 0.5) * 0.125 * aspect * u_scale * 6.0;
    float spd  = (0.5 + hash1(seed+1.0)*0.5) * u_fallSpeed;
    float wig  = (hash1(seed+2.0)-0.5) * 0.04 * u_wiggle;
    float life = 0.5 + hash1(seed+3.0)*1.5;
    float phase= hash1(seed+4.0) * 6.28318;
    float cy   = 1.0 - mod(t*spd + phase, life) / life;
    float wx   = cx + sin(t*spd*2.0+phase)*wig;
    float dw   = 0.012 * u_dropWidth;
    float dh   = 0.045 * u_dropLength;
    float d    = fallingDrop(st, vec2(wx, cy), dw, dh);
    if(d > 0.01){
      accum += d;
      vec2 n2 = normalize(st - vec2(wx, cy) + vec2(0.0001));
      normal += n2 * d * u_refraction * 2.5;
    }
  }

  int numStatic = int(mix(0.0, 100.0, u_staticDrops));
  for(int j=0; j<100; j++){
    if(j >= numStatic) break;
    float sj = float(j);
    vec2 center = vec2(
      hash1(sj*13.1+0.3) * aspect * u_scale * 6.0,
      hash1(sj*17.7+0.7)
    );
    float r = 0.008 + hash1(sj*31.0)*0.012;
    float d = staticBead(st, center, r);
    if(d > 0.01){
      accum += d * 0.5;
      normal += normalize(st - center + vec2(0.0001)) * d * u_refraction * 1.2;
    }
  }

  if(u_pointerActive > 0.0){
    vec2 pst = u_pointer * vec2(aspect, 1.0) * u_scale * 6.0;
    float pr = u_interactionRadius * u_scale * 6.0;
    float dist = length(st - pst);
    float wipe = smoothstep(pr, pr*0.3, dist) * u_interactionStrength;
    accum = mix(accum, 0.0, wipe);
    vec2 wd = normalize(st - pst + vec2(0.0001));
    float ring = smoothstep(pr,pr*0.6,dist)*(1.0-smoothstep(pr*0.6,pr*0.2,dist));
    normal += wd * ring * u_interactionDistortion * 0.02;
  }

  accum  = clamp(accum,  0.0, 1.0);
  normal = clamp(normal, -1.0, 1.0);
  return vec4(normal * 0.5 + 0.5, accum, 1.0);
}

vec4 compositePass(vec2 uv){
  vec4 rain  = texture(u_rain, uv);
  vec2 norm  = rain.xy * 2.0 - 1.0;
  float mask = rain.z;

  vec2 refractUV = clamp(uv + norm * u_refraction * 0.08 * mask, 0.0, 1.0);
  vec3 col;

  if(u_blur > 0.0){
    float ba = u_blur * 0.012 * (1.0 - mask);
    vec3 blurred = vec3(0.0);
    float total = 0.0;
    for(int x=-6; x<=6; x++){
      for(int y=-6; y<=6; y++){
        vec2 off = vec2(float(x),float(y)) * ba / 6.0;
        blurred += texture(u_scene, uv + off).rgb;
        total += 1.0;
      }
    }
    col = mix(blurred/total, texture(u_scene, refractUV).rgb, mask);
  } else {
    col = texture(u_scene, refractUV).rgb;
  }

  if(u_tintStrength > 0.0){
    col = mix(col, col * u_tint, u_tintStrength);
  }

  col = mix(col, col * 1.12, mask * 0.6);

  if(u_vignette > 0.0){
    vec2 vc = v_uv - 0.5;
    float vign = 1.0 - dot(vc,vc) * 2.2 * u_vignette;
    col *= clamp(vign, 0.0, 1.0);
  }

  return vec4(col, 1.0);
}

void main(){
  if(u_pass == 0){ fragColor = rainPass(v_uv); }
  else            { fragColor = compositePass(v_uv); }
}
`;

// ─── WebGL helpers ────────────────────────────────────────────────────────────

function mkShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)!);
  return s;
}
function mkProg(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const p = gl.createProgram()!;
  gl.attachShader(p, mkShader(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, mkShader(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)!);
  return p;
}
function mkTex(gl: WebGL2RenderingContext, w: number, h: number): WebGLTexture {
  const t = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Droplets({
  intensity = 0.5, speed = 1, scale = 0.4, dropWidth = 1, dropLength = 1,
  refraction = 0.2, blur = 0, vignette = 0, fallSpeed = 1, wiggle = 1,
  staticDrops = 0.2, interactive = true, interactionRadius = 0.3,
  interactionStrength = 0.6, interactionDistortion = 3,
  tint = [1, 1, 1] as [number, number, number], tintStrength = 0,
  className = "", children, style,
}: DropletsProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const ptrRef     = useRef({ x: 0.5, y: 0.5, active: false });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrapper = wrapperRef.current!;
    const gl = canvas.getContext("webgl2", { alpha: true, antialias: false, premultipliedAlpha: false });
    if (!gl) return;

    let prog: WebGLProgram;
    try { prog = mkProg(gl, VERT, FRAG); } catch(e){ console.error("[Droplets]", e); return; }

    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const posLoc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const ul = (n: string) => gl.getUniformLocation(prog, n);
    const U = {
      scene: ul("u_scene"), rain: ul("u_rain"),
      res: ul("u_resolution"), time: ul("u_time"),
      intensity: ul("u_intensity"), speed: ul("u_speed"),
      scale: ul("u_scale"), dw: ul("u_dropWidth"), dl: ul("u_dropLength"),
      refraction: ul("u_refraction"), blur: ul("u_blur"), vignette: ul("u_vignette"),
      fallSpeed: ul("u_fallSpeed"), wiggle: ul("u_wiggle"), static: ul("u_staticDrops"),
      ir: ul("u_interactionRadius"), is: ul("u_interactionStrength"), id: ul("u_interactionDistortion"),
      tint: ul("u_tint"), ts: ul("u_tintStrength"),
      ptr: ul("u_pointer"), pa: ul("u_pointerActive"), pass: ul("u_pass"),
    };

    let W=0, H=0;
    let rainTex: WebGLTexture, sceneTex: WebGLTexture, rainFBO: WebGLFramebuffer;

    const resize = () => {
      const dpr = Math.min(devicePixelRatio||1, 2);
      const w = Math.floor(wrapper.clientWidth*dpr);
      const h = Math.floor(wrapper.clientHeight*dpr);
      if(w===W && h===H) return;
      W=w; H=h;
      canvas.width=w; canvas.height=h;
      gl.viewport(0,0,w,h);
      if(rainTex) gl.deleteTexture(rainTex);
      if(sceneTex) gl.deleteTexture(sceneTex);
      if(rainFBO) gl.deleteFramebuffer(rainFBO);
      rainTex  = mkTex(gl,w,h);
      sceneTex = mkTex(gl,w,h);
      rainFBO = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, rainFBO);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rainTex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      // Fill sceneTex with current page snapshot
      const off = document.createElement("canvas");
      off.width=w; off.height=h;
      const ctx = off.getContext("2d")!;
      // Dark gradient background matching the app theme
      const grad = ctx.createLinearGradient(0,0,w,h);
      grad.addColorStop(0,"#050510");
      grad.addColorStop(1,"#0a0a1e");
      ctx.fillStyle=grad;
      ctx.fillRect(0,0,w,h);
      gl.bindTexture(gl.TEXTURE_2D, sceneTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, off);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrapper);
    resize();

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      ptrRef.current = { x:(e.clientX-r.left)/r.width, y:1-(e.clientY-r.top)/r.height, active:true };
    };
    const onLeave = () => { ptrRef.current.active = false; };
    if(interactive){ canvas.addEventListener("pointermove", onMove); canvas.addEventListener("pointerleave", onLeave); }

    let raf=0, start=performance.now(), alive=true;
    const draw = () => {
      if(!alive) return;
      raf = requestAnimationFrame(draw);
      const t = (performance.now()-start)/1000;
      gl.useProgram(prog); gl.bindVertexArray(vao);
      gl.uniform2f(U.res,W,H); gl.uniform1f(U.time,t);
      gl.uniform1f(U.intensity,intensity); gl.uniform1f(U.speed,speed);
      gl.uniform1f(U.scale,scale); gl.uniform1f(U.dw,dropWidth); gl.uniform1f(U.dl,dropLength);
      gl.uniform1f(U.refraction,refraction); gl.uniform1f(U.blur,blur); gl.uniform1f(U.vignette,vignette);
      gl.uniform1f(U.fallSpeed,fallSpeed); gl.uniform1f(U.wiggle,wiggle); gl.uniform1f(U.static,staticDrops);
      gl.uniform1f(U.ir,interactionRadius); gl.uniform1f(U.is,interactionStrength); gl.uniform1f(U.id,interactionDistortion);
      gl.uniform3f(U.tint,tint[0],tint[1],tint[2]); gl.uniform1f(U.ts,tintStrength);
      gl.uniform2f(U.ptr,ptrRef.current.x,ptrRef.current.y);
      gl.uniform1f(U.pa, ptrRef.current.active?1:0);

      // Pass 0 – rain field
      gl.bindFramebuffer(gl.FRAMEBUFFER, rainFBO);
      gl.uniform1i(U.pass,0);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, rainTex); gl.uniform1i(U.rain,0);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);

      // Pass 1 – composite
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.uniform1i(U.pass,1);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, sceneTex); gl.uniform1i(U.scene,0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, rainTex); gl.uniform1i(U.rain,1);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    };
    draw();

    return () => {
      alive=false; cancelAnimationFrame(raf); ro.disconnect();
      if(interactive){ canvas.removeEventListener("pointermove",onMove); canvas.removeEventListener("pointerleave",onLeave); }
      gl.deleteBuffer(buf); gl.deleteVertexArray(vao); gl.deleteProgram(prog);
      if(rainTex) gl.deleteTexture(rainTex);
      if(sceneTex) gl.deleteTexture(sceneTex);
      if(rainFBO) gl.deleteFramebuffer(rainFBO);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[intensity,speed,scale,dropWidth,dropLength,refraction,blur,vignette,
     fallSpeed,wiggle,staticDrops,interactive,interactionRadius,
     interactionStrength,interactionDistortion,tint[0],tint[1],tint[2],tintStrength]);

  return (
    <div ref={wrapperRef} className={className} style={{ position:"relative", overflow:"hidden", ...style }}>
      {children}
      <canvas ref={canvasRef} style={{
        position:"absolute", inset:0, width:"100%", height:"100%",
        zIndex:9999, pointerEvents: interactive ? "auto" : "none",
      }}/>
    </div>
  );
}

export default Droplets;
