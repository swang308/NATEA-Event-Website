"use client";

import { useState } from "react";

type Props = {
  value: string;
  label: string;
  copiedLabel: string;
};

export function CopyButton({ value, label, copiedLabel }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button type="button" onClick={copy} className="rounded-full border border-teal px-3 py-1 text-xs font-bold text-teal-d transition hover:bg-teal/10">
      {copied ? copiedLabel : label}
    </button>
  );
}
