'use client';

import dynamic from 'next/dynamic';
import MuiClientProvider from '@/app/components/MuiClientProvider';

// Use dynamic import with ssr: false to prevent hydration mismatch
const AppDashboard = dynamic(
  () => import('@/app/components/AppDashboard'),
  { ssr: false }
);

export default function Home() {
  return (
    <MuiClientProvider>
      <main>
        <AppDashboard />
      </main>
    </MuiClientProvider>
  );
}