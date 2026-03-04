import { ZoomIn, ZoomOut, RotateCcw, Download, Home, Eye, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useControls } from 'react-zoom-pan-pinch';
import { useState } from 'react';
import { useResumeStore } from '@/stores/resume-store';
import { exportResumePDF } from '@/services/resume';

import { useRouter } from 'next/navigation';

export default function Controls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  const { resume } = useResumeStore();
  const [isExporting, setIsExporting] = useState(false);
  const router = useRouter();

  const handlePrintPreview = () => {
    if (!resume) return;
    const { resumeId } = useResumeStore.getState();
    if (resumeId) {
      window.open(`/resume/print?id=${resumeId}`, '_blank');
    }
  };

  const handleExportPDF = async () => {
    if (isExporting || !resume) return;

    const { resumeId } = useResumeStore.getState();
    if (!resumeId) return;

    setIsExporting(true);

    try {
      const blob = await exportResumePDF(resume.basics.name || 'Resume', resumeId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${resume.basics.name || 'Resume'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('Failed to export PDF, please try again later');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-2 bg-white/95 backdrop-blur-sm rounded-lg p-2 shadow-lg border border-gray-200">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push('/dashboard/resumes')}
        title="Back to Resumes"
        className="cursor-pointer"
      >
        <Home className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => zoomIn()}
        title="Zoom In"
        className="cursor-pointer"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => zoomOut()}
        title="Zoom Out"
        className="cursor-pointer"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => resetTransform()}
        title="Reset"
        className="cursor-pointer"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePrintPreview}
        title="Preview"
        className="cursor-pointer"
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleExportPDF}
        disabled={isExporting}
        title="Export PDF"
        className="cursor-pointer"
      >
        {isExporting ? (
          <div className="h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        ) : (
          <Printer className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
