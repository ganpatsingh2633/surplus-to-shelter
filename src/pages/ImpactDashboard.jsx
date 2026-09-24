import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { subscribeAllDonations, subscribeShelters, isFirebaseConfigured } from '../firebase/firestore';
import { calculateTotalImpact, calculateDonationImpact } from '../utils/impactCalculator';
import LeafletMap from '../components/LeafletMap';
import StatusBadge from '../components/StatusBadge';
import {
  Utensils,
  Scale,
  TreePine,
  Building2,
  Sparkles,
  TrendingUp,
  MapPin,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  Filter,
} from 'lucide-react';

/**
 * Animated counter that smoothly increments from 0 to target value
 */
function AnimatedCounter({ value, duration = 1400, prefix = '', suffix = '' }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const target = Number(value) || 0;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(easeOut * target));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(target);
      }
    };

    window.requestAnimationFrame(step);
  }, [value, duration]);

  return (
    <span>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
}

export default function ImpactDashboard() {
  const [donations, setDonations] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [maxRadiusKm, setMaxRadiusKm] = useState(100); // 100km radius filter

  // Bay Area regional center reference point for public map
  const regionalHub = { lat: 37.7749, lng: -122.4194 };

  useEffect(() => {
    // Demo fallback for local sandbox mode
    const isDemo = !isFirebaseConfigured;
    if (isDemo) {
      const allDons = localStorage.getItem('sts_all_donations');
      if (allDons) {
        try {
          setDonations(JSON.parse(allDons));
        } catch (e) {}
      }
      const savedShelter = localStorage.getItem('sts_demo_shelter_demo-shelter-002');
      if (savedShelter) {
        try {
          setShelters([JSON.parse(savedShelter)]);
        } catch (e) {}
      } else {
        setShelters([
          {
            id: 'demo-shelter-002',
            name: 'Mission Community Food Hub',
            capacity: 200,
            currentLoad: 135,
            lat: 37.7608,
            lng: -122.4191,
            preferences: ['Prepared Meals (Hot)', 'Fresh Produce', 'Dairy & Eggs'],
          },
          {
            id: 'demo-shelter-004',
            name: 'Oakland East Bay Rescue Pantry',
            capacity: 350,
            currentLoad: 210,
            lat: 37.8044,
            lng: -122.2712,
            preferences: ['Bakery & Bread', 'Fresh Produce'],
          },
        ]);
      }
      setLoading(false);
      return;
    }

    const unsubDonations = subscribeAllDonations((items) => {
      setDonations(items);
      setLoading(false);
    });

    const unsubShelters = subscribeShelters((items) => {
      setShelters(items);
    });

    return () => {
      if (typeof unsubDonations === 'function') unsubDonations();
      if (typeof unsubShelters === 'function') unsubShelters();
    };
  }, []);

  // Compute live aggregate stats
  const impact = calculateTotalImpact(donations);
  const deliveredDonations = donations.filter((d) => d.status === 'delivered');

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden"
      >
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold uppercase tracking-wider text-emerald-300 mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Public Environmental &amp; Social Ledger
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Surplus Diverted. <br className="hidden sm:inline" />
            Communities Nourished.
          </h1>
          <p className="mt-3 text-sm sm:text-base text-emerald-100/90 leading-relaxed">
            Real-time aggregate impact of perishable food surplus diverted from landfills to community food shelters. Every rescue is verified by receiving shelters.
          </p>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      </motion.div>

      {/* 4 Animated Counter Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Meals Rescued */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 group-hover:scale-105 transition-transform">
              <Utensils className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
              ~0.42 kg / meal
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            <AnimatedCounter value={impact.totalMealsRescued} />
          </div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
            Meals Nourished
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Nutritious meals delivered directly to shelter dining halls.
          </p>
        </motion.div>

        {/* Card 2: Food Diverted (kg) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
              <Scale className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Landfill Diverted
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            <AnimatedCounter value={impact.totalKgDiverted} suffix=" kg" />
          </div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
            Food Waste Diverted
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Edible surplus kept out of municipal solid waste streams.
          </p>
        </motion.div>

        {/* Card 3: CO2e Avoided */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
              <TreePine className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              2.5 kg CO₂e / kg
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            <AnimatedCounter value={impact.totalCo2eAvoidedKg} suffix=" kg" />
          </div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
            CO₂e Offset Avoided
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Greenhouse gas emissions prevented from organic decomposition.
          </p>
        </motion.div>

        {/* Card 4: Shelters Served */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
              <Building2 className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
              Active Network
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            <AnimatedCounter value={impact.sheltersServed} />
          </div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
            Shelter Hubs Partnered
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Verified intake centers actively receiving hot &amp; fresh food.
          </p>
        </motion.div>
      </div>

      {/* Live Map Section with Under-100km Filtering */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              Live Regional Rescue Map &bull; Under 100km Radius
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pins show active intake donations (colored by risk score) and receiving shelters within 100km of the regional hub.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
              <Filter className="w-3.5 h-3.5" />
              Radius: {maxRadiusKm} km Active
            </span>
          </div>
        </div>

        <LeafletMap
          driverLocation={regionalHub}
          donations={donations}
          shelters={shelters}
          height="450px"
          maxRadiusKm={maxRadiusKm}
        />
      </div>

      {/* Verified Delivery Records Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Verified Deliveries Ledger
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Confirmed delivered and safety-inspected surplus batches
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            {deliveredDonations.length} Verified Deliveries
          </span>
        </div>

        {deliveredDonations.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No verified deliveries yet</p>
            <p className="text-xs text-slate-400 mt-1">
              When a shelter confirms receipt of surplus food, impact records populate here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-3">Surplus Batch</th>
                  <th className="pb-3">Quantity</th>
                  <th className="pb-3">Diverted (kg)</th>
                  <th className="pb-3">Meals Provided</th>
                  <th className="pb-3">CO₂e Offset</th>
                  <th className="pb-3">Destination Shelter</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveredDonations.map((item) => {
                  const itemImpact = calculateDonationImpact(item);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 font-bold text-slate-900">{item.foodType}</td>
                      <td className="py-3.5 text-slate-600">{item.quantity}</td>
                      <td className="py-3.5 font-mono font-bold text-emerald-700">{itemImpact.kgDiverted} kg</td>
                      <td className="py-3.5 font-mono font-bold text-sky-700">~{itemImpact.peopleFed}</td>
                      <td className="py-3.5 font-mono font-bold text-amber-700">-{itemImpact.co2eAvoidedKg} kg</td>
                      <td className="py-3.5 text-slate-700">{item.matchedShelterName || 'Mission Food Hub'}</td>
                      <td className="py-3.5"><StatusBadge status={item.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
