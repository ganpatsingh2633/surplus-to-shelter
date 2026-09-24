import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { app, isFirebaseConfigured } from './config';

export const db = getFirestore(app);

// ==========================================
// 1. DONATIONS COLLECTION
// Schema: {
//   donorId: string,
//   foodType: string,
//   quantity: string,
//   expiryWindow: Timestamp,
//   lat: number,
//   lng: number,
//   status: "posted" | "matched" | "picked_up" | "delivered",
//   riskScore: number,
//   createdAt: Timestamp
// }
// ==========================================

export const DONATIONS_COLLECTION = 'donations';
export const SHELTERS_COLLECTION = 'shelters';
export const DRIVERS_COLLECTION = 'drivers';
export const USERS_COLLECTION = 'users';

/**
 * Creates a new donation record in `donations` collection.
 */
export async function createDonation({
  donorId,
  foodType,
  quantity,
  expiryWindow, // Date object or ISO string
  lat,
  lng,
  riskScore = 50,
}) {
  const expiryTimestamp =
    expiryWindow instanceof Date
      ? Timestamp.fromDate(expiryWindow)
      : typeof expiryWindow === 'string'
      ? Timestamp.fromDate(new Date(expiryWindow))
      : expiryWindow;

  const donationData = {
    donorId,
    foodType,
    quantity,
    expiryWindow: expiryTimestamp,
    lat: Number(lat),
    lng: Number(lng),
    status: 'posted', // "posted" | "matched" | "picked_up" | "delivered"
    riskScore: Number(riskScore),
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, DONATIONS_COLLECTION), donationData);
  return { id: docRef.id, ...donationData };
}

/**
 * Listen to donations posted by a specific donor.
 */
export function subscribeDonorDonations(donorId, callback, onError) {
  const q = query(
    collection(db, DONATIONS_COLLECTION),
    where('donorId', '==', donorId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const donations = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      callback(donations);
    },
    (err) => {
      console.warn('subscribeDonorDonations error (will fallback to unordered query if index required):', err);
      // Fallback query without orderBy in case composite index is building
      const fallbackQuery = query(
        collection(db, DONATIONS_COLLECTION),
        where('donorId', '==', donorId)
      );
      onSnapshot(fallbackQuery, (snapshot) => {
        const donations = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        // Sort locally
        donations.sort((a, b) => {
          const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return tB - tA;
        });
        callback(donations);
      }, onError);
    }
  );
}

/**
 * Real-time listener for all active/available donations.
 */
export function subscribeAllDonations(callback, onError) {
  const q = query(
    collection(db, DONATIONS_COLLECTION),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const donations = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      callback(donations);
    },
    (err) => {
      console.warn('subscribeAllDonations fallback:', err);
      const fallbackQuery = collection(db, DONATIONS_COLLECTION);
      onSnapshot(fallbackQuery, (snapshot) => {
        const donations = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        callback(donations);
      }, onError);
    }
  );
}

/**
 * Update donation status.
 * Options: "posted" | "matched" | "picked_up" | "delivered"
 */
export async function updateDonationStatus(donationId, status) {
  const docRef = doc(db, DONATIONS_COLLECTION, donationId);
  return updateDoc(docRef, {
    status,
    updatedAt: serverTimestamp(),
  });
}

// ==========================================
// 2. SHELTERS COLLECTION
// Schema: {
//   uid: string,
//   name: string,
//   capacity: number,
//   currentLoad: number,
//   lat: number,
//   lng: number,
//   preferences: string[] (array of food types)
// }
// ==========================================

/**
 * Fetch shelter details by UID.
 */
export async function getShelter(uid) {
  if (!uid) return null;
  const snap = await getDoc(doc(db, SHELTERS_COLLECTION, uid));
  return snap.exists() ? snap.data() : null;
}

/**
 * Listen to shelter profile changes.
 */
export function subscribeShelter(uid, callback, onError) {
  return onSnapshot(
    doc(db, SHELTERS_COLLECTION, uid),
    (snap) => {
      if (snap.exists()) {
        callback(snap.data());
      } else {
        callback(null);
      }
    },
    onError
  );
}

