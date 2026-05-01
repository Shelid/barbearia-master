'use client';

import React from 'react';
import Link from 'next/link';
import { Star, MapPin, Clock, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useShopHours } from '@/hooks/use-shop-hours';
import { useShopRating } from '@/hooks/use-shop-rating';

interface BarbershopCardProps {
  shop: {
    id: string;
    slug: string;
    name: string;
    city: string;
    rating: number;
    reviewsCount: number;
    nextSlot: string;
    image: string;
    distance?: string;
    priceRange: string;
  };
  loadHours?: boolean;
}

export function BarbershopCard({ shop, loadHours = true }: BarbershopCardProps) {
  const hoursData = useShopHours(shop.id, loadHours);
  const rawRating = Number(shop.rating || 0);
  const rawReviewsCount = Number(shop.reviewsCount || 0);
  const { rating: computedRating } = useShopRating(shop.id, rawRating, rawReviewsCount);
  const ratingLabel = computedRating > 0 ? computedRating.toFixed(1) : 'Nuevo';

  return (
    <Link href={`/${shop.slug}`}>
      <Card className="group overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300">
        <div className="relative aspect-[16/10] overflow-hidden">
          <img 
            src={shop.image} 
            alt={shop.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
            <Badge className="bg-white/90 text-black hover:bg-white border-none backdrop-blur-sm">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 mr-1" />
              {ratingLabel}
            </Badge>
            {shop.distance && (
              <Badge variant="secondary" className="backdrop-blur-sm bg-black/50 text-white border-none">
                {shop.distance}
              </Badge>
            )}
          </div>
        </div>
        <CardContent className="p-5">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-display text-xl font-bold group-hover:text-primary transition-colors">{shop.name}</h3>
            <span className="text-sm font-medium text-muted-foreground">{shop.priceRange}</span>
          </div>
          
          <div className="flex items-center gap-1 text-muted-foreground text-sm mb-4">
            <MapPin className="w-3 h-3" />
            <span>{shop.city}</span>
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="font-medium">
                Próximo: {hoursData.isLoading ? (
                  <Loader2 className="w-3 h-3 inline animate-spin ml-1" />
                ) : (
                  hoursData.nextSlot
                )}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
