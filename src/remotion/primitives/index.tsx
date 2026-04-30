import { useCurrentFrame, interpolate, Easing } from "remotion";
import { type ReactNode } from "react";
import { colors, radius, fontFamily } from "../tokens";

// ── Card ────────────────────────────────────────────────────────────────────

type CardProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  children?: ReactNode;
  delayFrames?: number;
};

export function Card({ x, y, width, height, children, delayFrames = 0 }: CardProps) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delayFrames, delayFrames + 15], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.ease),
  });
  const translateY = interpolate(frame, [delayFrames, delayFrames + 15], [20, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height,
        background: colors.surface,
        border: `2px solid ${colors.border}`,
        borderRadius: radius.md,
        padding: 16,
        fontFamily,
        opacity,
        transform: `translateY(${translateY}px)`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
      }}
    >
      {children}
    </div>
  );
}

// ── Pill ────────────────────────────────────────────────────────────────────

type PillProps = {
  label: string;
  color?: string;
  textColor?: string;
  delayFrames?: number;
};

export function Pill({
  label,
  color = colors.accent,
  textColor = colors.accentFg,
  delayFrames = 0,
}: PillProps) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delayFrames, delayFrames + 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <span
      style={{
        background: color,
        color: textColor,
        borderRadius: 999,
        padding: "4px 12px",
        fontSize: 13,
        fontWeight: 600,
        fontFamily,
        opacity,
      }}
    >
      {label}
    </span>
  );
}

// ── ArrowFlow ───────────────────────────────────────────────────────────────

type ArrowFlowProps = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
  color?: string;
};

export function ArrowFlow({
  fromX,
  fromY,
  toX,
  toY,
  progress,
  color = colors.accent,
}: ArrowFlowProps) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const length = Math.sqrt(dx * dx + dy * dy);
  const drawLength = progress * length;

  return (
    <svg
      style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}
      width="100%"
      height="100%"
    >
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill={color} />
        </marker>
      </defs>
      <line
        x1={fromX}
        y1={fromY}
        x2={fromX + (dx / length) * drawLength}
        y2={fromY + (dy / length) * drawLength}
        stroke={color}
        strokeWidth={3}
        markerEnd={progress > 0.95 ? "url(#arrowhead)" : undefined}
      />
    </svg>
  );
}
