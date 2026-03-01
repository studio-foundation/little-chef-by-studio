export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      {/* Zone image skeleton */}
      <div className="h-40 animate-pulse bg-gradient-to-r from-[#f0f0f0] via-[#f8f8f8] to-[#f0f0f0]" />
      {/* Zone contenu skeleton */}
      <div className="p-4">
        <div className="mb-2 h-[18px] w-4/5 animate-pulse rounded-md bg-[#f0f0f0]" />
        <div className="mb-4 h-3.5 w-3/5 animate-pulse rounded-md bg-[#f0f0f0]" />
        <div className="flex gap-2">
          <div className="h-6 w-[70px] animate-pulse rounded-full bg-[#f0f0f0]" />
          <div className="h-6 w-[55px] animate-pulse rounded-full bg-[#f0f0f0]" />
        </div>
      </div>
    </div>
  );
}
