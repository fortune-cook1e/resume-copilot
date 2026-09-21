'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import type { AnalyzeResult } from '@/services/ai';
import { renderMarkdown } from '@/lib/markdown';
import ScoreBar from './ScoreBar';

interface MatchResultsProps {
  result: AnalyzeResult;
}

export default function MatchResults({ result }: MatchResultsProps) {
  const { match, suggestions } = result;

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-50 border-green-200';
    if (score >= 0.6) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getScoreMessage = (score: number) => {
    if (score >= 0.8) return 'Excellent match!';
    if (score >= 0.6) return 'Good match with room for improvement';
    return 'Consider adding more relevant skills';
  };

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <Card className={`p-4 border-2 ${getScoreBgColor(match.final_score)}`}>
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600 font-medium">Overall Match Score</p>
          <div className={`text-4xl font-bold ${getScoreColor(match.final_score)}`}>
            {Math.round(match.final_score * 100)}%
          </div>
          <p className="text-xs text-gray-500">{getScoreMessage(match.final_score)}</p>
        </div>
      </Card>

      {/* Detailed Scores */}
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-sm text-gray-900">Detailed Scores</h3>
        <div className="space-y-2">
          <ScoreBar label="Skills Match" score={match.skill_score} icon="🎯" />
          <ScoreBar label="Experience" score={match.experience_score} icon="📊" />
          <ScoreBar label="Semantic Match" score={match.semantic_score} icon="🧠" />
        </div>
      </Card>

      {/* Matched Skills */}
      {match.matched_skills.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-gray-900">Matched Skills</h3>
            <Badge variant="secondary" className="text-xs">
              {match.matched_skills.length}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {match.matched_skills.map(skill => (
              <Badge
                key={skill}
                variant="default"
                className="bg-green-100 text-green-700 hover:bg-green-200"
              >
                ✓ {skill}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Missing Skills */}
      {match.missing_skills.length > 0 && (
        <Card className="p-4  border-orange-200 bg-orange-50">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-gray-900">Missing Skills</h3>
            <Badge variant="secondary" className="text-xs bg-orange-200">
              {match.missing_skills.length}
            </Badge>
          </div>
          <p className="text-xs text-gray-600">
            Consider adding these skills to improve your match
          </p>
          <div className="flex flex-wrap gap-2">
            {match.missing_skills.map(skill => (
              <Badge
                key={skill}
                variant="outline"
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                + {skill}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* AI Suggestions */}
      {suggestions && (
        <Card className="p-4  border-blue-200 bg-blue-50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-sm text-gray-900">AI Suggestions</h3>
          </div>
          <div
            className="text-xs text-gray-700 leading-relaxed space-y-2
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1
              [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1
              [&_li]:leading-relaxed
              [&_p]:leading-relaxed
              [&_h1]:text-sm [&_h1]:font-semibold [&_h1]:mt-2
              [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-2
              [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mt-1
              [&_strong]:font-semibold [&_code]:bg-blue-100 [&_code]:px-1 [&_code]:rounded"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(suggestions) }}
          />
        </Card>
      )}
    </div>
  );
}
