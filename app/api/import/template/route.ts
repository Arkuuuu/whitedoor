import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Reviews ──────────────────────────────────────────────────────
  const reviews = [
    ["local_id", "event_id", "review_text"],
    [
      "R1",
      "paste-event-uuid-here",
      "Absolutely amazing experience! The team was professional, attentive, and made the event truly memorable. Highly recommend to anyone looking for a top-tier experience.",
    ],
    [
      "R2",
      "paste-event-uuid-here",
      "Exceptional service from start to finish. Every detail was taken care of and the atmosphere was perfect. Will definitely be coming back!",
    ],
    [
      "R3",
      "general",
      "One of the best experiences I've had. The staff went above and beyond to ensure everything was perfect. Five stars without hesitation.",
    ],
    [
      "R4",
      "paste-event-uuid-here",
      "Outstanding quality and attention to detail. The whole team was incredibly helpful and friendly. Couldn't have asked for a better experience.",
    ],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(reviews);

  // Column widths
  ws1["!cols"] = [
    { wch: 10 }, // local_id
    { wch: 38 }, // event_id
    { wch: 80 }, // review_text
  ];

  // Style header row (bold via cell metadata — xlsx community edition supports limited styling)
  XLSX.utils.book_append_sheet(wb, ws1, "Reviews");

  // ── Sheet 2: Mapping ─────────────────────────────────────────────────────
  const mapping = [
    ["review_id", "image_1", "image_2", "image_3"],
    // R1 has 2 images (MULTI_IMAGE — auto-detected)
    ["R1", "paste-image-uuid-1", "paste-image-uuid-2", ""],
    // R2 has 1 image (SINGLE_IMAGE — auto-detected)
    ["R2", "paste-image-uuid-3", "", ""],
    // R3 is text only — no row needed (or leave images blank)
    ["R4", "paste-image-uuid-4", "paste-image-uuid-5", "paste-image-uuid-6"],
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(mapping);
  ws2["!cols"] = [
    { wch: 12 }, // review_id
    { wch: 38 }, // image_1
    { wch: 38 }, // image_2
    { wch: 38 }, // image_3
  ];
  XLSX.utils.book_append_sheet(wb, ws2, "Mapping");

  // ── Sheet 3: Instructions ─────────────────────────────────────────────────
  const instructions = [
    ["White Door — Import Template Instructions"],
    [""],
    ["SHEET: Reviews (required)"],
    ["Column", "Description", "Example"],
    [
      "local_id",
      "Your reference key. Used to link rows in the Mapping sheet. Can be any text (R1, ROW1, review-a, etc.)",
      "R1",
    ],
    [
      "event_id",
      "UUID of the event from your Supabase events table. Use 'general' (lowercase) for homepage general reviews.",
      "3f2a1b4c-...",
    ],
    [
      "review_text",
      "The full review text. Keep it genuine and specific.",
      "Amazing experience...",
    ],
    [""],
    ["SHEET: Mapping (optional — only needed if reviews have images)"],
    ["Column", "Description"],
    ["review_id", "Must match a local_id from the Reviews sheet exactly."],
    [
      "image_1",
      "UUID of an image already uploaded via Admin → Images. Leave blank if no image.",
    ],
    ["image_2", "Second image UUID (optional)."],
    ["image_3", "Third image UUID (optional)."],
    [""],
    ["REVIEW TYPE (auto-detected from Mapping sheet)"],
    ["# of images in Mapping", "review_type assigned"],
    ["0 (no row in Mapping, or all blank)", "TEXT_ONLY"],
    ["1", "SINGLE_IMAGE"],
    ["2 or 3", "MULTI_IMAGE"],
    [""],
    ["RULES"],
    [
      "✅ Each image UUID can only be assigned to ONE review. The import will reject duplicates.",
    ],
    ["✅ Images must be uploaded via Admin → Images before import."],
    [
      "✅ Copy image UUIDs from the Admin → Imports page using the 'Show uploaded image IDs' panel.",
    ],
    ["✅ Rows with errors are skipped — the rest still import successfully."],
    ["✅ Run the import multiple times safely — errors on one row don't block others."],
  ];

  const ws3 = XLSX.utils.aoa_to_sheet(instructions);
  ws3["!cols"] = [{ wch: 45 }, { wch: 65 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws3, "Instructions");

  // ── Generate buffer and return ────────────────────────────────────────────
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="whitedoor-import-template.xlsx"',
    },
  });
}
