'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import RegionView from './RegionView';
import ShopView from './ShopView';

const KNOWN_REGIONS = [
  'andalucia', 'aragon', 'asturias', 'baleares', 'islas-baleares', 'canarias', 'cantabria', 
  'castilla-la-mancha', 'castilla-y-leon', 'cataluna', 'comunidad-valenciana', 
  'extremadura', 'galicia', 'madrid', 'murcia', 'navarra', 'pais-vasco', 'la-rioja',
  'ceuta', 'melilla'
];

export default function DynamicSlugPage() {
  const params = useParams();
  const router = useRouter();
  const slugOrRegion = (params.region as string)?.toLowerCase();
  
  const [type, setType] = useState<'loading' | 'region' | 'shop'>('loading');
  const [shopData, setShopData] = useState<any>(null);

  useEffect(() => {
    if (!slugOrRegion) return;
    
    // First, check if it's a known region
    if (KNOWN_REGIONS.includes(slugOrRegion)) {
      setType('region');
      return;
    }
    
    // If not a region, check if it's a barbershop slug
    const checkShop = async () => {
      try {
        const shopsQuery = query(collection(db, 'barbershops'), where('slug', '==', slugOrRegion));
        const shopsSnapshot = await getDocs(shopsQuery);
        
        const shopDoc = shopsSnapshot.docs.find(doc => doc.data().active !== false && doc.data().setupComplete === true);
        
        if (shopDoc) {
          setType('shop');
          setShopData({ id: shopDoc.id, ...shopDoc.data() });
        } else {
          // If not found, default back to region view so it shows "No encontramos barberias" 
          // or we could redirect to home. Let's show the region view as a fallback.
          setType('region');
        }
      } catch (e) {
        console.error("Error checking slug:", e);
        setType('region');
      }
    };
    
    checkShop();
  }, [slugOrRegion]);

  if (type === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-slate-900" />
      </div>
    );
  }

  if (type === 'shop' && shopData) {
    return <ShopView slug={slugOrRegion} preloadedShop={shopData} />;
  }

  return <RegionView region={slugOrRegion} />;
}
