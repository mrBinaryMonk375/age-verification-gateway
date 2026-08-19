import { useRef, useState } from "react";
import { motion, useMotionValue, useTransform, useMotionTemplate } from "framer-motion";

export const InteractiveCard = ({
  children,
  style,
  className,
  InteractiveColor = "#8b5cf6",
  borderRadius = "20px",
  rotationFactor = 0.3,
  transitionDuration = 0.3,
  transitionEasing = "easeInOut",
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  InteractiveColor?: string;
  borderRadius?: string;
  rotationFactor?: number;
  transitionDuration?: number;
  transitionEasing?: string;
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateXTrans = useTransform(y, [0, 1], [rotationFactor * 15, -rotationFactor * 15]);
  const rotateYTrans = useTransform(x, [0, 1], [-rotationFactor * 15, rotationFactor * 15]);

  const handlePointerMove = (e: React.PointerEvent) => {
    const bounds = cardRef.current?.getBoundingClientRect();
    if (!bounds) return;
    x.set((e.clientX - bounds.left) / bounds.width);
    y.set((e.clientY - bounds.top) / bounds.height);
  };

  const xPercentage = useTransform(x, (val) => `${val * 100}%`);
  const yPercentage = useTransform(y, (val) => `${val * 100}%`);

  const interactiveBackground = useMotionTemplate`radial-gradient(circle at ${xPercentage} ${yPercentage}, ${InteractiveColor} 0%, transparent 70%)`;

  return (
    <motion.div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      style={{ perspective: 1000, borderRadius, ...style }}
      className={className}
    >
      <motion.div
        style={{
          rotateX: rotateXTrans,
          rotateY: rotateYTrans,
          transformStyle: "preserve-3d",
          transition: `transform ${transitionDuration}s ${transitionEasing}`,
          width: "100%",
          height: "100%",
          borderRadius,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow layer */}
        <motion.div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius,
            background: interactiveBackground,
            opacity: isHovered ? 0.18 : 0,
            transition: `opacity ${transitionDuration}s ${transitionEasing}`,
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
        {/* Content */}
        <div style={{ position: "relative", zIndex: 2, width: "100%", height: "100%" }}>
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
};