import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  getNextAvailableSlot,
  HoursSummaryItem,
  BookedSlot,
  OverrideItem,
  ClosureItem,
} from '@/lib/shop-summary';

export interface ShopHoursData {
  nextSlot: string;
  nextSlotValue: number;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook that lazily loads shop hours and booked slots to calculate truly available times.
 * Considers both shop hours AND existing bookings, overrides, and closures.
 */
export function useShopHours(
  shopId: string,
  enabled: boolean = true
): ShopHoursData {
  const [data, setData] = useState<ShopHoursData>({
    nextSlot: 'Abierto hoy',
    nextSlotValue: 0,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    if (!enabled || !shopId) {
      setData((prev) => ({
        ...prev,
        isLoading: false,
      }));
      return;
    }

    let isActive = true;
    let hoursSummary: HoursSummaryItem[] = [];
    let bookedSlots: BookedSlot[] = [];
    let overrides: OverrideItem[] = [];
    let closures: ClosureItem[] = [];
    let barberCount = 1;
    let allDataLoaded = false;

    const refreshSlot = () => {
      if (!isActive || !allDataLoaded) return;

      if (hoursSummary.length === 0) {
        setData({
          nextSlot: 'Consultar',
          nextSlotValue: Infinity,
          isLoading: false,
          error: null,
        });
        return;
      }

      const slotData = getNextAvailableSlot(
        hoursSummary,
        bookedSlots,
        barberCount,
        overrides,
        closures,
        new Date()
      );

      console.log(`[useShopHours] ${shopId} - bookedSlots: ${bookedSlots.length}, result: ${slotData.nextSlot}`);

      setData({
        nextSlot: slotData.nextSlot,
        nextSlotValue: slotData.nextSlotValue,
        isLoading: false,
        error: null,
      });
    };

    const loadInitialData = async () => {
      try {
        // Load hours (required)
        const hoursSnap = await getDocs(collection(db, 'barbershops', shopId, 'hours'));
        hoursSummary = hoursSnap.docs.map((doc) => doc.data() as HoursSummaryItem);

        // Load booked slots (required for accurate calculation)
        const bookedSnap = await getDocs(
          query(
            collection(db, 'barbershops', shopId, 'booked_slots'),
            where('status', 'in', ['pending', 'confirmed'])
          )
        );
        bookedSlots = bookedSnap.docs.map((doc) => doc.data() as BookedSlot);

        // Load barbers (required for slot count)
        const barbersSnap = await getDocs(collection(db, 'barbershops', shopId, 'barbers'));
        barberCount = Math.max(
          1,
          barbersSnap.docs.filter((doc) => (doc.data() as { active?: boolean }).active !== false).length
        );

        allDataLoaded = true;
        refreshSlot();
      } catch (error) {
        console.error(`[useShopHours] Failed to load initial data for ${shopId}:`, error);
        if (isActive) {
          setData({
            nextSlot: 'Consultar',
            nextSlotValue: Infinity,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load hours',
          });
        }
      }
    };

    loadInitialData();

    const unsubscribeHours = onSnapshot(
      collection(db, 'barbershops', shopId, 'hours'),
      (snapshot) => {
        hoursSummary = snapshot.docs.map((doc) => doc.data() as HoursSummaryItem);
        refreshSlot();
      },
      (error) => {
        console.error(`[useShopHours] hours listener failed for ${shopId}:`, error);
      }
    );

    const unsubscribeBooked = onSnapshot(
      query(
        collection(db, 'barbershops', shopId, 'booked_slots'),
        where('status', 'in', ['pending', 'confirmed'])
      ),
      (snapshot) => {
        bookedSlots = snapshot.docs.map((doc) => doc.data() as BookedSlot);
        console.log(`[useShopHours] Booked slots updated for ${shopId}: ${bookedSlots.length} slots`);
        refreshSlot();
      },
      (error) => {
        console.error(`[useShopHours] booked_slots listener failed for ${shopId}:`, error);
      }
    );

    const unsubscribeOverrides = onSnapshot(
      collection(db, 'barbershops', shopId, 'overrides'),
      (snapshot) => {
        overrides = snapshot.docs.map((doc) => doc.data() as OverrideItem);
        refreshSlot();
      },
      (error) => {
        console.error(`[useShopHours] overrides listener failed for ${shopId}:`, error);
      }
    );

    const unsubscribeClosures = onSnapshot(
      collection(db, 'barbershops', shopId, 'closures'),
      (snapshot) => {
        closures = snapshot.docs.map((doc) => doc.data() as ClosureItem);
        refreshSlot();
      },
      (error) => {
        console.error(`[useShopHours] closures listener failed for ${shopId}:`, error);
      }
    );

    return () => {
      isActive = false;
      unsubscribeHours();
      unsubscribeBooked();
      unsubscribeOverrides();
      unsubscribeClosures();
    };
  }, [shopId, enabled]);

  return data;
}
