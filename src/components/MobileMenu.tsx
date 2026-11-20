"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";

type Labels = {
  events: string;
  payment: string;
  line: string;
  myEvents: string;
  profile: string;
  login: string;
  signup: string;
};

export function MobileMenu({ locale, labels, user, children }: { locale: string; labels: Labels; user: boolean; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button type="button" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open} className="grid h-10 w-10 place-items-center rounded-full border border-line text-xl font-bold">
        {open ? "✕" : "☰"}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-16 border-b border-line bg-card px-5 py-4 shadow-lg">
          <nav className="flex flex-col gap-4 text-sm font-bold">
            <Link href="/events" onClick={() => setOpen(false)}>{labels.events}</Link>
            <Link href="/#payment" onClick={() => setOpen(false)}>{labels.payment}</Link>
            <Link href="/#line" onClick={() => setOpen(false)}>{labels.line}</Link>
            {user ? (
              <>
                <Link href="/my-events" onClick={() => setOpen(false)}>{labels.myEvents}</Link>
                <Link href="/profile" onClick={() => setOpen(false)}>{labels.profile}</Link>
                <div onClick={() => setOpen(false)}>{children}</div>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)}>{labels.login}</Link>
                <Link href="/signup" onClick={() => setOpen(false)}>{labels.signup}</Link>
              </>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
