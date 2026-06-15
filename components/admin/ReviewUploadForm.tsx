"use client";

import { useState } from "react";
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
import { Upload } from "lucide-react";
import type { Event } from "@/lib/types";

interface ReviewUploadFormProps {
  events: Event[];
  onSuccess: () => void;
}

export function ReviewUploadForm({ events, onSuccess }: ReviewUploadFormProps) {
  const [eventId, setEventId] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const activeEvents = events.filter((e) => e.status === "active");

  async function handleSingle(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId || !reviewText.trim()) {
      toast.error("Select an event and enter review text");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, review_text: reviewText.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Review added");
      setReviewText("");
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
      toast.error("Select an event and upload a file");
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
        <Label>Event</Label>
        <Select value={eventId} onValueChange={(v) => v !== null && setEventId(v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select an event…" />
          </SelectTrigger>
          <SelectContent>
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
          <form onSubmit={handleSingle} className="space-y-3 pt-2">
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
