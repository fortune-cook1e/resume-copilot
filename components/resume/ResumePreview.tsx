'use client';

import { useResumeStore } from '@/stores/resume-store';
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ResumeDocument from './ResumeDocument';

function ZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();

  return (
    <div className="absolute top-4 right-4 z-10 flex gap-2 bg-white/90 backdrop-blur rounded-lg p-1 shadow-md">
      <Button variant="ghost" size="icon" onClick={() => zoomIn()} title="放大">
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => zoomOut()} title="缩小">
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => resetTransform()} title="重置">
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function ResumePreview() {
  const { resume } = useResumeStore();

  if (!resume) return null;

  return (
    <div className="relative h-full bg-gray-100 overflow-hidden">
      <TransformWrapper
        initialScale={0.6}
        minScale={0.3}
        maxScale={2}
        centerOnInit
        wheel={{ step: 0.1 }}
      >
        <ZoomControls />
        <TransformComponent
          wrapperStyle={{ width: '100%', height: '100%' }}
          contentStyle={{ padding: '32px' }}
        >
          <div className="shadow-2xl">
            <ResumeDocument resume={resume} />
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
