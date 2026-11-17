export function CricketIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Cricket Bat */}
      <path d="m14 7 3-3 4 4-3 3" />
      <path d="m14 7-9.5 9.5a2.12 2.12 0 0 0 3 3L17 10" />
      <path d="m17 4 3 3" />
      {/* Cricket Ball with seam */}
      <circle cx="6" cy="6" r="3" />
      <path d="M4.5 4.5c.8.8.8 2.2 0 3" />
    </svg>
  );
}
