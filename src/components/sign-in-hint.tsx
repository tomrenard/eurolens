"use client";

import { useAuth } from "@/components/auth-context";

/**
 * Nudges guests to sign in so their civic record survives a browser change.
 * There is no ranking to join — the record is private.
 */
export function SignInHint() {
  const { user, isLoading } = useAuth();

  if (isLoading || user) return null;

  return (
    <p className="text-xs text-muted-foreground">
      Your record is stored in this browser only. Sign in to keep it across
      devices.
    </p>
  );
}
