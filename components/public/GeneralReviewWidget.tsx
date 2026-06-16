"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import { Copy, RefreshCw, CheckCheck, PartyPopper, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getGeneralShownIds,
  addGeneralShownId,
  getUsedReviewIds,
  markReviewUsed,
} from "@/lib/review-session";
import { getSessionId } from "@/lib/session";
import type { Review, Image as ImageType } from "@/lib/types";

export function GeneralReviewWidget() {
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [posted, setPosted] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [error, setError] = useState("");

  const linkedImages = useMemo<ImageType[]>(() => {
    if (!review?.review_images || review.review_images.length === 0) return [];
    return [...review.review_images]
      .sort((a, b) => a.display_order - b.display_order)
      .map((ri) => ri.images);
  }, [review]);

  const fetchReview = useCallback(async (currentId?: string) => {
    setLoading(true);
    setCopied(false);
    setError("");

    if (currentId) addGeneralShownId(currentId);

    const shown = getGeneralShownIds();
    const used = getUsedReviewIds();
    const exclude = [...new Set([...shown, ...used])].join(",");

    const url = `/api/reviews/general${exclude ? `?exclude=${exclude}` : ""}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        setError("No general reviews available yet.");
        setLoading(false);
        return;
      }
      const data: Review = await res.json();
      setReview(data);
      addGeneralShownId(data.id);
    } catch {
      setError("Failed to load review. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReview();
  }, [fetchReview]);

  async function handleCopy() {
    if (!review) return;
    try {
      await navigator.clipboard.writeText(review.review_text);
      setCopied(true);
      fetch(`/api/reviews/${review.id}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "copied", session_id: getSessionId() }),
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked
    }
  }

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

  async function handleDownloadAll() {
    if (downloadingAll || linkedImages.length === 0) return;
    setDownloadingAll(true);
    for (const image of linkedImages) {
      try {
        await downloadPhoto(image);
        await new Promise((r) => setTimeout(r, 350));
      } catch {}
    }
    setDownloadingAll(false);
  }

  async function handleReviewPosted() {
    if (!review) return;
    const usedId = review.id;
    setPosted(true);
    markReviewUsed(usedId);
    fetch(`/api/reviews/${usedId}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "used", session_id: getSessionId() }),
    });
    setTimeout(() => {
      setPosted(false);
      fetchReview(usedId);
    }, 1500);
  }

  if (error) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">{error}</div>
    );
  }

  if (posted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
        <PartyPopper className="w-10 h-10 text-green-500 mx-auto mb-3" />
        <p className="font-semibold text-green-800">Thank you for your feedback!</p>
        <p className="text-green-600 text-sm mt-1">Getting you a fresh review…</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-100 rounded w-full" />
          <div className="h-4 bg-gray-100 rounded w-5/6" />
          <div className="h-4 bg-gray-100 rounded w-3/4" />
        </div>
      ) : (
        <p className="text-gray-700 leading-relaxed">{review?.review_text}</p>
      )}

      {/* ── Linked photos ── */}
      {!loading && linkedImages.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
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
          <div className="grid grid-cols-3 gap-2">
            {linkedImages.map((image) => (
              <div key={image.id} className="rounded-xl overflow-hidden bg-gray-100">
                <div className="relative aspect-square">
                  <Image
                    src={image.image_url}
                    alt={image.title ?? "Review photo"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 33vw, 20vw"
                  />
                </div>
                <button
                  onClick={() => downloadPhoto(image)}
                  className="w-full flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-1">
        <Button
          size="sm"
          onClick={handleCopy}
          disabled={loading || !review}
          className="gap-1.5"
        >
          {copied ? (
            <>
              <CheckCheck className="w-3.5 h-3.5" /> Copied!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" /> Copy Review
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchReview(review?.id)}
          disabled={loading}
          className="gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Another
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReviewPosted}
          disabled={loading || !review}
          className="gap-1.5 text-green-600 hover:text-green-700 hover:bg-green-50"
        >
          Review Posted ✓
        </Button>
      </div>
    </div>
  );
}
