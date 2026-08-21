"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
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

function FitBounds({ pins }: { pins: StorePin[] }) {
  const map = useMap();
  useEffect(() => {
    if (!pins.length) return;
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 6 });
  }, [map, pins]);
  return null;
}

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

export function StoreLocationsMap({ pins }: { pins: StorePin[] }) {
  const icon = useMemo(() => pinIcon(), []);
  const center: [number, number] = pins.length
    ? [pins[0].lat, pins[0].lng]
    : [5.6, 4.5];

  return (
    <div className="w-full overflow-hidden rounded-sm border border-white/15 bg-[#02033f] h-64 sm:h-80 lg:h-96 [&_.leaflet-container]:h-full [&_.leaflet-container]:w-full [&_.leaflet-container]:bg-[#e8eef5] [&_.leaflet-popup-content-wrapper]:rounded-sm [&_.leaflet-popup-content]:text-sm [&_.leaflet-popup-content]:text-[#03045e]">
      <MapContainer
        center={center}
        zoom={6}
        scrollWheelZoom={false}
        className="h-full w-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds pins={pins} />
        {pins.map((pin) => (
          <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={icon}>
            <Popup>
              <strong>{pin.label}</strong>
              <br />
              {pin.address}
              <br />
              <a
                href={pin.directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {pin.directionsLabel}
              </a>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
