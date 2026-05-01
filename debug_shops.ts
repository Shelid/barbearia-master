
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app);

async function listShops() {
  const snapshot = await getDocs(collection(db, 'barbershops'));
  const shops = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
  console.log('--- BARBERSHOPS IN DB ---');
  shops.forEach(s => {
    console.log(`ID: ${s.id} | Name: ${s.name} | Slug: ${s.slug} | City: ${s.city} | Active: ${s.active} | Owner: ${s.ownerUid}`);
  });
  console.log('-------------------------');
}

listShops().catch(console.error);
