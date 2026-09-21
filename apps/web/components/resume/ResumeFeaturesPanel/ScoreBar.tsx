interface ScoreBarProps {
  label: string;
  score: number;
  icon: string;
}

export default function ScoreBar({ label, score, icon }: ScoreBarProps) {
  const getBarColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-500';
    if (score >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const percentage = Math.round(score * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-gray-700">
          <span>{icon}</span>
          <span>{label}</span>
        </span>
        <span className="font-semibold text-gray-900">{percentage}%</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden relative">
        <div
          className={`absolute inset-y-0 left-0 ${getBarColor(score)} transition-all duration-500`}
          style={{ width: `${percentage}%` } as React.CSSProperties}
        />
      </div>
    </div>
  );
}
