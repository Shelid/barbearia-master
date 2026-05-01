import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const region = req.nextUrl.searchParams.get('region') || 'asturias';
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '3');

    const shopsQuery = query(
      collection(db, 'barbershops'),
      where('active', '==', true),
      where('setupComplete', '==', true)
    );

    const snapshot = await getDocs(shopsQuery);
    const shops = snapshot.docs
      .map((doc) => doc.data())
      .filter((shop) => {
        const shopRegion = (shop.regionSlug || '').toLowerCase().trim();
        return shopRegion.includes(region);
      })
      .slice(0, limit);

    const shopDetails = await Promise.all(
      shops.map(async (shop) => {
        const hoursRef = collection(db, 'barbershops', shop.id, 'hours');
        const hoursSnap = await getDocs(hoursRef);
        return {
          id: shop.id,
          name: shop.name,
          rating: shop.rating,
          hoursSummary: shop.hoursSummary ? 'exists' : 'empty',
          hoursSubcollection: hoursSnap.docs.length,
          hoursSample: hoursSnap.docs[0]?.data(),
        };
      })
    );

    return NextResponse.json({
      region,
      shops: shopDetails,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
