import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, DONATIONS_COLLECTION, isFirebaseConfigured } from '../firebase/firestore';
import {
  FileText,
  Building2,
  Truck,
  CheckCircle2,
  Clock,
  Check,
} from 'lucide-react';

export const PIPELINE_STEPS = [
  {
    key: 'posted',
    label: 'Posted',
    title: 'Surplus Posted',
    desc: 'Intake logged in Firestore',
    icon: FileText,
  },
  {
    key: 'matched',
    label: 'Matched',
    title: 'Shelter Matched',
    desc: 'Intake headroom verified',
    icon: Building2,
  },
  {
    key: 'picked_up',
    label: 'Picked Up',
    title: 'In Transit',
    desc: 'Courier collected surplus',
    icon: Truck,
  },
  {
    key: 'delivered',
    label: 'Delivered',
    title: 'Delivered & Usable',
    desc: 'Shelter confirmed receipt',
    icon: CheckCircle2,
  },
];

const STATUS_ORDER = {
  posted: 0,
  matched: 1,
  picked_up: 2,
  delivered: 3,
};

/**
 * Real-time status pipeline stepper shared across Donor, Shelter, and Driver dashboards.
 * Listens to Firestore onSnapshot on the donation document so updates propagate live.
 */
export default function StatusStepper({
  donationId,
  initialDonation = null,
  size = 'md', // "sm" | "md" | "lg"
  showLabels = true,
  className = '',
}) {
  const [donation, setDonation] = useState(initialDonation);

  // Subscribe to real-time updates for this donation
  useEffect(() => {
    if (initialDonation) {
      setDonation(initialDonation);
    }

    const targetId = donationId || initialDonation?.id;
    if (!targetId) return;

    // Check if live Firebase is active
    if (!isFirebaseConfigured || targetId.startsWith('don-') || targetId.startsWith('mock-')) {
      // LocalStorage watcher for demo environment
      const interval = setInterval(() => {
        const allDons = localStorage.getItem('sts_all_donations');
        if (allDons) {
          try {
            const parsed = JSON.parse(allDons);
            const found = parsed.find((d) => d.id === targetId);
            if (found && found.status !== donation?.status) {
              setDonation(found);
            }
          } catch (e) {}
        }
      }, 1000);
      return () => clearInterval(interval);
    }

    const docRef = doc(db, DONATIONS_COLLECTION, targetId);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setDonation({ id: docSnap.id, ...docSnap.data() });
        }
      },
      (err) => {
        console.warn(`Realtime stepper listener fallback for ${targetId}:`, err);
      }
    );

    return () => unsubscribe();
  }, [donationId, initialDonation?.id]);

  const currentStatus = donation?.status || 'posted';
  const currentStepIndex = STATUS_ORDER[currentStatus] ?? 0;

  return (
    <div className={`w-full ${className}`}>
      <div className="relative flex items-center justify-between">
        {/* Connecting Progress Track */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 w-full bg-slate-200 -z-0 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 transition-all duration-500 ease-out"
            style={{
              width: `${(currentStepIndex / (PIPELINE_STEPS.length - 1)) * 100}%`,
            }}
          />
        </div>

        {/* Step Nodes */}
        {PIPELINE_STEPS.map((step, idx) => {
          const isCompleted = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          const isUpcoming = idx > currentStepIndex;
          const Icon = step.icon;

          let nodeClasses = 'border-slate-300 bg-white text-slate-400';
          let ringClasses = '';

          if (isCompleted) {
            nodeClasses = 'border-emerald-500 bg-emerald-600 text-white shadow-xs';
          } else if (isCurrent) {
            nodeClasses =
              step.key === 'delivered'
                ? 'border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
                : 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-500/30';
            ringClasses = 'ring-4 ring-indigo-100 animate-pulse';
          }

          const nodeSize =
            size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs';

          return (
            <div
              key={step.key}
              className="relative z-10 flex flex-col items-center group cursor-default"
            >
              {/* Circle Marker */}
              <div
                className={`rounded-full border-2 flex items-center justify-center transition-all duration-300 ${nodeSize} ${nodeClasses} ${ringClasses}`}
                title={`${step.title} (${isCurrent ? 'Current' : isCompleted ? 'Completed' : 'Upcoming'})`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : (
                  <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                )}
              </div>

              {/* Step Labels */}
              {showLabels && (
                <div className="mt-2 text-center select-none">
                  <div
                    className={`font-bold transition-colors ${
                      size === 'sm' ? 'text-[10px]' : 'text-xs'
                    } ${
                      isCurrent
                        ? 'text-indigo-950 font-black'
                        : isCompleted
                        ? 'text-emerald-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </div>
                  {size !== 'sm' && (
                    <div className="text-[10px] text-slate-500 hidden sm:block mt-0.5">
                      {isCurrent ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-indigo-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
                          Live Now
                        </span>
                      ) : (
                        step.desc
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
