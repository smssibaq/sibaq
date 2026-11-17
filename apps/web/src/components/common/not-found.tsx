import { Compass, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-primary mb-6">
        <Compass className="h-8 w-8" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        404 — Page Not Found
      </h1>
      <p className="mt-3 max-w-md text-base text-muted-foreground leading-relaxed">
        The route you navigated to does not exist or has been relocated.
      </p>
      <div className="mt-8">
        <Button onClick={() => (window.location.href = '/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
