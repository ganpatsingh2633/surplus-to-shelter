import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC9PYYYHifT-u_FmnXwA33VYJ6xmM2d20o",
  authDomain: "silly-darwin.firebaseapp.com",
  projectId: "silly-darwin",
  storageBucket: "silly-darwin.firebasestorage.app",
  messagingSenderId: "166066964899",
  appId: "1:166066964899:web:11d05dc6e85757af89f216"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export const DEMO_ACCOUNTS = [
  {
    role: 'donor',
    name: 'Golden Gate Bistro & Catering',
    email: 'donor@surplustoshelter.org',
    password: 'RescuePass123!',
  },
  {
    role: 'shelter',
    name: 'Mission Community Food Hub',
    email: 'shelter@surplustoshelter.org',
    password: 'RescuePass123!',
  },
  {
    role: 'driver',
    name: 'Alex Rivera (Rescue Logistics)',
    email: 'driver@surplustoshelter.org',
    password: 'RescuePass123!',
  },
];

async function getOrCreateUser(account) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, account.email, account.password);
    await updateProfile(cred.user, { displayName: account.name });
    console.log(`Created new auth account for: ${account.email}`);
    return cred.user;
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      const cred = await signInWithEmailAndPassword(auth, account.email, account.password);
      console.log(`Signed in existing auth account for: ${account.email}`);
      return cred.user;
    }
    throw err;
  }
}

export async function seedDatabase(onProgress = console.log) {
  onProgress('Starting database seeding...');
  const userMap = {};

  // 1. Create or sign into the 3 Firebase Auth users
  for (const account of DEMO_ACCOUNTS) {
    onProgress(`Setting up ${account.role} account (${account.email})...`);
    const user = await getOrCreateUser(account);
    userMap[account.role] = user;

    // Write to users collection
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      name: account.name,
      role: account.role,
      email: account.email,
      createdAt: serverTimestamp(),
    }, { merge: true });
  }

  const donorUid = userMap['donor'].uid;
  const shelterUid = userMap['shelter'].uid;
  const driverUid = userMap['driver'].uid;

  // 2. Seed Shelter Profile
  onProgress('Seeding Shelter Hub profiles...');
  await setDoc(doc(db, 'shelters', shelterUid), {
    uid: shelterUid,
    name: 'Mission Community Food Hub',
    capacity: 200,
    currentLoad: 135,
    lat: 37.7608,
    lng: -122.4191,
    preferences: [
      'Prepared Meals (Hot)',
      'Fresh Produce',
      'Dairy & Eggs',
      'Bakery & Bread',
    ],
    updatedAt: serverTimestamp(),
  }, { merge: true });

  // 3. Seed Driver Status & Telemetry
  onProgress('Seeding Driver telemetry & duty status...');
  await setDoc(doc(db, 'drivers', driverUid), {
    uid: driverUid,
    name: 'Alex Rivera (Rescue Logistics)',
    status: 'available',
    currentLocation: {
      lat: 37.7749,
      lng: -122.4194,
    },
    updatedAt: serverTimestamp(),
  }, { merge: true });

  // 4. Seed Diverse Donations in All Stages of Rescue Flow
  onProgress('Seeding active and historical surplus donations...');
  const now = Date.now();

  const dummyDonations = [
    {
      donorId: donorUid,
      foodType: 'Prepared Meals (Hot)',
      quantity: '35 boxed gourmet lasagna & salad trays',
      expiryWindow: Timestamp.fromDate(new Date(now + 2.5 * 3600 * 1000)), // 2.5 hrs remaining
      lat: 37.7795,
      lng: -122.4180,
      status: 'posted',
      riskScore: 88, // Critical Risk
      createdAt: serverTimestamp(),
    },
    {
      donorId: donorUid,
      foodType: 'Meat & Poultry',
      quantity: '20 lbs grilled chicken fillets (vacuum sealed)',
      expiryWindow: Timestamp.fromDate(new Date(now + 4 * 3600 * 1000)), // 4 hrs remaining
      lat: 37.7830,
      lng: -122.4080,
      status: 'posted',
      riskScore: 82, // Critical Risk
      createdAt: serverTimestamp(),
    },
    {
      donorId: donorUid,
      foodType: 'Dairy & Eggs',
      quantity: '40 cartons fresh pasture-raised milk & Greek yogurt',
      expiryWindow: Timestamp.fromDate(new Date(now + 12 * 3600 * 1000)), // 12 hrs remaining
      lat: 37.7650,
      lng: -122.4240,
      status: 'matched',
      riskScore: 65, // High Risk
      createdAt: serverTimestamp(),
    },
    {
      donorId: donorUid,
      foodType: 'Fresh Produce',
      quantity: '120 lbs ripe avocados, strawberries, and organic spinach',
      expiryWindow: Timestamp.fromDate(new Date(now + 28 * 3600 * 1000)), // 28 hrs remaining
      lat: 37.7580,
      lng: -122.4120,
      status: 'picked_up',
      riskScore: 35, // Moderate Risk
      createdAt: serverTimestamp(),
    },
    {
      donorId: donorUid,
      foodType: 'Bakery & Bread',
      quantity: '55 artisanal sourdough loaves and assorted baguettes',
      expiryWindow: Timestamp.fromDate(new Date(now + 20 * 3600 * 1000)), // 20 hrs remaining
      lat: 37.7710,
      lng: -122.4310,
      status: 'delivered',
      riskScore: 25, // Low Risk
      createdAt: serverTimestamp(),
    },
  ];

  for (const donation of dummyDonations) {
    await addDoc(collection(db, 'donations'), donation);
  }

  onProgress('Database seeding completed successfully!');
  return { success: true, accounts: DEMO_ACCOUNTS };
}
