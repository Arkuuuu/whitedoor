import { EventForm } from "@/components/admin/EventForm";

export default function NewEventPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Event</h1>
        <p className="text-gray-500 text-sm">Fill in the details below to add a new event.</p>
      </div>
      <EventForm />
    </div>
  );
}
