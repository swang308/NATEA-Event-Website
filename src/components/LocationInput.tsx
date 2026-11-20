"use client";

import { useState } from "react";

type Props = {
  label: string;
  name: string;
  mapLabel: string;
  placeholder: string;
  initialValue?: string;
};

function mapsUrl(value: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
}

export function LocationInput({ label, name, mapLabel, placeholder, initialValue = "" }: Props) {
  const [value, setValue] = useState(initialValue);

  return (
    <div>
      <label className="block text-sm font-bold" htmlFor={name}>{label}</label>
      <input id={name} name={name} required value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-teal" />
      {value && <a href={mapsUrl(value)} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-bold text-purple">{mapLabel} ↗</a>}
    </div>
  );
}
