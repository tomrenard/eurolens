"use client";

import { useMemo } from "react";
import { getXpProgress, getLevelTitle } from "@/lib/gamification";

interface XpBarProps {
  xp: number;
  level: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export function XpBar({ xp, level, showLabel = true, size = "md" }: XpBarProps) {
  const { current, next, progress } = useMemo(() => getXpProgress(xp), [xp]);

  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  return (
    <div className="w-full space-y-1">
      {showLabel && (
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-muted-foreground">
            {getLevelTitle(level)}
          </span>
          <span className="text-muted-foreground">
            {current} / {next} XP
          </span>
        </div>
      )}
      <div className={`w-full bg-muted rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}
