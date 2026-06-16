"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import type { Event } from "@/lib/types";

interface EventFormProps {
  event?: Event;
}

export function EventForm({ event }: EventFormProps) {
  const router = useRouter();
  const isEdit = !!event;

  const [name, setName] = useState(event?.name ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [eventDate, setEventDate] = useState(event?.event_date ?? "");
  const [status, setStatus] = useState<"active" | "inactive">(event?.status ?? "active");
  const [googleReviewUrl, setGoogleReviewUrl] = useState(event?.google_review_url ?? "");
  const [bannerUrl, setBannerUrl] = useState(event?.banner_url ?? "");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState(event?.banner_url ?? "");
  const [saving, setSaving] = useState(false);

  function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  }

  function clearBanner() {
    setBannerFile(null);
    setBannerPreview("");
    setBannerUrl("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      let finalBannerUrl = bannerUrl;

      if (bannerFile) {
        const fd = new FormData();
        fd.append("file", bannerFile);
        const res = await fetch("/api/upload/banner", { method: "POST", body: fd });
        if (!res.ok) throw new Error("Banner upload failed");
        const json = await res.json();
        finalBannerUrl = json.url;
      }

      const payload = {
        name,
        description: description || null,
        banner_url: finalBannerUrl || null,
        event_date: eventDate || null,
        status,
        google_review_url: googleReviewUrl || null,
      };

      const url = isEdit ? `/api/events/${event.id}` : "/api/events";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to save event");
      }

      toast.success(isEdit ? "Event updated" : "Event created");
      router.push("/admin/dashboard/events");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Label htmlFor="name">Event Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. AI Summit 2025"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of the event…"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="event_date">Event Date</Label>
        <Input
          id="event_date"
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="google_review_url">Google Review URL</Label>
        <Input
          id="google_review_url"
          type="url"
          value={googleReviewUrl}
          onChange={(e) => setGoogleReviewUrl(e.target.value)}
          placeholder="https://g.page/r/…/review"
        />
        <p className="text-xs text-gray-400">
          The link visitors tap to open your Google review page. Leave blank to hide the &quot;Post on Google&quot; button.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={status} onValueChange={(v) => v !== null && setStatus(v as "active" | "inactive")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Banner Image</Label>
        {bannerPreview ? (
          <div className="relative w-full h-48 rounded-xl overflow-hidden bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bannerPreview} alt="Banner preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={clearBanner}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 transition-colors">
            <Upload className="w-6 h-6 text-gray-400 mb-2" />
            <span className="text-sm text-gray-400">Click to upload banner image</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBannerChange}
            />
          </label>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Update Event" : "Create Event"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/dashboard/events")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
