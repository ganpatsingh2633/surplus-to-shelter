/**
 * Batching & Routing Utility for Surplus-to-Shelter Driver Logistics
 */

/**
 * Calculates the great-circle distance between two points in kilometers
 * using the spherical Haversine formula.
 */
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's mean radius in km
  const dLat = (Number(lat2) - Number(lat1)) * (Math.PI / 180);
  const dLon = (Number(lon2) - Number(lon1)) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(Number(lat1) * (Math.PI / 180)) *
      Math.cos(Number(lat2) * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Finds batchable donations near an accepted donation.
 * Requirement:
 * - Status must be "matched"
 * - No assigned driver (!assignedDriverId)
 * - Within 1km radius of the accepted donation
 * - Created within the last 15 minutes (or within 15 min of the accepted donation)
 *
 * @param {Object} acceptedDonation - The anchor donation accepted by the driver
 * @param {Array<Object>} allDonations - Pool of all donations
 * @param {number} maxDistanceKm - Max radius in km (default 1.0 km)
 * @param {number} maxAgeMinutes - Time window threshold in minutes (default 15 min)
 * @returns {Array<Object>} Sorted list of batchable candidate donations with distance metadata
 */
export function findBatchableDonations(
  acceptedDonation,
  allDonations = [],
  maxDistanceKm = 1.0,
  maxAgeMinutes = 15
) {
  if (!acceptedDonation || !Array.isArray(allDonations)) {
    return [];
  }

  const anchorLat = Number(acceptedDonation.lat);
  const anchorLng = Number(acceptedDonation.lng);

  if (isNaN(anchorLat) || isNaN(anchorLng)) {
    return [];
  }

  const nowMs = Date.now();
  const maxAgeMs = maxAgeMinutes * 60 * 1000;

  const getDocTimestamp = (doc) => {
    if (!doc) return 0;
    if (doc.createdAt?.toMillis) return doc.createdAt.toMillis();
    if (doc.createdAt?.toDate) return doc.createdAt.toDate().getTime();
    if (typeof doc.createdAt === 'number') return doc.createdAt;
    if (doc.createdAt) return new Date(doc.createdAt).getTime();
    return 0;
  };

  const anchorCreatedMs = getDocTimestamp(acceptedDonation);

  const candidates = allDonations.filter((d) => {
    // 1. Cannot be the accepted donation itself
    if (d.id === acceptedDonation.id) return false;

    // 2. Status must be "matched" and unassigned
    if (d.status !== 'matched' || d.assignedDriverId) return false;

    // 3. Valid coordinates
    const dLat = Number(d.lat);
    const dLng = Number(d.lng);
    if (isNaN(dLat) || isNaN(dLng)) return false;

    // 4. Distance within threshold (<= 1 km)
    const distKm = haversineDistanceKm(anchorLat, anchorLng, dLat, dLng);
    if (distKm > maxDistanceKm) return false;

    // 5. Created within last 15 minutes (or within 15 mins of anchor)
    const docTime = getDocTimestamp(d);
    const isRecentFromNow = docTime > 0 && Math.abs(nowMs - docTime) <= maxAgeMs;
    const isRecentFromAnchor =
      anchorCreatedMs > 0 && docTime > 0 && Math.abs(anchorCreatedMs - docTime) <= maxAgeMs;

    // Fallback: If mock data doesn't have millisecond timestamps, accept nearby if created on same day
    const isWithinTimeWindow = isRecentFromNow || isRecentFromAnchor;

    return isWithinTimeWindow;
  });

  // Calculate distance for each and sort ascending (nearest first)
  const scoredCandidates = candidates.map((c) => {
    const distKm = haversineDistanceKm(anchorLat, anchorLng, Number(c.lat), Number(c.lng));
    return {
      ...c,
      distanceToAnchorKm: Math.round(distKm * 100) / 100, // rounded to 2 decimals
    };
  });

  scoredCandidates.sort((a, b) => a.distanceToAnchorKm - b.distanceToAnchorKm);
  return scoredCandidates;
}

/**
 * Orders a multi-stop trip route for an assigned driver.
 * Simple distance-sorted route sequence:
 * Start (Driver Location) -> Pickups (closest to farthest) -> Dropoffs (Shelters).
 *
 * @param {{ lat: number, lng: number }} driverLocation
 * @param {Array<Object>} assignedDonations
 * @returns {Array<Object>} Route waypoints with step number, type, and coordinates
 */
export function buildTripRoute(driverLocation, assignedDonations = []) {
  if (!assignedDonations || assignedDonations.length === 0) {
    return [];
  }

  const waypoints = [];
  let currentLat = driverLocation?.lat ?? 37.7749;
  let currentLng = driverLocation?.lng ?? -122.4194;

  // 1. Driver Start Waypoint
  waypoints.push({
    step: 1,
    type: 'driver_start',
    title: 'Driver Current Position',
    lat: currentLat,
    lng: currentLng,
    details: 'Initial dispatch origin',
  });

  // 2. Pickups sorted by proximity to driver
  const remainingPickups = [...assignedDonations];
  let stepIndex = 2;

  while (remainingPickups.length > 0) {
    // Find closest pickup to current position
    remainingPickups.sort((a, b) => {
      const distA = haversineDistanceKm(currentLat, currentLng, Number(a.lat), Number(a.lng));
      const distB = haversineDistanceKm(currentLat, currentLng, Number(b.lat), Number(b.lng));
      return distA - distB;
    });

    const nextPickup = remainingPickups.shift();
    const pLat = Number(nextPickup.lat);
    const pLng = Number(nextPickup.lng);
    const distFromPrev = haversineDistanceKm(currentLat, currentLng, pLat, pLng);

    waypoints.push({
      step: stepIndex++,
      type: 'pickup',
      title: `Pickup: ${nextPickup.foodType}`,
      donationId: nextPickup.id,
      donation: nextPickup,
      lat: pLat,
      lng: pLng,
      distanceFromPrevKm: Math.round(distFromPrev * 10) / 10,
      details: `${nextPickup.quantity} • Risk ${nextPickup.riskScore ?? 50}`,
    });

    currentLat = pLat;
    currentLng = pLng;
  }

  // 3. Dropoffs at matched shelter(s)
  // Group unique shelters from assigned donations
  const shelterMap = new Map();
  assignedDonations.forEach((d) => {
    const sId = d.matchedShelterId || 'shelter-destination';
    if (!shelterMap.has(sId)) {
      shelterMap.set(sId, {
        id: sId,
        name: d.matchedShelterName || 'Partner Shelter Hub',
        // If shelter lat/lng is stored on donation or default
        lat: d.shelterLat ?? 37.7608,
        lng: d.shelterLng ?? -122.4191,
        items: [d],
      });
    } else {
      shelterMap.get(sId).items.push(d);
    }
  });

  shelterMap.forEach((shelter) => {
    const distFromPrev = haversineDistanceKm(
      currentLat,
      currentLng,
      Number(shelter.lat),
      Number(shelter.lng)
    );

    waypoints.push({
      step: stepIndex++,
      type: 'dropoff',
      title: `Dropoff: ${shelter.name}`,
      shelterId: shelter.id,
      lat: Number(shelter.lat),
      lng: Number(shelter.lng),
      distanceFromPrevKm: Math.round(distFromPrev * 10) / 10,
      details: `Delivering ${shelter.items.length} batch${shelter.items.length > 1 ? 'es' : ''}`,
    });

    currentLat = Number(shelter.lat);
    currentLng = Number(shelter.lng);
  });

  return waypoints;
}
