/**
 * GlyphRain — canvas-based falling glyph background
 * Compatible with @canvas-ui/glyph-rain-react API surface.
 * Uses WebGL-free canvas 2D for maximum browser compatibility.
 */

import { useEffect, useRef } from "react";

export interface GlyphRainOptions {
  /** Characters used for the falling glyphs */
  charset?: string;
  /** Size of one glyph cell in CSS pixels (8–64) */
  cell?: number;
  /** Rain color as CSS hex string */
  color?: string;
  /** Color of the bright head glyph */
  headColor?: string;
  /** Fall speed in screen heights per second (0.05–3) */
  speed?: number;
  /** Fraction of drops that spawn each cycle (0–1) */
  density?: number;
  /** Length multiplier for the fading trails (0.2–3) */
  trail?: number;
  /** Overall opacity of the rain layer (0–1) */
  opacity?: number;
  /** How fast glyphs mutate (0–4) */
  mutate?: number;
}

export interface GlyphRainProps extends GlyphRainOptions {
  className?: string;
  style?: React.CSSProperties;
}

const DEFAULT_CHARSET =
  "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789Z*+-<>¦=:.";

export function GlyphRain({
  charset = DEFAULT_CHARSET,
  cell = 16,
  color = "#8b5cf6",
  headColor = "#e0d7ff",
  speed = 0.18,
  density = 0.12,
  trail = 0.7,
  opacity = 0.13,
  mutate = 1.2,
  className,
  style,
}: GlyphRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const chars = Array.from(new Set(charset.split("")));

    // Column state: y position of each drop head (in glyph rows), randomised
    let cols = 0;
    const drops: number[] = [];
    const colGlyphs: string[][] = [];
    const colSpeeds: number[] = [];
    const mutateTimers: number[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cols = Math.floor(canvas.width / cell);
      drops.length = cols;
      colGlyphs.length = cols;
      colSpeeds.length = cols;
      mutateTimers.length = cols;
      const rows = Math.ceil(canvas.height / cell) + 2;
      for (let i = 0; i < cols; i++) {
        drops[i] = -Math.random() * rows; // stagger start positions
        colSpeeds[i] = speed * (0.6 + Math.random() * 0.8);
        colGlyphs[i] = Array.from({ length: rows }, () =>
          chars[Math.floor(Math.random() * chars.length)]
        );
        mutateTimers[i] = 0;
      }
    };

    resize();

    const ro = new ResizeObserver(() => resize());
    ro.observe(document.documentElement);

    let lastTime = performance.now();
    let rafId = 0;
    const rows = () => Math.ceil(canvas.height / cell) + 2;

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Fade previous frame
      ctx.fillStyle = `rgba(5, 5, 16, ${0.18 + (1 - trail) * 0.25})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `bold ${cell}px monospace`;
      ctx.textBaseline = "top";

      const r = rows();

      for (let i = 0; i < cols; i++) {
        drops[i] += colSpeeds[i] * (dt * 60);
        mutateTimers[i] += dt * mutate * 4;

        // Mutate glyphs over time
        if (mutateTimers[i] >= 1) {
          mutateTimers[i] = 0;
          const row = Math.floor(drops[i]);
          if (row >= 0 && row < colGlyphs[i].length) {
            colGlyphs[i][row] = chars[Math.floor(Math.random() * chars.length)];
          }
        }

        const headRow = Math.floor(drops[i]);

        // Draw trail
        for (let j = headRow; j >= 0; j--) {
          const dist = headRow - j;
          const alpha = Math.max(0, 1 - dist / (trail * 18));
          if (alpha < 0.01) break;
          const glyph = colGlyphs[i][j % colGlyphs[i].length];
          const x = i * cell;
          const y = j * cell;

          if (dist === 0) {
            // Head glyph — bright
            ctx.globalAlpha = opacity * Math.min(alpha * 1.6, 1);
            ctx.fillStyle = headColor;
          } else {
            ctx.globalAlpha = opacity * alpha * 0.85;
            ctx.fillStyle = color;
          }
          ctx.fillText(glyph, x, y);
        }

        // Reset drop when it scrolls off screen
        if (drops[i] > r) {
          if (Math.random() < density) {
            drops[i] = -Math.random() * 6;
            colGlyphs[i] = Array.from({ length: r }, () =>
              chars[Math.floor(Math.random() * chars.length)]
            );
          } else {
            drops[i] = -Math.random() * r * 0.5;
          }
        }
      }

      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [charset, cell, color, headColor, speed, density, trail, opacity, mutate]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
        display: "block",
        ...style,
      }}
    />
  );
}
