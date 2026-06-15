export interface Event {
  id: string;
  name: string;
  description: string | null;
  banner_url: string | null;
  event_date: string | null;
  status: "active" | "inactive";
  created_at: string;
}

export interface Review {
  id: string;
  event_id: string | null;
  review_text: string;
  status: "active" | "archived";
  times_shown: number;
  times_copied: number;
  times_used: number;
  created_at: string;
}

export interface Image {
  id: string;
  event_id: string;
  image_url: string;
  title: string | null;
  downloads: number;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  review_id: string | null;
  action: "viewed" | "copied" | "used";
  created_at: string;
  reviews?: { review_text: string; events?: { name: string } };
}
