"use client";

import { useMemo } from "react";
import { getLevelTitle } from "@/lib/gamification";

interface LevelBadgeProps {
  level: number;
  size?: "sm" | "md" | "lg";
  showTitle?: boolean;
}

export function LevelBadge({ level, size = "md", showTitle = false }: LevelBadgeProps) {
  const title = useMemo(() => getLevelTitle(level), [level]);

  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-lg",
  };

  const gradients: Record<number, string> = {
    1: "from-gray-400 to-gray-500",
    2: "from-gray-500 to-gray-600",
    3: "from-green-400 to-green-600",
    4: "from-green-500 to-emerald-600",
    5: "from-blue-400 to-blue-600",
    6: "from-blue-500 to-indigo-600",
    7: "from-purple-400 to-purple-600",
    8: "from-purple-500 to-pink-600",
    9: "from-amber-400 to-orange-600",
    10: "from-amber-500 to-red-600",
    11: "from-rose-400 to-rose-600",
    12: "from-rose-500 to-pink-600",
    13: "from-yellow-300 to-amber-500",
    14: "from-yellow-400 to-orange-500",
    15: "from-yellow-300 via-amber-400 to-orange-500",
  };

  const gradient = gradients[Math.min(level, 15)] || gradients[15];

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center font-bold text-white shadow-lg ring-2 ring-white/20`}
      >
        {level}
      </div>
      {showTitle && (
        <span className="font-medium text-sm text-foreground">{title}</span>
      )}
    </div>
  );
}
