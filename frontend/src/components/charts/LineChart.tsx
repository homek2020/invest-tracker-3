import { Box, Paper, Stack, Typography } from '@mui/material';
import React, { useCallback, useState } from 'react';
import {
  AXIS_BOTTOM,
  AXIS_LEFT,
  AXIS_RIGHT,
  AXIS_TOP,
  CHART_HEIGHT_FULL,
  LineChartPoint,
  VIEWBOX_HEIGHT,
  VIEWBOX_WIDTH_FULL,
  buildTicks,
  formatTick,
  getMinMax,
} from './chartUtils';

type LineChartSeries = {
  points: LineChartPoint[];
  color: string;
  name?: string;
};

type TooltipData = {
  x: number;
  y: number;
  left: number;
  top: number;
  rawLabel: string;
  items: { name?: string; color: string; value: number | null }[];
};

function TooltipBox({
  tooltip,
  formatter,
}: {
  tooltip: TooltipData | null;
  formatter: (v: number) => string;
}) {
  if (!tooltip) return null;

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        left: tooltip.left,
        top: tooltip.top,
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
      <Stack spacing={0.5} mt={0.5}>
        {tooltip.items.map((item, idx) => (
          <Stack key={`${item.color}-${idx}`} direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: item.color }} />
            <Typography variant="body2" fontWeight={600} sx={{ display: 'block' }}>
              {item.value === null || Number.isNaN(item.value) ? '—' : formatter(item.value)}
            </Typography>
            {item.name && (
              <Typography variant="caption" color="text.secondary">
                {item.name}
              </Typography>
            )}
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}

function buildSegments(positions: { x: number; y: number | null }[]) {
  const segments: string[] = [];
  let current: string[] = [];

  positions.forEach((pos) => {
    if (pos.y === null) {
      if (current.length) {
        segments.push(current.join(' '));
        current = [];
      }
      return;
    }
    current.push(`${pos.x},${pos.y}`);
  });

  if (current.length) {
    segments.push(current.join(' '));
  }

  return segments;
}

export function LineChart({
  points,
  color,
  formatter,
  viewBoxWidth = VIEWBOX_WIDTH_FULL,
  viewBoxHeight = VIEWBOX_HEIGHT,
  chartHeight = CHART_HEIGHT_FULL,
  axisFontSize = 5.2,
  series,
}: {
  points: LineChartPoint[];
  color: string;
  formatter: (v: number) => string;
  viewBoxWidth?: number;
  viewBoxHeight?: number;
  chartHeight?: number;
  axisFontSize?: number;
  series?: LineChartSeries[];
}) {
  const lines: LineChartSeries[] = series?.length ? series : [{ points, color }];
  const timelinePoints = lines.reduce<LineChartPoint[]>(
    (longest, current) => (current.points.length > longest.length ? current.points : longest),
    points
  );

  if (timelinePoints.length === 0) {
    return <Typography variant="body2">Нет данных</Typography>;
  }

  const chartWidth = viewBoxWidth - AXIS_LEFT - AXIS_RIGHT;
  const innerHeight = viewBoxHeight - AXIS_BOTTOM - AXIS_TOP;
  const xPositions = timelinePoints.map((_, idx) =>
    AXIS_LEFT + (timelinePoints.length === 1 ? 0 : (idx / (timelinePoints.length - 1)) * chartWidth)
  );

  const values = lines
    .flatMap((line) => line.points.map((p) => p.value))
    .filter((v): v is number => v !== null && !Number.isNaN(v));

  if (values.length === 0) {
    return <Typography variant="body2">Нет данных</Typography>;
  }

  const { min, max } = getMinMax(values);
  const range = max - min || 1;
  const ticks = buildTicks(min, max);
  const zeroY = min <= 0 && max >= 0 ? AXIS_TOP + innerHeight - ((0 - min) / (range || 1)) * innerHeight : null;

  const seriesPositions = lines.map((line) =>
    timelinePoints.map((basePoint, idx) => {
      const point = line.points[idx] ?? basePoint;
      const value = point?.value ?? null;
      if (value === null || Number.isNaN(value)) {
        return { x: xPositions[idx], y: null, point: point ?? basePoint };
      }
      const y = AXIS_TOP + innerHeight - ((value - min) / range) * innerHeight;
      return { x: xPositions[idx], y, point: point ?? basePoint };
    })
  );

  const [hover, setHover] = useState<TooltipData | null>(null);

  const onMove = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const cursorX = event.clientX - rect.left;
      const relativeX = (cursorX / rect.width) * viewBoxWidth;
      const closestIdx = xPositions.reduce(
        (prevIdx, currX, idx) => (Math.abs(currX - relativeX) < Math.abs(xPositions[prevIdx] - relativeX) ? idx : prevIdx),
        0
      );

      const items = seriesPositions.map((positions, idx) => {
        const pos = positions[closestIdx];
        return { name: lines[idx].name, color: lines[idx].color, value: pos?.point.value ?? null, y: pos?.y ?? null };
      });
      const tooltipY = items.find((item) => item.value !== null && item.y !== null)?.y ?? viewBoxHeight - AXIS_BOTTOM;
      const rawLabel =
        timelinePoints[closestIdx]?.rawLabel ?? timelinePoints[closestIdx]?.label ?? `Точка ${closestIdx + 1}`;

      setHover({
        x: xPositions[closestIdx],
        y: tooltipY,
        left: cursorX,
        top: (tooltipY / viewBoxHeight) * rect.height,
        rawLabel,
        items,
      });
    },
    [lines, seriesPositions, timelinePoints, viewBoxHeight, viewBoxWidth, xPositions]
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

        {seriesPositions.map((positions, idx) => {
          const segments = buildSegments(positions);
          return (
            <g key={lines[idx].name ?? idx}>
              {segments.map((segment, segmentIdx) => (
                <polyline
                  key={`${lines[idx].name ?? idx}-${segmentIdx}`}
                  fill="none"
                  stroke={lines[idx].color}
                  strokeWidth={2}
                  points={segment}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}
              {positions.map((pos) =>
                pos.y === null ? null : (
                  <circle key={`${lines[idx].name ?? idx}-${pos.point.rawLabel}`} cx={pos.x} cy={pos.y} r={0.9} fill={lines[idx].color} />
                )
              )}
            </g>
          );
        })}

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
            <circle cx={hover.x} cy={hover.y} r={2.2} fill="#fff" stroke={lines[0].color} strokeWidth={0.7} />
          </g>
        )}
        {/* X axis */}
        <line
          x1={AXIS_LEFT}
          x2={viewBoxWidth - AXIS_RIGHT}
          y1={viewBoxHeight - AXIS_BOTTOM}
          y2={viewBoxHeight - AXIS_BOTTOM}
          stroke="#ccc"
          strokeWidth={0.5}
        />
        {timelinePoints.map((point, idx) => {
          const showLabel =
            timelinePoints.length <= 8 || idx % Math.ceil(timelinePoints.length / 6) === 0 || idx === timelinePoints.length - 1;
          if (!showLabel) return null;
          return (
            <text
              key={point.rawLabel}
              x={xPositions[idx]}
              y={viewBoxHeight - 4}
              fontSize={axisFontSize}
              textAnchor="middle"
              fill="#666"
            >
              {point.label}
            </text>
          );
        })}
      </svg>
      <TooltipBox tooltip={hover} formatter={formatter} />
    </Box>
  );
}
