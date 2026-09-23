"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { ApiRequestError, describeError } from "./api";

// Runs one Studio mutation: tracks its pending state and error, then refreshes
// the server-rendered data. A lost session sends the admin back to sign-in.
export function useAction() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, startTransition] = useTransition();

  const run = useCallback(
    async (work: () => Promise<unknown>, options: { refresh?: boolean } = {}) => {
      setBusy(true);
      setError(null);
      try {
        await work();
        if (options.refresh !== false) startTransition(() => router.refresh());
        return true;
      } catch (caught) {
        if (caught instanceof ApiRequestError && caught.status === 401) {
          router.push("/admin/login");
          return false;
        }
        setError(describeError(caught));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  return { run, pending: busy || refreshing, error, clearError: () => setError(null) };
}
