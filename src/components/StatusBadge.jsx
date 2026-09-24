import React from 'react';
import { Clock, CheckCircle2, Navigation, PackageCheck } from 'lucide-react';

export default function StatusBadge({ status }) {
  const configs = {
    posted: {
      label: 'Posted & Waiting',
      icon: Clock,
      classes: 'bg-sky-50 text-sky-700 border-sky-200',
      dot: 'bg-sky-500',
    },
    matched: {
      label: 'Matched to Shelter',
      icon: CheckCircle2,
      classes: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      dot: 'bg-indigo-500',
    },
    picked_up: {
      label: 'In Transit',
      icon: Navigation,
      classes: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500 animate-pulse',
    },
    delivered: {
      label: 'Delivered',
      icon: PackageCheck,
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
    },
  };

  const config = configs[status] || {
    label: status || 'Unknown',
    icon: Clock,
    classes: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.classes}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </span>
  );
}
