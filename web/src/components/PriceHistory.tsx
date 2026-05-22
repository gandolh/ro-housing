interface Props {
  history: { observedAt: number; priceEur: number | null }[];
  width?: number;
  height?: number;
}

export function PriceHistory({ history, width = 80, height = 18 }: Props) {
  const points = history.filter((h) => h.priceEur !== null) as {
    observedAt: number;
    priceEur: number;
  }[];
  if (points.length === 0)
    return <span className="text-ink-faint">—</span>;
  if (points.length === 1) {
    return (
      <svg width={width} height={height} aria-hidden>
        <rect
          x={width / 2 - 1}
          y={height / 2 - 1}
          width={2}
          height={2}
          fill="var(--color-ink)"
        />
      </svg>
    );
  }
  const minP = Math.min(...points.map((p) => p.priceEur));
  const maxP = Math.max(...points.map((p) => p.priceEur));
  const minT = points[0]!.observedAt;
  const maxT = points[points.length - 1]!.observedAt;
  const xFor = (t: number) =>
    maxT === minT ? width / 2 : ((t - minT) / (maxT - minT)) * (width - 4) + 2;
  const yFor = (p: number) =>
    maxP === minP
      ? height / 2
      : height - 2 - ((p - minP) / (maxP - minP)) * (height - 4);
  const d = points
    .map(
      (p, i) =>
        `${i === 0 ? 'M' : 'L'} ${xFor(p.observedAt).toFixed(1)} ${yFor(p.priceEur).toFixed(1)}`,
    )
    .join(' ');
  const last = points[points.length - 1]!;
  return (
    <svg width={width} height={height} aria-hidden>
      <path
        d={d}
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth={1}
        shapeRendering="crispEdges"
      />
      <rect
        x={xFor(last.observedAt) - 1.5}
        y={yFor(last.priceEur) - 1.5}
        width={3}
        height={3}
        fill="var(--color-ink)"
      />
    </svg>
  );
}
