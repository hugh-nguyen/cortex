'use client';

import dynamic from 'next/dynamic';
import MuiClientProvider from '@/app/components/MuiClientProvider';
import CortexLayout from '@/app/components/CortexLayout';

// Dynamically import with no SSR to prevent hydration issues
const AppDashboard = dynamic(
  () => import('@/app/components/AppDashboard'),
  { ssr: false }
);

export default function Home() {
  return (
    <MuiClientProvider>
      <CortexLayout>
        <AppDashboard />
      </CortexLayout>
    </MuiClientProvider>
  );
}