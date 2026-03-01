export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      {/* Zone image skeleton — shimmer */}
      <div
        className="h-40 animate-[shimmer_1.5s_infinite]"
        style={{
          background: `linear-gradient(90deg, var(--color-skeleton) 25%, var(--color-skeleton-shine) 50%, var(--color-skeleton) 75%)`,
          backgroundSize: "200% 100%",
        }}
      />
      {/* Zone contenu skeleton */}
      <div className="p-4">
        <div className="mb-2 h-[18px] w-4/5 animate-[shimmer_1.5s_infinite] rounded-md"
          style={{
            background: `linear-gradient(90deg, var(--color-skeleton) 25%, var(--color-skeleton-shine) 50%, var(--color-skeleton) 75%)`,
            backgroundSize: "200% 100%",
          }}
        />
        <div className="mb-4 h-3.5 w-3/5 animate-[shimmer_1.5s_infinite] rounded-md"
          style={{
            background: `linear-gradient(90deg, var(--color-skeleton) 25%, var(--color-skeleton-shine) 50%, var(--color-skeleton) 75%)`,
            backgroundSize: "200% 100%",
          }}
        />
        <div className="flex gap-2">
          <div className="h-6 w-[70px] animate-[shimmer_1.5s_infinite] rounded-full"
            style={{
              background: `linear-gradient(90deg, var(--color-skeleton) 25%, var(--color-skeleton-shine) 50%, var(--color-skeleton) 75%)`,
              backgroundSize: "200% 100%",
            }}
          />
          <div className="h-6 w-[55px] animate-[shimmer_1.5s_infinite] rounded-full"
            style={{
              background: `linear-gradient(90deg, var(--color-skeleton) 25%, var(--color-skeleton-shine) 50%, var(--color-skeleton) 75%)`,
              backgroundSize: "200% 100%",
            }}
          />
        </div>
      </div>
    </div>
  );
}
