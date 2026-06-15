import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  const excludeRaw = searchParams.get("exclude") ?? "";

  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const excludeIds = excludeRaw ? excludeRaw.split(",").filter(Boolean) : [];

  let query = supabase
    .from("reviews")
    .select("*")
    .eq("event_id", eventId)
    .eq("status", "active");

  if (excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.join(",")})`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If all reviews have been shown, reset and pick from the full pool
  if (!data || data.length === 0) {
    const { data: allData, error: allError } = await supabase
      .from("reviews")
      .select("*")
      .eq("event_id", eventId)
      .eq("status", "active");

    if (allError || !allData || allData.length === 0) {
      return NextResponse.json({ error: "No reviews available" }, { status: 404 });
    }

    const review = allData[Math.floor(Math.random() * allData.length)];
    await supabase.from("reviews").update({ times_shown: review.times_shown + 1 }).eq("id", review.id);
    return NextResponse.json({ ...review, poolReset: true });
  }

  const review = data[Math.floor(Math.random() * data.length)];
  await supabase.from("reviews").update({ times_shown: review.times_shown + 1 }).eq("id", review.id);

  return NextResponse.json(review);
}
