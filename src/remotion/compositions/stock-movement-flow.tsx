import { useCurrentFrame, interpolate, Easing, AbsoluteFill } from "remotion";
import { Card, Pill, ArrowFlow } from "../primitives";
import { colors, fontFamily, spacing } from "../tokens";

export type StockMovementFlowProps = {
  type: "in" | "out";
  quantity: number;
  productName: string;
};

export function StockMovementFlow({ type, quantity, productName }: StockMovementFlowProps) {
  const frame = useCurrentFrame();

  const isIn = type === "in";
  const accentColor = isIn ? colors.success : colors.danger;
  const label = isIn ? "Entrada" : "Saída";
  const sign = isIn ? "+" : "−";

  // Arrow animates frames 30→60
  const arrowProgress = interpolate(frame, [30, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.ease),
  });

  // Counter animates frames 60→100
  const counterValue = Math.round(
    interpolate(frame, [60, 100], [0, quantity], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }),
  );

  const counterOpacity = interpolate(frame, [60, 75], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: colors.background, fontFamily }}>
      {/* Product card — aparece nos primeiros 15 frames */}
      <Card x={440} y={240} width={400} height={120} delayFrames={0}>
        <span style={{ fontSize: 14, color: colors.muted, fontWeight: 500 }}>Produto</span>
        <span style={{ fontSize: 22, fontWeight: 700, color: colors.text }}>{productName}</span>
      </Card>

      {/* Fonte/destino */}
      <Card x={40} y={260} width={180} height={80} delayFrames={10}>
        <span
          style={{ fontSize: 13, fontWeight: 600, color: isIn ? colors.success : colors.muted }}
        >
          {isIn ? "Fornecedor" : "Estoque"}
        </span>
      </Card>

      {/* Destino/saída */}
      <Card x={1060} y={260} width={180} height={80} delayFrames={10}>
        <span style={{ fontSize: 13, fontWeight: 600, color: isIn ? colors.muted : colors.danger }}>
          {isIn ? "Estoque" : "Destino"}
        </span>
      </Card>

      {/* Arrow */}
      <ArrowFlow
        fromX={isIn ? 220 : 640}
        fromY={300}
        toX={isIn ? 440 : 1060}
        toY={300}
        progress={arrowProgress}
        color={accentColor}
      />

      {/* Badge e contador */}
      <div
        style={{
          position: "absolute",
          bottom: spacing.xl,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: spacing.sm,
          opacity: counterOpacity,
        }}
      >
        <Pill label={label} color={accentColor} delayFrames={60} />
        <span
          style={{
            fontSize: 48,
            fontWeight: 800,
            color: accentColor,
            letterSpacing: -2,
          }}
        >
          {sign}
          {counterValue}
        </span>
        <span style={{ fontSize: 14, color: colors.muted }}>unidades</span>
      </div>
    </AbsoluteFill>
  );
}
