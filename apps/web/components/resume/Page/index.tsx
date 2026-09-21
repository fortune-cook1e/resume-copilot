import { MM_TO_PX, PAGE_SIZE_MAP } from '@/constants';
import { cn } from '@/lib/utils';
import { FC, ReactNode } from 'react';
interface Props {
  mode?: 'builder' | 'preview';
  children: ReactNode;
}

// A4 size: 210mm x 297mm, 1mm = 3.78px
// 结合 CSS 的 page-break-after 属性，可以在打印时控制分页
// 在 builder 模式下显示分页线，帮助用户预览分页效果
// global.css
const Page: FC<Props> = ({ mode = 'preview', children }) => {
  const pageWidthPx = PAGE_SIZE_MAP.a4.width * MM_TO_PX;
  const pageHeightPx = PAGE_SIZE_MAP.a4.height * MM_TO_PX;
  return (
    <div
      id="page"
      className={cn(
        'text-text relative bg-background bg-white',
        mode === 'builder' && 'shadow-2xl',
      )}
      style={{
        width: `${pageWidthPx}px`,
        minHeight: `${pageHeightPx}px`,
      }}
    >
      {children}

      {mode === 'builder' && (
        <div
          aria-hidden="true"
          className="page-break-guide absolute inset-x-0 border-b border-dashed pointer-events-none"
          style={{
            top: `${pageHeightPx}px`,
          }}
        />
      )}
    </div>
  );
};

export default Page;
