import React, { useCallback, useMemo, useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { buildTicks, formatTick, getMinMax, LinePoint } from './chartUtils';

const VIEWBOX_HEIGHT = 120;
const VIEWBOX_WIDTH_FULL = 420;
const AXIS_LEFT = 28;
const AXIS_RIGHT = 8;
const AXIS_BOTTOM = 16;
const AXIS_TOP = 8;

export interface LineChartSeries {
  id: string;
  label?: string;
  color: string;
  points: LinePoint[];
  strokeDasharray?: string;
}

interface TooltipData {
  x: number;
  y: number;
  rawLabel: string;
  label: string;
  entries: { id: string; label: string; color: string; value: number }[];
}

function TooltipBox({ tooltip, formatter, viewBoxWidth, viewBoxHeight }: {
  tooltip: TooltipData | null;
  formatter: (v: number) => string;
  viewBoxWidth: number;
  viewBoxHeight: number;
}) {
  if (!tooltip) return null;

  const left = `${(tooltip.x / viewBoxWidth) * 100}%`;
  const top = `${(tooltip.y / viewBoxHeight) * 100}%`;

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        left,
        top,
        transform: 'translate(-50%, -120%)',
        px: 1,
        py: 0.5,
        minWidth: 140,
        pointerEvents: 'none',
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {tooltip.rawLabel}
      </Typography>
      <Typography variant="body2" fontWeight={600} mb={0.5}>
        {tooltip.label}
      </Typography>
      {tooltip.entries.map((entry) => (
        <Typography key={entry.id} variant="body2" sx={{ color: entry.color }}>
          {entry.label}: {formatter(entry.value)}
        </Typography>
      ))}
    </Paper>
  );
}

function buildSegments(
  axisPoints: { x: number; label: string; rawLabel: string }[],
  points: LinePoint[],
  min: number,
  range: number,
  innerHeight: number
) {
  const valueByLabel = new Map(points.map((p) => [p.rawLabel, p.value]));
  const segments: string[] = [];
  const circles: { x: number; y: number; rawLabel: string; value: number }[] = [];
  const positions = axisPoints.map((axisPoint) => {
    const value = valueByLabel.get(axisPoint.rawLabel);
    if (value === null || value === undefined) return null;
    const y = AXIS_TOP + innerHeight - ((value - min) / range) * innerHeight;
    circles.push({ x: axisPoint.x, y, rawLabel: axisPoint.rawLabel, value });
    return `${axisPoint.x},${y}`;
  });

  let current: string[] = [];
  positions.forEach((pos) => {
    if (!pos) {
      if (current.length) {
        segments.push(current.join(' '));
        current = [];
      }
      return;
    }
    current.push(pos);
  });
  if (current.length) {
    segments.push(current.join(' '));
  }

  return { segments, circles };
}

