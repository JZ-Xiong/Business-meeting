/**
 * Network quality badge — top right corner, shows signal bars.
 */
export default function NetworkBadge({ quality }) {
  if (quality === 'unknown') return null;

  const levels = {
    excellent: { bars: 4, color: 'bg-success', label: 'Excellent' },
    good: { bars: 3, color: 'bg-success', label: 'Good' },
    poor: { bars: 2, color: 'bg-warning', label: 'Poor' },
    bad: { bars: 1, color: 'bg-danger', label: 'Bad' },
  };

  const info = levels[quality] || levels.good;

  return (
    <div className="absolute top-4 right-4 z-50 glass rounded-xl px-3 py-2 flex items-center gap-2 animate-fade-in">
      {/* Signal bars */}
      <div className="flex items-end gap-0.5 h-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`quality-dot ${i <= info.bars ? info.color : 'bg-white/15'}`}
            style={{ height: `${25 + i * 18}%` }}
          />
        ))}
      </div>
      <span className="text-xs font-medium text-white/70">{info.label}</span>
    </div>
  );
}
