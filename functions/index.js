import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';

// Initialize Firebase Admin SDK
initializeApp();
const db = getFirestore();

// ============================================================================
// 1. DECAY RATES & RISK SCORING ALGORITHM
// ============================================================================
const FOOD_DECAY_RATES = {
  'Prepared Meals (Hot)': 0.95,
  'Seafood': 0.95,
  'Meat & Poultry': 0.90,
  'Dairy & Eggs': 0.85,
  'Refrigerated Packaged': 0.65,
  'Fresh Produce': 0.55,
  'Bakery & Bread': 0.40,
  'Pantry & Canned Goods': 0.15,
};

/**
 * Computes the weighted perishability risk score (0-100).
 * Formula: base risk (decay rate) × (time elapsed / total expiry window)
 * Output maps to: green (<33), amber (33-66), red (>66).
 */
export function calculateExpiryRiskScore(foodType, createdAt, expiryWindow) {
  const baseDecayRate = FOOD_DECAY_RATES[foodType] ?? 0.50;

  const createdMs = createdAt?.toMillis ? createdAt.toMillis() : new Date(createdAt || Date.now()).getTime();
  const expiryMs = expiryWindow?.toMillis ? expiryWindow.toMillis() : new Date(expiryWindow).getTime();
  const nowMs = Date.now();

  const totalWindow = Math.max(1000 * 60, expiryMs - createdMs); // at least 1 min
  const timeElapsed = Math.max(0, nowMs - createdMs);

  // If already at or past the expiry window, maximum danger
  if (nowMs >= expiryMs) {
    return 100;
  }

  const elapsedRatio = Math.min(1.0, timeElapsed / totalWindow);

  // Weighted formula: baseline perishability + elapsed proportion
  // Gives immediate risk baseline for hot/dairy items, accelerating as window closes
  const score = Math.round(baseDecayRate * 100 * (0.25 + 0.75 * elapsedRatio));
  return Math.min(100, Math.max(5, score));
}

