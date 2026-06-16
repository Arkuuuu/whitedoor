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

  const db = supabase();

  // Exclude images that are privately linked to a review
  const { data: linked } = await db.from("review_images").select("image_id");
  const excludedIds = (linked ?? []).map((r) => r.image_id);

  let query = db
    .from("images")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at");

  if (excludedIds.length > 0) {
    query = query.not("id", "in", `(${excludedIds.join(",")})`);
  }

  const { data } = await query;
  return (data ?? []) as ImageType[];
}
