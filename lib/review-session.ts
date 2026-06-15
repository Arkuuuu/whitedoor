"use client";

const SESSION_KEY_PREFIX = "wd_shown_reviews_";

export function getShownReviewIds(eventId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(`${SESSION_KEY_PREFIX}${eventId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addShownReviewId(eventId: string, reviewId: string): void {
  if (typeof window === "undefined") return;
  const existing = getShownReviewIds(eventId);
  if (!existing.includes(reviewId)) {
    sessionStorage.setItem(
      `${SESSION_KEY_PREFIX}${eventId}`,
      JSON.stringify([...existing, reviewId])
    );
  }
}

export function clearShownReviews(eventId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(`${SESSION_KEY_PREFIX}${eventId}`);
}
