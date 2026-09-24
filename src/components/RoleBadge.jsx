import React from 'react';
import { HeartHandshake, Home, Truck } from 'lucide-react';

export default function RoleBadge({ role, size = 'md' }) {
  const configs = {
    donor: {
      label: 'Food Donor',
      icon: HeartHandshake,
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      iconClass: 'text-emerald-600',
    },
    shelter: {
      label: 'Shelter Hub',
      icon: Home,
      badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      iconClass: 'text-indigo-600',
    },
    driver: {
      label: 'Rescue Driver',
      icon: Truck,
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
      iconClass: 'text-amber-600',
    },
  };

  const config = configs[role] || {
    label: role || 'Member',
    icon: HeartHandshake,
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    iconClass: 'text-slate-600',
  };

  const Icon = config.icon;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : 'px-2.5 py-1 text-xs font-semibold gap-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-full border ${config.badgeClass} ${sizeClasses} shadow-sm`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{config.label}</span>
    </span>
  );
}
