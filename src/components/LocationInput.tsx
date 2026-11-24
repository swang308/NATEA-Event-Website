"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  label: string;
  name: string;
  mapLabel: string;
  placeholder: string;
  initialValue?: string;
  mapSetup?: string;
};

function mapsUrl(value: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
}

declare global {
  interface Window {
    google?: any;
    __nateaMapsLoading?: Promise<void>;
  }
}

function loadMapsScript(apiKey: string): Promise<void> {
  if (window.google?.maps?.places) return Promise.resolve();
  if (window.__nateaMapsLoading) return window.__nateaMapsLoading;
  window.__nateaMapsLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&libraries=places`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });
  return window.__nateaMapsLoading;
}

export function LocationInput({ label, name, mapLabel, placeholder, initialValue = "", mapSetup }: Props) {
  const [address, setAddress] = useState(initialValue);
  const [loadError, setLoadError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  useEffect(() => {
    if (!apiKey || !containerRef.current) return;
    let element: any;
    loadMapsScript(apiKey)
      .then(async () => {
        await window.google.maps.importLibrary("places");
        if (!containerRef.current) return;
        containerRef.current.innerHTML = "";
        element = document.createElement("gmp-place-autocomplete");
        element.setAttribute("placeholder", placeholder);
        if (initialValue) element.value = initialValue;
        element.addEventListener("gmp-placeselect", async (event: any) => {
          const place = event.place;
          await place.fetchFields({ fields: ["formattedAddress", "displayName"] });
          const selected = place.formattedAddress || place.displayName || "";
          if (selected) setAddress(selected);
        });
        element.addEventListener("input", () => {
          // User typed without picking a suggestion — keep the typed text
          if (element.value) setAddress(element.value);
        });
        containerRef.current.appendChild(element);
      })
      .catch(() => setLoadError(true));
    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  // No API key or load failed — plain editable input, typing always works
  if (!apiKey || loadError) {
    return (
      <div>
        <label className="block text-sm font-bold" htmlFor={name}>{label}</label>
        <input id={name} name={name} required defaultValue={initialValue} onChange={(event) => setAddress(event.target.value)} placeholder={placeholder} autoComplete="off" className="mt-2 w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-teal" />
        {mapSetup && <p className="mt-2 text-xs text-muted">{mapSetup}</p>}
        {loadError && <p className="mt-2 text-xs text-red-700">Address search could not load. You can still type the address manually.</p>}
        {address && <a href={mapsUrl(address)} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-bold text-purple">{mapLabel} ↗</a>}
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-bold" htmlFor={name}>{label}</label>
      {/* Hidden input carries the address into the form submit */}
      <input type="hidden" name={name} value={address} readOnly />
      <div ref={containerRef} className="mt-2 [&_gmp-place-autocomplete]:w-full" />
      {address && <a href={mapsUrl(address)} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-bold text-purple">{mapLabel} ↗</a>}
    </div>
  );
}