export function LineChart({
  series,
  formatter,
  viewBoxWidth = VIEWBOX_WIDTH_FULL,
  viewBoxHeight = VIEWBOX_HEIGHT,
  chartHeight = 320,
  axisFontSize = 5.2,
}: {
  series: LineChartSeries[];
  formatter: (v: number) => string;
  viewBoxWidth?: number;
  viewBoxHeight?: number;
  chartHeight?: number;
  axisFontSize?: number;
}) {
  const axisPoints = useMemo(() => series[0]?.points ?? [], [series]);
  const values = useMemo(
    () =>
      series
        .flatMap((s) => s.points.map((p) => p.value))
        .filter((v): v is number => v !== null && v !== undefined),
    [series]
  );

  if (!axisPoints.length || values.length === 0) {
    return <Typography variant="body2">Нет данных</Typography>;
  }

  const { min, max } = getMinMax(values);
  const range = max - min || 1;
  const ticks = buildTicks(min, max);
  const chartWidth = viewBoxWidth - AXIS_LEFT - AXIS_RIGHT;
  const innerHeight = viewBoxHeight - AXIS_BOTTOM - AXIS_TOP;
  const zeroY = min <= 0 && max >= 0 ? AXIS_TOP + innerHeight - ((0 - min) / range) * innerHeight : null;

  const positions = axisPoints.map((p, idx) => {
    const x = AXIS_LEFT + (axisPoints.length === 1 ? 0 : (idx / (axisPoints.length - 1)) * chartWidth);
    return { x, label: p.label, rawLabel: p.rawLabel };
  });

  const seriesData = series.map((item) => ({
    ...item,
    ...buildSegments(positions, item.points, min, range, innerHeight),
  }));

  const [hover, setHover] = useState<TooltipData | null>(null);

  const onMove = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const relativeX = ((event.clientX - rect.left) / rect.width) * viewBoxWidth;
      const closest = positions.reduce((prev, curr) =>
        Math.abs(curr.x - relativeX) < Math.abs(prev.x - relativeX) ? curr : prev
      );

      const entries = seriesData
        .map((item) => {
          const circle = item.circles.find((c) => c.rawLabel === closest.rawLabel);
          if (!circle) return null;
          return { id: item.id, label: item.label ?? item.id, color: item.color, value: circle.value, y: circle.y };
        })
        .filter((entry): entry is { id: string; label: string; color: string; value: number; y: number } => Boolean(entry));

      if (!entries.length) {
        setHover(null);
        return;
      }

      const y = entries[0]?.y ?? viewBoxHeight / 2;

      setHover({ x: closest.x, y, rawLabel: closest.rawLabel, label: closest.label, entries });
    },
    [positions, seriesData, viewBoxHeight, viewBoxWidth]
  );

  return (
    <Box sx={{ width: '100%', height: chartHeight, position: 'relative' }}>
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMinYMin meet"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((tick) => {
          const y = AXIS_TOP + innerHeight - ((tick - min) / range) * innerHeight;
          return (
            <g key={tick}>
              <line x1={AXIS_LEFT} x2={viewBoxWidth - AXIS_RIGHT} y1={y} y2={y} stroke="#eee" strokeWidth={0.4} />
              <text x={AXIS_LEFT - 2} y={y + 2} fontSize={axisFontSize} textAnchor="end" fill="#666">
                {formatTick(tick)}
              </text>
            </g>
          );
        })}
        {zeroY !== null && (
          <line
            x1={AXIS_LEFT}
            x2={viewBoxWidth - AXIS_RIGHT}
            y1={zeroY}
            y2={zeroY}
            stroke="#bbb"
            strokeWidth={0.5}
            strokeDasharray="2,2"
          />
        )}
        {seriesData.map((item) => (
          <g key={item.id}>
            {item.segments.map((segment, idx) => (
              <polyline
                key={`${item.id}-${idx}`}
                fill="none"
                stroke={item.color}
                strokeWidth={2}
                points={segment}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={item.strokeDasharray}
              />
            ))}
            {item.circles.map((pos) => (
              <circle key={`${item.id}-${pos.rawLabel}`} cx={pos.x} cy={pos.y} r={0.9} fill={item.color} />
            ))}
          </g>
        ))}

        {hover && (
          <g>
            <line
              x1={hover.x}
              x2={hover.x}
              y1={AXIS_TOP}
              y2={viewBoxHeight - AXIS_BOTTOM}
              stroke="#bbb"
              strokeWidth={0.5}
              strokeDasharray="1,2"
            />
            {hover.entries.map((entry) => (
              <circle key={entry.id} cx={hover.x} cy={entry.y} r={2.2} fill="#fff" stroke={entry.color} strokeWidth={0.7} />
            ))}
          </g>
        )}
        <line
          x1={AXIS_LEFT}
          x2={viewBoxWidth - AXIS_RIGHT}
          y1={viewBoxHeight - AXIS_BOTTOM}
          y2={viewBoxHeight - AXIS_BOTTOM}
          stroke="#ccc"
          strokeWidth={0.5}
        />
        {positions.map((pos, idx) => {
          const showLabel = positions.length <= 8 || idx % Math.ceil(positions.length / 6) === 0 || idx === positions.length - 1;
          if (!showLabel) return null;
          return (
            <text
              key={pos.rawLabel}
              x={pos.x}
              y={viewBoxHeight - 4}
              fontSize={axisFontSize}
              textAnchor="middle"
              fill="#666"
            >
              {pos.label}
            </text>
          );
        })}
      </svg>
      <TooltipBox tooltip={hover} formatter={formatter} viewBoxWidth={viewBoxWidth} viewBoxHeight={viewBoxHeight} />
    </Box>
  );
}
