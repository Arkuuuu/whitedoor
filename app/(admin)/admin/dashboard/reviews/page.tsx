"use client";

import { useEffect, useState, useCallback } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
import { ReviewUploadForm } from "@/components/admin/ReviewUploadForm";
import { Plus, Archive, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { Event, Review } from "@/lib/types";

export default function ReviewsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filterEventId, setFilterEventId] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [eventsRes, reviewsRes] = await Promise.all([
      fetch("/api/events?all=true").then((r) => r.json()),
      fetch("/api/reviews").then((r) => r.json()),
    ]);
    setEvents(Array.isArray(eventsRes) ? eventsRes : []);
    setReviews(Array.isArray(reviewsRes) ? reviewsRes : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getEventName = (id: string) =>
    events.find((e) => e.id === id)?.name ?? "Unknown Event";

  const filtered = reviews.filter((r) => {
    if (filterEventId !== "all" && r.event_id !== filterEventId) return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    return true;
  });

  async function handleArchive(review: Review) {
    const newStatus = review.status === "active" ? "archived" : "active";
    const res = await fetch(`/api/reviews/${review.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      toast.success(newStatus === "archived" ? "Review archived" : "Review restored");
      loadData();
    } else {
      toast.error("Failed to update review");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this review? This cannot be undone.")) return;
    const res = await fetch(`/api/reviews/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Review deleted");
      loadData();
    } else {
      toast.error("Failed to delete review");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="text-gray-500 text-sm">{reviews.length} total reviews</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger className={cn(buttonVariants(), "gap-1")}>
            <Plus className="w-4 h-4" /> Add Reviews
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Reviews</DialogTitle>
            </DialogHeader>
            <ReviewUploadForm
              events={events}
              onSuccess={() => {
                setDialogOpen(false);
                loadData();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-3">
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

        <Select value={filterStatus} onValueChange={(v) => v !== null && setFilterStatus(v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-16 text-gray-400">No reviews found.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-medium text-gray-500">Review</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 hidden md:table-cell">Event</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 hidden lg:table-cell">Stats</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((review, i) => (
                <tr
                  key={review.id}
                  className={`border-b border-gray-50 hover:bg-gray-50 ${
                    i === filtered.length - 1 ? "border-0" : ""
                  }`}
                >
                  <td className="px-5 py-4 max-w-xs">
                    <p className="truncate text-gray-800">{review.review_text}</p>
                  </td>
                  <td className="px-5 py-4 text-gray-500 hidden md:table-cell">
                    {getEventName(review.event_id)}
                  </td>
                  <td className="px-5 py-4 text-gray-400 text-xs hidden lg:table-cell">
                    {review.times_copied} copied · {review.times_used} used
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={review.status === "active" ? "default" : "secondary"}>
                      {review.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchive(review)}
                        title={review.status === "active" ? "Archive" : "Restore"}
                      >
                        {review.status === "active" ? (
                          <Archive className="w-4 h-4 text-gray-400" />
                        ) : (
                          <RotateCcw className="w-4 h-4 text-gray-400" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(review.id)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
