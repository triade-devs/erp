"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildVitalsSeriesPath,
  getVitalsChartY,
  normalizeTimelineValues,
} from "../../services/session";
import { SectionCard, compactInputClassName, formInputClassName } from "../shared";

function parseNumeric(value: string): number | null {
  if (!value.trim()) return null;
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

type TextField = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

type Props = {
  /** Título exibido no cabeçalho do card */
  title: string;
  /** Descrição opcional exibida abaixo do título */
  description?: string;
  /** Rótulo da linha de inputs (ex: "SpO2 %" ou "EtCO2 mmHg") */
  label: string;
  /** Cor da linha no gráfico (hex, rgb, etc.) */
  color: string;
  /** Valores da série, um por slot de tempo */
  values: string[];
  /** Labels de horário geradas a partir de buildTimeLabels */
  timeLabels: string[];
  /** Valor mínimo do eixo Y (padrão: 0) */
  yMin?: number;
  /** Valor máximo do eixo Y (padrão: 100) */
  yMax?: number;
  /**
   * Campos de texto adicionais exibidos acima do gráfico.
   * Útil para campos como "Posição", "Observações", etc.
   */
  textFields?: TextField[];
  /** Chamado ao alterar um valor da série; recebe o array completo atualizado */
  onChange: (values: string[]) => void;
};

const CHART_WIDTH = 1200;
const CHART_HEIGHT = 200;
const Y_STEPS = 5;

export function MonitorTimelineChart({
  title,
  description,
  label,
  color,
  values,
  timeLabels,
  yMin = 0,
  yMax = 100,
  textFields,
  onChange,
}: Props) {
  const colWidth = CHART_WIDTH / Math.max(timeLabels.length, 1);
  const normalized = normalizeTimelineValues(values, timeLabels.length);
  const numericValues = normalized.map(parseNumeric);
  const path = buildVitalsSeriesPath(numericValues, colWidth, yMin, yMax, CHART_HEIGHT);

  const step = (yMax - yMin) / Y_STEPS;
  const yAxisValues = Array.from({ length: Y_STEPS + 1 }, (_, i) => Math.round(yMax - i * step));

  const handleChange = (index: number, value: string) => {
    const next = normalizeTimelineValues(normalized, timeLabels.length);
    next[index] = value;
    onChange(next);
  };

  return (
    <SectionCard title={title} description={description}>
      {textFields && textFields.length > 0 ? (
        <div className="flex flex-wrap gap-4">
          {textFields.map((field) => (
            <div key={field.label} className="flex items-center gap-2">
              <Label className="shrink-0">{field.label}</Label>
              <Input
                className={formInputClassName}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
              />
            </div>
          ))}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <div className="min-w-[1160px] space-y-3">
          {/* Legenda */}
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              {label}
            </span>
          </div>

          {/* Cabeçalho de horários */}
          <div className="vitals-grid gap-2 text-center text-xs font-medium text-muted-foreground">
            <div className="flex items-center justify-start px-2 text-left text-sm font-semibold text-foreground">
              Horários
            </div>
            {timeLabels.map((tl) => (
              <div key={tl} className="rounded-md border bg-muted/20 px-2 py-2">
                {tl}
              </div>
            ))}
          </div>

          {/* Gráfico */}
          <div className="vitals-grid gap-2">
            <div className="flex flex-col justify-between rounded-lg border bg-muted/10 p-3 text-xs text-muted-foreground">
              {yAxisValues.map((v) => (
                <span key={v}>{v}</span>
              ))}
            </div>
            <div className="col-span-12 overflow-hidden rounded-lg border bg-background">
              <svg
                viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                className="w-full"
                style={{ height: CHART_HEIGHT }}
              >
                {yAxisValues.map((v) => {
                  const y = getVitalsChartY(v, yMin, yMax, CHART_HEIGHT);
                  return (
                    <line
                      key={v}
                      x1="0"
                      y1={y}
                      x2={CHART_WIDTH}
                      y2={y}
                      stroke="#e5e7eb"
                      strokeWidth="1"
                    />
                  );
                })}
                {timeLabels.map((tl, i) => {
                  const x = (i + 0.5) * colWidth;
                  return (
                    <line
                      key={tl}
                      x1={x}
                      y1="0"
                      x2={x}
                      y2={CHART_HEIGHT}
                      stroke="#f3f4f6"
                      strokeWidth="1"
                    />
                  );
                })}
                {path ? <path d={path} fill="none" stroke={color} strokeWidth="2.5" /> : null}
                {numericValues.map((numeric, i) => {
                  if (numeric === null) return null;
                  return (
                    <circle
                      key={`pt-${i}`}
                      cx={(i + 0.5) * colWidth}
                      cy={getVitalsChartY(numeric, yMin, yMax, CHART_HEIGHT)}
                      r="4"
                      fill={color}
                    />
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Linha de inputs */}
          <div className="vitals-grid items-center gap-2">
            <div className="px-2 text-sm font-medium">{label}</div>
            {timeLabels.map((tl, i) => (
              <Input
                key={`${label}-${tl}`}
                className={compactInputClassName}
                value={normalized[i] ?? ""}
                onChange={(e) => handleChange(i, e.target.value)}
              />
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
