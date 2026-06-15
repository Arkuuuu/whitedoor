import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { DeleteEventButton } from "./DeleteEventButton";

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-500 text-sm">{events?.length ?? 0} total events</p>
        </div>
        <Link href="/admin/dashboard/events/new" className={cn(buttonVariants(), "gap-1")}>
          <Plus className="w-4 h-4" /> New Event
        </Link>
      </div>

      {!events || events.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          No events yet.{" "}
          <Link href="/admin/dashboard/events/new" className="text-blue-600 hover:underline">
            Create one
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500 hidden sm:table-cell">Date</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {events.map((event, i) => (
                <tr
                  key={event.id}
                  className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    i === events.length - 1 ? "border-0" : ""
                  }`}
                >
                  <td className="px-5 py-4 font-medium text-gray-900">{event.name}</td>
                  <td className="px-5 py-4 text-gray-500 hidden sm:table-cell">
                    {formatDate(event.event_date)}
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={event.status === "active" ? "default" : "secondary"}>
                      {event.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <Link
                        href={`/admin/dashboard/events/${event.id}`}
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <DeleteEventButton id={event.id} name={event.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
