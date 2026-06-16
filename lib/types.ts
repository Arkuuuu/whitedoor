export type ReviewType = "TEXT_ONLY" | "SINGLE_IMAGE" | "MULTI_IMAGE";
export type ImageStatus = "available" | "reserved" | "used" | "archived";

export interface Event {
  id: string;
  name: string;
  description: string | null;
  banner_url: string | null;
  event_date: string | null;
  status: "active" | "inactive";
  google_review_url: string | null;
  created_at: string;
}

export interface Image {
  id: string;
  event_id: string | null;
  image_url: string;
  title: string | null;
  status: ImageStatus;
  downloads: number;
  created_at: string;
}

export interface ReviewImage {
  id: string;
  review_id: string;
  image_id: string;
  display_order: number;
  created_at: string;
  images: Image;
}

export interface Review {
  id: string;
  event_id: string | null;
  review_text: string;
  review_type: ReviewType;
  status: "active" | "reserved" | "archived";
  times_shown: number;
  times_copied: number;
  times_used: number;
  created_at: string;
  // Populated when fetched via random route (JOIN with review_images)
  review_images?: ReviewImage[];
}

export interface ActivityLog {
  id: string;
  review_id: string | null;
  event_id: string | null;
  session_id: string | null;
  action: "viewed" | "copied" | "used" | "photo_downloaded" | "skipped";
  created_at: string;
  reviews?: { review_text: string; events?: { name: string } };
}
