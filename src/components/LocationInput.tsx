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
    __nateaMapsLoading?: boolean;
  }
}

function loadPlacesScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.places) return resolve();
    if (window.__nateaMapsLoading) {
      const check = setInterval(() => {
        if (window.google?.maps?.places) { clearInterval(check); resolve(); }
      }, 200);
      return;
    }
    window.__nateaMapsLoading = true;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });
}

export function LocationInput({ label, name, mapLabel, placeholder, initialValue = "", mapSetup }: Props) {
  // Only used for the "Open in Google Maps" link — the input itself
  // is uncontrolled so Google Autocomplete can write to it freely.
  const [linkValue, setLinkValue] = useState(initialValue);
  const [loadError, setLoadError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  useEffect(() => {
    if (!apiKey || !inputRef.current) return;
    let autocomplete: any;
    loadPlacesScript(apiKey)
      .then(() => {
        if (!inputRef.current) return;
        autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ["formatted_address", "name"],
        });
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          const address = place?.formatted_address || place?.name || "";
          if (address) setLinkValue(address);
        });
      })
      .catch(() => setLoadError(true));
    return () => {
      if (autocomplete) window.google?.maps?.event?.clearInstanceListeners(autocomplete);
    };
  }, [apiKey]);

  return (
    <div>
      <label className="block text-sm font-bold" htmlFor={name}>{label}</label>
      <input ref={inputRef} id={name} name={name} required defaultValue={initialValue} onChange={(event) => setLinkValue(event.target.value)} placeholder={placeholder} autoComplete="off" className="mt-2 w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-teal" />
      {!apiKey && mapSetup && <p className="mt-2 text-xs text-muted">{mapSetup}</p>}
      {loadError && <p className="mt-2 text-xs text-red-700">Address search could not load. You can still type the address manually.</p>}
      {linkValue && <a href={mapsUrl(linkValue)} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-bold text-purple">{mapLabel} ↗</a>}
    </div>
  );
}
