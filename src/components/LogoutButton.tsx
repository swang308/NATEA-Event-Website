"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  label: string;
  workingLabel: string;
  errorLabel: string;
};

export function LogoutButton({ label, workingLabel, errorLabel }: Props) {
  const router = useRouter();
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    setIsWorking(true);
    setError("");
    const { error: signOutError } = await createClient().auth.signOut();
    if (signOutError) {
      setError(signOutError.message || errorLabel);
      setIsWorking(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div>
      <button type="button" onClick={handleLogout} disabled={isWorking} className="text-purple transition hover:text-purple-d disabled:cursor-not-allowed disabled:opacity-60">
        {isWorking ? workingLabel : label}
      </button>
      {error && <p role="alert" className="mt-1 text-xs font-normal text-red-700">{error}</p>}
    </div>
  );
}
