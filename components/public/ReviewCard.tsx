"use client";

import { useState } from "react";
import { Copy, Check, RefreshCw, Star, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import type { Review } from "@/lib/types";

interface ReviewCardProps {
  review: Review;
  onAnotherReview: () => void;
  onReviewPosted: () => void;
  isLoading?: boolean;
  posted?: boolean;
}

export function ReviewCard({
  review,
  onAnotherReview,
  onReviewPosted,
  isLoading = false,
  posted = false,
}: ReviewCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(review.review_text);
      setCopied(true);
      toast.success("Review copied successfully");
      await fetch(`/api/reviews/${review.id}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "copied" }),
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy. Please copy manually.");
    }
  }

  if (posted) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-8 text-center">
          <div className="flex justify-center mb-4">
            <PartyPopper className="w-12 h-12 text-green-500" />
          </div>
          <h3 className="text-xl font-semibold text-green-800 mb-2">
            Thank you for your feedback!
          </h3>
          <p className="text-green-600">Your review helps others discover this event.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-100 shadow-md">
      <CardContent className="p-6">
        <div className="flex justify-center gap-1 mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
          ))}
        </div>

        <p className="text-gray-800 text-base leading-relaxed mb-6 text-center min-h-[80px]">
          {isLoading ? (
            <span className="text-gray-400 animate-pulse">Loading review…</span>
          ) : (
            review.review_text
          )}
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleCopy}
            className="flex-1 gap-2"
            disabled={isLoading}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" /> Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> Copy Review
              </>
            )}
          </Button>

          <Button
            onClick={onAnotherReview}
            variant="outline"
            className="flex-1 gap-2"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Another Review
          </Button>
        </div>

        <Button
          onClick={onReviewPosted}
          variant="ghost"
          className="w-full mt-3 text-green-600 hover:text-green-700 hover:bg-green-50"
          disabled={isLoading}
        >
          Review Posted ✓
        </Button>
      </CardContent>
    </Card>
  );
}
