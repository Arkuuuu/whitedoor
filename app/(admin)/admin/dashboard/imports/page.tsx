"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle2, XCircle, FileSpreadsheet, Info, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import type { Image as ImageType } from "@/lib/types";

interface ImportResult {
  row: number;
  local_id: string;
  review_text: string;
  status: "created" | "error";
  images_linked: number;
  error?: string;
}

interface ImportResponse {
  created: number;
  errors: number;
  results: ImportResult[];
}

export default function ImportsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState<ImportResponse | null>(null);
  const [images, setImages] = useState<ImageType[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [showImages, setShowImages] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setReport(null);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setReport(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Import failed");
        return;
      }
      setReport(data as ImportResponse);
      if (data.errors === 0) {
        toast.success(`${data.created} reviews imported successfully`);
      } else {
        toast.error(`${data.created} created, ${data.errors} failed — check report below`);
      }
    } catch {
      toast.error("Import failed. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  const loadImages = useCallback(async () => {
    setLoadingImages(true);
    try {
      const res = await fetch("/api/images");
      const data = await res.json();
      setImages(Array.isArray(data) ? data : []);
    } finally {
      setLoadingImages(false);
    }
  }, []);

  const handleShowImages = () => {
    if (!showImages) loadImages();
    setShowImages((v) => !v);
  };

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Reviews</h1>
        <p className="text-gray-500 text-sm mt-1">
          Upload an Excel file to create reviews and link images in bulk.
        </p>
      </div>

      {/* ── Format guide ── */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-blue-800">
            <Info className="w-4 h-4" />
            Excel Format (.xlsx)
          </div>
          <a
            href="/api/import/template"
            download
            className="flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download Template
          </a>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 text-sm text-blue-900">
          <div>
            <p className="font-medium mb-1">Sheet: <code className="bg-blue-100 px-1 rounded">Reviews</code></p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-blue-200">
                  <th className="text-left py-1 pr-3">Column</th>
                  <th className="text-left py-1">Value</th>
                </tr>
              </thead>
              <tbody className="text-blue-800">
                <tr><td className="py-0.5 pr-3 font-mono">local_id</td><td>Your reference (e.g. R1, R2)</td></tr>
                <tr><td className="py-0.5 pr-3 font-mono">event_id</td><td>Event UUID or "general"</td></tr>
                <tr><td className="py-0.5 pr-3 font-mono">review_text</td><td>The review text</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <p className="font-medium mb-1">Sheet: <code className="bg-blue-100 px-1 rounded">Mapping</code> (optional)</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-blue-200">
                  <th className="text-left py-1 pr-3">Column</th>
                  <th className="text-left py-1">Value</th>
                </tr>
              </thead>
              <tbody className="text-blue-800">
                <tr><td className="py-0.5 pr-3 font-mono">review_id</td><td>Matches local_id above</td></tr>
                <tr><td className="py-0.5 pr-3 font-mono">image_1</td><td>Image <span className="font-semibold">title</span> (set when uploading)</td></tr>
                <tr><td className="py-0.5 pr-3 font-mono">image_2</td><td>Optional — leave blank if unused</td></tr>
                <tr><td className="py-0.5 pr-3 font-mono">image_3</td><td>Optional — leave blank if unused</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-xs text-blue-700">
          Use the <span className="font-semibold">title</span> you gave each image when uploading (case-insensitive).
          review_type is auto-detected: 0 images = TEXT_ONLY, 1 = SINGLE_IMAGE, 2–3 = MULTI_IMAGE.
        </p>
      </div>

      {/* ── Image ID lookup ── */}
      <div>
        <button
          onClick={handleShowImages}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1.5"
        >
          <FileSpreadsheet className="w-4 h-4" />
          {showImages ? "Hide" : "Show"} uploaded image IDs
        </button>

        {showImages && (
          <div className="mt-3 border border-gray-100 rounded-xl overflow-hidden">
            {loadingImages ? (
              <p className="text-sm text-gray-400 p-4">Loading images…</p>
            ) : images.length === 0 ? (
              <p className="text-sm text-gray-400 p-4">No images uploaded yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Title</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Status</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">UUID (click to copy)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {images.map((img) => (
                    <tr key={img.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-700">{img.title ?? "—"}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          img.status === "available"
                            ? "bg-green-100 text-green-700"
                            : img.status === "reserved"
                            ? "bg-yellow-100 text-yellow-700"
                            : img.status === "used"
                            ? "bg-gray-100 text-gray-500"
                            : "bg-red-100 text-red-600"
                        }`}>
                          {img.status ?? "available"}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => copyId(img.id)}
                          className="flex items-center gap-1.5 font-mono text-xs text-gray-500 hover:text-blue-600 transition-colors"
                        >
                          {copiedId === img.id ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          {img.id}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ── File upload ── */}
      <div className="space-y-3">
        <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-blue-400 transition-colors bg-white">
          {file ? (
            <div className="text-center">
              <FileSpreadsheet className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="font-medium text-gray-800">{file.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <>
              <Upload className="w-7 h-7 text-gray-400 mb-2" />
              <span className="text-sm font-medium text-gray-600">Click to upload .xlsx or .csv</span>
              <span className="text-xs text-gray-400 mt-1">Must follow the format above</span>
            </>
          )}
          <input
            type="file"
            accept=".xlsx,.csv,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>

        <Button
          onClick={handleImport}
          disabled={!file || importing}
          className="w-full"
          size="lg"
        >
          {importing ? "Importing…" : "Import Reviews"}
        </Button>
      </div>

      {/* ── Results report ── */}
      {report && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-semibold">{report.created} created</span>
            </div>
            {report.errors > 0 && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-xl">
                <XCircle className="w-4 h-4" />
                <span className="font-semibold">{report.errors} failed</span>
              </div>
            )}
          </div>

          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 w-12">Row</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 w-20">ID</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Review</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 w-20">Images</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 w-24">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {report.results.map((r) => (
                  <tr key={r.row} className={r.status === "error" ? "bg-red-50" : ""}>
                    <td className="px-4 py-2 text-gray-400 text-xs">{r.row}</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-600">{r.local_id}</td>
                    <td className="px-4 py-2 text-gray-700 text-xs max-w-xs truncate">
                      {r.review_text}
                      {r.error && (
                        <p className="text-red-500 text-xs mt-0.5">{r.error}</p>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-500 text-xs text-center">{r.images_linked}</td>
                    <td className="px-4 py-2">
                      {r.status === "created" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Created
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                          <XCircle className="w-3.5 h-3.5" /> Error
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
