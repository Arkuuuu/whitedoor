import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { session_id } = await request.json();

  const supabase = await createAdminClient();

  // Reserve the review
  await supabase
    .from("reviews")
    .update({ status: "reserved" })
    .eq("id", id)
    .eq("status", "active");

  // Reserve linked images
  const { data: linkedImages } = await supabase
    .from("review_images")
    .select("image_id")
    .eq("review_id", id);

  if (linkedImages && linkedImages.length > 0) {
    await supabase
      .from("images")
      .update({ status: "reserved" })
      .in("id", linkedImages.map((li) => li.image_id))
      .eq("status", "available");
  }

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  await supabase.from("review_reservations").insert({
    review_id: id,
    session_id: session_id ?? "unknown",
    expires_at: expiresAt,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createAdminClient();

  // Release the review
  await supabase
    .from("reviews")
    .update({ status: "active" })
    .eq("id", id)
    .eq("status", "reserved");

  // Release linked images
  const { data: linkedImages } = await supabase
    .from("review_images")
    .select("image_id")
    .eq("review_id", id);

  if (linkedImages && linkedImages.length > 0) {
    await supabase
      .from("images")
      .update({ status: "available" })
      .in("id", linkedImages.map((li) => li.image_id))
      .eq("status", "reserved");
  }

  await supabase.from("review_reservations").delete().eq("review_id", id);

  return NextResponse.json({ success: true });
}
