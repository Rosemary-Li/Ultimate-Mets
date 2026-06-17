"use client";

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

export interface ChartDataset {
  label: string;
  data: (number | null)[];
  color?: string;
}

interface ChartViewProps {
  type: "bar" | "line";
  labels: (string | number)[];
  datasets: ChartDataset[];
  height?: number;
  /** y-axis starts at zero (true for counting stats, false for rate stats) */
  beginAtZero?: boolean;
}

// Mets palette for series.
const PALETTE = ["#002D72", "#FF5910", "#10B981", "#8B5CF6"];

/**
 * Reusable Chart.js wrapper. Server components fetch data and pass it here; this
 * client component renders the canvas and cleans the chart up on change/unmount.
 */
export default function ChartView({
  type,
  labels,
  datasets,
  height = 260,
  beginAtZero = true,
}: ChartViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type,
      data: {
        labels: labels.map(String),
        datasets: datasets.map((d, i) => {
          const color = d.color ?? PALETTE[i % PALETTE.length];
          return {
            label: d.label,
            data: d.data,
            backgroundColor:
              type === "line" ? "transparent" : color,
            borderColor: color,
            borderWidth: type === "line" ? 2.5 : 0,
            tension: 0.3,
            pointRadius: type === "line" ? 3 : 0,
            pointBackgroundColor: color,
            borderRadius: type === "bar" ? 4 : 0,
            maxBarThickness: 46,
          };
        }),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            display: datasets.length > 1,
            labels: { boxWidth: 12, font: { size: 12 } },
          },
          tooltip: { backgroundColor: "#111827", padding: 10, cornerRadius: 6 },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: {
            beginAtZero,
            grid: { color: "#F3F4F6" },
            ticks: { font: { size: 11 } },
          },
        },
      },
    } as never);

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, beginAtZero, JSON.stringify(labels), JSON.stringify(datasets)]);

  return (
    <div style={{ height, position: "relative" }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
