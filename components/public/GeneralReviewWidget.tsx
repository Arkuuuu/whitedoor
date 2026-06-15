"use client";

import { useEffect, useState, useCallback } from "react";
import { Copy, RefreshCw, CheckCheck, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getGeneralShownIds,
  addGeneralShownId,
  getUsedReviewIds,
  markReviewUsed,
} from "@/lib/review-session";
import type { Review } from "@/lib/types";

export function GeneralReviewWidget() {
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [posted, setPosted] = useState(false);
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
