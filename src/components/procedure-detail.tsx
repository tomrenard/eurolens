"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ExternalLink,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  MinusCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ActionPanel } from "@/components/action-panel";
import { ProcedureTimeline } from "@/components/procedure-timeline";
import { MEPVotesList } from "@/components/mep-votes-list";
import { RollCallCard } from "@/components/roll-call";
import { PlainEnglish } from "@/components/plain-english";
import { formatRelativeDate } from "@/lib/utils";
import { usePersona } from "@/components/persona-context";
import type { RollCall } from "@/lib/howtheyvote";
import type { LegislativeProcedure, VotingResult } from "@/types/europarl";

interface TimelineEvent {
  id: string;
  date: string;
  type: string;
  title: string;
  description?: string;
}

interface ProcedureData {
  reference: string;
  title: string;
  summary?: string;
  type: string;
  status: string;
  sourceUrl?: string;
  votingResult?: VotingResult;
  lastActivity?: {
    date: string;
    type: string;
  };
  timeline?: TimelineEvent[];
}

interface ProcedureDetailProps {
  reference: string;
}

/**
 * The detail endpoint returns a narrower shape than the list endpoints.
 * Fill in the fields the explainer reads so both surfaces share one renderer.
 */
function asLegislativeProcedure(
  procedure: ProcedureData
): LegislativeProcedure {
  return {
    id: procedure.reference,
    reference: procedure.reference,
    title: procedure.title,
    summary: procedure.summary,
    type: procedure.type,
    status: procedure.status,
    subjects: [],
    sourceUrl: procedure.sourceUrl,
    votingResult: procedure.votingResult,
    lastActivity: procedure.lastActivity,
  };
}

function VotingResultsCard({ votingResult }: { votingResult: VotingResult }) {
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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Voting Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-1 h-6 rounded-full overflow-hidden bg-muted">
          {percentages.favor > 0 && (
            <div
              style={{ width: `${percentages.favor}%` }}
              className="bg-green-500 transition-all flex items-center justify-center"
            >
              {percentages.favor > 10 && (
                <span className="text-xs font-medium text-white">
                  {Math.round(percentages.favor)}%
                </span>
              )}
            </div>
          )}
          {percentages.against > 0 && (
            <div
              style={{ width: `${percentages.against}%` }}
              className="bg-red-500 transition-all flex items-center justify-center"
            >
              {percentages.against > 10 && (
                <span className="text-xs font-medium text-white">
                  {Math.round(percentages.against)}%
                </span>
              )}
            </div>
          )}
          {percentages.abstention > 0 && (
            <div
              style={{ width: `${percentages.abstention}%` }}
              className="bg-gray-400 transition-all flex items-center justify-center"
            >
              {percentages.abstention > 10 && (
                <span className="text-xs font-medium text-white">
                  {Math.round(percentages.abstention)}%
                </span>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2">
              <ThumbsUp className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold text-green-600">{favor}</span>
            </div>
            <p className="text-sm text-muted-foreground">In Favor</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2">
              <ThumbsDown className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold text-red-600">{against}</span>
            </div>
            <p className="text-sm text-muted-foreground">Against</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2">
              <MinusCircle className="h-5 w-5 text-gray-400" />
              <span className="text-2xl font-bold text-gray-600">
                {abstention}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Abstention</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProcedureDetail({ reference }: ProcedureDetailProps) {
  const { persona, country } = usePersona();
  const [procedure, setProcedure] = useState<ProcedureData | null>(null);
  const [rollCall, setRollCall] = useState<RollCall | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProcedure() {
      try {
        const response = await fetch(
          `/api/procedure/${encodeURIComponent(reference)}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch procedure");
        }
        const data = await response.json();
        setProcedure(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }

    fetchProcedure();
  }, [reference]);

  useEffect(() => {
    let cancelled = false;

    async function fetchRollCall() {
      try {
        const res = await fetch(
          `/api/procedure/${encodeURIComponent(reference)}/votes`
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { rollCall: RollCall | null };
        if (!cancelled) setRollCall(data.rollCall ?? null);
      } catch {
        // Roll-call data is supplementary: a failure here must not break the page.
      }
    }

    fetchRollCall();
    return () => {
      cancelled = true;
    };
  }, [reference]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/4" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (error || !procedure) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="pt-6">
          <p className="text-destructive font-medium">
            {error || "Procedure not found"}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Could not load details for reference: {reference}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-start gap-2 mb-3">
          <Badge variant="default" className="text-sm">
            {procedure.type}
          </Badge>
          <Badge variant="outline" className="text-sm">
            {procedure.status}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground font-mono mb-2">
          {procedure.reference}
        </p>

        <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
          {procedure.title}
        </h1>

        {procedure.lastActivity && (
          <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              Last activity: {formatRelativeDate(procedure.lastActivity.date)}
            </span>
            <span className="text-muted-foreground/50">•</span>
            <span>{procedure.lastActivity.type}</span>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">In plain English</CardTitle>
        </CardHeader>
        <CardContent>
          <PlainEnglish
            procedure={asLegislativeProcedure(procedure)}
            persona={persona}
            officialSummary={rollCall?.officialSummary}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Take Action</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionPanel
            procedureId={procedure.reference}
            procedureTitle={procedure.title}
            procedureReference={procedure.reference}
            variant="full"
          />
        </CardContent>
      </Card>

      {procedure.votingResult && (
        <VotingResultsCard votingResult={procedure.votingResult} />
      )}

      {rollCall && <RollCallCard rollCall={rollCall} country={country} />}

      {rollCall && rollCall.votes.length > 0 && (
        <MEPVotesList votes={rollCall.votes} />
      )}

      {procedure.timeline && procedure.timeline.length > 0 && (
        <ProcedureTimeline events={procedure.timeline} />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Document trail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {procedure.sourceUrl && (
            <a
              href={procedure.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary hover:underline font-medium"
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              View procedure file on European Parliament (OEIL)
            </a>
          )}
          <a
            href={`https://eur-lex.europa.eu/search.html?qid=0&DB_CODED=LEGISLATION&DB_YEAR=${
              procedure.reference.match(/\d{4}/)?.[0] ?? ""
            }&DC_CODED=${encodeURIComponent(procedure.reference)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline font-medium"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            Search on EUR-Lex
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Related links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <a
            href="https://www.consilium.europa.eu"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline font-medium"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            Council of the European Union
          </a>
          <a
            href="https://ec.europa.eu/info/law/better-regulation/have-your-say_en"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline font-medium"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            Commission – Have your say (consultations)
          </a>
          <a
            href="https://citizens-initiative.europa.eu/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline font-medium"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            European Citizens’ Initiative (petitions)
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
