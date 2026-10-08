'use client';

import { useEffect, useEffectEvent } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useControls, useTransformComponent } from 'react-zoom-pan-pinch';
import { MM_TO_PX, PAGE_SIZE_MAP } from '@/constants';

export default function Controls() {
  const { zoomIn, zoomOut, setTransform, instance } = useControls();
  const percentage = useTransformComponent(({ state }) => Math.round(state.scale * 100));

  const fitPage = () => {
    const wrapper = instance.wrapperComponent;
    if (!wrapper || !wrapper.clientWidth || !wrapper.clientHeight) return;
    const width = PAGE_SIZE_MAP.a4.width * MM_TO_PX;
    const height = PAGE_SIZE_MAP.a4.height * MM_TO_PX;
    const scale = Math.max(0.2, Math.min(1, (wrapper.clientWidth - 40) / width, (wrapper.clientHeight - 100) / height));
    setTransform((wrapper.clientWidth - width * scale) / 2, 40, scale, 0);
  };

  // SDK helpers change identity on every zoom update. Only resize should refit.
  const fitAfterResize = useEffectEvent(() => fitPage());
  useEffect(() => {
    const wrapper = instance.wrapperComponent;
    if (!wrapper) return;
    const observer = new ResizeObserver(() => fitAfterResize());
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [instance]);

  return (
    <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-xl border bg-background/95 p-1.5 shadow-sm backdrop-blur-sm" role="group" aria-label="Preview zoom">
      <Button variant="ghost" size="icon-sm" aria-label="Zoom out" onClick={() => zoomOut(0.1)}><Minus /></Button>
      <Button variant="ghost" size="sm" aria-label="Fit page" onClick={fitPage}>Fit</Button>
      <Button variant="ghost" size="icon-sm" aria-label="Zoom in" onClick={() => zoomIn(0.1)}><Plus /></Button>
      <span className="min-w-12 border-l px-2 text-center text-xs tabular-nums text-muted-foreground">{percentage}%</span>
    </div>
  );
}
