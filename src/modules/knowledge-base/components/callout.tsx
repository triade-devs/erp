import { type ReactNode } from "react";

type CalloutType = "info" | "warning" | "tip" | "danger";

const styles: Record<CalloutType, { border: string; bg: string; label: string }> = {
  info: { border: "border-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30", label: "Info" },
  warning: {
    border: "border-yellow-500",
    bg: "bg-yellow-50 dark:bg-yellow-950/30",
    label: "Atenção",
  },
  tip: { border: "border-green-500", bg: "bg-green-50 dark:bg-green-950/30", label: "Dica" },
  danger: { border: "border-red-500", bg: "bg-red-50 dark:bg-red-950/30", label: "Perigo" },
};

type Props = {
  type?: CalloutType;
  children: ReactNode;
};

export function Callout({ type = "info", children }: Props) {
  const { border, bg, label } = styles[type];
  return (
    <div className={`my-4 rounded-md border-l-4 p-4 ${border} ${bg}`}>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}
