import { Card } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export default function EmptyState() {
  return (
    <Card className="p-8 text-center border-dashed">
      <div className="space-y-3">
        <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-gray-400" />
        </div>
        <div className="space-y-1">
          <p className="font-medium text-sm text-gray-900">No analysis yet</p>
          <p className="text-xs text-gray-500">
            Paste a job description and click &quot;Analyze Match&quot; to see how well your resume
            matches
          </p>
        </div>
      </div>
    </Card>
  );
}
