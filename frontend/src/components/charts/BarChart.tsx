import { Box, Paper, Typography } from '@mui/material';
import React, { useCallback, useMemo, useState } from 'react';
import {
  AXIS_BOTTOM,
  AXIS_LEFT,
  AXIS_RIGHT,
  AXIS_TOP,
  CHART_HEIGHT_FULL,
  LineChartPoint,
  VIEWBOX_HEIGHT,
  buildTicks,
  formatTick,
  getMinMax,
} from './chartUtils';
import { useChartViewBox } from './useChartViewBox';

type TooltipData = { x: number; y: number; left: number; top: number; point: LineChartPoint };

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
        minWidth: 120,
        pointerEvents: 'none',
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {tooltip.point.rawLabel}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {tooltip.point.value === null ? '—' : formatter(tooltip.point.value)}
      </Typography>
    </Paper>
  );
}

export function BarChart({
  points,
  color,
  formatter,
  getBarColor,
  axisFontSize = 5.2,
  chartHeight = CHART_HEIGHT_FULL,
}: {
  points: LineChartPoint[];
  color: string;
  formatter: (v: number) => string;
  getBarColor?: (value: number | null) => string;
  axisFontSize?: number;
  chartHeight?: number;
}) {
  const { containerRef, viewBoxWidth } = useChartViewBox(chartHeight);
  const viewBoxHeight = VIEWBOX_HEIGHT;
  const [hover, setHover] = useState<TooltipData | null>(null);

  const values = useMemo(() => points.map((p) => p.value), [points]);
  const { min, max } = useMemo(() => getMinMax(values), [values]);
  const range = max - min || 1;
  const ticks = useMemo(() => buildTicks(min, max), [min, max]);
  const chartWidth = viewBoxWidth - AXIS_LEFT - AXIS_RIGHT;
  const innerHeight = viewBoxHeight - AXIS_BOTTOM - AXIS_TOP;
  const zeroY = min <= 0 && max >= 0 ? AXIS_TOP + ((max - 0) / range) * innerHeight : null;
  const baselineY = zeroY ?? (min > 0 ? AXIS_TOP + innerHeight : AXIS_TOP);
  const barWidth = chartWidth / (points.length * 1.3);

  const pointsPos = useMemo(
    () =>
      points.map((p, idx) => {
        const x = AXIS_LEFT + idx * (barWidth * 1.3) + barWidth * 0.15;
        const y =
          p.value === null
            ? baselineY
            : AXIS_TOP + innerHeight - ((p.value - min) / range) * innerHeight;
        return { x, y, point: p };
      }),
    [points, barWidth, baselineY, innerHeight, min, range]
  );

  const onMouseMove = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();
      const offsetX = containerRect ? rect.left - containerRect.left : 0;
      const offsetY = containerRect ? rect.top - containerRect.top : 0;
      const relativeX = ((event.clientX - rect.left) / rect.width) * viewBoxWidth;
      const closest = pointsPos.reduce((prev, curr) =>
        Math.abs(curr.x + barWidth / 2 - relativeX) < Math.abs(prev.x + barWidth / 2 - relativeX)
          ? curr
          : prev
      );
      const hoverX = closest.x + barWidth / 2;
      setHover({
        x: hoverX,
        y: closest.y,
        left: offsetX + (hoverX / viewBoxWidth) * rect.width,
        top: offsetY + (closest.y / viewBoxHeight) * rect.height,
        point: closest.point,
      });
    },
    [containerRef, pointsPos, barWidth, viewBoxWidth, viewBoxHeight]
  );

  if (points.length === 0) {
    return <Typography variant="body2">Нет данных</Typography>;
  }

  return (
    <Box ref={containerRef} sx={{ width: '100%', height: chartHeight, position: 'relative' }}>
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        onMouseMove={onMouseMove}
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
        {pointsPos.map(({ x, y, point }) => {
          if (point.value === null) return null;
          const height = Math.abs(y - baselineY);
          const barY = point.value >= 0 ? y : baselineY;
          const fill = getBarColor ? getBarColor(point.value) : color;
          return <rect key={point.rawLabel} x={x} y={barY} width={barWidth} height={height} fill={fill} rx={0.5} />;
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
            <rect
              x={hover.x - barWidth / 2}
              y={hover.point.value !== null && hover.point.value >= 0 ? hover.y : baselineY}
              width={barWidth}
              height={Math.abs(hover.y - baselineY)}
              fill="rgba(0,0,0,0.05)"
            />
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
        {points.map((p, idx) => {
          const x = AXIS_LEFT + idx * (barWidth * 1.3) + barWidth * 0.65;
          const showLabel =
            points.length <= 8 || idx % Math.ceil(points.length / 6) === 0 || idx === points.length - 1;
          if (!showLabel) return null;
          return (
            <text key={p.rawLabel} x={x} y={viewBoxHeight - 4} fontSize={axisFontSize} textAnchor="middle" fill="#666">
              {p.label}
            </text>
          );
        })}
      </svg>
      <TooltipBox tooltip={hover} formatter={formatter} />
    </Box>
  );
}
