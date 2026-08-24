import { Landmark, Milestone, ArrowRight, Gavel, UserCheck } from "lucide-react";
import { explain } from "@/lib/explainer";
import type { LegislativeProcedure, Persona } from "@/types/europarl";

interface PlainEnglishProps {
  procedure: LegislativeProcedure;
  persona?: Persona;
  /**
   * Official Legislative Observatory summary paragraphs, when available.
   * Shown above the explainer because it is the authoritative account.
   */
  officialSummary?: string[];
}

interface RowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}

function Row({ icon: Icon, label, children }: RowProps) {
  return (
    <div className="flex gap-3">
      <Icon
        className="h-4 w-4 mt-0.5 shrink-0 text-primary"
        aria-hidden="true"
      />
      <div className="min-w-0 space-y-0.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          {label}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {children}
        </p>
      </div>
    </div>
  );
}

/**
 * Explains a procedure using only its structured fields and a fixed glossary.
 *
 * This replaced an LLM-generated summary. It renders on the server with no
 * network call, no API key and no sign-in, which also makes the substance of
 * every procedure page indexable by search engines.
 */
export function PlainEnglish({
  procedure,
  persona = "general",
  officialSummary,
}: PlainEnglishProps) {
  const explanation = explain(procedure, persona);

  return (
    <div className="space-y-4" aria-label={`Plain English explanation of ${procedure.title}`}>
      {officialSummary && officialSummary.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Official summary
          </p>
          {officialSummary.slice(0, 2).map((paragraph, idx) => (
            <p
              key={idx}
              className="text-sm text-muted-foreground leading-relaxed"
            >
              {paragraph}
            </p>
          ))}
          <p className="text-xs text-muted-foreground/70">
            Published in the European Parliament&apos;s Legislative Observatory.
          </p>
        </div>
      )}

      <div className="space-y-3">
        <Row icon={Landmark} label="What this is">
          {explanation.what}
        </Row>

        <Row icon={Milestone} label="Where it stands">
          {explanation.stage}
        </Row>

        {explanation.next && (
          <Row icon={ArrowRight} label="What happens next">
            {explanation.next}
          </Row>
        )}

        {explanation.outcome && (
          <Row icon={Gavel} label="The vote">
            {explanation.outcome}
          </Row>
        )}

        {explanation.relevance && (
          <Row icon={UserCheck} label="Why it may matter to you">
            {explanation.relevance}
          </Row>
        )}
      </div>

      {explanation.committees.length > 0 && (
        <div className="pt-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1.5">
            Committees
          </p>
          <ul className="space-y-0.5">
            {explanation.committees.map((committee) => (
              <li key={committee} className="text-sm text-muted-foreground">
                {committee}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
