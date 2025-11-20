import { AppLayout } from '@/components/app-layout';
import { Dashboard } from '@/components/dashboard/dashboard';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  return (
    <AppLayout>
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </AppLayout>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
      </div>
      <div className="border-t pt-6">
        <Skeleton className="h-7 w-56 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
