'use client';

import { useResumeStore } from '@/stores/resume-store';
import Basics from './modules/Basics';
import Education from './modules/Education';
import Experience from './modules/Experience';

export default function ResumeDocument() {
  const { resume } = useResumeStore();
  if (!resume) return null;

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month] = dateString.split('-');
    return `${year}年${month}月`;
  };

  // A4 尺寸: 210mm x 297mm
  // 浏览器默认使用 96 DPI
  // 在 96 DPI 下: 210mm = 794px, 297mm = 1123px
  // 使用像素单位确保浏览器和 PDF 渲染一致
  return (
    <div id="resume-document" className="p-custom space-y-4">
      <Basics />
      <Education />
      <Experience />
    </div>
  );
}
