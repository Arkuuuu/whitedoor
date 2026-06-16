import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");

  let query = supabase
    .from("reviews")
    .select("*, review_images(id, image_id, display_order, images(*))")
    .order("created_at", { ascending: false });

  if (eventId) {
    query = query.eq("event_id", eventId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await createAdminClient();

  // Accept FormData (supports optional image files)
  const formData = await request.formData();
  const eventIdRaw = formData.get("event_id") as string | null;
  const reviewText = (formData.get("review_text") as string | null)?.trim();

  if (!reviewText) {
    return NextResponse.json({ error: "review_text is required" }, { status: 400 });
  }

  const eventId = eventIdRaw && eventIdRaw !== "__general__" ? eventIdRaw : null;

  // Collect uploaded image files (image_1, image_2, image_3)
  const imageFiles: File[] = [];
  for (let i = 1; i <= 3; i++) {
    const f = formData.get(`image_${i}`);
    if (f instanceof File && f.size > 0) imageFiles.push(f);
  }

  const reviewType =
    imageFiles.length === 0
      ? "TEXT_ONLY"
      : imageFiles.length === 1
      ? "SINGLE_IMAGE"
      : "MULTI_IMAGE";

  // Upload images to storage and insert into images table
  const uploadedImageIds: string[] = [];

  for (const file of imageFiles) {
    const ext = file.name.split(".").pop() ?? "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: storageError } = await supabase.storage
      .from("event-images")
      .upload(fileName, file, { contentType: file.type });

    if (storageError) {
      return NextResponse.json(
        { error: `Image upload failed: ${storageError.message}` },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("event-images").getPublicUrl(fileName);

    const { data: imgRow, error: imgInsertError } = await admin
      .from("images")
      .insert({ event_id: eventId, image_url: publicUrl, title: null })
      .select("id")
      .single();

    if (imgInsertError || !imgRow) {
      return NextResponse.json(
        { error: `Failed to save image record: ${imgInsertError?.message}` },
        { status: 500 }
      );
    }

    uploadedImageIds.push(imgRow.id);
  }

  // Insert the review
  const { data: review, error: reviewError } = await admin
    .from("reviews")
    .insert({ event_id: eventId, review_text: reviewText, review_type: reviewType })
    .select("id")
    .single();

  if (reviewError || !review) {
    return NextResponse.json(
      { error: reviewError?.message ?? "Failed to create review" },
      { status: 500 }
    );
  }

  // Link images via review_images
  if (uploadedImageIds.length > 0) {
    const linkRows = uploadedImageIds.map((imageId, idx) => ({
      review_id: review.id,
      image_id: imageId,
      display_order: idx,
    }));

    const { error: linkError } = await admin.from("review_images").insert(linkRows);

    if (linkError) {
      return NextResponse.json(
        { error: `Review created but image linking failed: ${linkError.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ id: review.id, review_type: reviewType }, { status: 201 });
}
