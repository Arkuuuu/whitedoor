import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createAdminClient();
  const { action, event_id, session_id } = await request.json();

  const validActions = ["viewed", "copied", "used", "photo_downloaded", "skipped"];
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { data: review, error: fetchError } = await supabase
    .from("reviews")
    .select("times_shown, times_copied, times_used")
    .eq("id", id)
    .single();

  if (fetchError || !review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  const updateField =
    action === "viewed"
      ? { times_shown: review.times_shown + 1 }
      : action === "copied"
      ? { times_copied: review.times_copied + 1 }
      : action === "used"
      ? { times_used: review.times_used + 1, status: "archived" }
      : null;

  if (updateField) {
    const { error: updateError } = await supabase
      .from("reviews")
      .update(updateField)
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  // When a review is used, permanently retire its linked images
  if (action === "used") {
    const { data: linkedImages } = await supabase
      .from("review_images")
      .select("image_id")
      .eq("review_id", id);

    if (linkedImages && linkedImages.length > 0) {
      await supabase
        .from("images")
        .update({ status: "used" })
        .in("id", linkedImages.map((li) => li.image_id));
    }
  }

  await supabase.from("activity_logs").insert({
    review_id: id,
    event_id: event_id ?? null,
    session_id: session_id ?? null,
    action,
  });

  return NextResponse.json({ success: true });
}
