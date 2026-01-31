"use client";

import { useCallback, useState, useSyncExternalStore, useRef } from "react";
import Link from "next/link";
import {
  ThumbsUp,
  ThumbsDown,
  MinusCircle,
  Mail,
  Share2,
  FileText,
  MessageSquare,
  Check,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  savePosition,
  getPosition,
  recordAction,
  checkAchievements,
} from "@/lib/gamification";
import { XP_REWARDS } from "@/types/gamification";
import { usePersona } from "@/components/persona-context";
import type { Position, ActionType, UserPosition } from "@/types/gamification";

const POSITIONS_KEY = "eurolens-positions";

function useUserPosition(procedureId: string): UserPosition | null {
  const cache = useRef<UserPosition | null>(null);
  const cacheId = useRef<string>("");

  const subscribe = useCallback((onStoreChange: () => void) => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === POSITIONS_KEY) onStoreChange();
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (cacheId.current !== procedureId) {
      cache.current = getPosition(procedureId);
      cacheId.current = procedureId;
    }
    return cache.current;
  }, [procedureId]);

  const getServerSnapshot = useCallback(() => null, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export interface ActionPanelProps {
  procedureId: string;
  procedureTitle: string;
  procedureReference: string;
  variant?: "compact" | "full";
}

function getContactMepUrl(country: string): string {
  if (country && country !== "general") {
    return `/meps?country=${encodeURIComponent(country)}`;
  }
  return "/meps";
}

const ACTION_URLS = {
  consultation:
    "https://ec.europa.eu/info/law/better-regulation/have-your-say_en",
  petition: "https://citizens-initiative.europa.eu/",
} as const;

const ACTION_CONFIG = {
  contact_mep: {
    label: "Contact MEP",
    icon: Mail,
    color: "purple",
    xp: XP_REWARDS.CONTACT_MEP,
  },
  consultation: {
    label: "Consultations",
    icon: FileText,
    color: "amber",
    xp: XP_REWARDS.JOIN_CONSULTATION,
  },
  petition: {
    label: "Petitions",
    icon: FileText,
    color: "blue",
    xp: XP_REWARDS.SIGN_PETITION,
  },
  share: {
    label: "Share",
    icon: Share2,
    color: "green",
    xp: XP_REWARDS.SHARE_PROCEDURE,
  },
} as const;

const POSITION_CONFIG: Record<
  Position,
  { bg: string; bgFull: string; icon: typeof ThumbsUp }
> = {
  support: {
    bg: "bg-green-500/10 text-green-600 dark:text-green-400",
    bgFull: "bg-green-500/10 text-green-600 dark:text-green-400",
    icon: ThumbsUp,
  },
  oppose: {
    bg: "bg-red-500/10 text-red-600 dark:text-red-400",
    bgFull: "bg-red-500/10 text-red-600 dark:text-red-400",
    icon: ThumbsDown,
  },
  neutral: {
    bg: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
    bgFull: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
    icon: MinusCircle,
  },
};

export function ActionPanel({
  procedureId,
  procedureTitle,
  procedureReference,
  variant = "compact",
}: ActionPanelProps) {
  const { country } = usePersona();
  const existingPosition = useUserPosition(procedureId);
  const [showActions, setShowActions] = useState(false);
  const [showPositionForm, setShowPositionForm] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(
    null
  );
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<
    ActionType | "position" | null
  >(null);

  const isCompact = variant === "compact";
  const iconSize = isCompact ? "h-3 w-3" : "h-4 w-4";
  const actionIconSize = isCompact ? "h-4 w-4" : "h-5 w-5";
  const padding = isCompact ? "p-2.5" : "p-4";
  const textSize = isCompact ? "text-[11px]" : "text-sm";
  const xpTextSize = isCompact ? "text-[10px]" : "text-xs";

  const handleAction = async (actionType: ActionType, url?: string) => {
    setLoadingAction(actionType);

    await new Promise((resolve) => setTimeout(resolve, 100));

    recordAction(procedureId, actionType);
    checkAchievements();

    setActionFeedback(`+${ACTION_CONFIG[actionType].xp} XP earned!`);
    setTimeout(() => setActionFeedback(null), 2000);

    setLoadingAction(null);

    if (actionType === "contact_mep") {
      return;
    }
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleShare = async () => {
    setLoadingAction("share");

    const shareText = `Check out this EU procedure: ${procedureTitle}`;
    const shareUrl = `${window.location.origin}/procedure/${encodeURIComponent(
      procedureReference
    )}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: procedureTitle,
          text: shareText,
          url: shareUrl,
        });
        recordAction(procedureId, "share");
        checkAchievements();
        setActionFeedback(`+${XP_REWARDS.SHARE_PROCEDURE} XP earned!`);
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        recordAction(procedureId, "share");
        checkAchievements();
        setActionFeedback(`Link copied! +${XP_REWARDS.SHARE_PROCEDURE} XP`);
      }
    } catch {
      // User cancelled or share failed
    } finally {
      setLoadingAction(null);
      setTimeout(() => setActionFeedback(null), 2000);
    }
  };

  const handleSavePosition = async (pos: Position) => {
    setLoadingAction("position");
    setSelectedPosition(pos);

    await new Promise((resolve) => setTimeout(resolve, 100));

    savePosition(procedureId, procedureTitle, pos);
    checkAchievements();
    setShowPositionForm(false);
    setActionFeedback(`Position saved! +${XP_REWARDS.STATE_POSITION} XP`);

    setLoadingAction(null);
    setTimeout(() => setActionFeedback(null), 2000);
  };

  const focusClasses =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  if (!showActions && !existingPosition && isCompact) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowActions(true)}
        className="w-full gap-2 text-xs border-primary/30 text-primary hover:bg-primary/10"
        aria-label="Take action on this procedure"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Take Action on This Procedure
      </Button>
    );
  }

  const containerClasses = isCompact
    ? "p-3 rounded-lg bg-muted/30 border border-border/50 space-y-3"
    : "space-y-4";

  return (
    <div className={containerClasses}>
      {actionFeedback && (
        <div
          className={`flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-500/10 rounded-md animate-pulse ${
            isCompact ? "text-xs px-3 py-2" : "text-sm px-4 py-3"
          }`}
          role="status"
          aria-live="polite"
        >
          <Check className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          <span>{actionFeedback}</span>
        </div>
      )}

      {showPositionForm ? (
        <div
          className={
            isCompact ? "space-y-2" : "space-y-3 p-4 bg-muted/50 rounded-lg"
          }
        >
          <div className="flex items-center justify-between">
            <span
              className={`font-medium text-foreground ${
                isCompact ? "text-xs" : "text-sm"
              }`}
            >
              Your position{!isCompact && " on this procedure"}:
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPositionForm(false)}
              className={`${
                isCompact ? "text-xs h-6 px-2" : "text-xs"
              } text-muted-foreground hover:text-foreground`}
            >
              Cancel
            </Button>
          </div>
          <div className={`flex ${isCompact ? "gap-1.5" : "gap-2"}`}>
            {(["support", "oppose", "neutral"] as Position[]).map((pos) => {
              const config = POSITION_CONFIG[pos];
              const Icon = config.icon;
              const isLoading =
                loadingAction === "position" && selectedPosition === pos;

              return (
                <Button
                  key={pos}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSavePosition(pos)}
                  disabled={loadingAction === "position"}
                  className={`flex-1 ${focusClasses} ${
                    isCompact ? "py-2 px-2 text-xs" : "py-3 px-3 text-sm"
                  } ${
                    selectedPosition === pos
                      ? config.bg + " border-current"
                      : ""
                  }`}
                  aria-label={`${pos} this procedure`}
                >
                  {isLoading ? (
                    <Loader2 className={`${iconSize} animate-spin`} />
                  ) : (
                    <Icon className={iconSize} />
                  )}
                  <span className="capitalize ml-1.5">{pos}</span>
                </Button>
              );
            })}
          </div>
        </div>
      ) : existingPosition ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPositionForm(true)}
          className={`w-full justify-between ${
            POSITION_CONFIG[existingPosition.position].bg
          } ${focusClasses} ${
            isCompact ? "text-xs px-3 py-2" : "text-sm px-4 py-3"
          }`}
          aria-label={`You ${existingPosition.position} this procedure. Click to change.`}
        >
          <span className="flex items-center gap-2">
            {(() => {
              const Icon = POSITION_CONFIG[existingPosition.position].icon;
              return <Icon className={iconSize} />;
            })()}
            <span>
              {isCompact ? "" : "You "}
              <span className="capitalize">{existingPosition.position}</span>
              {!isCompact && " this procedure"}
            </span>
          </span>
          <span className={`${xpTextSize} opacity-70`}>Change</span>
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPositionForm(true)}
          className={`w-full border-dashed border-primary/30 text-primary hover:bg-primary/5 ${focusClasses} ${
            isCompact ? "text-xs px-3 py-2" : "text-sm px-4 py-3"
          }`}
          aria-label="State your position on this procedure"
        >
          <MessageSquare className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          <span className="ml-2">State your position</span>
          <span className={`${xpTextSize} opacity-70 ml-2`}>
            +{XP_REWARDS.STATE_POSITION} XP
          </span>
        </Button>
      )}

      <div className="grid grid-cols-2 gap-2">
        {(
          ["contact_mep", "consultation", "petition", "share"] as ActionType[]
        ).map((actionType) => {
          const config = ACTION_CONFIG[actionType];
          const Icon = config.icon;
          const isLoading = loadingAction === actionType;
          const isContactMep = actionType === "contact_mep";
          const contactMepHref = getContactMepUrl(country);
          const url =
            !isContactMep && actionType !== "share"
              ? ACTION_URLS[actionType as keyof typeof ACTION_URLS]
              : undefined;

          const colorClasses = {
            purple:
              "border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 text-purple-500",
            amber:
              "border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-500",
            blue: "border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 text-blue-500",
            green:
              "border-green-500/20 bg-green-500/5 hover:bg-green-500/10 text-green-500",
          }[config.color];

          return isContactMep ? (
            <Button
              key={actionType}
              variant="outline"
              size="sm"
              asChild
              className={`flex flex-col items-center gap-1 h-auto ${padding} ${colorClasses} border ${focusClasses}`}
            >
              <Link
                href={contactMepHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${config.label} - earn ${config.xp} XP`}
                onClick={() => {
                  recordAction(procedureId, "contact_mep");
                  checkAchievements();
                }}
              >
                <Icon className={actionIconSize} />
                <span className={`${textSize} font-medium text-foreground`}>
                  {config.label}
                </span>
                <span
                  className={`${xpTextSize} text-muted-foreground group-hover:text-current`}
                >
                  +{config.xp} XP
                </span>
              </Link>
            </Button>
          ) : (
            <Button
              key={actionType}
              variant="outline"
              size="sm"
              onClick={() =>
                actionType === "share"
                  ? handleShare()
                  : handleAction(actionType, url)
              }
              disabled={isLoading}
              className={`flex flex-col items-center gap-1 h-auto ${padding} ${colorClasses} border ${focusClasses} disabled:opacity-50`}
              aria-label={`${config.label} - earn ${config.xp} XP`}
            >
              {isLoading ? (
                <Loader2 className={`${actionIconSize} animate-spin`} />
              ) : (
                <Icon className={actionIconSize} />
              )}
              <span className={`${textSize} font-medium text-foreground`}>
                {config.label}
              </span>
              <span
                className={`${xpTextSize} text-muted-foreground group-hover:text-current`}
              >
                +{config.xp} XP
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
