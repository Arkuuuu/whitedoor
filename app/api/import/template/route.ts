import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Reviews ──────────────────────────────────────────────────────
  const reviews = [
    ["local_id", "event_id", "review_text"],
    [
      "R1",
      "PASTE-EVENT-UUID-HERE",
      "Absolutely amazing experience! The team was professional, attentive, and made the event truly memorable. Highly recommend to anyone looking for a top-tier experience.",
    ],
    [
      "R2",
      "PASTE-EVENT-UUID-HERE",
      "Exceptional service from start to finish. Every detail was taken care of and the atmosphere was perfect. Will definitely be coming back!",
    ],
    [
      "R3",
      "general",
      "One of the best experiences I've had. The staff went above and beyond to ensure everything was perfect. Five stars without hesitation.",
    ],
    [
      "R4",
      "PASTE-EVENT-UUID-HERE",
      "Outstanding quality and attention to detail. The whole team was incredibly helpful and friendly. Couldn't have asked for a better experience.",
    ],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(reviews);
  ws1["!cols"] = [{ wch: 10 }, { wch: 38 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Reviews");

  // ── Sheet 2: Mapping ─────────────────────────────────────────────────────
  // image_1/2/3 = the TITLE you gave the image when uploading in Admin → Images
  const mapping = [
    ["review_id", "image_1", "image_2", "image_3"],
    // R1 has 2 images → MULTI_IMAGE
    ["R1", "Beach Shot 1", "Group Photo", ""],
    // R2 has 1 image → SINGLE_IMAGE
    ["R2", "Event Highlight", "", ""],
    // R3 is text-only → no row needed
    // R4 has 3 images → MULTI_IMAGE
    ["R4", "Venue Photo", "Team Shot", "Closing Ceremony"],
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(mapping);
  ws2["!cols"] = [{ wch: 12 }, { wch: 30 }, { wch: 30 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Mapping");

  // ── Sheet 3: Instructions ─────────────────────────────────────────────────
  const instructions = [
    ["White Door — Import Template Instructions"],
    [""],
    ["SHEET: Reviews (required)"],
    ["Column", "Description", "Example"],
    ["local_id", "Your reference key. Used to match rows in the Mapping sheet.", "R1"],
    ["event_id", "UUID of the event OR the word 'general' for homepage reviews.", "3f2a1b4c-… OR general"],
    ["review_text", "The full review text.", "Amazing experience…"],
    [""],
    ["SHEET: Mapping (optional — only needed if reviews have photos)"],
    ["Column", "Description"],
    ["review_id", "Must match a local_id from the Reviews sheet exactly."],
    ["image_1", "The TITLE of an image you already uploaded in Admin → Images."],
    ["image_2", "Second image title (optional)."],
    ["image_3", "Third image title (optional, max 3 per review)."],
    [""],
    ["HOW TO LINK PHOTOS"],
    ["1. Go to Admin → Images and upload your photos — give each one a clear title (e.g. 'Beach Shot 1')."],
    ["2. In the Mapping sheet, type that exact title in image_1 / image_2 / image_3."],
    ["3. The import matches titles case-insensitively, so 'Beach shot 1' = 'beach shot 1'."],
    [""],
    ["REVIEW TYPE (auto-detected from Mapping sheet)"],
    ["# of images", "review_type"],
    ["0 (no row in Mapping or all blank)", "TEXT_ONLY"],
    ["1", "SINGLE_IMAGE"],
    ["2 or 3", "MULTI_IMAGE"],
    [""],
    ["RULES"],
    ["✅ Each image can only be assigned to ONE review. Duplicates are rejected."],
    ["✅ Images must be uploaded in Admin → Images before running the import."],
    ["✅ Titles must match exactly what you typed when uploading (case-insensitive)."],
    ["✅ Rows with errors are skipped — the rest still import successfully."],
  ];

  const ws3 = XLSX.utils.aoa_to_sheet(instructions);
  ws3["!cols"] = [{ wch: 45 }, { wch: 65 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws3, "Instructions");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="whitedoor-import-template.xlsx"',
    },
  });
}
