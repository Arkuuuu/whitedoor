import { createClient } from "@/lib/supabase/server";
import { DashboardStatCard } from "@/components/admin/DashboardStatCard";
import {
  CalendarDays,
  MessageSquareText,
  Images,
  Copy,
  CheckCircle,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [eventsRes, reviewsRes, imagesRes, activityRes] = await Promise.all([
    supabase.from("events").select("id, status"),
    supabase.from("reviews").select("id, times_copied, times_used"),
    supabase.from("images").select("id"),
    supabase
      .from("activity_logs")
      .select("id, action, created_at, review_id, reviews(review_text, events(name))")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const events = eventsRes.data ?? [];
  const reviews = reviewsRes.data ?? [];
  const images = imagesRes.data ?? [];
  const activity = activityRes.data ?? [];

  const totalCopied = reviews.reduce((s, r) => s + r.times_copied, 0);
  const totalUsed = reviews.reduce((s, r) => s + r.times_used, 0);

  const actionLabels: Record<string, string> = {
    viewed: "Viewed",
    copied: "Copied",
    used: "Marked Used",
  };

  const actionColors: Record<string, "default" | "secondary" | "outline"> = {
    viewed: "outline",
    copied: "secondary",
    used: "default",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm">Overview of your White Door activity</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <DashboardStatCard label="Total Events" value={events.length} icon={CalendarDays} color="blue" />
        <DashboardStatCard label="Total Reviews" value={reviews.length} icon={MessageSquareText} color="purple" />
        <DashboardStatCard label="Total Images" value={images.length} icon={Images} color="orange" />
        <DashboardStatCard label="Reviews Copied" value={totalCopied} icon={Copy} color="green" />
        <DashboardStatCard label="Reviews Marked Used" value={totalUsed} icon={CheckCircle} color="green" />
        <DashboardStatCard label="Active Events" value={events.filter((e) => e.status === "active").length} icon={CalendarDays} color="blue" />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        {activity.length === 0 ? (
          <p className="text-gray-400 text-sm">No activity yet.</p>
        ) : (
          <div className="space-y-2">
            {activity.map((log) => {
              const rev = (log.reviews as unknown) as { review_text: string; events?: { name: string } } | null;
              return (
                <div
                  key={log.id}
                  className="flex items-center gap-3 bg-white rounded-xl p-4 border border-gray-100"
                >
                  <Badge variant={actionColors[log.action] ?? "outline"} className="shrink-0">
                    {actionLabels[log.action] ?? log.action}
                  </Badge>
                  <p className="text-sm text-gray-700 flex-1 truncate">
                    {rev?.events?.name && (
                      <span className="font-medium">{rev.events.name}: </span>
                    )}
                    {rev?.review_text ? `"${rev.review_text.slice(0, 80)}…"` : "—"}
                  </p>
                  <span className="text-xs text-gray-400 shrink-0">
                    {formatDate(log.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
