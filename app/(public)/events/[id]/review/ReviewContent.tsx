"use client";

import { useEffect, useState, useCallback } from "react";
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
  AlertTriangle,
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
  const [images, setImages] = useState<ImageType[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [reviewCopied, setReviewCopied] = useState(false);
  const [googleOpened, setGoogleOpened] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [downloadsFailed, setDownloadsFailed] = useState(false);
  const [error, setError] = useState("");

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
        // Track view asynchronously
        fetch(`/api/reviews/${data.id}/track`, {
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
    Promise.all([
      fetch(`/api/events/${eventId}`).then((r) => r.json()),
      fetch(`/api/images?eventId=${eventId}`).then((r) => r.json()),
    ]).then(([ev, imgs]) => {
      setEvent(ev?.id ? ev : null);
      setImages(Array.isArray(imgs) ? imgs : []);
    });
  }, [eventId, fetchReview]);

  // Detect when user returns from Google Reviews tab
  useEffect(() => {
    if (!googleOpened) return;
    // Small delay so focus events from the window.open itself don't fire immediately
    const setup = setTimeout(() => {
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
    return () => clearTimeout(setup);
  }, [googleOpened]);

  async function handleCopyReview() {
    if (!review) return;
    try {
      await navigator.clipboard.writeText(review.review_text);
      setReviewCopied(true);
      toast.success("Review copied!");
      setTimeout(() => setReviewCopied(false), 2000);
    } catch {
      toast.error("Unable to copy. Please copy manually.");
    }
  }

  async function downloadPhoto(image: ImageType) {
    // Fire-and-forget analytics
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

  async function handlePostOnGoogle() {
    if (!review || !event?.google_review_url) return;
    setPosting(true);

    // Open the Google window SYNCHRONOUSLY inside the click handler so iOS Safari
    // doesn't block it as a popup. We set the URL after async work is done.
    const googleWindow = window.open("", "_blank");

    // Step 1: Copy review text
    let copied = false;
    try {
      await navigator.clipboard.writeText(review.review_text);
      copied = true;
    } catch {
      // Fallback: synchronous execCommand
      try {
        const ta = document.createElement("textarea");
        ta.value = review.review_text;
        ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        copied = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        toast.error("Unable to copy review. Please copy it manually.");
      }
    }

    // Step 2: Reserve the review (fire and forget — non-blocking)
    const sessionId = getSessionId();
    fetch(`/api/reviews/${review.id}/reserve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    });

    // Step 3: Track analytics (fire and forget)
    if (copied) {
      fetch(`/api/reviews/${review.id}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "copied" }),
      });
    }

    // Step 4: Download all event photos
    let failedDownloads = 0;
    for (const image of images) {
      try {
        fetch(`/api/images/${image.id}/download`, { method: "POST" });
        const blob = await fetch(image.image_url).then((r) => r.blob());
        const ext = image.image_url.split(".").pop()?.split("?")[0] ?? "jpg";
        const filename = image.title
          ? `${image.title}.${ext}`
          : `photo-${image.id}.${ext}`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        // Small gap between downloads to avoid browser throttling
        await new Promise((r) => setTimeout(r, 250));
      } catch {
        failedDownloads++;
      }
    }

    if (failedDownloads > 0) setDownloadsFailed(true);

    // Step 5–6: Toast + navigate the pre-opened window to Google Reviews
    const toastParts = [];
    if (copied) toastParts.push("✓ Review copied");
    if (images.length > 0 && failedDownloads < images.length)
      toastParts.push("✓ Photos downloaded");
    toastParts.push("Opening Google Reviews…");
    toast.success(toastParts.join("  ·  "), { duration: 3000 });

    if (googleWindow) {
      googleWindow.location.href = event.google_review_url;
    } else {
      // Popup was blocked — fall back to direct navigation
      window.open(event.google_review_url, "_blank");
    }

    setGoogleOpened(true);
    setPosting(false);
  }

  async function handleConfirmSubmitted() {
    if (!review) return;
    const usedId = review.id;
    markReviewUsed(usedId);
    setShowConfirmation(false);
    setGoogleOpened(false);
    await fetch(`/api/reviews/${usedId}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "used" }),
    });
    toast.success("Thank you for your feedback!");
    fetchReview(usedId);
  }

  function handleNotYet() {
    // Release reservation so the review becomes available to others again
    if (review) {
      fetch(`/api/reviews/${review.id}/reserve`, { method: "DELETE" });
    }
    setShowConfirmation(false);
    setGoogleOpened(false);
  }

  const hasGoogleUrl = !!event?.google_review_url;

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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-36">
        {/* Back link */}
        <Link
          href={`/events/${eventId}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5"
        >
          <ArrowLeft className="w-4 h-4" />
          {event?.name ?? "Back to Event"}
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {event?.name ?? "Get Your Review"}
        </h1>

        {/* ── Review card ── */}
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

        {/* ── Photo grid ── */}
        {images.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Photos You Can Use ({images.length})
            </p>

            {downloadsFailed && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 text-sm text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Some photos couldn&apos;t be downloaded automatically. Use the
                  buttons below to download them manually.
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="rounded-xl overflow-hidden bg-gray-100 shadow-sm"
                >
                  <div className="relative aspect-square">
                    <Image
                      src={image.image_url}
                      alt={image.title ?? "Event photo"}
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
                  Preparing…
                </>
              ) : (
                <>
                  <ExternalLink className="w-5 h-5" />
                  ★★★★★&nbsp; Post Review on Google
                </>
              )}
            </Button>
          )}

          <div className="flex items-center justify-center gap-3 pb-safe">
            <span className="text-sm text-gray-400">Need a different review?</span>
            <button
              onClick={() => fetchReview(review?.id)}
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
