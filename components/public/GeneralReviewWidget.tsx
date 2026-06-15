"use client";

import { useEffect, useState, useCallback } from "react";
import { Copy, RefreshCw, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getGeneralShownIds,
  addGeneralShownId,
  getUsedReviewIds,
} from "@/lib/review-session";
import type { Review } from "@/lib/types";

export function GeneralReviewWidget() {
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

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
      await fetch(`/api/reviews/${review.id}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "copied" }),
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked
    }
  }

  if (error) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">{error}</div>
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
      <div className="flex gap-3 pt-1">
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
      </div>
    </div>
  );
}
