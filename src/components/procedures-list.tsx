"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { DossierCard } from "@/components/dossier-card";
import { ProcedureFilters } from "@/components/procedure-filters";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { scoreRelevance } from "@/lib/explainer";
import { PERSONA_LABELS } from "@/types/europarl";
import type { LegislativeProcedure, Persona } from "@/types/europarl";

interface ProceduresListProps {
  procedures: LegislativeProcedure[];
  persona: Persona;
  showFilters?: boolean;
}

const ITEMS_PER_PAGE = 6;

export function ProceduresList({
  procedures,
  persona,
  showFilters = true,
}: ProceduresListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(0);
  const [relevantFirst, setRelevantFirst] = useState(true);

  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const availableTypes = useMemo(() => {
    const types = [...new Set(procedures.map((p) => p.type))].sort();
    return [
      { value: "all", label: "All Types" },
      ...types.map((t) => ({ value: t, label: t })),
    ];
  }, [procedures]);

  const availableYears = useMemo(() => {
    const years = [
      ...new Set(
        procedures
          .map((p) => p.reference.match(/\d{4}/)?.[0])
          .filter((y): y is string => Boolean(y))
      ),
    ];
    years.sort((a, b) => Number(b) - Number(a));
    return [
      { value: "all", label: "All Years" },
      ...years.map((y) => ({ value: y, label: y })),
    ];
  }, [procedures]);

  const filteredProcedures = useMemo(() => {
    return procedures.filter((proc) => {
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase();
        const matchesSearch =
          proc.title.toLowerCase().includes(query) ||
          (proc.summary?.toLowerCase().includes(query) ?? false) ||
          proc.reference.toLowerCase().includes(query) ||
          (proc.subjects?.some((s) => s.toLowerCase().includes(query)) ??
            false);
        if (!matchesSearch) return false;
      }
      if (typeFilter !== "all" && proc.type !== typeFilter) return false;
      if (yearFilter !== "all" && !proc.reference.includes(yearFilter))
        return false;
      return true;
    });
  }, [procedures, debouncedSearch, typeFilter, yearFilter]);

  /**
   * Personalisation used to mean asking a model to reword a summary for the
   * reader. It now ranks the feed instead: files whose committee or subject
   * matter matches the selected persona surface first, which is both free and
   * a better answer to "what here affects me".
   */
  const rankedProcedures = useMemo(() => {
    if (persona === "general" || !relevantFirst) return filteredProcedures;

    return [...filteredProcedures]
      .map((procedure) => ({
        procedure,
        score: scoreRelevance(
          { committees: procedure.subjects, title: procedure.title },
          persona
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.procedure);
  }, [filteredProcedures, persona, relevantFirst]);

  const relevantCount = useMemo(() => {
    if (persona === "general") return 0;
    return filteredProcedures.filter(
      (procedure) =>
        scoreRelevance(
          { committees: procedure.subjects, title: procedure.title },
          persona
        ) > 0
    ).length;
  }, [filteredProcedures, persona]);

  const totalPages = Math.ceil(rankedProcedures.length / ITEMS_PER_PAGE);

  const paginatedProcedures = useMemo(() => {
    const start = currentPage * ITEMS_PER_PAGE;
    return rankedProcedures.slice(start, start + ITEMS_PER_PAGE);
  }, [rankedProcedures, currentPage]);

  const handleTypeChange = (type: string) => {
    setTypeFilter(type);
    setCurrentPage(0);
  };

  const handleYearChange = (year: string) => {
    setYearFilter(year);
    setCurrentPage(0);
  };

  const handleReset = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setYearFilter("all");
    setCurrentPage(0);
  };

  const handlePrevious = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
  };

  if (procedures.length === 0) {
    return (
      <p className="text-muted-foreground">No legislative procedures found.</p>
    );
  }

  const hasActiveFilters =
    searchQuery !== "" || typeFilter !== "all" || yearFilter !== "all";

  return (
    <div className="space-y-4 sm:space-y-6">
      {showFilters && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 sm:h-4 sm:w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search procedures..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(0);
              }}
              className="w-full pl-11 sm:pl-10 pr-4 py-3 sm:py-2 text-base sm:text-sm border rounded-lg sm:rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label="Search procedures"
            />
          </div>

          <ProcedureFilters
            typeFilter={typeFilter}
            yearFilter={yearFilter}
            availableTypes={availableTypes}
            availableYears={availableYears}
            onTypeChange={handleTypeChange}
            onYearChange={handleYearChange}
            onReset={handleReset}
          />
        </div>
      )}

      {persona !== "general" && relevantCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-sm text-foreground">
            <span className="font-semibold">{relevantCount}</span> of{" "}
            {filteredProcedures.length} match{" "}
            {PERSONA_LABELS[persona].toLowerCase()} interests.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setRelevantFirst((prev) => !prev);
              setCurrentPage(0);
            }}
            aria-pressed={relevantFirst}
          >
            {relevantFirst ? "Show in original order" : "Show relevant first"}
          </Button>
        </div>
      )}

      {filteredProcedures.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No procedures match your {searchQuery ? "search" : "filters"}.
          </p>
          {hasActiveFilters && (
            <Button variant="link" onClick={handleReset} className="mt-2">
              Clear{" "}
              {searchQuery && typeFilter === "all" && yearFilter === "all"
                ? "search"
                : "filters"}
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {paginatedProcedures.map((procedure) => (
              <DossierCard
                key={procedure.reference || procedure.id}
                procedure={procedure}
                persona={persona}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between sm:justify-center gap-2 sm:gap-4 mt-6 sm:mt-8 px-2 sm:px-0">
              <Button
                variant="outline"
                size="default"
                onClick={handlePrevious}
                disabled={currentPage === 0}
                className="flex-1 sm:flex-none py-2.5 sm:py-2"
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {currentPage + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="default"
                onClick={handleNext}
                disabled={currentPage >= totalPages - 1}
                className="flex-1 sm:flex-none py-2.5 sm:py-2"
              >
                Next
              </Button>
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Showing {paginatedProcedures.length} of {rankedProcedures.length}{" "}
            procedures
          </p>
        </>
      )}
    </div>
  );
}
