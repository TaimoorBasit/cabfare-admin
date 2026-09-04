// @ts-nocheck
'use client';

import React, { useState, useEffect, useRef } from 'react';

const PX = {
  navy800: "#0D0E48",
  navy700: "#13155C",
  brandRed: "#CD202C",
  gray50: "#f8fafc",
  gray100: "#f1f5f9",
  gray200: "#e2e8f0",
  gray400: "#94a3b8",
  gray600: "#475569",
};

interface LocationGeo {
  lat: number;
  lng: number;
  name: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (address: string, geo: LocationGeo) => void;
  initialSearch?: string;
}

export default function LeafletMapPickerModal({ isOpen, onClose, onConfirm, initialSearch }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [selectedAddr, setSelectedAddr] = useState<string>("");
  const [selectedGeo, setSelectedGeo] = useState<LocationGeo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); } catch (_) {}
        mapInstanceRef.current = null;
      }
      markerRef.current = null;
      return;
    }

    let acListener: any = null;

    const initMap = async () => {
      if (typeof window === "undefined" || !mapContainerRef.current) return;
      let L: any;
      try { L = (await import("leaflet")).default; } catch (error) { console.warn("Leaflet failed to load; map unavailable.", error); return; }

      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); } catch (_) {}
        mapInstanceRef.current = null;
      }

      const defaultCenter: [number, number] = [52.5, -1.5]; // UK Center
      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 6,
        zoomControl: true,
      });
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Clean SVG pin matching Leaflet style
      const pinIcon = L.divIcon({
        className: 'leaflet-custom-picker-pin',
        html: `
          <div style="position: relative; width: 34px; height: 44px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35)); cursor: grab;">
            <svg width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 0C7.61116 0 0 7.61116 0 17C0 28.5 17 44 17 44C17 44 34 28.5 34 17C34 7.61116 26.3888 0 17 0Z" fill="#2563EB"/>
              <circle cx="17" cy="16" r="7" fill="#ffffff"/>
            </svg>
          </div>
        `,
        iconSize: [34, 44],
        iconAnchor: [17, 44],
        popupAnchor: [0, -40],
      });

      const marker = L.marker(defaultCenter, {
        draggable: true,
        icon: pinIcon,
      }).addTo(map);
      markerRef.current = marker;

      const fallbackNominatimReverse = async (lat: number, lng: number) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          if (data && data.display_name) {
            setSelectedAddr(data.display_name);
            setSelectedGeo({ lat, lng, name: data.display_name });
          } else {
            const coordStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            setSelectedAddr(coordStr);
            setSelectedGeo({ lat, lng, name: coordStr });
          }
        } catch (e) {
          const coordStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          setSelectedAddr(coordStr);
          setSelectedGeo({ lat, lng, name: coordStr });
        } finally {
          setLoading(false);
        }
      };

      const reverseGeocode = async (lat: number, lng: number) => {
        setLoading(true);
        try {
          if (window.google?.maps?.Geocoder) {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
              if (status === "OK" && results && results[0]) {
                const isUK = results[0].address_components?.some((c: any) => c.short_name === "GB" || c.long_name === "United Kingdom");
                if (!isUK) {
                  setLoading(false);
                  setSelectedAddr("⚠️ Service is exclusively available in the UK");
                  setSelectedGeo(null);
                  return;
                }
                const formatted = results[0].formatted_address;
                setSelectedAddr(formatted);
                setSelectedGeo({ lat, lng, name: formatted });
                setLoading(false);
              } else {
                fallbackNominatimReverse(lat, lng);
              }
            });
          } else {
            fallbackNominatimReverse(lat, lng);
          }
        } catch (_) {
          fallbackNominatimReverse(lat, lng);
        }
      };

      const updatePos = (lat: number, lng: number) => {
        marker.setLatLng([lat, lng]);
        reverseGeocode(lat, lng);
      };

      map.on("click", (e: any) => {
        updatePos(e.latlng.lat, e.latlng.lng);
      });

      marker.on("dragend", (e: any) => {
        const pos = e.target.getLatLng();
        updatePos(pos.lat, pos.lng);
      });

      if (initialSearch) {
        if (window.google?.maps?.Geocoder) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ address: initialSearch }, (results: any, status: any) => {
            if (status === "OK" && results && results[0]) {
              const loc = results[0].geometry.location;
              const lat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
              const lng = typeof loc.lng === "function" ? loc.lng() : loc.lng;
              map.setView([lat, lng], 14);
              updatePos(lat, lng);
            }
          });
        } else {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(initialSearch)}&limit=1`);
            const data = await res.json();
            if (data && data[0]) {
              const lat = parseFloat(data[0].lat);
              const lng = parseFloat(data[0].lon);
              map.setView([lat, lng], 14);
              updatePos(lat, lng);
            }
          } catch (_) {}
        }
      }

      if (window.google?.maps?.places && searchInputRef.current) {
        const ac = new window.google.maps.places.Autocomplete(searchInputRef.current, {
          componentRestrictions: { country: "gb" },
          fields: ["formatted_address", "geometry", "name"],
        });
        acListener = ac.addListener("place_changed", () => {
          const p = ac.getPlace();
          if (!p.geometry || !p.geometry.location) return;
          const lat = typeof p.geometry.location.lat === "function" ? p.geometry.location.lat() : p.geometry.location.lat;
          const lng = typeof p.geometry.location.lng === "function" ? p.geometry.location.lng() : p.geometry.location.lng;
          map.setView([lat, lng], 14);
          updatePos(lat, lng);
        });
      }

      setTimeout(() => {
        map.invalidateSize();
      }, 300);
    };

    const timer = setTimeout(initMap, 200);

    return () => {
      clearTimeout(timer);
      if (acListener && window.google?.maps?.event?.removeListener) {
        window.google.maps.event.removeListener(acListener);
      }
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); } catch (_) {}
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, initialSearch]);

  if (!isOpen) return null;

  return (
    <div style={{ position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(13,14,72,0.45)",backdropFilter:"blur(4px)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
      <div className="fade-up" style={{ width:"100%",maxWidth:620,maxHeight:"90vh",background: "#fff",borderRadius:16,overflow:"hidden",boxShadow:"0 20px 50px rgba(0,0,0,0.3)", display:"flex", flexDirection:"column" }}>
        
        {/* Header */}
        <div style={{ padding:"16px 20px",borderBottom:"1px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center", flexShrink:0 }}>
          <div style={{ fontWeight:700,color: PX.navy800,fontSize:17, display:"flex", alignItems:"center", gap:8 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            Select Location on Map
          </div>
          <button type="button" onClick={onClose} style={{ background:"none",border:"none",fontSize:22,cursor:"pointer",color: PX.gray400,lineHeight:1, display:"flex", alignItems:"center" }}>
            &times;
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ padding:"12px 20px", borderBottom:"1px solid #e2e8f0", background: "#f8fafc", flexShrink:0 }}>
          <div style={{ background: "#fff",padding:"10px 16px",borderRadius:8,border:`1.5px solid #e2e8f0`,boxShadow:"0 2px 4px rgba(0,0,0,.02)",display:"flex",alignItems:"center",gap:8 }}>
            {loading ? (
              <span className="spinning" style={{ color: PX.navy800, fontSize:16 }}>⟳</span>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            )}
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Search for a location or click/drag marker on map..." 
              value={selectedAddr} 
              onChange={e => setSelectedAddr(e.target.value)}
              style={{ flex:1, border:"none", outline:"none", fontSize:15, fontWeight:500, color: PX.navy800, background:"transparent", width:"100%" }}
            />
          </div>
        </div>

        {/* Map Container */}
        <div style={{ position:"relative", flex:1, minHeight: 280, height: 380 }}>
          <div ref={mapContainerRef} style={{ position: "absolute", top:0, left:0, right:0, bottom:0, background:PX.gray100 }}/>
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",background: PX.gray50,borderTop:"1px solid #e2e8f0", flexShrink:0 }}>
          <div style={{ fontSize:12, color: PX.gray600, maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selectedAddr ? selectedAddr : "Click anywhere on map to select coordinates"}
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button type="button" onClick={onClose} style={{ padding:"8px 16px",borderRadius:8,border: `1px solid ${PX.gray200}`,background: "#fff",cursor:"pointer",fontWeight:600,color: PX.gray600, fontSize:14 }}>
              Cancel
            </button>
            <button 
              type="button" 
              onClick={() => { if(selectedGeo) onConfirm(selectedAddr, selectedGeo); }} 
              disabled={!selectedGeo} 
              style={{ padding:"8px 18px",borderRadius:8,border:"none",background:PX.navy800,color:"#fff",cursor:selectedGeo?"pointer":"not-allowed",fontWeight:600,fontSize:14,opacity:selectedGeo?1:0.5 }}
            >
              Confirm Location
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
