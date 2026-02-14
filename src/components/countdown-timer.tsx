"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from "date-fns";
import { Calendar, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { PlenarySession } from "@/types/europarl";

interface CountdownTimerProps {
  session: PlenarySession;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateTimeLeft(targetDate: Date): TimeLeft {
  const now = new Date();

  if (targetDate <= now) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const days = differenceInDays(targetDate, now);
  const hours = differenceInHours(targetDate, now) % 24;
  const minutes = differenceInMinutes(targetDate, now) % 60;
  const seconds = differenceInSeconds(targetDate, now) % 60;

  return { days, hours, minutes, seconds };
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-14 h-14 md:w-[4.5rem] md:h-[4.5rem] rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
        <span className="text-2xl md:text-3xl font-bold tabular-nums" suppressHydrationWarning>
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="text-xs md:text-sm text-muted-foreground uppercase tracking-wide mt-2 font-medium">
        {label}
      </span>
    </div>
  );
}

function subscribe() {
  return () => {};
}

function getSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function CountdownTimer({ session }: CountdownTimerProps) {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!mounted) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const updateTime = () => setTimeLeft(calculateTimeLeft(session.startDate));
    updateTime();

    if (prefersReducedMotion) {
      return;
    }

    const timer = setInterval(updateTime, 1000);

    return () => clearInterval(timer);
  }, [session.startDate, mounted]);

  const isSessionStarted = mounted && 
    timeLeft.days === 0 &&
    timeLeft.hours === 0 &&
    timeLeft.minutes === 0 &&
    timeLeft.seconds === 0;

  const ariaLabel = !mounted
    ? `Countdown to ${session.title}`
    : isSessionStarted
      ? `${session.title} is happening now`
      : `${session.title} starts in ${timeLeft.days} days, ${timeLeft.hours} hours, ${timeLeft.minutes} minutes, and ${timeLeft.seconds} seconds`;

  return (
    <Card className="h-full overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/5 via-blue-500/5 to-purple-500/5">
      <CardContent className="pt-6">
        <div className="text-center" role="timer" aria-label={ariaLabel} suppressHydrationWarning>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm mb-4">
            {isSessionStarted ? (
              <>
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">Session In Progress</span>
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Next Plenary Session</span>
              </>
            )}
          </div>

          <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
            {session.title}
          </h3>
          
          <p className="text-muted-foreground mb-6" suppressHydrationWarning>
            {session.startDate.toLocaleDateString("en-GB", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>

          {!isSessionStarted && (
            <div className="flex flex-wrap justify-center items-center gap-1 sm:gap-2 md:gap-3">
              <TimeUnit value={timeLeft.days} label="Days" />
              <span className="text-xl sm:text-2xl md:text-3xl font-bold text-muted-foreground/30 mt-[-1.5rem]">:</span>
              <TimeUnit value={timeLeft.hours} label="Hours" />
              <span className="text-xl sm:text-2xl md:text-3xl font-bold text-muted-foreground/30 mt-[-1.5rem]">:</span>
              <TimeUnit value={timeLeft.minutes} label="Min" />
              <span className="text-xl sm:text-2xl md:text-3xl font-bold text-muted-foreground/30 mt-[-1.5rem]">:</span>
              <TimeUnit value={timeLeft.seconds} label="Sec" />
            </div>
          )}

          {isSessionStarted && (
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-500 text-white font-semibold animate-pulse">
                <Zap className="h-5 w-5" />
                Democracy in Action
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
