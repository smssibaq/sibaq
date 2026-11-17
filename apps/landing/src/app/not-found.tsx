import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground px-4 text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold tracking-wider uppercase text-primary mb-4">
        404 — Page Not Found
      </div>
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-[#F5F7F4]">
        Out of Bounds
      </h1>
      <p className="max-w-md text-base text-[#A2B5AA] mb-8">
        The page you are looking for does not exist or has been moved off the pitch.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Return to Pitch
      </Link>
    </div>
  );
}
