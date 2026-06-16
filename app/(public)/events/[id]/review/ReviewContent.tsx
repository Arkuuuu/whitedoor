"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Star,
  RefreshCw,
  Download,
  Copy,
  Check,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getShownReviewIds,
  addShownReviewId,
  getUsedReviewIds,
  markReviewUsed,
} from "@/lib/review-session";
import { getSessionId } from "@/lib/session";
import type { Review, Image as ImageType, Event } from "@/lib/types";

export function ReviewContent() {
  const params = useParams();
  const eventId = params.id as string;

  const [review, setReview] = useState<Review | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [reviewCopied, setReviewCopied] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [googleOpened, setGoogleOpened] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState("");

  // Extract linked images sorted by display_order
  const linkedImages = useMemo<ImageType[]>(() => {
    if (!review?.review_images || review.review_images.length === 0) return [];
    return [...review.review_images]
      .sort((a, b) => a.display_order - b.display_order)
      .map((ri) => ri.images);
  }, [review]);

  const fetchReview = useCallback(
    async (excludeCurrentId?: string) => {
      setLoading(true);
      setError("");
      setReviewCopied(false);

      if (excludeCurrentId) addShownReviewId(eventId, excludeCurrentId);

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
        fetch(`/api/reviews/${data.id}/track`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "viewed", event_id: eventId, session_id: getSessionId() }),
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
      .then((ev) => setEvent(ev?.id ? ev : null));
  }, [eventId, fetchReview]);

  // Detect return from Google Reviews tab
  useEffect(() => {
    if (!googleOpened) return;
    const tid = setTimeout(() => {
      const onVisible = () => {
        if (document.visibilityState === "visible") setShowConfirmation(true);
      };
      const onFocus = () => setShowConfirmation(true);
      document.addEventListener("visibilitychange", onVisible);
      window.addEventListener("focus", onFocus);
      return () => {
        document.removeEventListener("visibilitychange", onVisible);
        window.removeEventListener("focus", onFocus);
      };
    }, 800);
    return () => clearTimeout(tid);
  }, [googleOpened]);

  // ── Copy review ───────────────────────────────────────────────────────────
  async function handleCopyReview() {
    if (!review) return;
    const text = review.review_text;
    let copied = false;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;left:-9999px;top:0";
        document.body.appendChild(ta);
        ta.select();
        copied = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {}
    }
    if (copied) {
      setReviewCopied(true);
      toast.success("Review copied!");
      setTimeout(() => setReviewCopied(false), 2500);
    } else {
      toast.error("Couldn't copy automatically. Please copy manually.");
    }
  }

  // ── Download one photo ────────────────────────────────────────────────────
  async function downloadPhoto(image: ImageType) {
    fetch(`/api/images/${image.id}/download`, { method: "POST" });
    try {
      const blob = await fetch(image.image_url).then((r) => r.blob());
      const ext = image.image_url.split(".").pop()?.split("?")[0] ?? "jpg";
      const filename = image.title ? `${image.title}.${ext}` : `photo-${image.id}.${ext}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(image.image_url, "_blank");
    }
  }

  // ── Download all linked photos ────────────────────────────────────────────
  async function handleDownloadAll() {
    if (downloadingAll || linkedImages.length === 0) return;
    setDownloadingAll(true);
    let failed = 0;
    for (const image of linkedImages) {
      try {
        await downloadPhoto(image);
        await new Promise((r) => setTimeout(r, 350));
      } catch {
        failed++;
      }
    }
    setDownloadingAll(false);
    if (failed === 0) {
      toast.success(`${linkedImages.length} photo${linkedImages.length > 1 ? "s" : ""} downloaded`);
    } else {
      toast.error(`${failed} photo${failed > 1 ? "s" : ""} couldn't download — use individual buttons`);
    }
  }

  // ── Post on Google ────────────────────────────────────────────────────────
  // Only copies the review + opens the URL — no downloads, no permission prompts.
  // Downloads are intentionally a separate user action to avoid browser blocking window.open.
  async function handlePostOnGoogle() {
    if (!review || !event?.google_review_url) return;
    const googleUrl = event.google_review_url;
    const reviewId = review.id;
    setPosting(true);

    let copied = false;
    try {
      await navigator.clipboard.writeText(review.review_text);
      copied = true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = review.review_text;
        ta.style.cssText = "position:fixed;left:-9999px;top:0";
        document.body.appendChild(ta);
        ta.select();
        copied = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {}
    }

    // Fire-and-forget: reserve + analytics
    fetch(`/api/reviews/${reviewId}/reserve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: getSessionId() }),
    });
    if (copied) {
      fetch(`/api/reviews/${reviewId}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "copied", event_id: eventId, session_id: getSessionId() }),
      });
    }

    toast.success(
      copied
        ? "✓ Review copied! Opening Google Reviews…"
        : "Opening Google Reviews… (please copy the review above manually)",
      { duration: 3000 }
    );

    window.open(googleUrl, "_blank");
    setGoogleOpened(true);
    setPosting(false);
  }

  // ── Confirmation: Yes, submitted ─────────────────────────────────────────
  async function handleConfirmSubmitted() {
    if (!review) return;
    const usedId = review.id;
    markReviewUsed(usedId);
    setShowConfirmation(false);
    setGoogleOpened(false);
    await fetch(`/api/reviews/${usedId}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "used", event_id: eventId, session_id: getSessionId() }),
    });
    toast.success("Thank you for your review!");
    fetchReview(usedId);
  }

  // ── Confirmation: Not yet ────────────────────────────────────────────────
  function handleNotYet() {
    if (review) {
      fetch(`/api/reviews/${review.id}/reserve`, { method: "DELETE" });
    }
    setShowConfirmation(false);
    setGoogleOpened(false);
  }

  const hasGoogleUrl = !!event?.google_review_url;
  const hasImages = linkedImages.length > 0;

  return (
    <>
      {/* ── Return-from-Google confirmation overlay ── */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-12 h-12 text-blue-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-1">
              Did you submit your review?
            </h3>
            <p className="text-gray-500 text-sm text-center mb-6">
              Let us know so we can track your contribution.
            </p>
            <div className="flex gap-3">
              <Button className="flex-1" onClick={handleConfirmSubmitted}>
                ✓ Yes, Submitted!
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleNotYet}>
                Not Yet
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page content ── */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-40">
        {/* Back link */}
        <Link
          href={`/events/${eventId}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5"
        >
          <ArrowLeft className="w-4 h-4" />
          {event?.name ?? "Back to Event"}
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {event?.name ?? "Post Your Review"}
        </h1>

        {/* ── Step 1: Review card ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Suggested Review
          </p>
          <div className="flex gap-0.5 mb-3">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            ))}
          </div>

          {loading ? (
            <div className="animate-pulse space-y-2 mb-5">
              <div className="h-4 bg-gray-100 rounded w-full" />
              <div className="h-4 bg-gray-100 rounded w-5/6" />
              <div className="h-4 bg-gray-100 rounded w-2/3" />
            </div>
          ) : error ? (
            <p className="text-red-500 text-sm mb-5">{error}</p>
          ) : (
            <p className="text-gray-800 leading-relaxed mb-5">{review?.review_text}</p>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyReview}
            disabled={loading || !review}
            className="gap-2"
          >
            {reviewCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-500" /> Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copy Review
              </>
            )}
          </Button>
        </div>

        {/* ── Step 2: Review-linked photos ── */}
        {hasImages && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                Photos to Include ({linkedImages.length})
              </p>
              <button
                onClick={handleDownloadAll}
                disabled={downloadingAll}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-50"
              >
                <Download className={`w-3.5 h-3.5 ${downloadingAll ? "animate-bounce" : ""}`} />
                {downloadingAll ? "Downloading…" : "Download All"}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {linkedImages.map((image) => (
                <div
                  key={image.id}
                  className="rounded-xl overflow-hidden bg-gray-100 shadow-sm"
                >
                  <div className="relative aspect-square">
                    <Image
                      src={image.image_url}
                      alt={image.title ?? "Review photo"}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 33vw"
                      loading="lazy"
                    />
                  </div>
                  <button
                    onClick={() => downloadPhoto(image)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky bottom action bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-gray-100 shadow-lg">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 space-y-3">
          {hasImages && (
            <p className="text-xs text-center text-gray-400">
              Download photos above first, then post your review
            </p>
          )}

          {hasGoogleUrl && (
            <Button
              size="lg"
              className="w-full h-14 text-base font-bold gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md"
              onClick={handlePostOnGoogle}
              disabled={posting || loading || !review}
            >
              {posting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Opening…
                </>
              ) : (
                <>
                  <ExternalLink className="w-5 h-5" />
                  ★★★★★&nbsp;&nbsp;Post Review on Google
                </>
              )}
            </Button>
          )}

          <div className="flex items-center justify-center gap-3">
            <span className="text-sm text-gray-400">Need a different review?</span>
            <button
              onClick={() => {
                if (review) {
                  fetch(`/api/reviews/${review.id}/track`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "skipped", event_id: eventId, session_id: getSessionId() }),
                  });
                }
                fetchReview(review?.id);
              }}
              disabled={loading}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Another Review
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
