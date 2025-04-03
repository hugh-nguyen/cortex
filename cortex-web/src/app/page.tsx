'use client';

import dynamic from 'next/dynamic';
import { GlobalProvider } from '@/app/GlobalContext';
import MuiClientProvider from '@/app/components/MuiClientProvider';
import CortexLayout from '@/app/components/CortexLayout';

const AppDashboard = dynamic(
  () => import('@/app/components/AppDashboard'),
  { ssr: false }
);

export default function Home() {
  return (
    <GlobalProvider>
       <MuiClientProvider>
        <CortexLayout>
          <AppDashboard />
        </CortexLayout>
      </MuiClientProvider>
    </GlobalProvider>
  );
}