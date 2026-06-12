"use client";

import { useMemo, useRef, useState } from "react";
import type { DailyPurchaseMetrics } from "@/lib/sheets";

interface TrendChartProps {
  rows: DailyPurchaseMetrics[];
  label: string;
  title: string;
  visibleMetrics: MetricKey[];
  showPassRate: boolean;
}

type MetricKey = keyof Pick<
  DailyPurchaseMetrics,
  | "applicantCount"
  | "signupCount"
  | "purchaseRequestCount"
  | "applicationCount"
  | "completedPurchaseCount"
  | "purchaseAmount"
>;

const metricConfig: Record<MetricKey, { label: string; color: string; bg: string }> = {
  applicantCount: {
    label: "신청자수",
    color: "#0f766e",
    bg: "bg-teal-50 text-teal-900",
  },
  signupCount: {
    label: "가입자수",
    color: "#ec4899",
    bg: "bg-pink-50 text-pink-900",
  },
  purchaseRequestCount: {
    label: "매입신청건수",
    color: "#d97706",
    bg: "bg-amber-50 text-amber-900",
  },
  applicationCount: {
    label: "매입신청벌수",
    color: "#1d4ed8",
    bg: "bg-blue-50 text-blue-900",
  },
  completedPurchaseCount: {
    label: "검수통과갯수",
    color: "#475569",
    bg: "bg-slate-100 text-slate-900",
  },
  purchaseAmount: {
    label: "매입액",
    color: "#7c3aed",
    bg: "bg-violet-50 text-violet-900",
  },
};

const CHART_WIDTH = 100;
const CHART_HEIGHT = 44;

