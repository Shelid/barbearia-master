import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function cleanShops() {
  const snapshot = await getDocs(collection(db, 'barbershops'));
  const shops = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  let deletedCount = 0;
  for (const shop of shops) {
    if (shop.name?.toLowerCase().includes('garcias') || shop.name?.toLowerCase().includes('garcía') || shop.name === 'Barbearia Garcias') {
      console.log(`Deleting orphan: ${shop.id} - ${shop.name}`);
      await deleteDoc(doc(db, 'barbershops', shop.id));
      deletedCount++;
    }
  }
  
  console.log(`Finished. Deleted ${deletedCount} shops.`);
  process.exit(0);
}

cleanShops().catch(console.error);