/**
 * Update or set shelter setup form data.
 */
export async function updateShelterProfile(uid, {
  name,
  capacity,
  currentLoad,
  lat,
  lng,
  preferences = [],
}) {
  const shelterRef = doc(db, SHELTERS_COLLECTION, uid);
  const data = {
    uid,
    name: name || '',
    capacity: Number(capacity) || 0,
    currentLoad: Number(currentLoad) || 0,
    lat: lat !== null && lat !== undefined && lat !== '' ? Number(lat) : null,
    lng: lng !== null && lng !== undefined && lng !== '' ? Number(lng) : null,
    preferences: Array.isArray(preferences) ? preferences : [],
    updatedAt: serverTimestamp(),
  };

  await setDoc(shelterRef, data, { merge: true });
  return data;
}

// ==========================================
// 3. DRIVERS COLLECTION
// Schema: {
//   uid: string,
//   name: string,
//   status: "available" | "busy",
//   currentLocation: { lat: number, lng: number }
// }
// ==========================================

/**
 * Fetch driver details by UID.
 */
export async function getDriver(uid) {
  if (!uid) return null;
  const snap = await getDoc(doc(db, DRIVERS_COLLECTION, uid));
  return snap.exists() ? snap.data() : null;
}

/**
 * Listen to driver details.
 */
export function subscribeDriver(uid, callback, onError) {
  return onSnapshot(
    doc(db, DRIVERS_COLLECTION, uid),
    (snap) => {
      if (snap.exists()) {
        callback(snap.data());
      } else {
        callback(null);
      }
    },
    onError
  );
}

/**
 * Update driver status: "available" or "busy".
 */
