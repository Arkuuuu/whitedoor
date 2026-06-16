import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const eventId = formData.get("event_id") as string | null;

  if (!file) {
    return NextResponse.json(
      { error: "file is required" },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileName = file.name.toLowerCase();

  let reviewTexts: string[] = [];

  if (fileName.endsWith(".csv") || fileName.endsWith(".txt")) {
    const text = buffer.toString("utf-8");
    reviewTexts = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
    reviewTexts = rows
      .flat()
      .map((cell) => String(cell).trim())
      .filter(Boolean);
  } else {
    return NextResponse.json(
      { error: "Unsupported file type. Use CSV, TXT, or Excel." },
      { status: 400 }
    );
  }

  if (reviewTexts.length === 0) {
    return NextResponse.json({ error: "No reviews found in file" }, { status: 400 });
  }

  const admin = await createAdminClient();
  const rows = reviewTexts.map((text) => ({
    event_id: eventId && eventId !== "__general__" ? eventId : null,
    review_text: text,
    review_type: "TEXT_ONLY" as const,
  }));

  const { data, error } = await admin.from("reviews").insert(rows).select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ inserted: data?.length ?? 0 }, { status: 201 });
}
