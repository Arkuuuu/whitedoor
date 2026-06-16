"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, X, ImageIcon } from "lucide-react";
import type { Event } from "@/lib/types";

interface ImageUploadZoneProps {
  events: Event[];
  onSuccess: () => void;
}

interface FilePreview {
  file: File;
  preview: string;
  title: string;
}

export function ImageUploadZone({ events, onSuccess }: ImageUploadZoneProps) {
  const [eventId, setEventId] = useState("");
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const activeEvents = events.filter((e) => e.status === "active");

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const previews: FilePreview[] = Array.from(incoming)
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({
        file: f,
        preview: URL.createObjectURL(f),
        title: f.name.replace(/\.[^.]+$/, ""),
      }));
    setFiles((prev) => [...prev, ...previews]);
  }, []);

  function removeFile(index: number) {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleUpload() {
    if (!eventId || files.length === 0) {
      toast.error("Select an event and add images");
      return;
    }

    setUploading(true);
    let success = 0;
    let failed = 0;

    for (const { file, title } of files) {
      try {
        const fd = new FormData();
        fd.append("event_id", eventId);
        fd.append("file", file);
        fd.append("title", title);
        const res = await fetch("/api/images", { method: "POST", body: fd });
        if (!res.ok) throw new Error();
        success++;
      } catch {
        failed++;
      }
    }

    if (success > 0) toast.success(`${success} image${success > 1 ? "s" : ""} uploaded`);
    if (failed > 0) toast.error(`${failed} image${failed > 1 ? "s" : ""} failed`);

    setFiles([]);
    setUploading(false);
    onSuccess();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Event</Label>
        <Select value={eventId} onValueChange={(v) => v !== null && setEventId(v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select an event…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General (no event)</SelectItem>
            {activeEvents.map((ev) => (
              <SelectItem key={ev.id} value={ev.id}>
                {ev.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
          dragOver ? "border-blue-400 bg-blue-50" : "border-gray-200"
        }`}
      >
        <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500 mb-2">Drag & drop images here, or</p>
        <label className="inline-block cursor-pointer">
          <span className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            browse files
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-3">
          {files.map((fp, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fp.preview} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <Input
                  value={fp.title}
                  onChange={(e) =>
                    setFiles((prev) =>
                      prev.map((f, idx) =>
                        idx === i ? { ...f, title: e.target.value } : f
                      )
                    )
                  }
                  placeholder="Image title"
                  className="h-8 text-sm"
                />
              </div>
              <button
                onClick={() => removeFile(i)}
                className="text-gray-400 hover:text-red-500 p-1 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          <Button onClick={handleUpload} disabled={uploading || !eventId} className="w-full gap-2">
            <Upload className="w-4 h-4" />
            {uploading ? "Uploading…" : `Upload ${files.length} Image${files.length > 1 ? "s" : ""}`}
          </Button>
        </div>
      )}
    </div>
  );
}
