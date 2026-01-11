"use client";

import { useCallback, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DossierSkeleton } from "@/components/dossier-skeleton";
import type { LegislativeProcedure, Persona, Country } from "@/types/europarl";

interface DossierCardProps {
  procedure: LegislativeProcedure;
  persona?: Persona;
  country?: Country;
}

export function DossierCard({
  procedure,
  persona = "general",
  country = "general",
}: DossierCardProps) {
  const [completion, setCompletion] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastContext, setLastContext] = useState<string | null>(null);

  const currentContext = `${procedure.id}-${persona}-${country}`;
  const hasRequested = lastContext !== null;
  const needsRefresh = hasRequested && lastContext !== currentContext;

  const requestSummary = useCallback(async () => {
    setLastContext(currentContext);
    setCompletion("");
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: procedure.title,
          summary: procedure.title,
          subjects: procedure.subjects,
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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [currentContext, procedure, persona, country]);

  const renderSummary = () => {
    if (error) {
      const isRateLimit = error.includes("429") || error.includes("quota") || error.includes("rate") || error.includes("exceeded");
      
      return (
        <div className="text-destructive text-sm space-y-2" role="alert">
          <p className="font-medium">
            {isRateLimit ? "Rate limit exceeded" : "Failed to generate summary"}
          </p>
          <p className="text-xs opacity-80">
            {isRateLimit ? "Please wait 30-60 seconds and try again." : error}
          </p>
          <Button
            onClick={requestSummary}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      );
    }

    if (!hasRequested || needsRefresh) {
      return (
        <Button
          onClick={requestSummary}
          variant="secondary"
          className="w-full"
          aria-label={`Generate AI summary for ${procedure.title}`}
        >
          {needsRefresh ? "Refresh Summary for New Context" : "Generate AI Summary"}
        </Button>
      );
    }

    if (isLoading && !completion) {
      return <DossierSkeleton />;
    }

    if (completion) {
      return (
        <div
          className="prose prose-sm max-w-none text-card-foreground"
          aria-label={`AI Summary of ${procedure.title}`}
          role="region"
        >
          <div className="space-y-3 text-sm">
            {completion.split("\n").map((line, idx) => {
              if (line.startsWith("## ")) {
                return (
                  <h4
                    key={idx}
                    className="font-semibold text-primary mt-3 first:mt-0"
                  >
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
        </div>
      );
    }

    return <DossierSkeleton />;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-mono mb-1">
              {procedure.reference}
            </p>
            <CardTitle className="text-lg leading-tight">
              {procedure.title}
            </CardTitle>
          </div>
          <Badge variant="default" className="shrink-0">
            {procedure.type}
          </Badge>
        </div>
        {procedure.subjects.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {procedure.subjects.slice(0, 3).map((subject, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {subject}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="border-t pt-4">{renderSummary()}</div>
        <div className="flex items-center justify-between mt-4 pt-3 border-t text-xs text-muted-foreground">
          <span>Status: {procedure.status}</span>
          {procedure.lastActivity && (
            <span>
              Last: {procedure.lastActivity.type} (
              {new Date(procedure.lastActivity.date).toLocaleDateString("en-GB")}
              )
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
