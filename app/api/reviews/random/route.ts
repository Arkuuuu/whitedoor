import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

async function releaseExpiredReservations(eventId: string) {
  const supabase = await createAdminClient();
  const now = new Date().toISOString();

  const { data: expired } = await supabase
    .from("review_reservations")
    .select("review_id")
    .lt("expires_at", now);

  if (expired && expired.length > 0) {
    const reviewIds = expired.map((r) => r.review_id);

    // Release linked images back to available
    const { data: linkedImages } = await supabase
      .from("review_images")
      .select("image_id")
      .in("review_id", reviewIds);

    if (linkedImages && linkedImages.length > 0) {
      await supabase
        .from("images")
        .update({ status: "available" })
        .in("id", linkedImages.map((li) => li.image_id))
        .eq("status", "reserved");
    }

    await supabase
      .from("reviews")
      .update({ status: "active" })
      .in("id", reviewIds)
      .eq("status", "reserved");

    await supabase.from("review_reservations").delete().lt("expires_at", now);
  }
}

const REVIEW_SELECT = `
  *,
  review_images(
    id,
    image_id,
    display_order,
    images(id, image_url, title, status, downloads)
  )
` as const;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  const excludeRaw = searchParams.get("exclude") ?? "";

  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  }

  await releaseExpiredReservations(eventId);

  const supabase = await createClient();
  const excludeIds = excludeRaw ? excludeRaw.split(",").filter(Boolean) : [];

  let query = supabase
    .from("reviews")
    .select(REVIEW_SELECT)
    .eq("event_id", eventId)
    .eq("status", "active");

  if (excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.join(",")})`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // All shown/excluded — reset session pool
  if (!data || data.length === 0) {
    const { data: allData, error: allError } = await supabase
      .from("reviews")
      .select(REVIEW_SELECT)
      .eq("event_id", eventId)
      .eq("status", "active");

    if (allError || !allData || allData.length === 0) {
      return NextResponse.json({ error: "No reviews available" }, { status: 404 });
    }

    const review = allData[Math.floor(Math.random() * allData.length)];
    return NextResponse.json({ ...review, poolReset: true });
  }

  const review = data[Math.floor(Math.random() * data.length)];
  return NextResponse.json(review);
}
