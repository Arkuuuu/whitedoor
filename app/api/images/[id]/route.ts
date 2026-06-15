import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: image } = await supabase
    .from("images")
    .select("image_url")
    .eq("id", id)
    .single();

  if (image?.image_url) {
    const urlParts = image.image_url.split("/event-images/");
    if (urlParts[1]) {
      await supabase.storage.from("event-images").remove([urlParts[1]]);
    }
  }

  const { error } = await supabase.from("images").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateTag("images", "max");
  return NextResponse.json({ success: true });
}
