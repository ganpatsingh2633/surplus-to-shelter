export const DEMO_CREDENTIALS = {
  donor: {
    role: 'donor',
    name: 'Golden Gate Bistro & Catering',
    email: 'donor@surplustoshelter.org',
    password: 'RescuePass123!',
    tagline: 'Surplus Food Donor (Restaurants & Caterers)',
    uid: 'demo-donor-001',
  },
  shelter: {
    role: 'shelter',
    name: 'Mission Community Food Hub',
    email: 'shelter@surplustoshelter.org',
    password: 'RescuePass123!',
    tagline: 'Shelter Hub (Capacity: 200 | Load: 135)',
    uid: 'demo-shelter-002',
  },
  driver: {
    role: 'driver',
    name: 'Alex Rivera (Rescue Logistics)',
    email: 'driver@surplustoshelter.org',
    password: 'RescuePass123!',
    tagline: 'Courier Driver (Active Fleet Telemetry)',
    uid: 'demo-driver-003',
  },
};

/**
 * Initializes rich mock data across all 3 roles in localStorage
 * so the user can immediately test and monitor all operations.
 */
export function initializeDummyData() {
  const now = Date.now();

  // 1. Initial Donations in all 4 lifecycles
  const allDonationsKey = 'sts_all_donations';
  const existingAll = localStorage.getItem(allDonationsKey);
  
  if (!existingAll) {
    const dummyDonations = [
      {
        id: 'don-001',
        donorId: DEMO_CREDENTIALS.donor.uid,
        foodType: 'Prepared Meals (Hot)',
        quantity: '35 gourmet lasagna & soup lunch boxes',
        expiryWindow: { toMillis: () => now + 2.5 * 3600 * 1000 },
        lat: 37.7795,
        lng: -122.4180,
        status: 'posted',
        riskScore: 88, // Critical Risk
        createdAt: { toMillis: () => now - 25 * 60 * 1000 },
      },
      {
        id: 'don-002',
        donorId: DEMO_CREDENTIALS.donor.uid,
        foodType: 'Meat & Poultry',
        quantity: '20 lbs grilled chicken breast fillets',
        expiryWindow: { toMillis: () => now + 4 * 3600 * 1000 },
        lat: 37.7830,
        lng: -122.4080,
        status: 'posted',
        riskScore: 82, // Critical Risk
        createdAt: { toMillis: () => now - 45 * 60 * 1000 },
      },
      {
        id: 'don-003',
        donorId: DEMO_CREDENTIALS.donor.uid,
        foodType: 'Dairy & Eggs',
        quantity: '40 cartons pasture-raised milk & Greek yogurt',
        expiryWindow: { toMillis: () => now + 12 * 3600 * 1000 },
        lat: 37.7650,
        lng: -122.4240,
        status: 'matched',
        riskScore: 65, // High Risk
        createdAt: { toMillis: () => now - 90 * 60 * 1000 },
      },
      {
        id: 'don-004',
        donorId: DEMO_CREDENTIALS.donor.uid,
        foodType: 'Fresh Produce',
        quantity: '120 lbs ripe avocados, strawberries & spinach',
        expiryWindow: { toMillis: () => now + 28 * 3600 * 1000 },
        lat: 37.7580,
        lng: -122.4120,
        status: 'picked_up',
        riskScore: 35, // Moderate Risk
        createdAt: { toMillis: () => now - 180 * 60 * 1000 },
      },
      {
        id: 'don-005',
        donorId: DEMO_CREDENTIALS.donor.uid,
        foodType: 'Bakery & Bread',
        quantity: '55 artisanal sourdough loaves and baguettes',
        expiryWindow: { toMillis: () => now + 20 * 3600 * 1000 },
        lat: 37.7710,
        lng: -122.4310,
        status: 'delivered',
        riskScore: 20, // Low Risk
        createdAt: { toMillis: () => now - 240 * 60 * 1000 },
      },
      {
        id: 'don-006',
        donorId: DEMO_CREDENTIALS.donor.uid,
        foodType: 'Prepared Meals (Hot)',
        quantity: '25 hot vegetable curries & brown rice bowls',
        expiryWindow: { toMillis: () => now + 3 * 3600 * 1000 },
        lat: 37.7680,
        lng: -122.4215, // ~0.4 km from don-003
        status: 'matched',
        matchedShelterId: 'demo-shelter-002',
        matchedShelterName: 'Mission Community Food Hub',
        riskScore: 78,
        createdAt: { toMillis: () => now - 8 * 60 * 1000 }, // 8 minutes ago
      },
    ];

    localStorage.setItem(allDonationsKey, JSON.stringify(dummyDonations));
    localStorage.setItem(`sts_demo_donations_${DEMO_CREDENTIALS.donor.uid}`, JSON.stringify(dummyDonations));
  }

  // 2. Shelter setup data
  const shelterKey = `sts_demo_shelter_${DEMO_CREDENTIALS.shelter.uid}`;
  if (!localStorage.getItem(shelterKey)) {
    const dummyShelter = {
      uid: DEMO_CREDENTIALS.shelter.uid,
      name: 'Mission Community Food Hub',
      capacity: 200,
      currentLoad: 135,
      lat: '37.7608',
      lng: '-122.4191',
      preferences: [
        'Prepared Meals (Hot)',
        'Fresh Produce',
        'Dairy & Eggs',
        'Bakery & Bread',
      ],
    };
    localStorage.setItem(shelterKey, JSON.stringify(dummyShelter));
  }

  // 3. Driver telemetry data
  const driverKey = `sts_demo_driver_${DEMO_CREDENTIALS.driver.uid}`;
  if (!localStorage.getItem(driverKey)) {
    const dummyDriver = {
      uid: DEMO_CREDENTIALS.driver.uid,
      name: 'Alex Rivera (Rescue Logistics)',
      status: 'available',
      currentLocation: {
        lat: 37.7749,
        lng: -122.4194,
      },
    };
    localStorage.setItem(driverKey, JSON.stringify(dummyDriver));
  }
}
