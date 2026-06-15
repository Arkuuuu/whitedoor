"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ReviewCard } from "@/components/public/ReviewCard";
import { ImageGallery } from "@/components/public/ImageGallery";
import { getShownReviewIds, addShownReviewId, getUsedReviewIds, markReviewUsed } from "@/lib/review-session";
import type { Review, Image as ImageType } from "@/lib/types";

export function ReviewContent() {
  const params = useParams();
  const eventId = params.id as string;

  const [review, setReview] = useState<Review | null>(null);
  const [images, setImages] = useState<ImageType[]>([]);
  const [eventName, setEventName] = useState("");
  const [loading, setLoading] = useState(true);
  const [posted, setPosted] = useState(false);
  const [error, setError] = useState("");

  const fetchReview = useCallback(
    async (excludeCurrentId?: string) => {
      setLoading(true);
      setError("");

      if (excludeCurrentId) {
        addShownReviewId(eventId, excludeCurrentId);
      }

      const shown = getShownReviewIds(eventId);
      const used = getUsedReviewIds();
      const exclude = [...new Set([...shown, ...used])].join(",");
      const url = `/api/reviews/random?eventId=${eventId}${exclude ? `&exclude=${exclude}` : ""}`;

      try {
        const res = await fetch(url);
        if (!res.ok) {
          setError("No reviews available for this event yet.");
          return;
        }
        const data: Review = await res.json();
        setReview(data);
        addShownReviewId(eventId, data.id);

        await fetch(`/api/reviews/${data.id}/track`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "viewed" }),
        });
      } catch {
        setError("Failed to load review. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [eventId]
  );

  useEffect(() => {
    fetchReview();
    fetch(`/api/events/${eventId}`)
      .then((r) => r.json())
      .then((e) => setEventName(e.name ?? ""));
    fetch(`/api/images?eventId=${eventId}`)
      .then((r) => r.json())
      .then((data) => setImages(Array.isArray(data) ? data : []));
  }, [eventId, fetchReview]);

  async function handleAnotherReview() {
    setPosted(false);
    await fetchReview(review?.id);
  }

  async function handleReviewPosted() {
    if (!review) return;
    const usedId = review.id;
    setPosted(true);
    markReviewUsed(usedId);
    await fetch(`/api/reviews/${usedId}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "used" }),
    });
    // Archive confirmed — auto-advance so the used review is never visible again
    setTimeout(() => {
      setPosted(false);
      fetchReview(usedId);
    }, 1500);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <Link
        href={`/events/${eventId}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        {eventName ? eventName : "Back to Event"}
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Review</h1>
      <p className="text-gray-500 text-sm mb-6">
        Copy this review and paste it wherever you&apos;d like to share your experience.
      </p>

      {error ? (
        <div className="bg-red-50 text-red-600 rounded-xl p-6 text-center text-sm">
          {error}
        </div>
      ) : (
        <ReviewCard
          review={review ?? ({} as Review)}
          onAnotherReview={handleAnotherReview}
          onReviewPosted={handleReviewPosted}
          isLoading={loading}
          posted={posted}
        />
      )}

      {images.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Photos</h2>
          <ImageGallery images={images} />
        </div>
      )}
    </div>
  );
}
