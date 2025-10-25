"use client";
export function SkeletonCard() {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="h-4 w-40 rounded shimmer" />
        <div className="h-5 w-16 rounded-full shimmer" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-3 w-2/3 rounded shimmer" />
        <div className="h-3 w-1/2 rounded shimmer" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-8 w-full rounded shimmer" />
        <div className="h-16 w-full rounded shimmer" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

