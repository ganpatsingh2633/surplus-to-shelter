import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getShelter,
  updateShelterProfile,
  subscribeShelter,
  subscribeAllDonations,
  updateDonationStatus,
  isFirebaseConfigured,
} from '../firebase/firestore';
import { FOOD_TYPES } from '../utils/riskCalculator';
import StatusBadge from '../components/StatusBadge';
import StatusStepper from '../components/StatusStepper';
import RiskBadge from '../components/RiskBadge';
import TrustScoreBadge from '../components/TrustScoreBadge';
import ConfirmReceivedModal from '../components/ConfirmReceivedModal';
import {
  Building2,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  Navigation2,
  Check,
  PackageCheck,
  Award,
} from 'lucide-react';

export default function ShelterDashboard() {
  const { currentUser, userProfile } = useAuth();

  // Shelter Setup Form State
  const [shelterName, setShelterName] = useState(userProfile?.name || 'Mission Community Food Hub');
  const [capacity, setCapacity] = useState(200);
  const [currentLoad, setCurrentLoad] = useState(135);
  const [lat, setLat] = useState('37.7608');
  const [lng, setLng] = useState('-122.4191');
  const [preferences, setPreferences] = useState([
    'Prepared Meals (Hot)',
    'Fresh Produce',
    'Dairy & Eggs',
    'Bakery & Bread',
  ]);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);

  // Trust score state
  const [shelterTrust, setShelterTrust] = useState({ score: 0.98, count: 18 });

  // Available Donations Feed
  const [availableDonations, setAvailableDonations] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(true);

  // Confirmation Modal State
  const [confirmingDonation, setConfirmingDonation] = useState(null);
  const [confirmationNotice, setConfirmationNotice] = useState('');

  // Load existing shelter data
  useEffect(() => {
    if (!currentUser?.uid) return;

    const isDemoSession = currentUser.uid.startsWith('demo-') || !isFirebaseConfigured;

    if (isDemoSession) {
      const saved = localStorage.getItem(`sts_demo_shelter_${currentUser.uid}`) || localStorage.getItem('sts_demo_shelter_demo-shelter-002');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setShelterName(parsed.name || userProfile?.name || 'Mission Community Food Hub');
          setCapacity(parsed.capacity || 200);
          setCurrentLoad(parsed.currentLoad || 135);
          setLat(parsed.lat || '37.7608');
          setLng(parsed.lng || '-122.4191');
          if (parsed.preferences) setPreferences(parsed.preferences);
          if (parsed.trustScore !== undefined) {
            setShelterTrust({ score: parsed.trustScore, count: parsed.trustRatingCount || 18 });
          }
        } catch (e) {
          console.error(e);
        }
      }

      const allDons = localStorage.getItem('sts_all_donations');
      if (allDons) {
        try {
          setAvailableDonations(JSON.parse(allDons));
        } catch (e) {}
      }
      setLoadingFeed(false);
      return;
    }

    // Subscribe to shelter document in Firestore
    const unsubscribeShelter = subscribeShelter(currentUser.uid, (data) => {
      if (data) {
        if (data.name) setShelterName(data.name);
        if (data.capacity !== undefined) setCapacity(data.capacity);
        if (data.currentLoad !== undefined) setCurrentLoad(data.currentLoad);
        if (data.lat !== undefined && data.lat !== null) setLat(String(data.lat));
        if (data.lng !== undefined && data.lng !== null) setLng(String(data.lng));
        if (Array.isArray(data.preferences)) setPreferences(data.preferences);
        if (data.trustScore !== undefined) {
          setShelterTrust({ score: data.trustScore, count: data.trustRatingCount || 0 });
        }
      }
    });

    // Subscribe to active donations
    const unsubscribeDonations = subscribeAllDonations((donations) => {
      setAvailableDonations(donations);
      setLoadingFeed(false);
    });

    return () => {
      if (typeof unsubscribeShelter === 'function') unsubscribeShelter();
      if (typeof unsubscribeDonations === 'function') unsubscribeDonations();
    };
  }, [currentUser, userProfile]);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setGeoLoading(false);
      },
      () => setGeoLoading(false)
    );
  };

  const togglePreference = (type) => {
    setPreferences((prev) =>
      prev.includes(type) ? prev.filter((p) => p !== type) : [...prev, type]
    );
  };

  const handleSaveShelter = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setErrorMsg('');

    try {
      const payload = {
        uid: currentUser.uid,
        name: shelterName.trim(),
        capacity: Number(capacity),
        currentLoad: Number(currentLoad),
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        preferences,
      };

      if (!isFirebaseConfigured) {
        localStorage.setItem(`sts_demo_shelter_${currentUser.uid}`, JSON.stringify(payload));
      } else {
        await updateShelterProfile(currentUser.uid, payload);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to update shelter setup:', err);
      setErrorMsg('Error saving shelter profile: ' + (err.message || 'Please retry.'));
    } finally {
      setSaving(false);
    }
  };

  const handleClaimDonation = async (donationId) => {
    const isDemoSession = currentUser?.uid?.startsWith('demo-') || !isFirebaseConfigured;
    try {
      if (isDemoSession) {
        setAvailableDonations((prev) => {
          const updated = prev.map((d) => (d.id === donationId ? { ...d, status: 'matched', matchedShelterId: currentUser.uid } : d));
          localStorage.setItem('sts_all_donations', JSON.stringify(updated));
          return updated;
        });
      } else {
        await updateDonationStatus(donationId, 'matched');
      }
    } catch (err) {
      console.error('Failed to claim donation:', err);
    }
  };

  const handleConfirmationComplete = (result) => {
    setConfirmationNotice(
      `Delivery receipt confirmed! Donor was rated ${result.usable ? 'Usable (1★)' : 'Unusable (0★)'} and trust score has been updated.`
    );
    // Refresh local list
    const isDemoSession = currentUser?.uid?.startsWith('demo-') || !isFirebaseConfigured;
    if (isDemoSession && confirmingDonation) {
      setAvailableDonations((prev) =>
        prev.map((d) =>
          d.id === confirmingDonation.id ? { ...d, status: 'delivered', confirmedUsable: result.usable } : d
        )
      );
    }
    setTimeout(() => setConfirmationNotice(''), 6000);
  };

  const capacityNum = Number(capacity) || 1;
  const currentLoadNum = Number(currentLoad) || 0;
  const occupancyRate = Math.min(100, Math.round((currentLoadNum / capacityNum) * 100));
  const remainingCapacity = Math.max(0, capacityNum - currentLoadNum);

  return (
    <div className="space-y-8">
      {/* Header Banner with TrustScore */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-indigo-700/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-semibold tracking-wide uppercase">
                <Building2 className="w-3.5 h-3.5" />
                Shelter Hub Portal
              </span>
              <TrustScoreBadge score={shelterTrust.score} count={shelterTrust.count} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {shelterName || 'Shelter Management'}
            </h1>
            <p className="mt-1 text-indigo-100 text-sm max-w-2xl">
              Configure intake headroom, dietary preferences, and confirm received deliveries to maintain verified network trust scores.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/10 min-w-[110px]">
              <div className="text-2xl font-black">{occupancyRate}%</div>
              <div className="text-[11px] text-indigo-200 font-medium">Occupancy Load</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/10 min-w-[110px]">
              <div className="text-2xl font-black text-emerald-300">{remainingCapacity}</div>
              <div className="text-[11px] text-indigo-200 font-medium">Remaining Intake</div>
            </div>
          </div>
        </div>
      </div>

      {confirmationNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-800 text-sm flex items-start gap-2.5 shadow-xs">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <span>{confirmationNotice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Shelter Setup Form (6 cols) */}
        <div className="lg:col-span-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7">
            <div className="pb-5 mb-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Shelter Configuration &amp; Capacity Setup
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Updates your record in the <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">shelters</code> collection used by the Cloud Function matching engine.
              </p>
            </div>

            {saveSuccess && (
              <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800 text-sm">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Shelter preferences and capacity successfully saved to Firestore!</span>
              </div>
            )}

            {errorMsg && (
              <div className="mb-5 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-800 text-sm">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveShelter} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Shelter / Hub Name
                </label>
                <input
                  type="text"
                  required
                  value={shelterName}
                  onChange={(e) => setShelterName(e.target.value)}
                  placeholder="e.g. Hope Mission Food Center"
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Total Capacity (Meals/People) <span className="text-indigo-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Maximum capacity limit</span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Current Load <span className="text-indigo-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={currentLoad}
                    onChange={(e) => setCurrentLoad(e.target.value)}
                    className="w-full"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Currently served / sheltered</span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                <div className="flex items-center justify-between text-xs font-bold mb-2">
                  <span className="text-slate-700 uppercase tracking-wider">Live Intake Headroom</span>
                  <span className={`${occupancyRate > 90 ? 'text-rose-600' : 'text-indigo-600'}`}>
                    {currentLoadNum} / {capacityNum} ({occupancyRate}%)
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      occupancyRate > 90
                        ? 'bg-rose-500'
                        : occupancyRate > 75
                        ? 'bg-amber-500'
                        : 'bg-indigo-600'
                    }`}
                    style={{ width: `${occupancyRate}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                  <span>Available capacity for surplus: <strong>{remainingCapacity}</strong> units</span>
                  <span>{occupancyRate >= 100 ? 'At Maximum Capacity' : 'Accepting Deliveries'}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Accepted Food Type Preferences (Multi-Select) <span className="text-indigo-600">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FOOD_TYPES.map((type) => {
                    const isChecked = preferences.includes(type);
                    return (
                      <div
                        key={type}
                        onClick={() => togglePreference(type)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                          isChecked
                            ? 'border-indigo-500 bg-indigo-50/60 text-indigo-950'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                            isChecked
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="flex-1">{type}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Shelter GPS Coordinates
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={geoLoading}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition-colors"
                  >
                    <Navigation2 className="w-3.5 h-3.5" />
                    <span>{geoLoading ? 'Detecting...' : 'Detect Location'}</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="any"
                    placeholder="Latitude"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Longitude"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving to Firestore...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Shelter Preferences</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Matched & Available Surplus Feed (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Surplus Feed &amp; Delivery Confirmations
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm receipt for arriving items &amp; claim matched inventory
                </p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Live Feed
              </span>
            </div>

            {loadingFeed ? (
              <div className="py-12 text-center text-slate-500 flex flex-col items-center">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
                <span className="text-xs">Connecting to Firestore donations...</span>
              </div>
            ) : availableDonations.length === 0 ? (
              <div className="py-12 text-center">
                <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No surplus posted yet</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  When local food donors post surplus items, they will appear here for you to claim and confirm.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 mt-2 max-h-[600px] overflow-y-auto pr-1">
                {availableDonations.map((item) => {
                  const isPreferred = preferences.includes(item.foodType);

                  return (
                    <div key={item.id} className="py-4 first:pt-2 last:pb-0 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {item.foodType}
                            </span>
                            {isPreferred && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                                Preference Match
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-600 font-medium">
                            {item.quantity}
                          </span>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <RiskBadge score={item.riskScore} size="sm" />
                        <span className="text-slate-500 text-[11px] flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          Lat: {Number(item.lat).toFixed(3)}, Lng: {Number(item.lng).toFixed(3)}
                        </span>
                      </div>

                      {/* Live Pipeline Stepper */}
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                        <StatusStepper donationId={item.id} initialDonation={item} size="sm" />
                      </div>

                      {/* Matching action */}
                      {item.status === 'posted' && (
                        <button
                          type="button"
                          onClick={() => handleClaimDonation(item.id)}
                          className="w-full mt-1 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs border border-indigo-200 flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <span>Request / Match with Shelter</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}

                      {/* Trust / Confirmation Flow Requirement 3 */}
                      {item.status === 'picked_up' && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => setConfirmingDonation(item)}
                            className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.01]"
                          >
                            <PackageCheck className="w-4 h-4 text-emerald-200" />
                            <span>Confirm Received &amp; Rate Donor</span>
                          </button>
                          <span className="text-[10px] text-slate-400 block text-center mt-1">
                            Courier in transit • Tap upon physical drop-off
                          </span>
                        </div>
                      )}

                      {item.status === 'delivered' && (
                        <div className="w-full text-center py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Delivery Verified &amp; Trust Score Updated</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmReceivedModal
        donation={confirmingDonation}
        isOpen={Boolean(confirmingDonation)}
        onClose={() => setConfirmingDonation(null)}
        onConfirmed={handleConfirmationComplete}
      />
    </div>
  );
}
