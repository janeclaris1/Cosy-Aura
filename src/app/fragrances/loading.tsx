export default function FragrancesLoading() {
  return (
    <div className="max-w-[1500px] mx-auto px-4 py-6" aria-busy="true" aria-label="Loading fragrances">
      <div className="skeleton h-10 w-48 rounded mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-3 md:gap-x-4 gap-y-10">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="skeleton aspect-[3/4] rounded" />
            <div className="skeleton h-3 w-2/3 mx-auto rounded" />
            <div className="skeleton h-4 w-1/2 mx-auto rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
