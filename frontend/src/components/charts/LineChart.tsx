import { Box, Paper, Typography } from '@mui/material';
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

type TooltipData = { x: number; y: number; point: LineChartPoint };

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
      <Typography variant="body2" fontWeight={600} sx={{ display: 'block' }}>
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
  points: LineChartPoint[];
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
        <polyline
          fill="none"
          stroke={color}
          strokeWidth={2}
          points={positions.map((p) => `${p.x},${p.y}`).join(' ')}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {positions.map((pos) => (
          <circle key={pos.point.rawLabel} cx={pos.x} cy={pos.y} r={0.9} fill={color} />
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
            <circle cx={hover.x} cy={hover.y} r={2.2} fill="#fff" stroke={color} strokeWidth={0.7} />
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
        {positions.map((pos, idx) => {
          const showLabel = points.length <= 8 || idx % Math.ceil(points.length / 6) === 0 || idx === points.length - 1;
          if (!showLabel) return null;
          return (
            <text
              key={pos.point.rawLabel}
              x={pos.x}
              y={viewBoxHeight - 4}
              fontSize={axisFontSize}
              textAnchor="middle"
              fill="#666"
            >
              {pos.point.label}
            </text>
          );
        })}
      </svg>
      <TooltipBox tooltip={hover} formatter={formatter} viewBoxWidth={viewBoxWidth} viewBoxHeight={viewBoxHeight} />
    </Box>
  );
}
