"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { ExternalLink, Calendar, ThumbsUp, ThumbsDown, MinusCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ActionPanel } from "@/components/action-panel";
import { formatRelativeDate } from "@/lib/utils";
import type { VotingResult, Persona, Country } from "@/types/europarl";

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
}

interface ProcedureDetailProps {
  reference: string;
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

        <div className="grid grid-cols-3 gap-4 text-center">
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
              <span className="text-2xl font-bold text-gray-600">{abstention}</span>
            </div>
            <p className="text-sm text-muted-foreground">Abstention</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AISummaryCard({ 
  procedure, 
  persona, 
  country 
}: { 
  procedure: ProcedureData; 
  persona: Persona; 
  country: Country;
}) {
  const [completion, setCompletion] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);

  const cacheKey = `eurolens-summary-${procedure.reference}-${persona}-${country}`;

  useEffect(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setCompletion(cached);
        setIsCached(true);
      }
    } catch {
      // localStorage not available
    }
  }, [cacheKey]);

  const requestSummary = useCallback(async () => {
    setCompletion("");
    setError(null);
    setIsLoading(true);
    setIsCached(false);

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: procedure.title,
          summary: procedure.summary || procedure.title,
          subjects: [],
          persona,
          country,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || `HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let text = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        text += chunk;
        setCompletion(text);
      }

      try {
        localStorage.setItem(cacheKey, text);
        setIsCached(true);
      } catch {
        // localStorage not available
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, procedure, persona, country]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">AI Summary</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="text-destructive text-sm space-y-2">
            <p className="font-medium">Failed to generate summary</p>
            <p className="text-xs opacity-80">{error}</p>
            <Button onClick={requestSummary} variant="outline" size="sm" className="mt-2">
              Retry
            </Button>
          </div>
        )}

        {!completion && !isLoading && !error && (
          <Button onClick={requestSummary} variant="secondary" className="w-full">
            Generate AI Summary
          </Button>
        )}

        {isLoading && !completion && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}

        {completion && (
          <div className="space-y-3">
            <div className="prose prose-sm max-w-none text-card-foreground">
              {completion.split("\n").map((line, idx) => {
                if (line.startsWith("## ")) {
                  return (
                    <h4 key={idx} className="font-semibold text-primary mt-3 first:mt-0">
                      {line.replace("## ", "")}
                    </h4>
                  );
                }
                if (line.trim()) {
                  return (
                    <p key={idx} className="text-muted-foreground leading-relaxed">
                      {line}
                    </p>
                  );
                }
                return null;
              })}
            </div>
            {isLoading && (
              <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
            )}
            {isCached && !isLoading && (
              <div className="flex items-center gap-2 pt-3 border-t">
                <span className="text-xs text-muted-foreground">Cached summary</span>
                <Button onClick={requestSummary} variant="ghost" size="sm" className="h-6 px-2 text-xs">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Regenerate
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ProcedureDetail({ reference }: ProcedureDetailProps) {
  const [procedure, setProcedure] = useState<ProcedureData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProcedure() {
      try {
        const response = await fetch(`/api/procedure/${encodeURIComponent(reference)}`);
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
            <span>Last activity: {formatRelativeDate(procedure.lastActivity.date)}</span>
            <span className="text-muted-foreground/50">•</span>
            <span>{procedure.lastActivity.type}</span>
          </div>
        )}
      </div>

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

      <AISummaryCard procedure={procedure} persona="general" country="general" />

      {procedure.sourceUrl && (
        <Card>
          <CardContent className="pt-6">
            <a
              href={procedure.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              <ExternalLink className="h-4 w-4" />
              View on European Parliament Website
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
