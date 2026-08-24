"use client";

import { useAuth } from "@/components/auth-context";

interface SignInHintProps {
  variant?: "home" | "leaderboard";
}

export function SignInHint({ variant = "home" }: SignInHintProps) {
  const { user, isLoading } = useAuth();

  if (isLoading || user) return null;

  const text =
    variant === "leaderboard"
      ? "Sign in to save your progress and rank on the leaderboard."
      : "Sign in to save your progress and appear on the leaderboard.";

  return <p className="text-xs text-muted-foreground">{text}</p>;
}
