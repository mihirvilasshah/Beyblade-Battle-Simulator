export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="skeleton h-8 w-64 rounded-lg" />
      <div className="skeleton mt-3 h-4 w-96 max-w-full rounded" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="skeleton h-72 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
