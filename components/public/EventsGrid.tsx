"use client";

import { useState } from "react";
import { EventCard } from "@/components/public/EventCard";
import { SearchBar } from "@/components/public/SearchBar";
import type { Event } from "@/lib/types";

export function EventsGrid({ events }: { events: Event[] }) {
  const [search, setSearch] = useState("");

  const filtered = events.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="mb-6 max-w-md">
        <SearchBar value={search} onChange={setSearch} />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          {search ? `No events matching "${search}"` : "No events available right now."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </>
  );
}
