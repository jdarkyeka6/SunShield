'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';

type Point = { lat: number; lon: number };

type Props = {
  route: [number, number][];
  start: Point;
  end: Point;
};

export default function RouteMap({ route, start, end }: Props) {
  const el = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!el.current || route.length < 2) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(el.current, {
      zoomControl: true,
      attributionControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const latLngs = route.map(([lon, lat]) => L.latLng(lat, lon));
    const line = L.polyline(latLngs, {
      color: '#ffb703',
      weight: 6,
      opacity: 0.92,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    const startIcon = L.divIcon({
      className: 'sunshield-marker-wrap',
      html: '<div class="sunshield-marker start">A</div>',
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    const endIcon = L.divIcon({
      className: 'sunshield-marker-wrap',
      html: '<div class="sunshield-marker end">B</div>',
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    L.marker([start.lat, start.lon], { icon: startIcon }).addTo(map);
    L.marker([end.lat, end.lon], { icon: endIcon }).addTo(map);
    map.fitBounds(line.getBounds(), { padding: [28, 28] });

    mapRef.current = map;

    const timer = window.setTimeout(() => map.invalidateSize(), 50);
    return () => {
      window.clearTimeout(timer);
      map.remove();
      mapRef.current = null;
    };
  }, [route, start.lat, start.lon, end.lat, end.lon]);

  return <div ref={el} className="routeMap" aria-label="Trip route map" />;
}
