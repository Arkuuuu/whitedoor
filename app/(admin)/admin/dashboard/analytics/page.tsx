import { createClient } from "@/lib/supabase/server";
import { DashboardStatCard } from "@/components/admin/DashboardStatCard";
import {
  CalendarDays,
  MessageSquareText,
  Images,
  Copy,
  CheckCircle,
  Download,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { truncate } from "@/lib/utils";

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const [eventsRes, reviewsRes, imagesRes] = await Promise.all([
    supabase.from("events").select("id, name, status"),
    supabase.from("reviews").select("id, event_id, review_text, times_copied, times_used, times_shown"),
    supabase.from("images").select("id, event_id, title, downloads"),
  ]);

  const events = eventsRes.data ?? [];
  const reviews = reviewsRes.data ?? [];
  const images = imagesRes.data ?? [];

  const totalCopied = reviews.reduce((s, r) => s + r.times_copied, 0);
  const totalUsed = reviews.reduce((s, r) => s + r.times_used, 0);
  const totalDownloads = images.reduce((s, i) => s + i.downloads, 0);
  const totalShown = reviews.reduce((s, r) => s + r.times_shown, 0);

  const topReviews = [...reviews]
    .sort((a, b) => b.times_used - a.times_used)
    .slice(0, 5);

  const topImages = [...images]
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, 5);

  const getEventName = (id: string) => events.find((e) => e.id === id)?.name ?? "Unknown";

  // Reviews per event
  const eventStats = events.map((event) => {
    const eventReviews = reviews.filter((r) => r.event_id === event.id);
    return {
      ...event,
      totalReviews: eventReviews.length,
      totalCopied: eventReviews.reduce((s, r) => s + r.times_copied, 0),
      totalUsed: eventReviews.reduce((s, r) => s + r.times_used, 0),
    };
  }).sort((a, b) => b.totalUsed - a.totalUsed);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm">Overall platform metrics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <DashboardStatCard label="Total Events" value={events.length} icon={CalendarDays} color="blue" />
        <DashboardStatCard label="Active Events" value={events.filter((e) => e.status === "active").length} icon={CalendarDays} color="blue" />
        <DashboardStatCard label="Total Reviews" value={reviews.length} icon={MessageSquareText} color="purple" />
        <DashboardStatCard label="Reviews Shown" value={totalShown} icon={TrendingUp} color="orange" />
        <DashboardStatCard label="Reviews Copied" value={totalCopied} icon={Copy} color="green" />
        <DashboardStatCard label="Reviews Used" value={totalUsed} icon={CheckCircle} color="green" />
        <DashboardStatCard label="Total Images" value={images.length} icon={Images} color="orange" />
        <DashboardStatCard label="Total Downloads" value={totalDownloads} icon={Download} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Events by Review Usage</CardTitle>
          </CardHeader>
          <CardContent>
            {eventStats.length === 0 ? (
              <p className="text-gray-400 text-sm">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {eventStats.slice(0, 5).map((event) => (
                  <div key={event.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 truncate max-w-50">{event.name}</span>
                    <div className="flex gap-4 text-gray-400 text-xs">
                      <span>{event.totalReviews} reviews</span>
                      <span>{event.totalCopied} copied</span>
                      <span className="font-medium text-green-600">{event.totalUsed} used</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Reviews by Usage</CardTitle>
          </CardHeader>
          <CardContent>
            {topReviews.length === 0 ? (
              <p className="text-gray-400 text-sm">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {topReviews.map((review) => (
                  <div key={review.id} className="text-sm">
                    <p className="text-gray-700 truncate">{truncate(review.review_text, 60)}</p>
                    <p className="text-xs text-gray-400">
                      {getEventName(review.event_id)} · {review.times_copied} copied · {review.times_used} used
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most Downloaded Images</CardTitle>
          </CardHeader>
          <CardContent>
            {topImages.length === 0 ? (
              <p className="text-gray-400 text-sm">No downloads yet.</p>
            ) : (
              <div className="space-y-3">
                {topImages.map((img) => (
                  <div key={img.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 truncate max-w-50">
                      {img.title ?? img.id.slice(0, 8)}
                    </span>
                    <span className="text-gray-400 text-xs flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      {img.downloads}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
