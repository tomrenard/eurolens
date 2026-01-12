"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface FilterOption {
  value: string;
  label: string;
}

interface ProcedureFiltersProps {
  typeFilter: string;
  yearFilter: string;
  availableTypes: FilterOption[];
  availableYears: FilterOption[];
  onTypeChange: (type: string) => void;
  onYearChange: (year: string) => void;
  onReset: () => void;
}

export function ProcedureFilters({
  typeFilter,
  yearFilter,
  availableTypes,
  availableYears,
  onTypeChange,
  onYearChange,
  onReset,
}: ProcedureFiltersProps) {
  const hasActiveFilters = typeFilter !== "all" || yearFilter !== "all";
  const hasTypeOptions = availableTypes.length > 1;
  const hasYearOptions = availableYears.length > 1;

  if (!hasTypeOptions && !hasYearOptions) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-4 bg-card rounded-lg border">
      {hasTypeOptions && (
        <div className="flex-1 min-w-0">
          <label
            htmlFor="type-filter"
            className="block text-sm font-medium text-muted-foreground mb-1.5 sm:mb-2"
          >
            Procedure Type
          </label>
          <Select value={typeFilter} onValueChange={onTypeChange}>
            <SelectTrigger id="type-filter" className="w-full h-11 sm:h-10">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              {availableTypes.map((type) => (
                <SelectItem key={type.value} value={type.value} className="py-2.5 sm:py-2">
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {hasYearOptions && (
        <div className="flex-1 min-w-0">
          <label
            htmlFor="year-filter"
            className="block text-sm font-medium text-muted-foreground mb-1.5 sm:mb-2"
          >
            Year
          </label>
          <Select value={yearFilter} onValueChange={onYearChange}>
            <SelectTrigger id="year-filter" className="w-full h-11 sm:h-10">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year.value} value={year.value} className="py-2.5 sm:py-2">
                  {year.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {hasActiveFilters && (
        <div className="flex items-end">
          <Button variant="outline" onClick={onReset} className="w-full sm:w-auto h-11 sm:h-10">
            Reset Filters
          </Button>
        </div>
      )}
    </div>
  );
}
