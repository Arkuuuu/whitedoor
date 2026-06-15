import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import type { Event, Image as ImageType } from "@/lib/types";

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function getActiveEvents(): Promise<Event[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("events");

  const { data } = await supabase()
    .from("events")
    .select("*")
    .eq("status", "active")
    .order("event_date", { ascending: false });

  return (data ?? []) as Event[];
}

export async function getEvent(id: string): Promise<Event | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("events", `event-${id}`);

  const { data } = await supabase()
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  return data as Event | null;
}

export async function getEventImages(eventId: string): Promise<ImageType[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("images", `images-${eventId}`);

  const { data } = await supabase()
    .from("images")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at");

  return (data ?? []) as ImageType[];
}
