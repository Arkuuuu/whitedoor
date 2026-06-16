import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createAdminClient();

  const { data: image, error: fetchError } = await supabase
    .from("images")
    .select("downloads")
    .eq("id", id)
    .single();

  if (fetchError || !image) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  await supabase
    .from("images")
    .update({ downloads: image.downloads + 1 })
    .eq("id", id);

  return NextResponse.json({ success: true });
}
