"use client";

import { Player } from "@remotion/player";
import { StockMovementFlow } from "@/remotion/compositions/stock-movement-flow";
import { AuthFlow } from "@/remotion/compositions/auth-flow";

type RemotionComposition = "StockMovementFlow" | "AuthFlow";

type Props = {
  composition: RemotionComposition;
  inputProps?: Record<string, unknown>;
};

const COMPONENTS: Record<RemotionComposition, React.ComponentType<Record<string, unknown>>> = {
  StockMovementFlow: StockMovementFlow as React.ComponentType<Record<string, unknown>>,
  AuthFlow: AuthFlow as React.ComponentType<Record<string, unknown>>,
};

import React from "react";

export function RemotionPlayer({ composition, inputProps = {} }: Props) {
  const component = COMPONENTS[composition];

  return (
    <Player
      component={component}
      durationInFrames={180}
      compositionWidth={1280}
      compositionHeight={720}
      fps={30}
      inputProps={inputProps}
      controls
      style={{ width: "100%", borderRadius: "0.5rem" }}
    />
  );
}
