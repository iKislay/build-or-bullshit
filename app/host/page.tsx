import { Suspense } from 'react';
import HostDashboard from '@/components/host/HostDashboard';

export default function HostPage() {
  return (
    <Suspense fallback={null}>
      <HostDashboard />
    </Suspense>
  );
}
