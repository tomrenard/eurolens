"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { AuthButton } from "@/components/auth-button";
import { UserProfile } from "@/components/user-profile";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/learn", label: "Learn" },
  { href: "/national", label: "National" },
  { href: "/meps", label: "MEPs" },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav
      className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-1 sm:gap-2"
      aria-label="Main navigation"
    >
      {NAV_LINKS.map(({ href, label }) => {
        const isActive =
          href === "/"
            ? pathname === "/"
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <header
      className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      role="banner"
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-lg font-semibold text-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
        >
          <Image
            src="/favicon.svg"
            alt=""
            width={24}
            height={24}
            className="shrink-0"
          />
          <span className="hidden sm:inline">EuroLens</span>
        </Link>

        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-center">
          <NavLinks />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!loading && user && (
            <div className="hidden sm:block">
              <UserProfile compact />
            </div>
          )}
          <AuthButton />
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="sm:hidden inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div
          id="mobile-nav"
          className="sm:hidden border-t border-border bg-background px-4 pb-4 pt-2"
        >
          <NavLinks onNavigate={() => setMobileOpen(false)} />
          {!loading && user && (
            <div className="mt-3 pt-3 border-t border-border">
              <UserProfile compact />
            </div>
          )}
        </div>
      )}
    </header>
  );
}
