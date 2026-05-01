"use client";

import { useEffect, useRef } from "react";

type Props = {
  chart: string;
};

export function MermaidDiagram({ chart }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    import("mermaid").then(({ default: mermaid }) => {
      mermaid.initialize({ startOnLoad: false, theme: "neutral" });
      const id = `mermaid-${Math.random().toString(36).slice(2)}`;
      el.innerHTML = `<div class="mermaid" id="${id}">${chart}</div>`;
      mermaid.run({ nodes: [el.querySelector(`#${id}`) as HTMLElement] });
    });
  }, [chart]);

  return (
    <div
      ref={ref}
      className="my-4 flex justify-center overflow-x-auto rounded-md border bg-muted/20 p-4"
    >
      <p className="text-sm text-muted-foreground">Carregando diagrama…</p>
    </div>
  );
}
