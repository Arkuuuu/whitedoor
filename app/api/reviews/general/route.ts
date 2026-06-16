import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";

function readClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
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
  const excludeRaw = searchParams.get("exclude") ?? "";
  const excludeIds = excludeRaw ? excludeRaw.split(",").filter(Boolean) : [];

  const db = readClient();
  const admin = await createAdminClient();

  let query = db
    .from("reviews")
    .select(REVIEW_SELECT)
    .is("event_id", null)
    .eq("status", "active");

  if (excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.join(",")})`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    // All excluded — reset and pick from full pool
    const { data: allData, error: allError } = await db
      .from("reviews")
      .select(REVIEW_SELECT)
      .is("event_id", null)
      .eq("status", "active");

    if (allError || !allData || allData.length === 0) {
      return NextResponse.json({ error: "No general reviews available" }, { status: 404 });
    }

    const review = allData[Math.floor(Math.random() * allData.length)];
    await admin.from("reviews").update({ times_shown: review.times_shown + 1 }).eq("id", review.id);
    return NextResponse.json({ ...review, poolReset: true });
  }

  const review = data[Math.floor(Math.random() * data.length)];
  await admin.from("reviews").update({ times_shown: review.times_shown + 1 }).eq("id", review.id);
  return NextResponse.json(review);
}
