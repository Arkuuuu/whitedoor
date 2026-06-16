"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Upload, ImagePlus, X } from "lucide-react";
import type { Event } from "@/lib/types";

interface ReviewUploadFormProps {
  events: Event[];
  onSuccess: () => void;
}

interface ImageSlot {
  file: File | null;
  preview: string | null;
}

const MAX_IMAGES = 3;

export function ReviewUploadForm({ events, onSuccess }: ReviewUploadFormProps) {
  const [eventId, setEventId] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [imageSlots, setImageSlots] = useState<ImageSlot[]>([
    { file: null, preview: null },
    { file: null, preview: null },
    { file: null, preview: null },
  ]);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const activeEvents = events.filter((e) => e.status === "active");

  function handleImageSelect(index: number, file: File | null) {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setImageSlots((prev) => {
      const next = [...prev];
      if (next[index].preview) URL.revokeObjectURL(next[index].preview!);
      next[index] = { file, preview };
      return next;
    });
  }

  function removeImage(index: number) {
    setImageSlots((prev) => {
      const next = [...prev];
      if (next[index].preview) URL.revokeObjectURL(next[index].preview!);
      next[index] = { file: null, preview: null };
      if (fileInputRefs[index].current) fileInputRefs[index].current!.value = "";
      return next;
    });
  }

  const linkedImageCount = imageSlots.filter((s) => s.file !== null).length;
  const reviewType =
    linkedImageCount === 0
      ? "TEXT_ONLY"
      : linkedImageCount === 1
      ? "SINGLE_IMAGE"
      : "MULTI_IMAGE";

  async function handleSingle(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId || !reviewText.trim()) {
      toast.error("Select a destination and enter review text");
      return;
    }
    setSaving(true);
    const actualEventId = eventId === "__general__" ? null : eventId;

    try {
      const fd = new FormData();
      if (actualEventId) fd.append("event_id", actualEventId);
      fd.append("review_text", reviewText.trim());
      imageSlots.forEach((slot, i) => {
        if (slot.file) fd.append(`image_${i + 1}`, slot.file);
      });

      const res = await fetch("/api/reviews", { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json()).error);

      toast.success(
        linkedImageCount > 0
          ? `Review added with ${linkedImageCount} photo${linkedImageCount > 1 ? "s" : ""}`
          : "Review added"
      );
      setReviewText("");
      setImageSlots([
        { file: null, preview: null },
        { file: null, preview: null },
        { file: null, preview: null },
      ]);
      fileInputRefs.forEach((ref) => {
        if (ref.current) ref.current.value = "";
      });
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add review");
    } finally {
      setSaving(false);
    }
  }

  async function handleBulk(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId || !bulkFile) {
      toast.error("Select a destination and upload a file");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("event_id", eventId);
      fd.append("file", bulkFile);
      const res = await fetch("/api/reviews/bulk", { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json()).error);
      const { inserted } = await res.json();
      toast.success(`${inserted} reviews uploaded`);
      setBulkFile(null);
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Destination</Label>
        <Select value={eventId} onValueChange={(v) => v !== null && setEventId(v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select event or General…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__general__">General Reviews (homepage)</SelectItem>
            {activeEvents.map((ev) => (
              <SelectItem key={ev.id} value={ev.id}>
                {ev.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="single">
        <TabsList className="w-full">
          <TabsTrigger value="single" className="flex-1">Single Review</TabsTrigger>
          <TabsTrigger value="bulk" className="flex-1">Bulk Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="single">
          <form onSubmit={handleSingle} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="review_text">Review Text</Label>
              <Textarea
                id="review_text"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Write an honest 5-star review…"
                rows={4}
              />
            </div>

            {/* ── Image slots ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Photos <span className="text-gray-400 font-normal">(optional, up to {MAX_IMAGES})</span></Label>
                {linkedImageCount > 0 && (
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    {reviewType.replace("_", " ")}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {imageSlots.map((slot, i) => (
                  <div key={i} className="aspect-square">
                    {slot.preview ? (
                      <div className="relative w-full h-full rounded-xl overflow-hidden group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={slot.preview}
                          alt={`Photo ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRefs[i].current?.click()}
                        className="w-full h-full border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-blue-400 hover:bg-blue-50/40 transition-colors text-gray-400 hover:text-blue-500"
                      >
                        <ImagePlus className="w-5 h-5" />
                        <span className="text-xs">Photo {i + 1}</span>
                      </button>
                    )}
                    <input
                      ref={fileInputRefs[i]}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageSelect(i, e.target.files?.[0] ?? null)}
                    />
                  </div>
                ))}
              </div>
              {linkedImageCount > 0 && (
                <p className="text-xs text-gray-400">
                  Photos will be shown to users alongside this review and downloaded before they post on Google.
                </p>
              )}
            </div>

            <Button type="submit" disabled={saving || !eventId}>
              {saving ? "Adding…" : "Add Review"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="bulk">
          <form onSubmit={handleBulk} className="space-y-3 pt-2">
            <div className="space-y-2">
              <Label>File (CSV, TXT, or Excel)</Label>
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 transition-colors">
                {bulkFile ? (
                  <p className="text-sm text-gray-700">{bulkFile.name}</p>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-gray-400 mb-1" />
                    <span className="text-sm text-gray-400">
                      Click to upload CSV, TXT, or Excel
                    </span>
                    <span className="text-xs text-gray-300 mt-1">
                      One review per line / cell
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept=".csv,.txt,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => setBulkFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <Button type="submit" disabled={saving || !eventId || !bulkFile}>
              {saving ? "Uploading…" : "Upload Reviews"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
