"use client";
export function SkeletonCard() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-800" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-800" />
      </div>
      <div className="mt-4 h-8 w-24 rounded bg-gray-200 dark:bg-gray-800" />
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

