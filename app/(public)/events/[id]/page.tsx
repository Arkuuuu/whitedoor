import { Suspense } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Calendar, ArrowLeft, Star } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ImageGallery } from "@/components/public/ImageGallery";
import { cn, formatDate } from "@/lib/utils";
import { getEvent, getEventImages } from "@/lib/data";

function EventPageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-4 bg-gray-100 rounded w-24" />
      <div className="h-64 sm:h-80 bg-gray-100 rounded-2xl" />
      <div className="h-8 bg-gray-100 rounded w-64" />
      <div className="h-4 bg-gray-100 rounded w-48" />
      <div className="h-28 bg-blue-50 rounded-2xl" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="aspect-square bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

async function EventContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [event, images] = await Promise.all([getEvent(id), getEventImages(id)]);

  if (!event) notFound();

  return (
    <>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Events
      </Link>

      {event.banner_url && (
        <div className="relative w-full h-64 sm:h-80 rounded-2xl overflow-hidden mb-6">
          <Image
            src={event.banner_url}
            alt={event.name}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">{event.name}</h1>
        {event.event_date && (
          <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-3">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(event.event_date)}</span>
          </div>
        )}
        {event.description && (
          <p className="text-gray-600 leading-relaxed">{event.description}</p>
        )}
      </div>

      <div className="bg-blue-50 rounded-2xl p-6 mb-10 flex flex-col sm:flex-row items-center gap-4 justify-between">
        <div>
          <div className="flex gap-0.5 mb-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <p className="font-semibold text-gray-900">Enjoyed the event?</p>
          <p className="text-gray-500 text-sm">Get a review suggestion you can post in seconds.</p>
        </div>
        <Link
          href={`/events/${event.id}/review`}
          className={cn(buttonVariants({ size: "lg" }), "shrink-0")}
        >
          Get a Review
        </Link>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Event Gallery
          {images.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-400">({images.length} photos)</span>
          )}
        </h2>
        <ImageGallery images={images} />
      </div>
    </>
  );
}

export default function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Suspense fallback={<EventPageSkeleton />}>
        <EventContent params={params} />
      </Suspense>
    </div>
  );
}
