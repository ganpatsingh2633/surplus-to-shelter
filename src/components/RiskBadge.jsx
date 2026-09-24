import React from 'react';
import { ShieldAlert, AlertTriangle, ShieldCheck } from 'lucide-react';

/**
 * Maps riskScore (0-100) to thresholds:
 * - Green: < 33 (Low decay rate / safe window)
 * - Amber: 33-66 (Moderate decay / accelerating urgency)
 * - Red: > 66 (Critical decay / immediate dispatch needed)
 */
export function getRiskTier(score = 50) {
  const numericScore = Number(score);
  if (numericScore < 33) {
    return {
      tier: 'low',
      label: 'Low Risk',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-300',
      dot: 'bg-emerald-500',
      barColor: 'bg-emerald-500',
      icon: ShieldCheck,
      description: 'Slow decay rate; comfortable safe window (< 33)',
    };
  }
  if (numericScore <= 66) {
    return {
      tier: 'medium',
      label: 'Medium Risk',
      color: 'bg-amber-50 text-amber-800 border-amber-300',
      dot: 'bg-amber-500',
      barColor: 'bg-amber-500',
      icon: AlertTriangle,
      description: 'Moderate decay; dispatch recommended soon (33-66)',
    };
  }
  return {
    tier: 'high',
    label: 'Critical Risk',
    color: 'bg-rose-50 text-rose-800 border-rose-300',
    dot: 'bg-rose-500 animate-pulse',
    barColor: 'bg-rose-500',
    icon: ShieldAlert,
    description: 'High decay rate; immediate pickup required (> 66)',
  };
}

export default function RiskBadge({ score = 50, showScore = true, size = 'md' }) {
  const numericScore = Math.min(100, Math.max(0, Math.round(Number(score) || 0)));
  const { label, color, dot, icon: Icon } = getRiskTier(numericScore);

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px] gap-1'
      : size === 'lg'
      ? 'px-3.5 py-1.5 text-sm gap-2 font-bold'
      : 'px-2.5 py-1 text-xs gap-1.5 font-semibold';

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-xs ${color} ${sizeClasses}`}
      title={`Risk Score: ${numericScore}/100 (${label})`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>
        {showScore && <strong className="font-mono mr-1">{numericScore}</strong>}
        {label}
      </span>
    </span>
  );
}