// ============================================================================
// 2. HAVERSINE DISTANCE FORMULA
// ============================================================================
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ============================================================================
// 3. MATCHING ENGINE (onCreate trigger on `donations` collection)
// ============================================================================
export const matchDonationOnCreate = onDocumentCreated('donations/{donationId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    logger.warn('No document data present in event');
    return;
  }

  const donationId = event.params.donationId;
  const donation = snapshot.data();

  // Guard against re-triggering if already matched or delivered
  if (donation.status && donation.status !== 'posted') {
    return;
  }

  logger.info(`Starting matching engine for donation: ${donationId} (${donation.foodType})`);

  // 1. Calculate initial risk score on write
  const riskScore = calculateExpiryRiskScore(
    donation.foodType,
    donation.createdAt || new Date(),
    donation.expiryWindow
  );

  const donationLat = Number(donation.lat);
  const donationLng = Number(donation.lng);

  if (isNaN(donationLat) || isNaN(donationLng)) {
    logger.warn(`Donation ${donationId} lacks valid lat/lng coordinates`);
    await snapshot.ref.update({
      riskScore,
      unmatched: true,
      unmatchedReason: 'Missing valid GPS coordinates',
    });
    return;
  }

  // 2. Fetch all shelters
  const sheltersSnapshot = await db.collection('shelters').get();
  const eligibleShelters = [];

  for (const doc of sheltersSnapshot.docs) {
    const shelter = doc.data();
    const capacity = Number(shelter.capacity) || 0;
    const currentLoad = Number(shelter.currentLoad) || 0;
    const availableCapacity = capacity - currentLoad;

    // Filter A: Capacity constraint (capacity - currentLoad > 0)
    if (availableCapacity <= 0) {
      continue;
    }

    // Filter B: Dietary/Food preferences constraint
    // preferences empty array or null = accepts anything
    const preferences = Array.isArray(shelter.preferences) ? shelter.preferences : [];
    const acceptsFoodType =
      preferences.length === 0 || preferences.includes(donation.foodType);

    if (!acceptsFoodType) {
      continue;
    }

    // Filter C: GPS coordinate validity
    const shelterLat = Number(shelter.lat);
    const shelterLng = Number(shelter.lng);
    if (isNaN(shelterLat) || isNaN(shelterLng)) {
      continue;
    }

    // Calculate proximity
    const distanceKm = haversineDistanceKm(
      donationLat,
      donationLng,
      shelterLat,
      shelterLng
    );

    eligibleShelters.push({
      ref: doc.ref,
      id: doc.id,
      ...shelter,
      distanceKm,
    });
  }

  // 3. No eligible shelter found
  if (eligibleShelters.length === 0) {
    logger.info(`No eligible shelters found for donation ${donationId}. Setting unmatched: true`);
    await snapshot.ref.update({
      status: 'posted',
      unmatched: true,
      riskScore,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return;
  }

  // 4. Pick closest shelter (minimum Haversine distance)
  eligibleShelters.sort((a, b) => a.distanceKm - b.distanceKm);
  const bestShelter = eligibleShelters[0];

  logger.info(`Matched donation ${donationId} to shelter: ${bestShelter.id} (${bestShelter.name}) at ${bestShelter.distanceKm.toFixed(2)} km`);

  // 5. Atomic transaction: update donation and increment shelter's currentLoad
  await db.runTransaction(async (transaction) => {
    // Re-verify shelter capacity within transaction
    const freshShelterSnap = await transaction.get(bestShelter.ref);
    if (!freshShelterSnap.exists) {
      throw new Error(`Shelter ${bestShelter.id} disappeared during match`);
    }

    const freshShelter = freshShelterSnap.data();
    const currentLoad = Number(freshShelter.currentLoad) || 0;

    // Update donation status to "matched"
    transaction.update(snapshot.ref, {
      status: 'matched',
      matchedShelterId: bestShelter.uid || bestShelter.id,
      matchedShelterName: bestShelter.name || 'Shelter Hub',
      distanceKm: Math.round(bestShelter.distanceKm * 10) / 10,
      unmatched: false,
      riskScore,
      matchedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Decrement availability (increment currentLoad by 1 estimated rescue unit)
    transaction.update(bestShelter.ref, {
      currentLoad: currentLoad + 1,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
});

// ============================================================================
// 4. SCHEDULED RISK RESCORER (Every 10 minutes)
// ============================================================================
export const updateExpiryRiskScores = onSchedule('every 10 minutes', async (event) => {
  logger.info('Scheduled job: Recomputing expiry risk scores for active surplus...');

  // Query all active non-delivered donations
  const activeStatuses = ['posted', 'matched', 'picked_up'];
  const snapshot = await db
    .collection('donations')
    .where('status', 'in', activeStatuses)
    .get();

  if (snapshot.empty) {
    logger.info('No active donations to rescore');
    return;
  }

  const batch = db.batch();
  let updatedCount = 0;

  for (const doc of snapshot.docs) {
    const donation = doc.data();
    if (!donation.foodType || !donation.expiryWindow) continue;

    const newRiskScore = calculateExpiryRiskScore(
      donation.foodType,
      donation.createdAt || new Date(),
      donation.expiryWindow
    );

    // Only update if score changed
    if (newRiskScore !== donation.riskScore) {
      batch.update(doc.ref, {
        riskScore: newRiskScore,
        riskRescoredAt: FieldValue.serverTimestamp(),
      });
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    await batch.commit();
    logger.info(`Successfully rescored ${updatedCount} active donations.`);
  }
});

// ============================================================================
// 5. CONFIRMATION TRIGGER & TRUST SCORE CALCULATION
// ============================================================================
export const onConfirmationCreated = onDocumentCreated(
  'donations/{donationId}/confirmations/{confirmationId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const { donationId } = event.params;
    const confirmation = snapshot.data();
    const { donorId, shelterId, usable, rating } = confirmation;

    // Rating is 1 for usable, 0 for not usable
    const newRating = Number(rating !== undefined ? rating : usable ? 1 : 0);

    logger.info(`Processing confirmation for donation ${donationId}. Usable: ${usable}, Rating: ${newRating}`);

    // 1. Mark donation as delivered
    const donationRef = db.collection('donations').doc(donationId);
    await donationRef.update({
      status: 'delivered',
      confirmedUsable: Boolean(usable),
      deliveredAt: FieldValue.serverTimestamp(),
    });

    // 2. Helper to compute running average:
    // (previous_score * count + new_rating) / (count + 1)
    const updateEntityTrustScore = async (docRef) => {
      await db.runTransaction(async (transaction) => {
        const docSnap = await transaction.get(docRef);
        if (!docSnap.exists) return;

        const data = docSnap.data();
        const prevCount = Number(data.trustRatingCount) || 0;
        const prevScore = Number(data.trustScore !== undefined ? data.trustScore : 1.0);

        const newCount = prevCount + 1;
        const newScore = (prevScore * prevCount + newRating) / newCount;

        transaction.update(docRef, {
          trustScore: Math.round(newScore * 1000) / 1000, // round to 3 decimals
          trustRatingCount: newCount,
          lastRatedAt: FieldValue.serverTimestamp(),
        });
      });
    };

    // Update Donor Trust Score in `users` collection
    if (donorId) {
      const donorRef = db.collection('users').doc(donorId);
      await updateEntityTrustScore(donorRef);
      logger.info(`Updated trustScore for donor: ${donorId}`);
    }

    // Update Shelter Trust Score in `shelters` collection
    if (shelterId) {
      const shelterRef = db.collection('shelters').doc(shelterId);
      await updateEntityTrustScore(shelterRef);
      logger.info(`Updated trustScore for shelter: ${shelterId}`);
    }
  }
);
