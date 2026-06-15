"use client";

const SESSION_KEY_PREFIX = "wd_shown_reviews_";
const GENERAL_SESSION_KEY = "wd_general_shown";
// Persists across sessions — reviews the user marked as posted are never shown again
const USED_LOCAL_KEY = "wd_used_reviews";

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

export function getUsedReviewIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USED_LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markReviewUsed(reviewId: string): void {
  if (typeof window === "undefined") return;
  const existing = getUsedReviewIds();
  if (!existing.includes(reviewId)) {
    localStorage.setItem(USED_LOCAL_KEY, JSON.stringify([...existing, reviewId]));
  }
}

export function getGeneralShownIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(GENERAL_SESSION_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addGeneralShownId(reviewId: string): void {
  if (typeof window === "undefined") return;
  const existing = getGeneralShownIds();
  if (!existing.includes(reviewId)) {
    sessionStorage.setItem(GENERAL_SESSION_KEY, JSON.stringify([...existing, reviewId]));
  }
}

export function clearShownReviews(eventId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(`${SESSION_KEY_PREFIX}${eventId}`);
}
