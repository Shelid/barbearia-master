import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface ShopRatingData {
  rating: number;
  reviewsCount: number;
  isLoading: boolean;
  error: string | null;
}

export function useShopRating(
  shopId: string,
  initialRating: number = 0,
  initialReviewsCount: number = 0
): ShopRatingData {
  const [rating, setRating] = useState(initialRating);
  const [reviewsCount, setReviewsCount] = useState(initialReviewsCount);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shopId) {
      setRating(initialRating);
      setReviewsCount(initialReviewsCount);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const fetchReviews = async () => {
      try {
        const reviewsSnap = await getDocs(collection(db, 'barbershops', shopId, 'reviews'));
        if (cancelled) return;

        const reviews = reviewsSnap.docs.map((doc) => doc.data() as { rating?: number });
        const count = reviews.length;
        const average =
          count > 0
            ? reviews.reduce((total, review) => total + (typeof review.rating === 'number' ? review.rating : 0), 0) / count
            : initialRating;

        setReviewsCount(count);
        setRating(count > 0 ? average : initialRating);
      } catch (err) {
        if (!cancelled) {
          console.error(`[useShopRating] Error fetching reviews for ${shopId}:`, err);
          setError(err instanceof Error ? err.message : 'Error loading reviews');
          setRating(initialRating);
          setReviewsCount(initialReviewsCount);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchReviews();

    return () => {
      cancelled = true;
    };
  }, [shopId, initialRating, initialReviewsCount]);

  return {
    rating,
    reviewsCount,
    isLoading,
    error,
  };
}
