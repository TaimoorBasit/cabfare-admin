// @ts-nocheck
'use client';

import React, { useEffect, useRef } from 'react';

interface Props {
  lat: number;
  lng: number;
  darkMode?: boolean;
}

export default function LeafletDepotMap({ lat, lng, darkMode = false }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    let isCancelled = false;

    const initMap = async () => {
      if (typeof window === "undefined" || !mapContainerRef.current || !lat || !lng) return;
      const L = (await import("leaflet")).default;
      if (isCancelled) return;

      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); } catch (_) {}
        mapInstanceRef.current = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      });
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      const depotIcon = L.divIcon({
        className: 'custom-depot-marker',
        html: `
          <div style="width: 28px; height: 28px; border-radius: 50%; background: #A22D3A; border: 2.5px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 800; font-size: 11px;">
            D
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14],
      });

      L.marker([lat, lng], { icon: depotIcon }).addTo(map);

      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);
    };

    initMap();

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); } catch (_) {}
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lng]);

  return (
    <div 
      ref={mapContainerRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'absolute', 
        top: 0, 
        left: 0,
        borderRadius: 8,
        overflow: 'hidden'
      }} 
    />
  );
}
