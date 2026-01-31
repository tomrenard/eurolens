"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface SignInHintProps {
  variant?: "home" | "leaderboard";
}

export function SignInHint({ variant = "home" }: SignInHintProps) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSignedIn(!!session?.user);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (signedIn !== false) return null;

  const text =
    variant === "leaderboard"
      ? "Sign in to save your progress and rank on the leaderboard."
      : "Sign in to save your progress and appear on the leaderboard.";

  return <p className="text-xs text-muted-foreground">{text}</p>;
}
