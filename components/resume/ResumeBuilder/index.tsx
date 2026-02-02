'use client';
import { useRef } from 'react';

import { useResumeStore } from '@/stores/resume-store';
import ResumeDocument from '../ResumeDocument';
import Controls from '@/components/resume/ResumeDocument/Controls';
import Page from '@/components/resume/Page';
import {
  TransformWrapper,
  TransformComponent,
  ReactZoomPanPinchContentRef,
} from 'react-zoom-pan-pinch';
import { MM_TO_PX, PAGE_SIZE_MAP } from '@/constants';

export default function ResumeBuilder() {
  const { resume } = useResumeStore();
  const transformRef = useRef<ReactZoomPanPinchContentRef>(null);

  if (!resume) return null;

  return (
    <TransformWrapper
      centerOnInit
      maxScale={2}
      minScale={0.4}
      initialScale={0.8}
      ref={transformRef}
      limitToBounds={false}
    >
      <TransformComponent
        wrapperClass="!w-screen !h-screen"
        contentClass="grid items-start justify-center space-x-12 pointer-events-none"
        contentStyle={{ width: `${PAGE_SIZE_MAP.a4.width * MM_TO_PX + 42}px` }}
      >
        <Page mode="builder">
          <ResumeDocument />
        </Page>
      </TransformComponent>
      <Controls />
    </TransformWrapper>
  );
}
