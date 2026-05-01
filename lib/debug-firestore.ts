import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export async function debugShopData() {
  try {
    const shopsRef = collection(db, 'barbershops');
    const snapshot = await getDocs(query(shopsRef, where('active', '==', true)));
    
    console.log(`\n=== DEBUG: Found ${snapshot.docs.length} active shops ===\n`);
    
    for (const shopDoc of snapshot.docs.slice(0, 3)) {
      const shop = shopDoc.data();
      console.log(`\n📍 Shop: ${shop.name} (${shopDoc.id})`);
      console.log(`   Rating: ${shop.rating} (Type: ${typeof shop.rating})`);
      console.log(`   hoursSummary: ${shop.hoursSummary ? 'YES' : 'NO'}`);
      
      // Check hours subcollection
      const hoursRef = collection(db, 'barbershops', shopDoc.id, 'hours');
      const hoursSnap = await getDocs(hoursRef);
      console.log(`   Hours subcollection: ${hoursSnap.docs.length} entries`);
      
      if (hoursSnap.docs.length > 0) {
        const sample = hoursSnap.docs[0].data();
        console.log(`   Sample hour entry:`, JSON.stringify(sample, null, 2));
      }
    }
  } catch (error) {
    console.error('Debug error:', error);
  }
}
