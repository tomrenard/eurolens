"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Calendar,
  CircleCheck,
  ThumbsUp,
  ThumbsDown,
  MinusCircle,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionPanel } from "@/components/action-panel";
import { PlainEnglish } from "@/components/plain-english";
import { formatRelativeDate, isRecentDate } from "@/lib/utils";
import type {
  LegislativeProcedure,
  Persona,
  Country,
  VotingResult,
} from "@/types/europarl";

interface VotingBarProps {
  votingResult: VotingResult;
}

function VotingBar({ votingResult }: VotingBarProps) {
  const { favor, against, abstention } = votingResult;
  const total = favor + against + abstention;

  const percentages = useMemo(() => {
    if (total === 0) return { favor: 0, against: 0, abstention: 0 };
    return {
      favor: (favor / total) * 100,
      against: (against / total) * 100,
      abstention: (abstention / total) * 100,
    };
  }, [favor, against, abstention, total]);

  if (total === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex gap-0.5 h-3 sm:h-2 rounded-full overflow-hidden bg-muted">
        {percentages.favor > 0 && (
          <div
            style={{ width: `${percentages.favor}%` }}
            className="bg-green-500 transition-all"
            title={`In favor: ${favor}`}
          />
        )}
        {percentages.against > 0 && (
          <div
            style={{ width: `${percentages.against}%` }}
            className="bg-red-500 transition-all"
            title={`Against: ${against}`}
          />
        )}
        {percentages.abstention > 0 && (
          <div
            style={{ width: `${percentages.abstention}%` }}
            className="bg-gray-400 transition-all"
            title={`Abstention: ${abstention}`}
          />
        )}
      </div>
      <div className="flex items-center justify-between text-xs sm:text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1 sm:gap-0.5">
          <ThumbsUp className="h-3.5 w-3.5 sm:h-2.5 sm:w-2.5 text-green-500" />
          {favor}
        </span>
        <span className="flex items-center gap-1 sm:gap-0.5">
          <ThumbsDown className="h-3.5 w-3.5 sm:h-2.5 sm:w-2.5 text-red-500" />
          {against}
        </span>
        <span className="flex items-center gap-1 sm:gap-0.5">
          <MinusCircle className="h-3.5 w-3.5 sm:h-2.5 sm:w-2.5 text-gray-400" />
          {abstention}
        </span>
      </div>
    </div>
  );
}

interface DossierCardProps {
  procedure: LegislativeProcedure;
  persona?: Persona;
  country?: Country;
}

export function DossierCard({
  procedure,
  persona = "general",
}: DossierCardProps) {
  const typeColors: Record<string, string> = {
    Codecision: "border-l-blue-500",
    Consultation: "border-l-purple-500",
    Budget: "border-l-green-500",
    Resolution: "border-l-amber-500",
    Report: "border-l-indigo-500",
    "Own-initiative": "border-l-pink-500",
  };

  const borderColor = typeColors[procedure.type] || "border-l-primary";

  return (
    <Card
      className={`overflow-hidden border-l-4 ${borderColor} transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}
    >
      <CardHeader className="pb-3 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div className="flex-1 min-w-0 order-2 sm:order-1">
            {procedure.votingResult ? (
              <>
                <CardTitle className="text-base sm:text-lg leading-tight">
                  {procedure.title}
                </CardTitle>
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  {procedure.reference}
                </p>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground font-mono mb-1">
                  {procedure.reference}
                </p>
                <CardTitle className="text-base sm:text-lg leading-tight">
                  {procedure.title}
                </CardTitle>
              </>
            )}
            {procedure.summary && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                {procedure.summary}
              </p>
            )}
          </div>
          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-1 shrink-0 order-1 sm:order-2">
            {procedure.lastActivity?.date &&
              isRecentDate(procedure.lastActivity.date) && (
                <Badge variant="destructive" className="text-xs animate-pulse">
                  New
                </Badge>
              )}
            <Badge
              variant="secondary"
              className="text-xs sm:text-sm font-medium"
            >
              {procedure.type}
            </Badge>
          </div>
        </div>
        {procedure.subjects.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:gap-1">
            {procedure.subjects.slice(0, 3).map((subject, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="text-xs py-1 px-2"
              >
                {subject}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="border-t pt-4">
          <PlainEnglish procedure={procedure} persona={persona} />
        </div>
        <div className="mt-4 pt-3 border-t space-y-3">
          {procedure.votingResult && (
            <VotingBar votingResult={procedure.votingResult} />
          )}
          {procedure.status !== "Adopted" && !procedure.votingResult && (
            <ActionPanel
              procedureId={procedure.id}
              procedureTitle={procedure.title}
              procedureReference={procedure.reference}
              variant="compact"
            />
          )}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <CircleCheck className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                {procedure.status}
              </span>
              {procedure.parliamentaryTerm && (
                <span className="text-muted-foreground/70">
                  {procedure.parliamentaryTerm}
                </span>
              )}
            </div>
            {procedure.lastActivity && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                {formatRelativeDate(procedure.lastActivity.date)}
              </span>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {procedure.reference && (
              <Link
                href={`/procedure/${encodeURIComponent(procedure.reference)}`}
                className="inline-flex items-center justify-center gap-2 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex-1 sm:flex-none"
              >
                View Details
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
            {procedure.sourceUrl && (
              <a
                href={procedure.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 text-xs font-medium text-primary bg-primary/5 hover:bg-primary/10 px-3 py-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex-1 sm:flex-none"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                European Parliament
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
