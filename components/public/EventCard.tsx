"use client";

import Link from "next/link";
import Image from "next/image";
import { Calendar, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import type { Event } from "@/lib/types";

export function EventCard({ event }: { event: Event }) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200 group">
      <div className="relative h-48 bg-gray-100">
        {event.banner_url ? (
          <Image
            src={event.banner_url}
            alt={event.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-blue-50 to-blue-100">
            <span className="text-blue-300 text-4xl font-bold">
              {event.name.charAt(0)}
            </span>
          </div>
        )}
      </div>
      <CardContent className="p-5">
        <h3 className="font-semibold text-gray-900 text-lg mb-1 line-clamp-1">
          {event.name}
        </h3>
        {event.description && (
          <p className="text-gray-500 text-sm mb-3 line-clamp-2">
            {event.description}
          </p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-gray-400 text-sm">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(event.event_date)}</span>
          </div>
          <Link
            href={`/events/${event.id}`}
            className={cn(buttonVariants({ size: "sm" }), "gap-1")}
          >
            View Event <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
