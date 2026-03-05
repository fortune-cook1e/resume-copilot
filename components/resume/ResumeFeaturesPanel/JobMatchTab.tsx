'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, Loader2 } from 'lucide-react';
import { analyzeResume } from '@/services/ai';
import type { AnalyzeResult } from '@/services/ai';
import { useResumeStore } from '@/stores/resume-store';
import MatchResults from './MatchResults';
import EmptyState from './EmptyState';

export default function JobMatchTab() {
  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchResult, setMatchResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { resumeId } = useResumeStore();

  const handleAnalyze = async () => {
    if (!jobDescription.trim() || !resumeId) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeResume(jobDescription, resumeId);
      setMatchResult(result);
    } catch (err) {
      console.error('Analysis failed:', err);
      setError('Failed to analyze. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Job Description Input Section */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-gray-900">Job Description</h3>
            <Badge variant="secondary" className="text-xs">
              LinkedIn
            </Badge>
          </div>
          <Textarea
            placeholder="Paste the job description from LinkedIn here...&#10;&#10;Example:&#10;We are looking for a Senior Software Engineer with 5+ years of experience in Python, React, and cloud technologies..."
            value={jobDescription}
            onChange={e => setJobDescription(e.target.value)}
            className="max-h-[180px] text-sm"
          />
          <Button
            onClick={handleAnalyze}
            disabled={!jobDescription.trim() || isAnalyzing || !resumeId}
            className="w-full"
            size="sm"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 mr-2" />
                Analyze Match
              </>
            )}
          </Button>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </Card>

        {/* Match Results Section */}
        {matchResult && <MatchResults result={matchResult} />}

        {/* Empty State */}
        {!matchResult && !isAnalyzing && <EmptyState />}
      </div>
    </ScrollArea>
  );
}
