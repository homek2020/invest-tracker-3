import { useEffect, useRef, useState } from 'react';
import { VIEWBOX_HEIGHT } from './chartUtils';

// Measures the container width and computes a dynamicViewBoxWidth such that
// SVG's X and Y scales are equal, preventing text distortion.
// The formula: viewBoxWidth = containerWidth * VIEWBOX_HEIGHT / chartHeight
// ensures that 1 viewBox unit = chartHeight/VIEWBOX_HEIGHT CSS pixels in both axes.
export function useChartViewBox(chartHeight: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewBoxWidth, setViewBoxWidth] = useState<number>(
    Math.round(960 * VIEWBOX_HEIGHT / chartHeight)
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = (w: number) => {
      if (w > 0) setViewBoxWidth(Math.round(w * VIEWBOX_HEIGHT / chartHeight));
    };
    const ro = new ResizeObserver((entries) => update(entries[0].contentRect.width));
    ro.observe(el);
    update(el.clientWidth);
    return () => ro.disconnect();
  }, [chartHeight]);

  return { containerRef, viewBoxWidth };
}
