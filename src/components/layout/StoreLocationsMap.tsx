"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type StorePin = {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  directionsUrl: string;
  directionsLabel: string;
};

function pinIcon() {
  return L.divIcon({
    className: "",
    html: `<span style="
      display:block;width:18px;height:18px;border-radius:9999px;
      background:#FFD200;border:3px solid #03045e;
      box-shadow:0 2px 8px rgba(0,0,0,.35);
    "></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

type LeafletElement = HTMLElement & { _leaflet_id?: number };

function clearLeafletContainer(el: LeafletElement) {
  if (el._leaflet_id != null) {
    delete el._leaflet_id;
  }
}

export function StoreLocationsMap({ pins }: { pins: StorePin[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    clearLeafletContainer(el);

    const center: [number, number] = pins.length
      ? [pins[0].lat, pins[0].lng]
      : [5.6, 4.5];

    const map = L.map(el, { scrollWheelZoom: false }).setView(center, 6);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    if (pins.length) {
      const bounds = L.latLngBounds(pins.map((pin) => [pin.lat, pin.lng]));
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 6 });
    }

    const icon = pinIcon();
    for (const pin of pins) {
      L.marker([pin.lat, pin.lng], { icon })
        .addTo(map)
        .bindPopup(
          `<strong>${pin.label}</strong><br>${pin.address}<br><a href="${pin.directionsUrl}" target="_blank" rel="noopener noreferrer" class="underline">${pin.directionsLabel}</a>`
        );
    }

    return () => {
      map.remove();
      mapRef.current = null;
      clearLeafletContainer(el);
    };
  }, [pins]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-sm border border-white/15 bg-[#02033f] h-64 sm:h-80 lg:h-96 [&_.leaflet-container]:h-full [&_.leaflet-container]:w-full [&_.leaflet-container]:bg-[#e8eef5] [&_.leaflet-popup-content-wrapper]:rounded-sm [&_.leaflet-popup-content]:text-sm [&_.leaflet-popup-content]:text-[#03045e]"
    />
  );
}
