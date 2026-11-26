// Page outlines shown while a screen loads (Next's loading.tsx), so a click
// answers at once with the page's shape instead of a blank screen.
// Same parts as the real pages: Skeleton blocks on the paper background,
// hairline cards with the card radius. No colour, no motion beyond the pulse.
import { Skeleton } from "@/components/ui";

/** Inside the app shell: header, a row of tiles, then cards. */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy aria-label="Loading">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-[min(360px,80%)]" />
        <Skeleton className="h-4 w-[min(520px,90%)]" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="flex flex-col gap-3 rounded-card border-hair border-line bg-surface p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex flex-col gap-3 rounded-card border-hair border-line bg-surface p-4">
            <Skeleton className="aspect-[4/3] w-full rounded-control" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** A public page: a title block and a grid of works. */
export function PublicGridSkeleton() {
  return (
    <div className="min-h-screen bg-page" aria-busy aria-label="Loading">
      <div className="h-16 border-b-hair border-line bg-surface" />
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-12 sm:px-8 sm:py-16">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-14 w-[min(560px,100%)]" />
        <Skeleton className="h-4 w-[min(420px,90%)]" />
        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="aspect-square w-full rounded-card" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** One work: a large image and its details beside it. */
export function PieceSkeleton() {
  return (
    <div className="min-h-screen bg-page" aria-busy aria-label="Loading">
      <div className="h-14 border-b-hair border-line bg-surface" />
      <div className="mx-auto grid max-w-[1100px] gap-8 px-4 py-8 md:grid-cols-[1.2fr_1fr] md:py-12">
        <Skeleton className="aspect-[4/5] w-full rounded-card" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-10 w-4/5" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="mt-4 h-12 w-full rounded-control" />
          <Skeleton className="h-24 w-full rounded-card" />
        </div>
      </div>
    </div>
  );
}
