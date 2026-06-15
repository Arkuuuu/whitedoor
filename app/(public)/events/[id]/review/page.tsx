import { Suspense } from "react";
import { ReviewContent } from "./ReviewContent";

function ReviewSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 animate-pulse space-y-6">
      <div className="h-4 bg-gray-100 rounded w-28" />
      <div className="h-6 bg-gray-100 rounded w-40" />
      <div className="h-4 bg-gray-100 rounded w-64" />
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-5 h-5 bg-gray-100 rounded" />
          ))}
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-100 rounded" />
          <div className="h-4 bg-gray-100 rounded w-5/6" />
          <div className="h-4 bg-gray-100 rounded w-4/6" />
        </div>
        <div className="flex gap-3 pt-2">
          <div className="h-10 bg-gray-100 rounded-xl flex-1" />
          <div className="h-10 bg-gray-100 rounded-xl flex-1" />
        </div>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<ReviewSkeleton />}>
      <ReviewContent />
    </Suspense>
  );
}
