"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { TrainerCard, type TrainerProfile } from "@/components/trainer-card";

const SPECIALIZATIONS = [
  "weight_loss",
  "strength_training",
  "rehabilitation",
  "yoga",
  "pilates",
  "cardio",
  "hiit",
  "crossfit",
  "nutrition",
  "bodybuilding",
  "martial_arts",
  "swimming",
  "running",
  "flexibility",
  "prenatal",
  "postnatal",
  "sports_performance",
  "senior_fitness",
];

function formatSpecialization(spec: string): string {
  return spec.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Filters {
  search: string;
  specialization: string;
  city: string;
  country: string;
  minRate: string;
  maxRate: string;
  minExperience: string;
  maxExperience: string;
}

const EMPTY_FILTERS: Filters = {
  search: "",
  specialization: "",
  city: "",
  country: "",
  minRate: "",
  maxRate: "",
  minExperience: "",
  maxExperience: "",
};

export function TrainerDiscovery() {
  const [trainers, setTrainers] = useState<TrainerProfile[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(EMPTY_FILTERS);

  const fetchTrainers = useCallback(
    async (currentFilters: Filters, currentPage: number) => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ list: "true", page: String(currentPage), per_page: String(perPage) });

      if (currentFilters.search) params.set("search", currentFilters.search);
      if (currentFilters.specialization) params.set("specialization", currentFilters.specialization);
      if (currentFilters.city) params.set("city", currentFilters.city);
      if (currentFilters.country) params.set("country", currentFilters.country);
      if (currentFilters.minRate) params.set("min_rate", currentFilters.minRate);
      if (currentFilters.maxRate) params.set("max_rate", currentFilters.maxRate);
      if (currentFilters.minExperience) params.set("min_experience", currentFilters.minExperience);
      if (currentFilters.maxExperience) params.set("max_experience", currentFilters.maxExperience);

      const response = await fetch(`/api/trainers?${params.toString()}`);

      if (!response.ok) {
        setError("Failed to fetch trainers");
        setLoading(false);
        return;
      }

      const result = await response.json();

      setTrainers(result.data || []);
      setCount(result.count || 0);
      setLoading(false);
    },
    [perPage],
  );

  useEffect(() => {
    fetchTrainers(appliedFilters, page);
  }, [appliedFilters, page, fetchTrainers]);

  const handleApplyFilters = () => {
    setPage(1);
    setAppliedFilters({ ...filters });
  };

  const handleClearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleApplyFilters();
    }
  };

  const totalPages = Math.ceil(count / perPage);

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="space-y-4 rounded-lg border p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="Trainer name..."
              value={filters.search}
              onChange={(e) =>
                setFilters((f) => ({ ...f, search: e.target.value }))
              }
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Specialization</Label>
            <Select
              value={filters.specialization}
              onValueChange={(v) =>
                setFilters((f) => ({
                  ...f,
                  specialization: v === "all" ? "" : v,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Any specialization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any specialization</SelectItem>
                {SPECIALIZATIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {formatSpecialization(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              placeholder="City..."
              value={filters.city}
              onChange={(e) =>
                setFilters((f) => ({ ...f, city: e.target.value }))
              }
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              placeholder="Country..."
              value={filters.country}
              onChange={(e) =>
                setFilters((f) => ({ ...f, country: e.target.value }))
              }
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="min_rate">Min Rate ($/hr)</Label>
            <Input
              id="min_rate"
              type="number"
              min={0}
              placeholder="0"
              value={filters.minRate}
              onChange={(e) =>
                setFilters((f) => ({ ...f, minRate: e.target.value }))
              }
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="max_rate">Max Rate ($/hr)</Label>
            <Input
              id="max_rate"
              type="number"
              min={0}
              placeholder="Any"
              value={filters.maxRate}
              onChange={(e) =>
                setFilters((f) => ({ ...f, maxRate: e.target.value }))
              }
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="min_exp">Min Experience (yrs)</Label>
            <Input
              id="min_exp"
              type="number"
              min={0}
              placeholder="0"
              value={filters.minExperience}
              onChange={(e) =>
                setFilters((f) => ({ ...f, minExperience: e.target.value }))
              }
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="max_exp">Max Experience (yrs)</Label>
            <Input
              id="max_exp"
              type="number"
              min={0}
              placeholder="Any"
              value={filters.maxExperience}
              onChange={(e) =>
                setFilters((f) => ({ ...f, maxExperience: e.target.value }))
              }
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleApplyFilters}>Apply Filters</Button>
          <Button variant="outline" onClick={handleClearFilters}>
            Clear
          </Button>
        </div>
      </div>

      <Separator />

      {/* Results */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <p className="text-sm text-muted-foreground">Loading trainers...</p>
        </div>
      ) : trainers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">
            No trainers found matching your filters.
          </p>
          <Button
            variant="link"
            className="mt-2"
            onClick={handleClearFilters}
          >
            Clear all filters
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {count} trainer{count !== 1 ? "s" : ""} found
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trainers.map((trainer) => (
              <TrainerCard key={trainer.id} trainer={trainer} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
