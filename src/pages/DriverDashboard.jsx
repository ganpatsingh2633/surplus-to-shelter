import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  subscribeDriver,
  subscribeAllDonations,
  subscribeShelters,
  updateDriverStatus,
  updateDriverLocation,
  acceptDonationTrip,
  markDonationPickedUp,
  isFirebaseConfigured,
} from '../firebase/firestore';
import { haversineDistanceKm, findBatchableDonations, buildTripRoute } from '../utils/batching';
import RiskBadge from '../components/RiskBadge';
import StatusBadge from '../components/StatusBadge';
import StatusStepper from '../components/StatusStepper';
import LeafletMap from '../components/LeafletMap';
import {
  Truck,
  MapPin,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Compass,
  PackageCheck,
  Radio,
  Sparkles,
  Building2,
  Layers,
  ArrowRight,
  Check,
  Plus,
  X,
  AlertTriangle,
  Route as RouteIcon,
  ShieldCheck,
} from 'lucide-react';

export default function DriverDashboard() {
  const { currentUser, userProfile } = useAuth();

  // Driver telemetry & duty status
  const [driverStatus, setDriverStatus] = useState('available'); // "available" | "busy"
  const [currentLocation, setCurrentLocation] = useState({ lat: 37.7749, lng: -122.4194 });
  const [geoUpdating, setGeoUpdating] = useState(false);
  const [geoMessage, setGeoMessage] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Firestore real-time collections
  const [donations, setDonations] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);

  // Batching & Dispatch Interaction State
  const [batchModal, setBatchModal] = useState({
    isOpen: false,
    anchorDonation: null,
    batchCandidates: [],
    selectedBatchIds: [],
  });
  const [acceptingTrip, setAcceptingTrip] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [selectedDonationId, setSelectedDonationId] = useState(null);

  // Real-time Firestore Subscriptions
  useEffect(() => {
    if (!currentUser?.uid) return;

    const isDemoSession = currentUser.uid.startsWith('demo-') || !isFirebaseConfigured;

    if (isDemoSession) {
      // 1. Driver state from local storage
      const savedDriver =
        localStorage.getItem(`sts_demo_driver_${currentUser.uid}`) ||
        localStorage.getItem('sts_demo_driver_demo-driver-003');
      if (savedDriver) {
        try {
          const parsed = JSON.parse(savedDriver);
          if (parsed.status) setDriverStatus(parsed.status);
          if (parsed.currentLocation) setCurrentLocation(parsed.currentLocation);
        } catch (e) {}
      }

      // 2. Donations from local storage with periodic refresh
      const loadLocalDonations = () => {
        const allDons = localStorage.getItem('sts_all_donations');
        if (allDons) {
          try {
            setDonations(JSON.parse(allDons));
          } catch (e) {}
        }
      };
      loadLocalDonations();
      const interval = setInterval(loadLocalDonations, 1500);

      // 3. Shelters from local storage or demo defaults
      const savedShelter =
        localStorage.getItem('sts_demo_shelter_demo-shelter-002') ||
        localStorage.getItem(`sts_demo_shelter_${currentUser.uid}`);
      if (savedShelter) {
        try {
          setShelters([JSON.parse(savedShelter)]);
        } catch (e) {}
      } else {
        setShelters([
          {
            id: 'demo-shelter-002',
            uid: 'demo-shelter-002',
            name: 'Mission Community Food Hub',
            capacity: 200,
            currentLoad: 135,
            lat: 37.7608,
            lng: -122.4191,
            preferences: ['Prepared Meals (Hot)', 'Fresh Produce', 'Dairy & Eggs'],
          },
        ]);
      }

      setLoading(false);
      return () => clearInterval(interval);
    }

    // Live Firebase Subscriptions
    const unsubDriver = subscribeDriver(currentUser.uid, (data) => {
      if (data) {
        if (data.status) setDriverStatus(data.status);
        if (data.currentLocation) setCurrentLocation(data.currentLocation);
      }
    });

    const unsubDonations = subscribeAllDonations((items) => {
      setDonations(items);
      setLoading(false);
    });

    const unsubShelters = subscribeShelters((items) => {
      setShelters(items);
    });

    return () => {
      if (typeof unsubDriver === 'function') unsubDriver();
      if (typeof unsubDonations === 'function') unsubDonations();
      if (typeof unsubShelters === 'function') unsubShelters();
    };
  }, [currentUser]);

  // Telemetry Location Broadcaster
  const handleBroadcastLocation = () => {
    if (!navigator.geolocation) {
      setGeoMessage('Geolocation not supported by browser.');
      return;
    }

    setGeoUpdating(true);
    setGeoMessage('Broadcasting real-time GPS telemetry...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = {
          lat: parseFloat(pos.coords.latitude.toFixed(6)),
          lng: parseFloat(pos.coords.longitude.toFixed(6)),
        };
        setCurrentLocation(coords);

        try {
          if (!isFirebaseConfigured || currentUser.uid.startsWith('demo-')) {
            localStorage.setItem(
              `sts_demo_driver_${currentUser.uid}`,
              JSON.stringify({ status: driverStatus, currentLocation: coords })
            );
          } else {
            await updateDriverLocation(currentUser.uid, coords);
          }
          setGeoMessage(
            `GPS BroadCast: ${coords.lat}, ${coords.lng} (±${Math.round(pos.coords.accuracy)}m)`
          );
        } catch (err) {
          console.error(err);
          setGeoMessage('Failed to update telemetry location.');
        } finally {
          setGeoUpdating(false);
        }
      },
      (err) => {
        setGeoUpdating(false);
        setGeoMessage('Unable to access GPS: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Toggle Driver Availability
  const handleToggleStatus = async (newStatus) => {
    setStatusUpdating(true);
    try {
      if (!isFirebaseConfigured || currentUser.uid.startsWith('demo-')) {
        setDriverStatus(newStatus);
        localStorage.setItem(
          `sts_demo_driver_${currentUser.uid}`,
          JSON.stringify({ status: newStatus, currentLocation })
        );
      } else {
        await updateDriverStatus(currentUser.uid, newStatus);
        setDriverStatus(newStatus);
      }
    } catch (err) {
      console.error('Error toggling duty status:', err);
    } finally {
      setStatusUpdating(false);
    }
  };

  // 1. Available Matched Donations Feed (Sorted by distance from driver's currentLocation)
  const availableMatched = useMemo(() => {
    const list = donations.filter(
      (d) => d.status === 'matched' && (!d.assignedDriverId || d.assignedDriverId === '')
    );

    return list
      .map((d) => {
        const distKm = haversineDistanceKm(
          currentLocation.lat,
          currentLocation.lng,
          Number(d.lat),
          Number(d.lng)
        );
        return {
          ...d,
          distanceFromDriverKm: Math.round(distKm * 10) / 10,
        };
      })
      .sort((a, b) => a.distanceFromDriverKm - b.distanceFromDriverKm);
  }, [donations, currentLocation]);

  // 2. Active Trips assigned to current driver
  const myAssignedDonations = useMemo(() => {
    return donations.filter((d) => d.assignedDriverId === currentUser?.uid);
  }, [donations, currentUser?.uid]);

  // 3. Simple distance-sorted route waypoints
  const assignedRoute = useMemo(() => {
    return buildTripRoute(currentLocation, myAssignedDonations);
  }, [currentLocation, myAssignedDonations]);

  // ============================================================================
  // DISPATCH & BATCHING LOGIC
  // ============================================================================
  const handleInitiateAccept = (donation) => {
    // Check for other "matched" unassigned donations within 1km & created within 15 mins
    const batchCandidates = findBatchableDonations(donation, donations, 1.0, 15);

    if (batchCandidates.length > 0) {
      // Prompt driver with the Batching Suggestion Modal
      setBatchModal({
        isOpen: true,
        anchorDonation: donation,
        batchCandidates,
        selectedBatchIds: batchCandidates.map((c) => c.id), // select all by default
      });
    } else {
      // Direct single-trip assignment
      executeAcceptTrip([donation.id], `Accepted dispatch for ${donation.foodType}!`);
    }
  };

  const executeAcceptTrip = async (donationIds, successText) => {
    setAcceptingTrip(true);
    try {
      await acceptDonationTrip(donationIds, currentUser.uid);
      setActionSuccessMsg(successText);
      setTimeout(() => setActionSuccessMsg(''), 5000);
      setBatchModal({ isOpen: false, anchorDonation: null, batchCandidates: [], selectedBatchIds: [] });
    } catch (err) {
      console.error('Failed to accept dispatch trip:', err);
    } finally {
      setAcceptingTrip(false);
    }
  };

  const handleConfirmBatchAccept = () => {
    const allIds = [batchModal.anchorDonation.id, ...batchModal.selectedBatchIds];
    const text = `Batch Route Created! Assigned ${allIds.length} nearby surplus pickups to your trip.`;
    executeAcceptTrip(allIds, text);
  };

  const handleDeclineBatchAccept = () => {
    // Only accept the primary anchor donation
    executeAcceptTrip(
      [batchModal.anchorDonation.id],
      `Accepted single trip for ${batchModal.anchorDonation.foodType}.`
    );
  };

  const toggleBatchCandidate = (id) => {
    setBatchModal((prev) => {
      const exists = prev.selectedBatchIds.includes(id);
      return {
        ...prev,
        selectedBatchIds: exists
          ? prev.selectedBatchIds.filter((item) => item !== id)
          : [...prev.selectedBatchIds, id],
      };
    });
  };

  // Driver action: "Mark Picked Up"
  const handleMarkPickedUp = async (donationId) => {
    try {
      await markDonationPickedUp(donationId, currentUser.uid);
      setActionSuccessMsg('Status updated: Surplus picked up and currently in transit to shelter!');
      setTimeout(() => setActionSuccessMsg(''), 5000);
    } catch (err) {
      console.error('Failed to mark picked up:', err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner with Duty Telemetry */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-orange-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-amber-600/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-semibold tracking-wide uppercase mb-3">
              <Truck className="w-3.5 h-3.5" />
              Rescue Courier Dispatch &amp; Telemetry
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {userProfile?.name || 'Alex Rivera (Rescue Logistics)'}
            </h1>
            <p className="mt-1 text-amber-100 text-sm max-w-2xl">
              Intelligent real-time driver dispatch. Accept matched surplus, batch nearby pickups within 1km, and track live status transitions.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/10 min-w-[130px]">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    driverStatus === 'available' ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'
                  }`}
                />
                <span className="text-lg font-black capitalize">{driverStatus}</span>
              </div>
              <div className="text-[11px] text-amber-100 font-medium">Duty Status</div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/10 min-w-[120px]">
              <div className="text-2xl font-black text-amber-100">
                {myAssignedDonations.filter((d) => d.status !== 'delivered').length}
              </div>
              <div className="text-[11px] text-amber-100 font-medium">Active Trips</div>
            </div>
          </div>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-800 text-sm flex items-start gap-2.5 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Interactive Map View */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-amber-600" />
            Real-Time OpenStreetMap Fleet &amp; Route Telemetry
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>OpenStreetMap Tiles Live (Free, No API Key)</span>
          </div>
        </div>

        <LeafletMap
          driverLocation={currentLocation}
          donations={donations}
          shelters={shelters}
          assignedRoute={assignedRoute}
          highlightedDonationId={selectedDonationId}
          height="400px"
        />
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Available Matched Dispatch Feed (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Available Matched Surplus Feed
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Surplus matched to shelters, sorted by distance from your GPS position
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                {availableMatched.length} Available
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-500 flex flex-col items-center">
                <Loader2 className="w-6 h-6 animate-spin text-amber-600 mb-2" />
                <span className="text-xs">Scanning available dispatch opportunities...</span>
              </div>
            ) : availableMatched.length === 0 ? (
              <div className="py-12 text-center">
                <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No unassigned matched donations</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  When new food surplus is posted and matched to a shelter by the Cloud Function, it will appear here for pickup.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 space-y-4">
                {availableMatched.map((item) => {
                  return (
                    <div
                      key={item.id}
                      className="pt-4 first:pt-0 space-y-3 p-3.5 rounded-xl hover:bg-slate-50/70 border border-transparent hover:border-slate-200 transition-all"
                    >
                      {/* Title & Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {item.foodType}
                            </span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                              {item.distanceFromDriverKm} km away
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium mt-0.5">
                            {item.quantity}
                          </p>
                        </div>
                        <RiskBadge score={item.riskScore} size="sm" />
                      </div>

                      {/* Pickup & Shelter Dropoff Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Pickup Location</span>
                            <span className="font-semibold text-slate-800">
                              {Number(item.lat).toFixed(4)}, {Number(item.lng).toFixed(4)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-start gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Dropoff Shelter</span>
                            <span className="font-semibold text-slate-800 truncate block">
                              {item.matchedShelterName || 'Partner Shelter Hub'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        type="button"
                        onClick={() => handleInitiateAccept(item)}
                        disabled={acceptingTrip}
                        className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                      >
                        <Truck className="w-4 h-4" />
                        <span>Accept Dispatch &amp; Plan Trip</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Telemetry Controls Widget */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <Radio className="w-4 h-4 text-amber-600" />
              Duty Availability &amp; Live Telemetry
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={statusUpdating}
                onClick={() => handleToggleStatus('available')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  driverStatus === 'available'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Available</span>
              </button>
              <button
                type="button"
                disabled={statusUpdating}
                onClick={() => handleToggleStatus('busy')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  driverStatus === 'busy'
                    ? 'border-rose-500 bg-rose-50 text-rose-800 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Busy / On Route</span>
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Current Coordinates:</span>
                <span className="font-mono font-bold text-slate-800">
                  {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                </span>
              </div>

              <button
                type="button"
                disabled={geoUpdating}
                onClick={handleBroadcastLocation}
                className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded-lg border border-amber-300 flex items-center justify-center gap-1.5 transition-colors"
              >
                {geoUpdating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Compass className="w-3.5 h-3.5" />
                )}
                <span>{geoUpdating ? 'Acquiring GPS...' : 'Broadcast Current Location'}</span>
              </button>

              {geoMessage && (
                <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>{geoMessage}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Active Trips & Route Pipeline (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <RouteIcon className="w-4 h-4 text-indigo-600" />
                  My Assigned Active Rescue Trips
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sequential route list with real-time status pipeline
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                {myAssignedDonations.length} Assigned
              </span>
            </div>

            {myAssignedDonations.length === 0 ? (
              <div className="py-12 text-center">
                <Truck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No active trips assigned</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Click "Accept Dispatch" on any matched surplus to claim the delivery route.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Route Sequencing Summary */}
                {assignedRoute.length > 0 && (
                  <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 rounded-xl shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold uppercase tracking-wider text-amber-300">
                        Optimized Route Sequence
                      </span>
                      <span className="text-[11px] text-slate-300">
                        {assignedRoute.length} Waypoints
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                      {assignedRoute.map((wp, idx) => (
                        <React.Fragment key={wp.step}>
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[11px] flex items-center gap-1 ${
                              wp.type === 'driver_start'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                                : wp.type === 'pickup'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                            }`}
                          >
                            <span>#{wp.step}</span>
                            <span>{wp.title}</span>
                          </span>
                          {idx < assignedRoute.length - 1 && (
                            <ArrowRight className="w-3 h-3 text-slate-500" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}

                {/* Individual Donation Pipeline Cards */}
                {myAssignedDonations.map((item) => {
                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 text-sm">
                              {item.foodType}
                            </span>
                            <RiskBadge score={item.riskScore} size="sm" />
                          </div>
                          <p className="text-xs text-slate-600 font-medium mt-0.5">
                            {item.quantity}
                          </p>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>

                      {/* Dropoff shelter destination */}
                      <div className="flex items-center gap-2 text-xs bg-white p-2.5 rounded-lg border border-slate-200 text-slate-700">
                        <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="truncate">
                          Destination Shelter: <strong>{item.matchedShelterName || 'Mission Community Food Hub'}</strong>
                        </span>
                      </div>

                      {/* Real-time Status Stepper */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Live Pipeline Tracking
                        </div>
                        <StatusStepper donationId={item.id} initialDonation={item} size="sm" />
                      </div>

                      {/* Driver Action Buttons */}
                      <div className="pt-1">
                        {item.status === 'matched' && (
                          <button
                            type="button"
                            onClick={() => handleMarkPickedUp(item.id)}
                            className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 transition-all"
                          >
                            <PackageCheck className="w-4 h-4" />
                            <span>Mark Picked Up from Donor</span>
                          </button>
                        )}

                        {item.status === 'picked_up' && (
                          <div className="w-full text-center py-2 px-3 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-xl border border-indigo-200 flex items-center justify-center gap-2">
                            <Truck className="w-4 h-4 animate-bounce" />
                            <span>Surplus in transit &bull; Shelter will confirm upon physical drop-off</span>
                          </div>
                        )}

                        {item.status === 'delivered' && (
                          <div className="w-full text-center py-2 px-3 text-xs font-semibold text-emerald-800 bg-emerald-50 rounded-xl border border-emerald-300 flex items-center justify-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>Delivery Verified Usable by Shelter (Mission Completed)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BATCHING SUGGESTION MODAL ("Add to this trip?")                            */}
      {/* ========================================================================= */}
      {batchModal.isOpen && batchModal.anchorDonation && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-amber-300">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Nearby Surplus Found!</h3>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    Batching Suggestion: Within 1km &amp; recent window
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBatchModal({ isOpen: false, anchorDonation: null, batchCandidates: [], selectedBatchIds: [] })}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Primary Accepted Surplus
                </div>
                <div className="font-extrabold text-sm text-slate-900">
                  {batchModal.anchorDonation.foodType}
                </div>
                <div className="text-xs text-slate-600">
                  {batchModal.anchorDonation.quantity}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Add nearby surplus to this trip? ({batchModal.selectedBatchIds.length} selected)
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {batchModal.batchCandidates.map((candidate) => {
                    const isSelected = batchModal.selectedBatchIds.includes(candidate.id);
                    return (
                      <div
                        key={candidate.id}
                        onClick={() => toggleBatchCandidate(candidate.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/60 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">
                              {candidate.foodType}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {candidate.quantity}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full">
                            {candidate.distanceToAnchorKm} km away
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-indigo-50 rounded-xl p-3 text-[11px] text-indigo-900 border border-indigo-200/60 leading-relaxed">
                Combining pickups into a batched trip reduces courier transport emissions and accelerates delivery to local shelters before perishability windows close.
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDeclineBatchAccept}
                  disabled={acceptingTrip}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                >
                  Keep Single Trip
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBatchAccept}
                  disabled={acceptingTrip}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {acceptingTrip ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Assigning Batched Route...</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-4 h-4" />
                      <span>Accept {1 + batchModal.selectedBatchIds.length} Pickups as Batch</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
