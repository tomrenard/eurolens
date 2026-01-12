"use client";

import { useState, useMemo } from "react";
import { Search, ThumbsUp, ThumbsDown, MinusCircle, ExternalLink, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MEPVote, VoteType } from "@/types/europarl";

interface MEPVotesListProps {
  votes: MEPVote[];
}

function VoteIcon({ vote }: { vote: VoteType }) {
  switch (vote) {
    case "favor":
      return <ThumbsUp className="h-4 w-4 text-green-500" />;
    case "against":
      return <ThumbsDown className="h-4 w-4 text-red-500" />;
    case "abstention":
      return <MinusCircle className="h-4 w-4 text-gray-400" />;
  }
}

function VoteBadge({ vote }: { vote: VoteType }) {
  const variants: Record<VoteType, { className: string; label: string }> = {
    favor: { className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", label: "In Favor" },
    against: { className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", label: "Against" },
    abstention: { className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400", label: "Abstention" },
  };
  
  const { className, label } = variants[vote];
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      <VoteIcon vote={vote} />
      {label}
    </span>
  );
}

export function MEPVotesList({ votes }: MEPVotesListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVote, setFilterVote] = useState<VoteType | "all">("all");
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [showAll, setShowAll] = useState(false);

  const countries = useMemo(() => {
    const unique = [...new Set(votes.map((v) => v.country))].sort();
    return ["all", ...unique];
  }, [votes]);

  const groups = useMemo(() => {
    const unique = [...new Set(votes.map((v) => v.politicalGroup))].sort();
    return ["all", ...unique];
  }, [votes]);

  const filteredVotes = useMemo(() => {
    return votes.filter((vote) => {
      if (searchQuery && !vote.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (filterVote !== "all" && vote.vote !== filterVote) {
        return false;
      }
      if (filterCountry !== "all" && vote.country !== filterCountry) {
        return false;
      }
      if (filterGroup !== "all" && vote.politicalGroup !== filterGroup) {
        return false;
      }
      return true;
    });
  }, [votes, searchQuery, filterVote, filterCountry, filterGroup]);

  const displayedVotes = showAll ? filteredVotes : filteredVotes.slice(0, 20);

  const voteStats = useMemo(() => {
    const stats = { favor: 0, against: 0, abstention: 0 };
    filteredVotes.forEach((v) => stats[v.vote]++);
    return stats;
  }, [filteredVotes]);

  if (votes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Individual MEP Votes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Individual voting records are not available for this procedure.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Individual MEP Votes ({votes.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search MEP by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border rounded-md bg-background"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={filterVote}
            onChange={(e) => setFilterVote(e.target.value as VoteType | "all")}
            className="px-3 py-1.5 text-sm border rounded-md bg-background"
          >
            <option value="all">All Votes</option>
            <option value="favor">In Favor</option>
            <option value="against">Against</option>
            <option value="abstention">Abstention</option>
          </select>

          <select
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value)}
            className="px-3 py-1.5 text-sm border rounded-md bg-background"
          >
            {countries.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All Countries" : c}
              </option>
            ))}
          </select>

          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="px-3 py-1.5 text-sm border rounded-md bg-background"
          >
            {groups.map((g) => (
              <option key={g} value={g}>
                {g === "all" ? "All Groups" : g}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <ThumbsUp className="h-4 w-4 text-green-500" />
            <span className="font-medium">{voteStats.favor}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <ThumbsDown className="h-4 w-4 text-red-500" />
            <span className="font-medium">{voteStats.against}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <MinusCircle className="h-4 w-4 text-gray-400" />
            <span className="font-medium">{voteStats.abstention}</span>
          </span>
        </div>

        <div className="divide-y">
          {displayedVotes.map((vote) => (
            <div key={vote.mepId} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{vote.name}</span>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {vote.country}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {vote.politicalGroup}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <VoteBadge vote={vote.vote} />
                <a
                  href={`https://www.europarl.europa.eu/meps/en/${vote.mepId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="View MEP profile"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {filteredVotes.length > 20 && !showAll && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowAll(true)}
          >
            Show all {filteredVotes.length} votes
          </Button>
        )}

        {filteredVotes.length === 0 && (
          <p className="text-center text-muted-foreground py-4">
            No votes match your filters.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
