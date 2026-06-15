import { getActiveEvents } from "@/lib/data";
import { EventsGrid } from "@/components/public/EventsGrid";

export default async function HomePage() {
  const events = await getActiveEvents();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Events</h1>
        <p className="text-gray-500">Select an event to view photos and get a review suggestion.</p>
      </div>
      <EventsGrid events={events} />
    </div>
  );
}
