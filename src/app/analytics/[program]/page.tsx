import { AppLayout } from '@/components/app-layout';

export default function AnalyticsPage({ params }: { params: { program: string } }) {
  return (
    <AppLayout>
      <h1 className="text-2xl font-bold">Análisis: {decodeURIComponent(params.program)}</h1>
      {/* Analytics content will go here */}
    </AppLayout>
  );
}
