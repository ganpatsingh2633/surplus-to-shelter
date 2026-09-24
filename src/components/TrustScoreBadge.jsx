import React from 'react';
import { Star, Award, ShieldCheck } from 'lucide-react';

/**
 * Renders trust score as a percentage and star rating.
 * Handles both decimal (0.0 - 1.0) and percent (0 - 100) input formats.
 */
export default function TrustScoreBadge({ score = 1.0, count = 0, size = 'md' }) {
  // Normalize score to 0 - 100
  let percent = Number(score);
  if (percent <= 1.0 && percent > 0) {
    percent = Math.round(percent * 100);
  } else {
    percent = Math.min(100, Math.max(0, Math.round(percent || 100)));
  }

  // Convert to 5-star scale
  const starsOutOf5 = (percent / 20).toFixed(1);

  const getTierColor = (pct) => {
    if (pct >= 90) return 'bg-emerald-50 text-emerald-800 border-emerald-300';
    if (pct >= 75) return 'bg-sky-50 text-sky-800 border-sky-300';
    if (pct >= 60) return 'bg-amber-50 text-amber-800 border-amber-300';
    return 'bg-rose-50 text-rose-800 border-rose-300';
  };

  const badgeColor = getTierColor(percent);

  if (size === 'sm') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${badgeColor}`}
        title={`Trust Rating: ${percent}% (${count} verified deliveries)`}
      >
        <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
        <span>{percent}%</span>
        {count > 0 && <span className="text-slate-400 font-normal">({count})</span>}
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${badgeColor} shadow-xs`}
    >
      <div className="flex items-center text-amber-500">
        <Star className="w-4 h-4 fill-amber-400" />
      </div>
      <div className="flex flex-col leading-none">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black tracking-tight">{percent}% Trust Score</span>
          <span className="text-[11px] text-slate-500 font-medium font-mono">({starsOutOf5}★)</span>
        </div>
        <span className="text-[10px] text-slate-500 mt-0.5">
          {count > 0 ? `${count} deliveries confirmed usable` : 'New partner (5★ default)'}
        </span>
      </div>
    </div>
  );
}
