/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";

let loadPromise: Promise<typeof google> | null = null;

function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.google?.maps) return Promise.resolve(window.google);
  if (loadPromise) return loadPromise;

  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
  loadPromise = new Promise((resolve, reject) => {
    const cbName = "__tfInitMap";
    (window as unknown as Record<string, unknown>)[cbName] = () => resolve(window.google);
    const s = document.createElement("script");
    s.async = true;
    s.defer = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=${cbName}&channel=${channel}`;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return loadPromise;
}

// Apple-like map styling
const lightStyle: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f7f5f2" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#5b5b5b" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#f0ebe3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#e9dfd0" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#b9d6e8" }] },
];

const darkStyle: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1c2030" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#a3a8b8" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1c2030" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a3045" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#2f3650" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3a4263" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1525" }] },
];

export function useGoogleMap(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: { center: { lat: number; lng: number }; zoom: number },
) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !containerRef.current) return;
        const isDark = document.documentElement.classList.contains("dark");
        const m = new g.maps.Map(containerRef.current, {
          center: options.center,
          zoom: options.zoom,
          disableDefaultUI: true,
          zoomControl: false,
          gestureHandling: "greedy",
          clickableIcons: false,
          rotateControl: true,
          tilt: 45,
          heading: 0,
          isFractionalZoomEnabled: true,
          keyboardShortcuts: false,
          minZoom: 11,
          maxZoom: 18,
          restriction: {
            latLngBounds: { north: 41.42, south: 41.25, east: 19.93, west: 19.72 },
            strictBounds: false,
          },
          backgroundColor: isDark ? "#1c2030" : "#f7f5f2",
          styles: isDark ? darkStyle : lightStyle,
        });
        mapRef.current = m;
        setMap(m);

        const obs = new MutationObserver(() => {
          const dark = document.documentElement.classList.contains("dark");
          m.setOptions({ styles: dark ? darkStyle : lightStyle });
        });
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      })
      .catch((e) => setError(e.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { map, error };
}

declare global {
  interface Window {
    google: typeof google;
  }
}
