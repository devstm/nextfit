"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface TrainerProfile {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  phone: string | null;
  specializations: string[];
  certifications: { name: string; issuer: string; year: number }[];
  experience_years: number;
  location: string | null;
  city: string | null;
  country: string | null;
  hourly_rate: number | null;
  currency: string;
  is_available: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

function formatSpecialization(spec: string): string {
  return spec.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TrainerCard({ trainer }: { trainer: TrainerProfile }) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0">
              {trainer.display_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <CardTitle className="text-base leading-tight">
                {trainer.display_name}
              </CardTitle>
              {trainer.city && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {trainer.city}
                  {trainer.country ? `, ${trainer.country}` : ""}
                </p>
              )}
            </div>
          </div>
          {trainer.is_verified && (
            <Badge variant="default" className="shrink-0 text-xs">
              Verified
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {trainer.bio && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {trainer.bio}
          </p>
        )}

        {trainer.specializations.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {trainer.specializations.slice(0, 4).map((spec) => (
              <Badge key={spec} variant="secondary" className="text-xs">
                {formatSpecialization(spec)}
              </Badge>
            ))}
            {trainer.specializations.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{trainer.specializations.length - 4}
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {trainer.experience_years > 0 && (
            <span>{trainer.experience_years} yr exp</span>
          )}
          {trainer.hourly_rate != null && (
            <span className="font-medium text-foreground">
              {trainer.hourly_rate} {trainer.currency}/hr
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Button variant="outline" className="w-full" disabled>
          View Profile
        </Button>
      </CardFooter>
    </Card>
  );
}
