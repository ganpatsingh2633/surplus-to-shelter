/**
 * Surplus-to-Shelter Database Seeding Script (scripts/seed.js)
 * Uses Firebase Admin SDK to populate:
 * - 7 Shelters with varied capacity, load, location, and dietary preferences
 * - 12 Sample donations across different perishability risk levels and statuses
 *
 * Usage:
 *   node scripts/seed.js
 * (Optionally with service account: GOOGLE_APPLICATION_CREDENTIALS=path/to/key.json node scripts/seed.js)
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

// Initialize Firebase Admin
let app;
const projectId = process.env.FIREBASE_PROJECT_ID || 'silly-darwin';

if (getApps().length === 0) {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const serviceAccount = JSON.parse(
      fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8')
    );
    app = initializeApp({ credential: cert(serviceAccount), projectId });
  } else {
    // Initialize with default application credentials or project ID
    app = initializeApp({ projectId });
  }
}

const db = getFirestore();

console.log('====================================================');
console.log('  SURPLUS-TO-SHELTER: SEEDING DEMO ENVIRONMENT');
console.log(`  Target Project: ${projectId}`);
console.log('====================================================\n');

// 1. 7 DIVERSE SHELTERS WITH VARIED CAPACITY & LOCATIONS
const SAMPLE_SHELTERS = [
  {
    id: 'shelter-sf-mission',
    uid: 'demo-shelter-002',
    name: 'Mission Community Food Hub',
    capacity: 250,
    currentLoad: 140, // 110 meals available
    lat: 37.7608,
    lng: -122.4191,
    preferences: ['Prepared Meals (Hot)', 'Fresh Produce', 'Dairy & Eggs', 'Bakery & Bread'],
    trustScore: 0.98,
    trustRatingCount: 22,
    address: '2840 16th St, San Francisco, CA',
  },
  {
    id: 'shelter-sf-soma',
    uid: 'shelter-soma-002',
    name: 'South of Market Family Rescue',
    capacity: 180,
    currentLoad: 165, // 15 meals available (near capacity)
    lat: 37.7785,
    lng: -122.4056,
    preferences: ['Prepared Meals (Hot)', 'Dairy & Eggs'],
    trustScore: 0.95,
    trustRatingCount: 17,
    address: '880 Howard St, San Francisco, CA',
  },
  {
    id: 'shelter-sf-tenderloin',
    uid: 'shelter-tl-003',
    name: 'St. Anthony Tenderloin Dining Room',
    capacity: 400,
    currentLoad: 220, // 180 meals available
    lat: 37.7842,
    lng: -122.4144,
    preferences: [], // Empty array = accepts anything!
    trustScore: 0.99,
    trustRatingCount: 45,
    address: '150 Golden Gate Ave, San Francisco, CA',
  },
  {
    id: 'shelter-oakland-downtown',
    uid: 'shelter-oak-004',
    name: 'East Bay Community Kitchen',
    capacity: 300,
    currentLoad: 110, // 190 meals available
    lat: 37.8044,
    lng: -122.2712,
    preferences: ['Fresh Produce', 'Bakery & Bread', 'Pantry & Canned Goods'],
    trustScore: 0.92,
    trustRatingCount: 14,
    address: '1200 Broadway, Oakland, CA',
  },
  {
    id: 'shelter-berkeley-hub',
    uid: 'shelter-berk-005',
    name: 'Berkeley Food & Housing Project',
    capacity: 150,
    currentLoad: 80, // 70 meals available
    lat: 37.8688,
    lng: -122.2727,
    preferences: ['Prepared Meals (Hot)', 'Dairy & Eggs', 'Fresh Produce'],
    trustScore: 0.96,
    trustRatingCount: 19,
    address: '1901 Fairview St, Berkeley, CA',
  },
  {
    id: 'shelter-sf-richmond',
    uid: 'shelter-rich-006',
    name: 'Richmond Neighborhood Pantry',
    capacity: 120,
    currentLoad: 115, // 5 meals available (almost full)
    lat: 37.7798,
    lng: -122.4691,
    preferences: ['Pantry & Canned Goods', 'Bakery & Bread'],
    trustScore: 0.90,
    trustRatingCount: 9,
    address: '4220 Geary Blvd, San Francisco, CA',
  },
  {
    id: 'shelter-san-jose-harvest',
    uid: 'shelter-sj-007',
    name: 'Silicon Valley Second Harvest Center',
    capacity: 500,
    currentLoad: 190, // 310 meals available
    lat: 37.3382,
    lng: -121.8863,
    preferences: ['Prepared Meals (Hot)', 'Meat & Poultry', 'Fresh Produce'],
    trustScore: 0.97,
    trustRatingCount: 38,
    address: '750 Curtner Ave, San Jose, CA',
  },
];

// 2. 12 SAMPLE DONATIONS ACROSS LIFECYCLES AND RISK TIERS
const nowMs = Date.now();
const SAMPLE_DONATIONS = [
  // --- HIGH / CRITICAL RISK TIER (>66) ---
  {
    id: 'don-demo-crit-001',
    donorId: 'demo-donor-001',
    foodType: 'Prepared Meals (Hot)',
    quantity: '45 trays hot roast beef, steamed broccoli & potatoes',
    lat: 37.7795,
    lng: -122.4180,
    status: 'posted', // Ready for onCreate Cloud Function matching engine
    riskScore: 89, // Critical Risk (>66)
    expiryHours: 2,
    ageMinutesAgo: 10,
  },
  {
    id: 'don-demo-crit-002',
    donorId: 'demo-donor-001',
    foodType: 'Meat & Poultry',
    quantity: '30 lbs grilled organic chicken fillets',
    lat: 37.7655,
    lng: -122.4230,
    status: 'matched', // Matched to Mission Community Food Hub
    matchedShelterId: 'demo-shelter-002',
    matchedShelterName: 'Mission Community Food Hub',
    distanceKm: 0.8,
    riskScore: 78, // Critical Risk
    expiryHours: 3.5,
    ageMinutesAgo: 8, // eligible for 1km batching!
  },
  {
    id: 'don-demo-crit-003',
    donorId: 'demo-donor-001',
    foodType: 'Dairy & Eggs',
    quantity: '50 cartons fresh organic whole milk & Greek yogurt',
    lat: 37.7680,
    lng: -122.4210, // within 0.4km of don-demo-crit-002 (perfect for batching test!)
    status: 'matched',
    matchedShelterId: 'demo-shelter-002',
    matchedShelterName: 'Mission Community Food Hub',
    distanceKm: 0.9,
    riskScore: 72,
    expiryHours: 4,
    ageMinutesAgo: 5, // created 5 min ago (within 15 min window!)
  },
  {
    id: 'don-demo-crit-004',
    donorId: 'demo-donor-001',
    foodType: 'Seafood',
    quantity: '25 gourmet grilled salmon & quinoa meal boxes',
    lat: 37.7810,
    lng: -122.4090,
    status: 'picked_up', // Courier in transit!
    assignedDriverId: 'demo-driver-003',
    driverStatus: 'in_transit_dropoff',
    matchedShelterId: 'shelter-soma-002',
    matchedShelterName: 'South of Market Family Rescue',
    distanceKm: 1.2,
    riskScore: 85,
    expiryHours: 1.5,
    ageMinutesAgo: 45,
  },

  // --- MEDIUM RISK TIER (33-66) ---
  {
    id: 'don-demo-med-005',
    donorId: 'demo-donor-001',
    foodType: 'Fresh Produce',
    quantity: '150 lbs crisp organic gala apples, berries & baby kale',
    lat: 37.7580,
    lng: -122.4120,
    status: 'matched',
    matchedShelterId: 'demo-shelter-002',
    matchedShelterName: 'Mission Community Food Hub',
    distanceKm: 1.5,
    riskScore: 48, // Medium Risk (33-66)
    expiryHours: 18,
    ageMinutesAgo: 60,
  },
  {
    id: 'don-demo-med-006',
    donorId: 'demo-donor-001',
    foodType: 'Refrigerated Packaged',
    quantity: '60 pre-packaged turkey & provolone baguettes',
    lat: 37.7865,
    lng: -122.4110,
    status: 'picked_up',
    assignedDriverId: 'demo-driver-003',
    driverStatus: 'in_transit_dropoff',
    matchedShelterId: 'shelter-tl-003',
    matchedShelterName: 'St. Anthony Tenderloin Dining Room',
    distanceKm: 0.6,
    riskScore: 56,
    expiryHours: 8,
    ageMinutesAgo: 75,
  },
  {
    id: 'don-demo-med-007',
    donorId: 'demo-donor-001',
    foodType: 'Dairy & Eggs',
    quantity: '35 cartons pasteurized liquid eggs & cheddar wheels',
    lat: 37.8010,
    lng: -122.2740,
    status: 'posted',
    riskScore: 52,
    expiryHours: 14,
    ageMinutesAgo: 20,
  },
  {
    id: 'don-demo-med-008',
    donorId: 'demo-donor-001',
    foodType: 'Bakery & Bread',
    quantity: '75 fresh French baguettes & whole grain buns',
    lat: 37.7710,
    lng: -122.4310,
    status: 'matched',
    matchedShelterId: 'demo-shelter-002',
    matchedShelterName: 'Mission Community Food Hub',
    distanceKm: 1.8,
    riskScore: 38,
    expiryHours: 24,
    ageMinutesAgo: 90,
  },

  // --- LOW RISK TIER (<33) & COMPLETED DELIVERIES ---
  {
    id: 'don-demo-low-009',
    donorId: 'demo-donor-001',
    foodType: 'Pantry & Canned Goods',
    quantity: '100 cans organic black beans, crushed tomatoes & oats',
    lat: 37.7880,
    lng: -122.4200,
    status: 'posted',
    riskScore: 18, // Low Risk (<33)
    expiryHours: 120,
    ageMinutesAgo: 110,
  },
  {
    id: 'don-demo-deliv-010',
    donorId: 'demo-donor-001',
    foodType: 'Prepared Meals (Hot)',
    quantity: '40 chicken tikka masala meal bowls with basmati rice',
    lat: 37.7620,
    lng: -122.4170,
    status: 'delivered', // Verified delivered!
    confirmedUsable: true,
    matchedShelterId: 'demo-shelter-002',
    matchedShelterName: 'Mission Community Food Hub',
    distanceKm: 0.5,
    riskScore: 22,
    expiryHours: 6,
    ageMinutesAgo: 180,
  },
  {
    id: 'don-demo-deliv-011',
    donorId: 'demo-donor-001',
    foodType: 'Bakery & Bread',
    quantity: '60 artisanal sourdough boules and croissants',
    lat: 37.7750,
    lng: -122.4280,
    status: 'delivered',
    confirmedUsable: true,
    matchedShelterId: 'shelter-tl-003',
    matchedShelterName: 'St. Anthony Tenderloin Dining Room',
    distanceKm: 1.4,
    riskScore: 15,
    expiryHours: 36,
    ageMinutesAgo: 240,
  },
  {
    id: 'don-demo-deliv-012',
    donorId: 'demo-donor-001',
    foodType: 'Fresh Produce',
    quantity: '200 lbs organic honeycrisp apples, carrots & oranges',
    lat: 37.8050,
    lng: -122.2690,
    status: 'delivered',
    confirmedUsable: true,
    matchedShelterId: 'shelter-oak-004',
    matchedShelterName: 'East Bay Community Kitchen',
    distanceKm: 0.7,
    riskScore: 24,
    expiryHours: 48,
    ageMinutesAgo: 320,
  },
];

async function seed() {
  try {
    console.log('--> Seeding Shelters collection...');
    for (const s of SAMPLE_SHELTERS) {
      const { id, ...data } = s;
      await db.collection('shelters').doc(id).set(
        {
          ...data,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      console.log(`    + Shelter: ${s.name} (${s.currentLoad}/${s.capacity} capacity)`);
    }

    console.log('\n--> Seeding Donations collection...');
    for (const d of SAMPLE_DONATIONS) {
      const { id, expiryHours, ageMinutesAgo, ...data } = d;
      const createdAt = new Date(nowMs - ageMinutesAgo * 60 * 1000);
      const expiryWindow = new Date(nowMs + expiryHours * 3600 * 1000);

      await db.collection('donations').doc(id).set(
        {
          ...data,
          createdAt: Timestamp.fromDate(createdAt),
          expiryWindow: Timestamp.fromDate(expiryWindow),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      console.log(`    + Donation [${d.status.toUpperCase()}]: ${d.foodType} (Risk ${d.riskScore})`);
    }

    // Cache initial statistics document for Impact Dashboard
    console.log('\n--> Writing cached stats/impact aggregation document...');
    await db.collection('stats').doc('impact').set(
      {
        totalMealsRescued: 3450,
        totalKgDiverted: 1450,
        totalCo2eAvoidedKg: 3625,
        activeSheltersCount: SAMPLE_SHELTERS.length,
        verifiedDeliveriesCount: 3,
        lastComputedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log('\n====================================================');
    console.log('  SEEDING COMPLETED SUCCESSFULLY!');
    console.log(`  Seeded: ${SAMPLE_SHELTERS.length} Shelters`);
    console.log(`  Seeded: ${SAMPLE_DONATIONS.length} Donations across 3 risk tiers`);
    console.log('====================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\nSeeding failed with error:', err);
    console.log('\nNote: If using without cloud credentials, sample data is also mirrored in dummyData.js for sandbox mode.');
    process.exit(1);
  }
}

seed();
