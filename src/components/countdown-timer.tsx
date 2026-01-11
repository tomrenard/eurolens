"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from "date-fns";
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
      <span
        className="text-3xl md:text-5xl font-bold text-primary tabular-nums"
        aria-hidden="true"
      >
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-xs md:text-sm text-muted-foreground uppercase tracking-wide mt-1">
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
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    calculateTimeLeft(session.startDate)
  );

  useEffect(() => {
    if (!mounted) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(session.startDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [session.startDate, mounted]);

  const isSessionStarted =
    timeLeft.days === 0 &&
    timeLeft.hours === 0 &&
    timeLeft.minutes === 0 &&
    timeLeft.seconds === 0;

  const ariaLabel = isSessionStarted
    ? `${session.title} is happening now`
    : `${session.title} starts in ${timeLeft.days} days, ${timeLeft.hours} hours, ${timeLeft.minutes} minutes, and ${timeLeft.seconds} seconds`;

  if (!mounted) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Next Plenary Session
            </h3>
            <p className="text-muted-foreground mb-4">{session.title}</p>
            <div className="flex justify-center gap-4 md:gap-8">
              <TimeUnit value={0} label="Days" />
              <TimeUnit value={0} label="Hours" />
              <TimeUnit value={0} label="Minutes" />
              <TimeUnit value={0} label="Seconds" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="pt-6">
        <div className="text-center" role="timer" aria-label={ariaLabel}>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {isSessionStarted ? "Session In Progress" : "Next Plenary Session"}
          </h3>
          <p className="text-muted-foreground mb-4">{session.title}</p>
          <p className="text-sm text-muted-foreground mb-6">
            {session.startDate.toLocaleDateString("en-GB", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          {!isSessionStarted && (
            <div className="flex justify-center gap-4 md:gap-8">
              <TimeUnit value={timeLeft.days} label="Days" />
              <span className="text-3xl md:text-5xl font-bold text-primary/50 self-start">
                :
              </span>
              <TimeUnit value={timeLeft.hours} label="Hours" />
              <span className="text-3xl md:text-5xl font-bold text-primary/50 self-start">
                :
              </span>
              <TimeUnit value={timeLeft.minutes} label="Minutes" />
              <span className="text-3xl md:text-5xl font-bold text-primary/50 self-start">
                :
              </span>
              <TimeUnit value={timeLeft.seconds} label="Seconds" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
