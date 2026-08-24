"use client";

import { Button } from "@/components/ui/button";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-context";

export function AuthButton() {
  const { user, isLoading: loading } = useAuth();

  // Sign-in is unavailable when the deployment has no Supabase project.
  if (!isSupabaseConfigured()) return null;

  const handleSignIn = async () => {
    const supabase = createClient();
    if (!supabase) return;

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    if (!supabase) return;

    await supabase.auth.signOut();
    window.location.reload();
  };

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled className="opacity-70">
        …
      </Button>
    );
  }

  if (user) {
    return (
      <Button variant="outline" size="sm" onClick={handleSignOut}>
        Sign out
      </Button>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSignIn}>
      Sign in
    </Button>
  );
}
