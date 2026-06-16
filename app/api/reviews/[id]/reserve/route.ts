import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { session_id } = await request.json();

  const supabase = await createAdminClient();

  // Mark the review as reserved
  await supabase
    .from("reviews")
    .update({ status: "reserved" })
    .eq("id", id)
    .eq("status", "active");

  // Record the reservation with 30-minute expiry
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  await supabase.from("review_reservations").insert({
    review_id: id,
    session_id: session_id ?? "unknown",
    expires_at: expiresAt,
  });

  return NextResponse.json({ success: true });
}

// Called if user says "Not Yet" — releases the reservation early
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createAdminClient();

  await supabase
    .from("reviews")
    .update({ status: "active" })
    .eq("id", id)
    .eq("status", "reserved");

  await supabase.from("review_reservations").delete().eq("review_id", id);

  return NextResponse.json({ success: true });
}