function buildPath(values: number[], width: number, height: number) {
  if (values.length === 0) {
    return "";
  }

  const max = Math.max(...values, 1);
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - (value / max) * height;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function getScaledPoint(value: number, index: number, length: number, max: number) {
  const x = (index / Math.max(length - 1, 1)) * CHART_WIDTH;
  const y = CHART_HEIGHT - (value / Math.max(max, 1)) * CHART_HEIGHT;
  return { x, y };
}

function formatPassRate(completedPurchaseCount: number, applicationCount: number) {
  if (applicationCount === 0) {
    return "0.0%";
  }

  return `${((completedPurchaseCount / applicationCount) * 100).toFixed(1)}%`;
}

export function TrendChart({
  rows,
  label,
  title,
  visibleMetrics,
  showPassRate,
}: TrendChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [chartBounds, setChartBounds] = useState({ width: 0, height: 0 });
  const chartRows = useMemo(
    () => [...rows].sort((a, b) => a.date.localeCompare(b.date)),
    [rows],
  );

  const values = {
    applicantCount: chartRows.map((row) => row.applicantCount),
    signupCount: chartRows.map((row) => row.signupCount),
    purchaseRequestCount: chartRows.map((row) => row.purchaseRequestCount),
    applicationCount: chartRows.map((row) => row.applicationCount),
    completedPurchaseCount: chartRows.map((row) => row.completedPurchaseCount),
    purchaseAmount: chartRows.map((row) => row.purchaseAmount),
  };
  const maxByMetric = useMemo(
    () => ({
      applicantCount: Math.max(...values.applicantCount, 1),
      signupCount: Math.max(...values.signupCount, 1),
      purchaseRequestCount: Math.max(...values.purchaseRequestCount, 1),
      applicationCount: Math.max(...values.applicationCount, 1),
      completedPurchaseCount: Math.max(...values.completedPurchaseCount, 1),
      purchaseAmount: Math.max(...values.purchaseAmount, 1),
    }),
    [
      values.applicationCount,
      values.applicantCount,
      values.signupCount,
      values.completedPurchaseCount,
      values.purchaseAmount,
      values.purchaseRequestCount,
    ],
  );
  const hoveredRow = hoveredIndex !== null ? chartRows[hoveredIndex] : null;

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!chartRef.current || chartRows.length === 0) {
      return;
    }

    const rect = chartRef.current.getBoundingClientRect();
    const relativeX = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    const nextIndex = Math.round(
      (relativeX / Math.max(rect.width, 1)) * Math.max(chartRows.length - 1, 0),
    );

    setHoveredIndex(nextIndex);
    setChartBounds({ width: rect.width, height: rect.height });
    setTooltipPosition({
      x: relativeX,
      y: Math.min(Math.max(event.clientY - rect.top, 12), rect.height - 12),
    });
  }

  return (
    <section className="rounded-[32px] border border-white/70 bg-[var(--surface)] p-6 shadow-[var(--shadow)] backdrop-blur">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Trend</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            {title}
          </h2>
          <p className="mt-2 text-sm text-slate-600">{label}</p>
        </div>
        <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
          총 {chartRows.length.toLocaleString("ko-KR")}일
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {visibleMetrics.map((key) => (
          <span
            key={key}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${metricConfig[key].bg}`}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: metricConfig[key].color }}
            />
            {metricConfig[key].label}
          </span>
        ))}
      </div>

      <div
        ref={chartRef}
        className="relative mt-8 overflow-hidden rounded-[24px] border border-slate-200 bg-white/70 p-4"
      >
        <svg
          viewBox={`0 0 ${CHART_WIDTH} 48`}
          preserveAspectRatio="none"
          className="h-72 w-full"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoveredIndex(null)}
        >
          {[0, 1, 2, 3].map((index) => (
            <line
              key={index}
              x1="0"
              y1={index * 16}
              x2={CHART_WIDTH}
              y2={index * 16}
              stroke="rgba(148, 163, 184, 0.18)"
              strokeWidth="0.5"
            />
          ))}

          {visibleMetrics.map((metricKey) => (
            <path
              key={metricKey}
              d={buildPath(values[metricKey], CHART_WIDTH, CHART_HEIGHT)}
              fill="none"
              stroke={metricConfig[metricKey].color}
              strokeWidth="1.6"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {hoveredIndex !== null ? (
            <>
              <line
                x1={getScaledPoint(0, hoveredIndex, chartRows.length, 1).x}
                y1="0"
                x2={getScaledPoint(0, hoveredIndex, chartRows.length, 1).x}
                y2="48"
                stroke="rgba(15, 23, 42, 0.18)"
                strokeWidth="0.8"
                strokeDasharray="2 2"
              />
              {visibleMetrics.map((metricKey) => {
                const point = getScaledPoint(
                  values[metricKey][hoveredIndex] ?? 0,
                  hoveredIndex,
                  chartRows.length,
                  maxByMetric[metricKey],
                );

                return (
                  <circle
                    key={metricKey}
                    cx={point.x}
                    cy={point.y}
                    r="1.6"
                    fill={metricConfig[metricKey].color}
                    stroke="white"
                    strokeWidth="0.8"
                  />
                );
              })}
            </>
          ) : null}
        </svg>

        {hoveredRow ? (
          <div
            className="pointer-events-none absolute z-10 min-w-52 rounded-[18px] border border-slate-200 bg-white/95 px-4 py-3 text-sm text-slate-700 shadow-lg backdrop-blur"
            style={{
              left: Math.min(
                Math.max(tooltipPosition.x + 18, 12),
                Math.max(chartBounds.width - 220, 12),
              ),
              top: Math.min(
                Math.max(tooltipPosition.y - 20, 12),
                Math.max(chartBounds.height - 160, 12),
              ),
            }}
          >
            <p className="font-medium text-slate-900">{hoveredRow.date}</p>
            <div className="mt-3 space-y-1.5">
              {visibleMetrics.includes("signupCount") ? (
                <p>가입자수 {hoveredRow.signupCount.toLocaleString("ko-KR")}</p>
              ) : null}
              {visibleMetrics.includes("applicantCount") ? (
                <p>신청자수 {hoveredRow.applicantCount.toLocaleString("ko-KR")}</p>
              ) : null}
              {visibleMetrics.includes("purchaseRequestCount") ? (
                <p>매입신청건수 {hoveredRow.purchaseRequestCount.toLocaleString("ko-KR")}</p>
              ) : null}
              {visibleMetrics.includes("applicationCount") ? (
                <p>매입신청벌수 {hoveredRow.applicationCount.toLocaleString("ko-KR")}</p>
              ) : null}
              {visibleMetrics.includes("completedPurchaseCount") ? (
                <p>검수통과갯수 {hoveredRow.completedPurchaseCount.toLocaleString("ko-KR")}</p>
              ) : null}
              {visibleMetrics.includes("purchaseAmount") ? (
                <p>매입액 {hoveredRow.purchaseAmount.toLocaleString("ko-KR")}</p>
              ) : null}
              {showPassRate &&
              visibleMetrics.includes("completedPurchaseCount") &&
              visibleMetrics.includes("applicationCount") ? (
                <p>통과율 {formatPassRate(hoveredRow.completedPurchaseCount, hoveredRow.applicationCount)}</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
