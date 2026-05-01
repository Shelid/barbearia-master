'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { Coordinates } from '@/lib/geo';

type LocationPickerMapProps = {
  value: Coordinates | null;
  onChange: (coordinates: Coordinates) => void;
};

const DEFAULT_CENTER: Coordinates = {
  latitude: 40.4168,
  longitude: -3.7038,
};

const DEFAULT_ZOOM = 6;
const DETAIL_ZOOM = 17;

const markerIcon = L.divIcon({
  className: 'location-pin-icon',
  html: '<div class="location-pin-marker"><div class="location-pin-marker__dot"></div></div>',
  iconSize: [30, 42],
  iconAnchor: [15, 42],
});

function roundCoordinate(value: number) {
  return Number(value.toFixed(6));
}

function MapViewportSync({ value }: { value: Coordinates | null }) {
  const map = useMap();

  useEffect(() => {
    if (!value) return;

    map.flyTo([value.latitude, value.longitude], DETAIL_ZOOM, {
      duration: 0.4,
    });
  }, [map, value?.latitude, value?.longitude]);

  return null;
}

function ClickHandler({ onChange }: { onChange: (coordinates: Coordinates) => void }) {
  useMapEvents({
    click(event) {
      onChange({
        latitude: roundCoordinate(event.latlng.lat),
        longitude: roundCoordinate(event.latlng.lng),
      });
    },
  });

  return null;
}

export default function LocationPickerMap({ value, onChange }: LocationPickerMapProps) {
  return (
    <div className="location-picker-map h-[320px] w-full">
      <MapContainer
        center={[value?.latitude ?? DEFAULT_CENTER.latitude, value?.longitude ?? DEFAULT_CENTER.longitude]}
        zoom={value ? DETAIL_ZOOM : DEFAULT_ZOOM}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewportSync value={value} />
        <ClickHandler onChange={onChange} />
        {value && (
          <Marker
            position={[value.latitude, value.longitude]}
            icon={markerIcon}
            draggable
            eventHandlers={{
              dragend: (event) => {
                const marker = event.target as L.Marker;
                const latLng = marker.getLatLng();
                onChange({
                  latitude: roundCoordinate(latLng.lat),
                  longitude: roundCoordinate(latLng.lng),
                });
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
