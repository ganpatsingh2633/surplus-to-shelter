import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  createDonation,
  subscribeDonorDonations,
  isFirebaseConfigured,
} from '../firebase/firestore';
import { FOOD_TYPES, calculateRiskScore } from '../utils/riskCalculator';
import StatusBadge from '../components/StatusBadge';
import StatusStepper from '../components/StatusStepper';
import RiskBadge, { getRiskTier } from '../components/RiskBadge';
import TrustScoreBadge from '../components/TrustScoreBadge';
import ShareableImpactCardModal from '../components/ShareableImpactCardModal';
import toast from 'react-hot-toast';
import {
  HeartHandshake,
  MapPin,
  Clock,
  Package,
  AlertCircle,
  CheckCircle,
  Loader2,
  Navigation2,
  Calendar,
  Sparkles,
  Info,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Share2,
} from 'lucide-react';

export default function DonorDashboard() {
  const { currentUser, userProfile } = useAuth();

  // Form State
  const [foodType, setFoodType] = useState(FOOD_TYPES[0]);
  const [quantity, setQuantity] = useState('');

  // Default expiry window: 6 hours from now formatted for datetime-local
  const getDefaultExpiry = () => {
    const d = new Date(Date.now() + 6 * 60 * 60 * 1000);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const [expiryWindow, setExpiryWindow] = useState(getDefaultExpiry());
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoMessage, setGeoMessage] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [shareModalDonation, setShareModalDonation] = useState(null);

  // Donation history state
  const [myDonations, setMyDonations] = useState([]);
  const [loadingDonations, setLoadingDonations] = useState(true);

  // Donor Trust Score state
  const [donorTrust, setDonorTrust] = useState({ score: 0.96, count: 24 });

  // Compute live risk score preview using weighted decay formula
  const liveRiskScore = calculateRiskScore(foodType, expiryWindow);
  const riskTier = getRiskTier(liveRiskScore);

  // Browser Geolocation API Handler
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGeoMessage('Geolocation is not supported by your browser. Please enter manually.');
      return;
    }

    setGeoLoading(true);
    setGeoMessage('Acquiring high-accuracy GPS coordinates...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude.toFixed(6);
        const longitude = position.coords.longitude.toFixed(6);
        setLat(latitude);
        setLng(longitude);
        setGeoLoading(false);
        setGeoMessage(`GPS acquired (±${Math.round(position.coords.accuracy)}m)`);
      },
      (error) => {
        setGeoLoading(false);
        let msg = 'Unable to retrieve location. Please type manually.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission denied. Please enter coordinates manually.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location information is unavailable.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out. Please enter manually.';
        }
        setGeoMessage(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Real-time listener for donations
  useEffect(() => {
    if (!currentUser?.uid) return;

    // Check local donor trust score
    const trustKey = `sts_donor_trust_${currentUser.uid}`;
    const savedTrust = localStorage.getItem(trustKey);
    if (savedTrust) {
      try {
        const parsed = JSON.parse(savedTrust);
        setDonorTrust({ score: parsed.score, count: parsed.count });
      } catch (e) {}
    } else if (userProfile?.trustScore !== undefined) {
      setDonorTrust({ score: userProfile.trustScore, count: userProfile.trustRatingCount || 24 });
    }

    const isDemoSession = currentUser.uid.startsWith('demo-') || !isFirebaseConfigured;

    if (isDemoSession) {
      const localKey = `sts_demo_donations_${currentUser.uid}`;
      const saved = localStorage.getItem(localKey) || localStorage.getItem('sts_all_donations');
      if (saved) {
        try {
          setMyDonations(JSON.parse(saved));
        } catch (e) {
          setMyDonations([]);
        }
      }
      setLoadingDonations(false);
      return;
    }

    const unsubscribe = subscribeDonorDonations(
      currentUser.uid,
      (donations) => {
        setMyDonations(donations);
        setLoadingDonations(false);
      },
      (err) => {
        console.error('Error fetching donations:', err);
        setLoadingDonations(false);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [currentUser, userProfile]);

  // Form Submit Handler
  const handleSubmitDonation = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    if (!lat || !lng) {
      setErrorMessage('Please provide latitude and longitude (use geolocation or enter manually).');
      return;
    }

    setSubmitting(true);
    try {
      const donationPayload = {
        donorId: currentUser.uid,
        foodType,
        quantity: quantity.trim(),
        expiryWindow: new Date(expiryWindow),
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        riskScore: liveRiskScore,
      };

      const isDemoSession = currentUser.uid.startsWith('demo-') || !isFirebaseConfigured;

      if (isDemoSession) {
        // In local demo mode, simulate the Cloud Function matching engine:
        // Try to match with nearest demo shelter (Mission Community Food Hub)
        const mockDonation = {
          id: 'don-' + Math.random().toString(36).substring(2, 9),
          ...donationPayload,
          status: 'matched', // Cloud Function auto-matches
          matchedShelterId: 'demo-shelter-002',
          matchedShelterName: 'Mission Community Food Hub',
          distanceKm: 2.4,
          unmatched: false,
          createdAt: { toMillis: () => Date.now() },
          expiryWindow: { toMillis: () => new Date(expiryWindow).getTime() },
        };
        const updated = [mockDonation, ...myDonations];
        setMyDonations(updated);
        localStorage.setItem(`sts_demo_donations_${currentUser.uid}`, JSON.stringify(updated));
        localStorage.setItem('sts_all_donations', JSON.stringify(updated));
      } else {
        await createDonation(donationPayload);
      }

      setSuccessMessage('Donation posted! The Cloud Function matching engine is evaluating nearby shelters and dispatching couriers.');
      setQuantity('');
      setExpiryWindow(getDefaultExpiry());
    } catch (err) {
      console.error('Failed to post donation:', err);
      setErrorMessage('Failed to post donation: ' + (err.message || 'Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return 'N/A';
    if (ts.toDate) return ts.toDate().toLocaleString();
    if (ts.toMillis) return new Date(ts.toMillis()).toLocaleString();
    if (typeof ts === 'string') return new Date(ts).toLocaleString();
    return new Date(ts).toLocaleString();
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner with Trust Score */}
      <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-emerald-700/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-semibold tracking-wide uppercase">
                <HeartHandshake className="w-3.5 h-3.5" />
                Donor Portal
              </span>
              <TrustScoreBadge score={donorTrust.score} count={donorTrust.count} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome, {userProfile?.name || 'Partner'}
            </h1>
            <p className="mt-1 text-emerald-100 text-sm max-w-2xl">
              Post surplus food inventory. Our Cloud Function matching engine evaluates shelter capacity, dietary preferences, and haversine proximity to auto-dispatch incoming surplus.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/10 min-w-[120px]">
              <div className="text-2xl font-black">{myDonations.length}</div>
              <div className="text-[11px] text-emerald-100 font-medium">Total Rescues</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Donor Intake Form (7 cols) */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7">
            <div className="flex items-center justify-between pb-5 mb-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  Post Surplus Food Intake
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Triggers the Cloud Function matching engine on document creation
                </p>
              </div>
            </div>

            {successMessage && (
              <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-emerald-800 text-sm">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <div className="flex-1">{successMessage}</div>
              </div>
            )}

            {errorMessage && (
              <div className="mb-5 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <div className="flex-1">{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleSubmitDonation} className="space-y-5">
              {/* 1. Food Type Dropdown */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Food Type <span className="text-emerald-600">*</span>
                </label>
                <select
                  value={foodType}
                  onChange={(e) => setFoodType(e.target.value)}
                  className="w-full font-medium"
                >
                  {FOOD_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Select category to determine decay rate and matching preferences.
                </span>
              </div>

              {/* 2. Quantity Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Quantity &amp; Packaging <span className="text-emerald-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 35 packaged dinner trays, 40 lbs apples"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* 3. Expiry Window Datetime Picker */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Expiry / Safe Pickup Window <span className="text-emerald-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    required
                    value={expiryWindow}
                    onChange={(e) => setExpiryWindow(e.target.value)}
                    className="w-full pl-10"
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
              </div>

              {/* Risk Scoring Display with 3-Tier Badges */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Expiry-Risk Scoring (Weighted Formula)
                    </span>
                  </div>
                  <RiskBadge score={liveRiskScore} size="md" />
                </div>

                {/* Risk Progress Bar */}
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-3">
                  <div
                    className={`h-full transition-all duration-300 ${riskTier.barColor}`}
                    style={{ width: `${liveRiskScore}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                  <span>Thresholds: <strong>&lt; 33 Green</strong> | <strong>33-66 Amber</strong> | <strong>&gt; 66 Red</strong></span>
                  <span>{riskTier.description}</span>
                </div>
              </div>

              {/* 4. Geolocation & Fallback Manual Lat/Lng */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Pickup Location Coordinates <span className="text-emerald-600">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={geoLoading}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors disabled:opacity-50"
                  >
                    {geoLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Navigation2 className="w-3.5 h-3.5" />
                    )}
                    <span>{geoLoading ? 'Detecting GPS...' : 'Use Browser Geolocation'}</span>
                  </button>
                </div>

                {geoMessage && (
                  <div className="text-xs text-slate-600 mb-2 bg-slate-100 p-2 rounded-lg flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{geoMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 37.7749"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. -122.4194"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting &amp; Running Matching Engine...</span>
                  </>
                ) : (
                  <>
                    <HeartHandshake className="w-4 h-4" />
                    <span>Post Surplus Donation</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Donation History (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                My Posted Donations
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {myDonations.length} records
              </span>
            </div>

            {loadingDonations ? (
              <div className="py-12 text-center text-slate-500 flex flex-col items-center">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
                <span className="text-xs">Loading donations...</span>
              </div>
            ) : myDonations.length === 0 ? (
              <div className="py-12 text-center">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No donations posted yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  Fill out the intake form to trigger the matching engine.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 mt-2 max-h-[600px] overflow-y-auto pr-1">
                {myDonations.map((item) => {
                  return (
                    <div key={item.id} className="py-4 first:pt-2 last:pb-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold text-slate-900 text-sm block">
                            {item.foodType}
                          </span>
                          <span className="text-xs text-slate-600 font-medium">
                            {item.quantity}
                          </span>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>

                      {/* Matching info */}
                      {item.matchedShelterName && (
                        <div className="text-[11px] bg-indigo-50 text-indigo-800 px-2.5 py-1 rounded-lg border border-indigo-200 flex items-center gap-1.5 font-medium">
                          <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>Matched: <strong>{item.matchedShelterName}</strong> ({item.distanceKm || '2.4'} km away)</span>
                        </div>
                      )}

                      {item.unmatched && (
                        <div className="text-[11px] bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Pending match (eligible shelters currently at capacity)</span>
                        </div>
                      )}

                      {item.confirmedUsable !== undefined && (
                        <div className="text-[11px] bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Confirmed Received • Rated Usable (+1 Trust)</span>
                        </div>
                      )}

                      {/* Live Status Pipeline */}
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 my-2">
                        <StatusStepper donationId={item.id} initialDonation={item} size="sm" />
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {Number(item.lat).toFixed(4)}, {Number(item.lng).toFixed(4)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          Expiry: {formatTimestamp(item.expiryWindow)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <RiskBadge score={item.riskScore} size="sm" />
                        <span className="text-[10px] text-slate-400">
                          {formatTimestamp(item.createdAt)}
                        </span>
                      </div>

                      {/* Shareable Impact Card Trigger for Delivered Items */}
                      {item.status === 'delivered' && (
                        <button
                          type="button"
                          onClick={() => setShareModalDonation(item)}
                          className="w-full mt-2 py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all transform hover:scale-[1.01]"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                          <span>View &amp; Share Impact Certificate 🌍</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shareable Impact Certificate Modal */}
      <ShareableImpactCardModal
        donation={shareModalDonation}
        isOpen={Boolean(shareModalDonation)}
        onClose={() => setShareModalDonation(null)}
        donorName={userProfile?.name || 'Golden Gate Bistro'}
      />
    </div>
  );
}
