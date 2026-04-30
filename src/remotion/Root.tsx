import { Composition } from "remotion";
import { StockMovementFlow, type StockMovementFlowProps } from "./compositions/stock-movement-flow";
import { AuthFlow, type AuthFlowProps } from "./compositions/auth-flow";

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="StockMovementFlow"
        component={StockMovementFlow}
        durationInFrames={180}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{ type: "in" as const, quantity: 50, productName: "Produto Exemplo" }}
      />
      <Composition
        id="AuthFlow"
        component={AuthFlow}
        durationInFrames={180}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{ userName: "Usuário" }}
      />
    </>
  );
}
