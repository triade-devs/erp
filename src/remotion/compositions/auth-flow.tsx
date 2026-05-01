import { useCurrentFrame, interpolate, AbsoluteFill } from "remotion";
import { Card, Pill, ArrowFlow } from "../primitives";
import { colors, fontFamily, spacing } from "../tokens";

export type AuthFlowProps = {
  userName: string;
};

const STEPS = ["Login", "Sessão criada", "Role atribuída", "Permissão verificada"];

export function AuthFlow({ userName }: AuthFlowProps) {
  const frame = useCurrentFrame();

  const steps = STEPS.map((label, i) => {
    const start = i * 40;
    const opacity = interpolate(frame, [start, start + 15], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const isActive = frame >= start;
    return { label, opacity, isActive };
  });

  // Arrow between each step
  const arrowProgresses = [0, 1, 2].map((i) => {
    const start = i * 40 + 20;
    return interpolate(frame, [start, start + 20], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  });

  const CARD_Y = 280;
  const CARD_W = 200;
  const CARD_H = 100;
  const GAP = 260;
  const OFFSET_X = 80;

  const checkOpacity = interpolate(frame, [150, 165], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: colors.background, fontFamily }}>
      {/* User label */}
      <div
        style={{
          position: "absolute",
          top: spacing.xl,
          left: "50%",
          transform: "translateX(-50%)",
          opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <Pill label={`Usuário: ${userName}`} color={colors.primary} delayFrames={0} />
      </div>

      {/* Step cards */}
      {steps.map(({ label, opacity }, i) => (
        <Card
          key={label}
          x={OFFSET_X + i * GAP}
          y={CARD_Y}
          width={CARD_W}
          height={CARD_H}
          delayFrames={i * 40}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: colors.text, opacity }}>
            {label}
          </span>
        </Card>
      ))}

      {/* Arrows between steps */}
      {arrowProgresses.map((progress, i) => (
        <ArrowFlow
          key={i}
          fromX={OFFSET_X + i * GAP + CARD_W}
          fromY={CARD_Y + CARD_H / 2}
          toX={OFFSET_X + (i + 1) * GAP}
          toY={CARD_Y + CARD_H / 2}
          progress={progress}
          color={colors.accent}
        />
      ))}

      {/* Final check mark */}
      <div
        style={{
          position: "absolute",
          bottom: spacing.xl,
          left: "50%",
          transform: "translateX(-50%)",
          opacity: checkOpacity,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: spacing.sm,
        }}
      >
        <Pill label="Acesso concedido ✓" color={colors.success} delayFrames={150} />
      </div>
    </AbsoluteFill>
  );
}
