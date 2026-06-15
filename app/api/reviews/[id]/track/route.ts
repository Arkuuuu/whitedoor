import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { action } = await request.json();

  if (!["viewed", "copied", "used"].includes(action)) {
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
      : { times_used: review.times_used + 1, status: "archived" };

  const { error: updateError } = await supabase
    .from("reviews")
    .update(updateField)
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabase.from("activity_logs").insert({ review_id: id, action });

  return NextResponse.json({ success: true });
}
