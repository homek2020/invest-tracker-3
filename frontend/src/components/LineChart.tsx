import React, { useCallback, useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';

export const VIEWBOX_HEIGHT = 120;
export const VIEWBOX_WIDTH_FULL = 420;
export const VIEWBOX_WIDTH_HALF = 320;
export const CHART_HEIGHT_FULL = 320;
export const CHART_HEIGHT_HALF = 240;
export const AXIS_LEFT = 28;
export const AXIS_RIGHT = 8;
export const AXIS_BOTTOM = 16;
export const AXIS_TOP = 8;

export type LinePoint = { label: string; value: number; rawLabel: string };

function getMinMax(values: number[]) {
  if (values.length === 0) return { min: 0, max: 0 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    const padding = Math.max(Math.abs(min) * 0.1, 1);
    return { min: min - padding, max: max + padding };
  }
  return { min, max };
}

function buildTicks(min: number, max: number, steps = 5): number[] {
  if (steps < 2) return [min, max];
  const range = max - min;
  if (range === 0) return [min, max];
  const step = range / (steps - 1);
  const ticks: number[] = [];
  for (let i = 0; i < steps; i++) {
    ticks.push(min + i * step);
  }
  return ticks;
}

function formatTick(value: number) {
  const rounded = Math.round(value);
  const compact = new Intl.NumberFormat('ru-RU', {
    notation: 'compact',
    maximumFractionDigits: 0,
  }).format(rounded);

  return compact
    .replace('\u00a0тыс.', 'k')
    .replace(' тыс.', 'k')
    .replace('\u00a0млн', 'm')
    .replace(' млн', 'm');
}

type TooltipData = { x: number; y: number; point: LinePoint };

function TooltipBox({
  tooltip,
  formatter,
  viewBoxWidth,
  viewBoxHeight,
}: {
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
        minWidth: 120,
        pointerEvents: 'none',
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {tooltip.point.rawLabel}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {formatter(tooltip.point.value)}
      </Typography>
    </Paper>
  );
}

export function LineChart({
  points,
  color,
  formatter,
  viewBoxWidth = VIEWBOX_WIDTH_FULL,
  viewBoxHeight = VIEWBOX_HEIGHT,
  chartHeight = CHART_HEIGHT_FULL,
  axisFontSize = 5.2,
}: {
  points: LinePoint[];
  color: string;
  formatter: (v: number) => string;
  viewBoxWidth?: number;
  viewBoxHeight?: number;
  chartHeight?: number;
  axisFontSize?: number;
}) {
  if (points.length === 0) {
    return <Typography variant="body2">Нет данных</Typography>;
  }

  const values = points.map((p) => p.value);
  const { min, max } = getMinMax(values);
  const range = max - min || 1;
  const ticks = buildTicks(min, max);
  const chartWidth = viewBoxWidth - AXIS_LEFT - AXIS_RIGHT;
  const innerHeight = viewBoxHeight - AXIS_BOTTOM - AXIS_TOP;
  const zeroY = min <= 0 && max >= 0 ? AXIS_TOP + innerHeight - ((0 - min) / (range || 1)) * innerHeight : null;
  const positions = points.map((p, idx) => {
    const x = AXIS_LEFT + (points.length === 1 ? 0 : (idx / (points.length - 1)) * chartWidth);
    const y = AXIS_TOP + innerHeight - ((p.value - min) / range) * innerHeight;
    return { x, y, point: p };
  });

  const [hover, setHover] = useState<TooltipData | null>(null);

  const onMove = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const relativeX = ((event.clientX - rect.left) / rect.width) * viewBoxWidth;
      const closest = positions.reduce((prev, curr) =>
        Math.abs(curr.x - relativeX) < Math.abs(prev.x - relativeX) ? curr : prev
      );
      setHover({ x: closest.x, y: closest.y, point: closest.point });
    },
    [positions, viewBoxWidth]
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
          <line x1={AXIS_LEFT} x2={viewBoxWidth - AXIS_RIGHT} y1={zeroY} y2={zeroY} stroke="#000" strokeWidth={0.2} />
        )}
        {positions.map((pos, idx) => {
          if (idx === 0) return null;
          const prev = positions[idx - 1];
          return (
            <line key={`${pos.x}-${pos.y}`} x1={prev.x} x2={pos.x} y1={prev.y} y2={pos.y} stroke={color} strokeWidth={0.8} />
          );
        })}
        {positions.map((pos, idx) => (
          <g key={idx}>
            <circle cx={pos.x} cy={pos.y} r={1.3} fill={color} />
            <text
              x={pos.x}
              y={viewBoxHeight - 4}
              textAnchor="middle"
              fontSize={axisFontSize}
              fill="#555"
            >
              {points[idx].label}
            </text>
          </g>
        ))}
      </svg>
      <TooltipBox tooltip={hover} formatter={formatter} viewBoxWidth={viewBoxWidth} viewBoxHeight={viewBoxHeight} />
    </Box>
  );
}
