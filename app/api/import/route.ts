import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

interface ReviewRow extends Record<string, string> {
  local_id: string;
  event_id: string;
  review_text: string;
}

interface MappingRow extends Record<string, string> {
  review_id: string;
  image_1: string;
  image_2: string;
  image_3: string;
}

interface ImportResult {
  row: number;
  local_id: string;
  review_text: string;
  status: "created" | "error";
  images_linked: number;
  error?: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeHeader(h: unknown): string {
  return String(h ?? "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .trim();
}

function parseSheet<T extends Record<string, string>>(
  wb: XLSX.WorkBook,
  sheetName: string,
  required: string[]
): { rows: T[]; error?: string } {
  const ws = wb.Sheets[sheetName];
  if (!ws) return { rows: [], error: `Sheet "${sheetName}" not found` };

  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
  });
  if (raw.length === 0) return { rows: [] };

  const rows = raw.map((r) => {
    const normalized: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) {
      normalized[normalizeHeader(k)] = String(v ?? "").trim();
    }
    return normalized as T;
  });

  for (const req of required) {
    if (!(req in rows[0])) {
      return {
        rows: [],
        error: `Sheet "${sheetName}" is missing required column "${req}"`,
      };
    }
  }

  return { rows };
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

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "buffer" });
  } catch {
    return NextResponse.json(
      { error: "Could not read file. Please upload a valid .xlsx or .csv" },
      { status: 400 }
    );
  }

  // ── Parse Reviews sheet ───────────────────────────────────────────────────
  const { rows: reviewRows, error: reviewSheetError } = parseSheet<ReviewRow>(
    wb,
    "Reviews",
    ["local_id", "event_id", "review_text"]
  );
  if (reviewSheetError) {
    return NextResponse.json({ error: reviewSheetError }, { status: 400 });
  }
  if (reviewRows.length === 0) {
    return NextResponse.json(
      { error: "Reviews sheet is empty" },
      { status: 400 }
    );
  }

  // ── Parse Mapping sheet (optional) ───────────────────────────────────────
  const { rows: mappingRows } = parseSheet<MappingRow>(wb, "Mapping", [
    "review_id",
  ]);

  // Build lookup: local_review_id → [raw image ref (title or UUID), ...]
  const rawMappingByLocalId = new Map<string, string[]>();
  for (const row of mappingRows) {
    const refs = [row.image_1, row.image_2, row.image_3]
      .map((v) => v?.trim() ?? "")
      .filter((v) => v.length > 0);
    if (refs.length > 0) rawMappingByLocalId.set(row.review_id, refs);
  }

  // ── Resolve image titles → UUIDs ──────────────────────────────────────────
  // Each cell in image_1/2/3 can be either an image title OR a UUID.
  // Titles are matched case-insensitively against the `title` column in images.
  const allRawRefs = [...new Set([...rawMappingByLocalId.values()].flat())];
  const titleRefs = allRawRefs.filter((r) => !UUID_RE.test(r));
  const titleToId = new Map<string, string>(); // normalizedTitle → image UUID

  if (titleRefs.length > 0) {
    const { data: byTitle, error: titleLookupError } = await admin
      .from("images")
      .select("id, title");

    if (titleLookupError) {
      return NextResponse.json(
        { error: `Failed to look up images: ${titleLookupError.message}` },
        { status: 500 }
      );
    }

    for (const img of byTitle ?? []) {
      if (img.title) {
        titleToId.set(img.title.toLowerCase().trim(), img.id);
      }
    }

    const unresolved = titleRefs.filter(
      (t) => !titleToId.has(t.toLowerCase().trim())
    );
    if (unresolved.length > 0) {
      return NextResponse.json(
        {
          error: `These image titles were not found — check spelling matches exactly what you typed when uploading: ${unresolved.join(", ")}`,
        },
        { status: 400 }
      );
    }
  }

  // Replace raw refs with resolved UUIDs
  const mappingByLocalId = new Map<string, string[]>();
  for (const [localId, rawRefs] of rawMappingByLocalId) {
    const resolved = rawRefs.map((raw) => {
      if (UUID_RE.test(raw)) return raw; // already a UUID
      return titleToId.get(raw.toLowerCase().trim()) ?? raw;
    });
    mappingByLocalId.set(localId, resolved);
  }

  // ── Validate resolved UUIDs exist in DB ───────────────────────────────────
  const allImageIds = [...new Set([...mappingByLocalId.values()].flat())];

  if (allImageIds.length > 0) {
    const { data: existingImages } = await admin
      .from("images")
      .select("id")
      .in("id", allImageIds);

    const validIds = new Set((existingImages ?? []).map((img) => img.id));
    const invalid = allImageIds.filter((id) => !validIds.has(id));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Image IDs not found in system: ${invalid.join(", ")}` },
        { status: 400 }
      );
    }

    // Ensure no image is already linked to another review
    const { data: alreadyLinked } = await admin
      .from("review_images")
      .select("image_id")
      .in("image_id", allImageIds);

    if (alreadyLinked && alreadyLinked.length > 0) {
      const taken = alreadyLinked.map((r) => r.image_id).join(", ");
      return NextResponse.json(
        { error: `These images are already linked to another review: ${taken}` },
        { status: 400 }
      );
    }
  }

  // ── Insert reviews + link images ──────────────────────────────────────────
  const results: ImportResult[] = [];

  for (let i = 0; i < reviewRows.length; i++) {
    const row = reviewRows[i];
    const localId = row.local_id?.trim();
    const eventIdRaw = row.event_id?.trim();
    const reviewText = row.review_text?.trim();

    if (!localId || !reviewText) {
      results.push({
        row: i + 2,
        local_id: localId ?? "",
        review_text: reviewText ?? "",
        status: "error",
        images_linked: 0,
        error: "local_id and review_text are required",
      });
      continue;
    }

    const eventId =
      !eventIdRaw || eventIdRaw.toLowerCase() === "general" ? null : eventIdRaw;
    const imageIds = mappingByLocalId.get(localId) ?? [];
    const reviewType =
      imageIds.length === 0
        ? "TEXT_ONLY"
        : imageIds.length === 1
        ? "SINGLE_IMAGE"
        : "MULTI_IMAGE";

    try {
      const { data: created, error: insertError } = await admin
        .from("reviews")
        .insert({ event_id: eventId, review_text: reviewText, review_type: reviewType })
        .select("id")
        .single();

      if (insertError || !created)
        throw new Error(insertError?.message ?? "Insert failed");

      let imagesLinked = 0;
      if (imageIds.length > 0) {
        const imageRows = imageIds.map((imageId, idx) => ({
          review_id: created.id,
          image_id: imageId,
          display_order: idx,
        }));
        const { error: linkError } = await admin
          .from("review_images")
          .insert(imageRows);
        if (linkError)
          throw new Error(
            `Review created but images failed to link: ${linkError.message}`
          );
        imagesLinked = imageIds.length;
      }

      results.push({
        row: i + 2,
        local_id: localId,
        review_text: reviewText,
        status: "created",
        images_linked: imagesLinked,
      });
    } catch (err: unknown) {
      results.push({
        row: i + 2,
        local_id: localId,
        review_text: reviewText,
        status: "error",
        images_linked: 0,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const created = results.filter((r) => r.status === "created").length;
  const errors = results.filter((r) => r.status === "error").length;

  return NextResponse.json({ created, errors, results });
}
