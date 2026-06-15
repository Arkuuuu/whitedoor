import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [eventsRes, reviewsRes, imagesRes, activityRes] = await Promise.all([
    supabase.from("events").select("id, status"),
    supabase.from("reviews").select("id, times_copied, times_used, times_shown, event_id, review_text, status"),
    supabase.from("images").select("id, downloads, event_id"),
    supabase
      .from("activity_logs")
      .select("id, action, created_at, review_id, reviews(review_text, event_id, events(name))")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const events = eventsRes.data ?? [];
  const reviews = reviewsRes.data ?? [];
  const images = imagesRes.data ?? [];
  const activity = activityRes.data ?? [];

  const totalReviewsCopied = reviews.reduce((sum, r) => sum + r.times_copied, 0);
  const totalReviewsUsed = reviews.reduce((sum, r) => sum + r.times_used, 0);
  const totalDownloads = images.reduce((sum, i) => sum + i.downloads, 0);

  // Top reviews by usage
  const topReviews = [...reviews]
    .sort((a, b) => b.times_used - a.times_used)
    .slice(0, 5);

  // Top images by downloads
  const topImages = [...images]
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, 5);

  return NextResponse.json({
    totalEvents: events.length,
    activeEvents: events.filter((e) => e.status === "active").length,
    totalReviews: reviews.length,
    totalReviewsCopied,
    totalReviewsUsed,
    totalImages: images.length,
    totalDownloads,
    recentActivity: activity,
    topReviews,
    topImages,
  });
}
