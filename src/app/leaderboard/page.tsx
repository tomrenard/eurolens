import Link from "next/link";
import { ArrowLeft, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Leaderboard } from "@/components/leaderboard";
import { AchievementsGrid } from "@/components/achievements-grid";
import { PositionHistory } from "@/components/position-history";

export const metadata = {
  title: "Leaderboard | EuroLens",
  description: "See how you rank against other EU democracy enthusiasts",
};

export default function LeaderboardPage() {
  return (
    <main className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <Button variant="ghost" asChild className="gap-2 -ml-2 mb-4">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-red-500/5 border border-amber-500/20 p-6 md:p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Leaderboard & Progress</h1>
              <p className="text-muted-foreground">
                Track your journey through EU democracy
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Leaderboard />
          <AchievementsGrid />
        </div>
        <div className="lg:col-span-1">
          <PositionHistory />
        </div>
      </div>
    </main>
  );
}
