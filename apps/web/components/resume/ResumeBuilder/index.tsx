'use client';
import { useResumeStore } from '@/stores/resume-store';
import ResumeDocument from '../ResumeDocument';
import Controls from '@/components/resume/ResumeBuilder/Controls';
import Page from '@/components/resume/Page';
import type { EditorSelectionProps } from '@/types/resume/editor';
import {
  TransformWrapper,
  TransformComponent,
} from 'react-zoom-pan-pinch';

export default function ResumeBuilder({ selection, onSelect }: EditorSelectionProps = {}) {
  const isReady = useResumeStore(state => state.isReady);

  if (!isReady) return null;

  return (
    <TransformWrapper
      centerOnInit
      maxScale={2.5}
      minScale={0.2}
      initialScale={0.6}
      limitToBounds={false}
      centerZoomedOut
      panning={{ excluded: ['resume-preview-block'] }}
      doubleClick={{ disabled: true }}
    >
      <TransformComponent
        wrapperClass="!w-full !h-full"
        contentClass={onSelect ? '' : 'pointer-events-none'}
      >
        <Page mode="builder">
          <ResumeDocument selection={selection} onSelect={onSelect} />
        </Page>
      </TransformComponent>
      <Controls />
    </TransformWrapper>
  );
}
