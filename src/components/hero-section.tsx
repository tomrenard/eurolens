"use client";

import Link from "next/link";
import {
  ArrowRight,
  Trophy,
  Sparkles,
  Mail,
  MessageSquare,
  Share2,
  Users,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-purple-500/5 to-pink-500/5 border border-primary/20 p-8 md:p-12 mb-8">
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="relative">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="flex-1 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Sparkles className="h-4 w-4" />
              <span>Your Voice in Brussels</span>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
              Shape EU Policy,{" "}
              <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Make Your Voice Heard
              </span>
            </h1>

            <p className="text-lg text-muted-foreground mb-6">
              Understand what the European Parliament is deciding, take a
              stance, and take real action. Contact your MEP, join
              consultations, and earn XP for civic engagement.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="gap-2" asChild>
                <a href="#procedures">
                  Start Taking Action
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="gap-2" asChild>
                <Link href="/leaderboard">
                  <Trophy className="h-4 w-4" />
                  View Leaderboard
                </Link>
              </Button>
              <Button size="lg" variant="ghost" className="gap-2" asChild>
                <Link href="/learn">
                  <BookOpen className="h-4 w-4" />
                  Learn
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:w-80">
            <FeatureCard
              icon={<MessageSquare className="h-5 w-5" />}
              title="State Your Position"
              description="Support or oppose procedures"
              color="blue"
            />
            <FeatureCard
              icon={<Mail className="h-5 w-5" />}
              title="Contact Your MEP"
              description="Make your voice heard (+50 XP)"
              color="purple"
            />
            <FeatureCard
              icon={<Users className="h-5 w-5" />}
              title="Join Consultations"
              description="Participate in EU decisions"
              color="amber"
            />
            <FeatureCard
              icon={<Share2 className="h-5 w-5" />}
              title="Spread Awareness"
              description="Share important procedures"
              color="green"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: "blue" | "purple" | "amber" | "green";
}

function FeatureCard({ icon, title, description, color }: FeatureCardProps) {
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    green: "bg-green-500/10 text-green-600 dark:text-green-400",
  };

  return (
    <div className="p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
      <div
        className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}
      >
        {icon}
      </div>
      <h3 className="font-semibold text-foreground text-sm mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
