"use client";

import { useMemo } from "react";
import { Users, Flag, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ATTRIBUTION, type RollCall } from "@/lib/howtheyvote";
import { COUNTRY_LABELS, type Country } from "@/types/europarl";

interface RollCallCardProps {
  rollCall: RollCall;
  /** The reader's selected country, used to surface their own delegation first. */
  country: Country;
}

function Bar({
  favor,
  against,
  abstention,
  didNotVote,
}: {
  favor: number;
  against: number;
  abstention: number;
  didNotVote: number;
}) {
  const total = favor + against + abstention + didNotVote;
  if (total === 0) return null;

  const segments = [
    { value: favor, className: "bg-green-500", label: `In favour: ${favor}` },
    { value: against, className: "bg-red-500", label: `Against: ${against}` },
    {
      value: abstention,
      className: "bg-gray-400",
      label: `Abstention: ${abstention}`,
    },
    {
      value: didNotVote,
      className: "bg-muted-foreground/25",
      label: `Did not vote: ${didNotVote}`,
    },
  ];

  return (
    <div className="flex gap-0.5 h-2 rounded-full overflow-hidden bg-muted">
      {segments
        .filter((segment) => segment.value > 0)
        .map((segment) => (
          <div
            key={segment.label}
            style={{ width: `${(segment.value / total) * 100}%` }}
            className={segment.className}
            title={segment.label}
          />
        ))}
    </div>
  );
}

export function RollCallCard({ rollCall, country }: RollCallCardProps) {
  const delegation = useMemo(() => {
    if (country === "general") return null;

    const votes = rollCall.votes.filter((vote) => vote.countryCode === country);
    if (votes.length === 0) return null;

    const tally = { favor: 0, against: 0, abstention: 0, did_not_vote: 0 };
    for (const vote of votes) tally[vote.vote]++;

    return { votes, tally };
  }, [rollCall.votes, country]);

  const groups = useMemo(
    () =>
      [...rollCall.byGroup].sort(
        (a, b) =>
          b.favor + b.against + b.abstention + b.didNotVote -
          (a.favor + a.against + a.abstention + a.didNotVote)
      ),
    [rollCall.byGroup]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          How Parliament split
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {delegation && (
          <section
            className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3"
            aria-labelledby="delegation-heading"
          >
            <h3
              id="delegation-heading"
              className="text-sm font-semibold flex items-center gap-2"
            >
              <Flag className="h-4 w-4 text-primary" />
              Your MEPs — {COUNTRY_LABELS[country]}
            </h3>
            <p className="text-sm text-muted-foreground">
              Of {delegation.votes.length} members from{" "}
              {COUNTRY_LABELS[country]},{" "}
              <span className="font-medium text-foreground">
                {delegation.tally.favor} voted in favour
              </span>
              , {delegation.tally.against} against and{" "}
              {delegation.tally.abstention} abstained.
              {delegation.tally.did_not_vote > 0 &&
                ` ${delegation.tally.did_not_vote} did not vote.`}
            </p>
            <Bar
              favor={delegation.tally.favor}
              against={delegation.tally.against}
              abstention={delegation.tally.abstention}
              didNotVote={delegation.tally.did_not_vote}
            />
          </section>
        )}

        <section aria-labelledby="groups-heading" className="space-y-3">
          <h3 id="groups-heading" className="text-sm font-semibold">
            By political group
          </h3>
          <ul className="space-y-3">
            {groups.map((group) => (
              <li key={group.code} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium truncate" title={group.label}>
                    {group.shortLabel}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                    {group.favor} for · {group.against} against ·{" "}
                    {group.abstention} abstained
                  </span>
                </div>
                <Bar
                  favor={group.favor}
                  against={group.against}
                  abstention={group.abstention}
                  didNotVote={group.didNotVote}
                />
              </li>
            ))}
          </ul>
        </section>

        <p className="text-xs text-muted-foreground border-t pt-3">
          Roll-call data from{" "}
          <a
            href={rollCall.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            {ATTRIBUTION.name}
            <ExternalLink className="h-3 w-3" />
          </a>
          , licensed under the{" "}
          <a
            href={ATTRIBUTION.licenceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {ATTRIBUTION.licence}
          </a>
          . Originally published by the European Parliament.
        </p>
      </CardContent>
    </Card>
  );
}
