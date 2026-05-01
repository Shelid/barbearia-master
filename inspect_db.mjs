import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function inspectShops() {
  const snapshot = await getDocs(collection(db, 'barbershops'));
  const shops = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  for (const shop of shops) {
    if (shop.name?.toLowerCase().includes('garcias') || shop.name?.toLowerCase().includes('garcía') || shop.name === 'Barbearia Garcias') {
      console.log(shop);
    }
  }
  
  process.exit(0);
}

inspectShops().catch(console.error);
