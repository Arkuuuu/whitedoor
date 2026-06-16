"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploadZone } from "@/components/admin/ImageUploadZone";
import { Plus, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import type { Event, Image as ImageType } from "@/lib/types";

export default function ImagesPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [images, setImages] = useState<ImageType[]>([]);
  const [filterEventId, setFilterEventId] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [eventsRes, imagesRes] = await Promise.all([
      fetch("/api/events?all=true").then((r) => r.json()),
      fetch("/api/images").then((r) => r.json()),
    ]);
    setEvents(Array.isArray(eventsRes) ? eventsRes : []);
    setImages(Array.isArray(imagesRes) ? imagesRes : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getEventName = (id: string | null) =>
    id ? (events.find((e) => e.id === id)?.name ?? "Unknown") : "General";

  const filtered =
    filterEventId === "all" ? images : images.filter((img) => img.event_id === filterEventId);

  async function handleDelete(id: string) {
    if (!confirm("Delete this image? This cannot be undone.")) return;
    const res = await fetch(`/api/images/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Image deleted");
      loadData();
    } else {
      toast.error("Failed to delete image");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Images</h1>
          <p className="text-gray-500 text-sm">{images.length} total images</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger className={cn(buttonVariants(), "gap-1")}>
            <Plus className="w-4 h-4" /> Upload Images
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Upload Images</DialogTitle>
            </DialogHeader>
            <ImageUploadZone
              events={events}
              onSuccess={() => {
                setDialogOpen(false);
                loadData();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Select value={filterEventId} onValueChange={(v) => v !== null && setFilterEventId(v)}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All Events" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Events</SelectItem>
          {events.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-20 text-gray-400">No images found.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((img) => (
            <div key={img.id} className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100">
              <Image
                src={img.image_url}
                alt={img.title ?? "Event image"}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                loading="lazy"
              />
              {/* Status badge — always visible */}
              <div className={`absolute top-1.5 left-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${
                img.status === "available" ? "bg-green-500/90 text-white" :
                img.status === "reserved" ? "bg-yellow-500/90 text-white" :
                img.status === "used" ? "bg-gray-500/80 text-white" :
                "bg-red-500/80 text-white"
              }`}>
                {img.status ?? "available"}
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors duration-200">
                <div className="absolute bottom-0 left-0 right-0 p-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs flex items-center gap-1">
                    <Download className="w-3 h-3" /> {img.downloads}
                  </span>
                  <button
                    onClick={() => handleDelete(img.id)}
                    className="text-red-300 hover:text-red-200 p-1 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {img.title && (
                  <div className="absolute top-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100">
                    <p className="text-white text-xs truncate">{img.title}</p>
                    <p className="text-white/60 text-xs">{getEventName(img.event_id)}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
