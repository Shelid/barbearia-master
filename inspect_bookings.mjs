import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, collectionGroup } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function inspectBookings() {
  const snapshot = await getDocs(collectionGroup(db, 'bookings'));
  const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  console.log("All bookings:", bookings);
  
  process.exit(0);
}

inspectBookings().catch(console.error);
