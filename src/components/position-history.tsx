"use client";

import { useSyncExternalStore, useCallback, useRef } from "react";
import { ThumbsUp, ThumbsDown, MinusCircle, Mail, FileText, Share2, Pen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPositions } from "@/lib/gamification";
import { formatRelativeDate } from "@/lib/utils";
import type { UserPosition, Position, ActionType } from "@/types/gamification";

const POSITIONS_KEY = "eurolens-positions";

function usePositions(): UserPosition[] {
  const cache = useRef<UserPosition[]>([]);
  const cacheLength = useRef(0);

  const subscribe = useCallback((onStoreChange: () => void) => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === POSITIONS_KEY) onStoreChange();
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined") return [];
    const positions = getPositions().sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    if (positions.length !== cacheLength.current) {
      cache.current = positions;
      cacheLength.current = positions.length;
    }
    return cache.current;
  }, []);

  const getServerSnapshot = useCallback(() => [], []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const positionIcons: Record<Position, React.ReactNode> = {
  support: <ThumbsUp className="h-4 w-4 text-green-500" />,
  oppose: <ThumbsDown className="h-4 w-4 text-red-500" />,
  neutral: <MinusCircle className="h-4 w-4 text-gray-500" />,
};

const positionLabels: Record<Position, string> = {
  support: "Support",
  oppose: "Oppose",
  neutral: "Neutral",
};

const actionIcons: Record<ActionType, React.ReactNode> = {
  contact_mep: <Mail className="h-3 w-3" />,
  consultation: <FileText className="h-3 w-3" />,
  petition: <Pen className="h-3 w-3" />,
  share: <Share2 className="h-3 w-3" />,
};

const actionLabels: Record<ActionType, string> = {
  contact_mep: "MEP",
  consultation: "Consultation",
  petition: "Petition",
  share: "Shared",
};

export function PositionHistory() {
  const positions = usePositions();

  if (positions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Civic Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No positions yet. State your position on a procedure and take action to make your voice heard!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Your Civic Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {positions.slice(0, 10).map((position) => (
            <div
              key={position.id}
              className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/50"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {position.procedureTitle}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {positionIcons[position.position]}
                    <span>{positionLabels[position.position]}</span>
                  </div>
                </div>
                {position.actionsTaken.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {position.actionsTaken.map((action) => (
                      <Badge key={action} variant="secondary" className="text-[10px] gap-1 px-1.5 py-0.5">
                        {actionIcons[action]}
                        {actionLabels[action]}
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {formatRelativeDate(position.timestamp)}
                </p>
              </div>
              <Badge 
                variant="outline" 
                className={`shrink-0 ${
                  position.position === "support" 
                    ? "border-green-500/50 text-green-600 dark:text-green-400" 
                    : position.position === "oppose"
                    ? "border-red-500/50 text-red-600 dark:text-red-400"
                    : "border-gray-500/50 text-gray-600 dark:text-gray-400"
                }`}
              >
                {positionLabels[position.position]}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
