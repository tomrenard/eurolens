"use client";

import { Calendar, Vote, FileText, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeDate } from "@/lib/utils";

interface TimelineEvent {
  id: string;
  date: string;
  type: string;
  title: string;
  description?: string;
}

interface ProcedureTimelineProps {
  events: TimelineEvent[];
}

function getEventIcon(type: string) {
  switch (type.toLowerCase()) {
    case "voted":
    case "vote":
      return Vote;
    case "adopted":
    case "completed":
      return CheckCircle;
    case "document":
    case "report":
      return FileText;
    default:
      return Calendar;
  }
}

export function ProcedureTimeline({ events }: ProcedureTimelineProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
          
          <div className="space-y-6">
            {events.map((event, index) => {
              const Icon = getEventIcon(event.type);
              const isFirst = index === 0;
              
              return (
                <div key={event.id} className="relative pl-10">
                  <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    isFirst ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  
                  <div className="min-h-[2rem]">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <span className={`font-medium ${isFirst ? "text-primary" : "text-foreground"}`}>
                        {event.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeDate(event.date)}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
