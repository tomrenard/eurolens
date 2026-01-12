"use client";

import { useEffect, useState } from "react";
import { X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Achievement } from "@/types/gamification";

interface AchievementToastProps {
  achievement: Achievement;
  onClose: () => void;
}

export function AchievementToast({ achievement, onClose }: AchievementToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 p-0.5 rounded-xl shadow-2xl">
        <div className="bg-background rounded-xl p-4 flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl animate-bounce">
              {achievement.icon}
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
          </div>
          
          <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
              Achievement Unlocked!
            </p>
            <p className="font-bold text-lg">{achievement.name}</p>
            <p className="text-sm text-muted-foreground">{achievement.description}</p>
            <p className="text-sm text-primary font-semibold mt-1">
              +{achievement.xpReward} XP
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface AchievementToastContainerProps {
  achievements: Achievement[];
  onDismiss: (id: string) => void;
}

export function AchievementToastContainer({
  achievements,
  onDismiss,
}: AchievementToastContainerProps) {
  if (achievements.length === 0) return null;

  return (
    <>
      {achievements.map((achievement) => (
        <AchievementToast
          key={achievement.id}
          achievement={achievement}
          onClose={() => onDismiss(achievement.id)}
        />
      ))}
    </>
  );
}
