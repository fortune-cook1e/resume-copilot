import { ZoomIn, ZoomOut, RotateCcw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useControls } from 'react-zoom-pan-pinch';
import { useState } from 'react';
import { useResumeStore } from '@/stores/resume-store';

export default function Controls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  const { resume } = useResumeStore();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    if (isExporting || !resume) return;

    setIsExporting(true);

    try {
      const response = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: resume.personalInfo.name || 'Resume',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export PDF');
      }

      // Download PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${resume.personalInfo.name || 'Resume'}.pdf`;
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
      <Button variant="ghost" size="icon" onClick={() => zoomIn()} title="Zoom In">
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => zoomOut()} title="Zoom Out">
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => resetTransform()} title="Reset">
        <RotateCcw className="h-4 w-4" />
      </Button>
      <div className="w-px bg-gray-200" />
      <Button
        variant="ghost"
        size="icon"
        onClick={handleExportPDF}
        disabled={isExporting}
        title="Export PDF"
      >
        {isExporting ? (
          <div className="h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