export async function updateDriverStatus(uid, status) {
  const driverRef = doc(db, DRIVERS_COLLECTION, uid);
  return setDoc(
    driverRef,
    {
      status, // "available" | "busy"
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Update driver current GPS location.
 */
export async function updateDriverLocation(uid, { lat, lng }) {
  const driverRef = doc(db, DRIVERS_COLLECTION, uid);
  return setDoc(
    driverRef,
    {
      currentLocation: {
        lat: Number(lat),
        lng: Number(lng),
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Subscribe to all shelters (for map and routing display).
 */
export function subscribeShelters(callback, onError) {
  const colRef = collection(db, SHELTERS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const shelters = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      callback(shelters);
    },
    onError
  );
}

/**
 * Assigns a driver to a donation (or multiple batched donations).
 * Status remains "matched" while driverStatus becomes "en_route_pickup".
 */
export async function acceptDonationTrip(donationIds, driverId) {
  const ids = Array.isArray(donationIds) ? donationIds : [donationIds];
  const isDemo = !isFirebaseConfigured || ids.some((id) => id.startsWith('don-') || id.startsWith('mock-'));

  if (isDemo) {
    const allDons = localStorage.getItem('sts_all_donations');
    if (allDons) {
      try {
        const parsed = JSON.parse(allDons);
        const updated = parsed.map((d) => {
          if (ids.includes(d.id)) {
            return {
              ...d,
              assignedDriverId: driverId,
              driverStatus: 'en_route_pickup',
              acceptedAt: Date.now(),
            };
          }
          return d;
        });
        localStorage.setItem('sts_all_donations', JSON.stringify(updated));
      } catch (e) {}
    }
    return { success: true, count: ids.length };
  }

  // Live Firestore updates
  const promises = ids.map((id) => {
    const docRef = doc(db, DONATIONS_COLLECTION, id);
    return updateDoc(docRef, {
      assignedDriverId: driverId,
      driverStatus: 'en_route_pickup',
      acceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await Promise.all(promises);
  return { success: true, count: ids.length };
}

/**
 * Driver marks donation as collected from donor:
 * status becomes "picked_up", driverStatus becomes "in_transit_dropoff".
 */
export async function markDonationPickedUp(donationId, driverId) {
  const isDemo = !isFirebaseConfigured || donationId.startsWith('don-') || donationId.startsWith('mock-');

  if (isDemo) {
    const allDons = localStorage.getItem('sts_all_donations');
    if (allDons) {
      try {
        const parsed = JSON.parse(allDons);
        const updated = parsed.map((d) => {
          if (d.id === donationId) {
            return {
              ...d,
              status: 'picked_up',
              driverStatus: 'in_transit_dropoff',
              pickedUpAt: Date.now(),
            };
          }
          return d;
        });
        localStorage.setItem('sts_all_donations', JSON.stringify(updated));
      } catch (e) {}
    }
    return { success: true };
  }

  const docRef = doc(db, DONATIONS_COLLECTION, donationId);
  await updateDoc(docRef, {
    status: 'picked_up',
    driverStatus: 'in_transit_dropoff',
    pickedUpAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { success: true };
}

// 4. CONFIRMATION & TRUST SCORE FLOW
// ==========================================

/**
 * Confirms receipt of donation at the shelter.
 * Prompts usability feedback, writes to `confirmations` subcollection,
 * sets donation status to "delivered", and recalculates trustScore running average.
 */
export async function confirmDonationReceived({
  donationId,
  donorId,
  shelterId,
  usable,
  note = '',
}) {
  const rating = usable ? 1 : 0;
  const now = new Date();

  // Local demo fallback
  const isDemo = !isFirebaseConfigured || donationId.startsWith('don-') || donationId.startsWith('mock-');
  if (isDemo) {
    // 1. Update donation in local storage
    const allDons = localStorage.getItem('sts_all_donations');
    if (allDons) {
      try {
        const parsed = JSON.parse(allDons);
        const updated = parsed.map((d) =>
          d.id === donationId
            ? { ...d, status: 'delivered', confirmedUsable: usable, note }
            : d
        );
        localStorage.setItem('sts_all_donations', JSON.stringify(updated));
      } catch (e) {}
    }

    // 2. Update donor trust score in localStorage
    if (donorId) {
      const donorKey = `sts_donor_trust_${donorId}`;
      const saved = localStorage.getItem(donorKey);
      let count = 0;
      let prevScore = 1.0;
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          count = parsed.count || 0;
          prevScore = parsed.score !== undefined ? parsed.score : 1.0;
        } catch (e) {}
      }
      const newCount = count + 1;
      const newScore = Math.round(((prevScore * count + rating) / newCount) * 100) / 100;
      localStorage.setItem(donorKey, JSON.stringify({ score: newScore, count: newCount }));
    }

    return { success: true, rating, usable };
  }

  // Live Firestore Implementation
  const donationRef = doc(db, DONATIONS_COLLECTION, donationId);
  const confirmationsCol = collection(db, DONATIONS_COLLECTION, donationId, 'confirmations');

  // 1. Add confirmation document
  await addDoc(confirmationsCol, {
    donationId,
    donorId: donorId || null,
    shelterId: shelterId || null,
    usable: Boolean(usable),
    rating,
    note: note || '',
    confirmedAt: serverTimestamp(),
  });

  // 2. Update donation status to "delivered"
  await updateDoc(donationRef, {
    status: 'delivered',
    confirmedUsable: Boolean(usable),
    deliveredAt: serverTimestamp(),
  });

  // 3. Helper to update running average trustScore: (prev * count + rating) / (count + 1)
  const updateRunningAverage = async (entityDocRef) => {
    try {
      const snap = await getDoc(entityDocRef);
      if (!snap.exists()) return;
      const data = snap.data();
      const count = Number(data.trustRatingCount) || 0;
      const prevScore = Number(data.trustScore !== undefined ? data.trustScore : 1.0);

      const newCount = count + 1;
      const newScore = Math.round(((prevScore * count + rating) / newCount) * 1000) / 1000;

      await setDoc(
        entityDocRef,
        {
          trustScore: newScore,
          trustRatingCount: newCount,
          lastConfirmedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Error updating running average trust score:', err);
    }
  };

  if (donorId) {
    await updateRunningAverage(doc(db, USERS_COLLECTION, donorId));
  }
  if (shelterId) {
    await updateRunningAverage(doc(db, SHELTERS_COLLECTION, shelterId));
  }

  return { success: true, rating, usable };
}

export { Timestamp, serverTimestamp };
export { isFirebaseConfigured } from './config';
