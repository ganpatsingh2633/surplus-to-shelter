import { seedDatabase, DEMO_ACCOUNTS } from './src/utils/seedData.js';

console.log('--------------------------------------------------');
console.log('Surplus-to-Shelter: Seeding Demo Accounts & Data');
console.log('--------------------------------------------------');

seedDatabase(console.log)
  .then(() => {
    console.log('\n==================================================');
    console.log('DEMO ACCOUNTS READY TO USE:');
    console.log('==================================================');
    DEMO_ACCOUNTS.forEach((acc) => {
      console.log(`Role:     ${acc.role.toUpperCase()}`);
      console.log(`Name:     ${acc.name}`);
      console.log(`Email:    ${acc.email}`);
      console.log(`Password: ${acc.password}`);
      console.log('--------------------------------------------------');
    });
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nSeeding failed:', err.message);
    if (err.code === 'auth/operation-not-allowed') {
      console.error('\n--> IMPORTANT: Please enable "Email/Password" in Firebase Console > Authentication > Sign-in method!');
    } else if (err.code === 'permission-denied') {
      console.error('\n--> IMPORTANT: Please create Cloud Firestore in Test Mode in Firebase Console > Firestore Database!');
    }
    process.exit(1);
  });
