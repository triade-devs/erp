"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FichaAnestesiaData } from "../../types";
import {
  buildTimeLabels,
  buildVitalsSeriesPath,
  getVitalsChartY,
  normalizeTimelineValues,
  syncVitalsWithStartHour,
} from "../../utils/session";
import { SectionCard, compactInputClassName, formInputClassName } from "../shared";

type Props = {
  data: FichaAnestesiaData;
  onChange: (partial: Partial<FichaAnestesiaData>) => void;
};

type VitalsField = "pasSis" | "paDia" | "pam" | "fc" | "fr";

type SeriesConfig = {
  key: VitalsField;
  label: string;
  color: string;
};

const series: SeriesConfig[] = [
  { key: "pasSis", label: "PA SIS", color: "#7f1d1d" },
  { key: "paDia", label: "PA DIA", color: "#b91c1c" },
  { key: "pam", label: "PAM", color: "#f87171" },
  { key: "fc", label: "FC", color: "#2563eb" },
  { key: "fr", label: "FR", color: "#16a34a" },
];

function parseNumeric(value: string): number | null {
  if (!value.trim()) return null;
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

export function VitalsGrid({ data, onChange }: Props) {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const timeLabels = useMemo(() => buildTimeLabels(data.vitalsHoraInicio), [data.vitalsHoraInicio]);
  const syncedVitals = useMemo(
    () => syncVitalsWithStartHour(data.vitalsHoraInicio, data.vitals),
    [data.vitals, data.vitalsHoraInicio],
  );

  const updateSlot = (index: number, field: VitalsField, value: string) => {
    const vitals = syncedVitals.map((slot, slotIndex) =>
      slotIndex === index ? { ...slot, [field]: value } : slot,
    );
    onChange({ vitals });
  };

  const updateMetricArray = (
    key: "spo2" | "temp" | "diurese" | "pvc" | "ritmo",
    index: number,
    value: string,
  ) => {
    const next = normalizeTimelineValues(data[key]);
    next[index] = value;
    onChange({ [key]: next } as Partial<FichaAnestesiaData>);
  };

  const chartWidth = 1200;
  const step = chartWidth / Math.max(timeLabels.length - 1, 1);

  const yAxisValues = Array.from({ length: 11 }, (_, index) => 220 - index * 20);

  return (
    <SectionCard
      title="Grade de sinais vitais"
      description="Monitorização dinâmica em intervalos de 15 minutos com gráfico sobreposto."
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          {series.map((item) => (
            <span
              key={item.key}
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Label>Hora inicial</Label>
          <Input
            type="time"
            className={formInputClassName}
            value={data.vitalsHoraInicio}
            onChange={(event) =>
              onChange({
                vitalsHoraInicio: event.target.value,
                vitals: syncVitalsWithStartHour(event.target.value, syncedVitals),
              })
            }
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1160px] space-y-4">
          <div className="vitals-grid gap-2 text-center text-xs font-medium text-muted-foreground">
            <div className="flex items-center justify-start px-2 text-left text-sm font-semibold text-foreground">
              Horários
            </div>
            {timeLabels.map((label) => (
              <div key={label} className="rounded-md border bg-muted/20 px-2 py-2">
                {label}
              </div>
            ))}
          </div>

          <div className="vitals-grid gap-2">
            <div className="flex flex-col justify-between rounded-lg border bg-muted/10 p-3 text-xs text-muted-foreground">
              {yAxisValues.map((value) => (
                <span key={value}>{value}</span>
              ))}
            </div>
            <div className="col-span-12 overflow-hidden rounded-lg border bg-background">
              <svg viewBox={`0 0 ${chartWidth} 350`} className="h-[350px] w-full">
                {yAxisValues.map((value) => {
                  const y = getVitalsChartY(value);
                  return (
                    <line
                      key={value}
                      x1="0"
                      y1={y}
                      x2={chartWidth}
                      y2={y}
                      stroke="#e5e7eb"
                      strokeWidth="1"
                    />
                  );
                })}
                {timeLabels.map((label, index) => {
                  const x = index * step;
                  return (
                    <line
                      key={label}
                      x1={x}
                      y1="0"
                      x2={x}
                      y2="350"
                      stroke="#f3f4f6"
                      strokeWidth="1"
                    />
                  );
                })}
                {series.map((item) => {
                  const numericValues = syncedVitals.map((slot) => parseNumeric(slot[item.key]));
                  const path = buildVitalsSeriesPath(numericValues, step);

                  return (
                    <g key={item.key}>
                      {path ? (
                        <path d={path} fill="none" stroke={item.color} strokeWidth="2.5" />
                      ) : null}
                      {numericValues.map((numeric, index) => {
                        if (numeric === null) return null;
                        return (
                          <circle
                            key={`${item.key}-${syncedVitals[index]?.hora}`}
                            cx={index * step}
                            cy={getVitalsChartY(numeric)}
                            r="4"
                            fill={item.color}
                          />
                        );
                      })}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="vitals-grid gap-2">
            <div className="flex items-center px-2 text-sm font-medium">Editar sinais</div>
            {timeLabels.map((label, index) => (
              <Button
                key={label}
                type="button"
                variant={selectedSlot === index ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedSlot(index)}
              >
                Editar
              </Button>
            ))}
          </div>

          {selectedSlot !== null ? (
            <div className="rounded-xl border bg-muted/10 p-4">
              <p className="mb-4 text-sm font-medium">
                Editar slot {timeLabels[selectedSlot] ?? syncedVitals[selectedSlot]?.hora}
              </p>
              <div className="grid gap-4 md:grid-cols-5">
                {series.map((item) => (
                  <div key={item.key} className="space-y-2">
                    <Label>{item.label}</Label>
                    <Input
                      className={formInputClassName}
                      value={syncedVitals[selectedSlot]?.[item.key] ?? ""}
                      onChange={(event) => updateSlot(selectedSlot, item.key, event.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {(
            [
              { key: "spo2", label: "SPO2" },
              { key: "temp", label: "Temp" },
              { key: "diurese", label: "Diurese" },
              { key: "pvc", label: "PVC" },
              { key: "ritmo", label: "Ritmo" },
            ] as const
          ).map((metric) => (
            <div key={metric.key} className="vitals-grid items-center gap-2">
              <div className="px-2 text-sm font-medium">{metric.label}</div>
              {timeLabels.map((label, index) => (
                <Input
                  key={`${metric.key}-${label}`}
                  className={compactInputClassName}
                  value={data[metric.key][index] ?? ""}
                  onChange={(event) => updateMetricArray(metric.key, index, event.target.value)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
