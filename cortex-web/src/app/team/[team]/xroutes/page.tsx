'use client';

import dynamic from 'next/dynamic';
import { GlobalProvider } from '@/app/GlobalContext';
import MuiClientProvider from '@/app/components/MuiClientProvider';
import CortexLayout from '@/app/components/CortexLayout';

const RouteDashboard = dynamic(
  () => import('@/app/components/RouteDashboard'),
  { ssr: false }
);

export default function Home() {
  return (
    <GlobalProvider>
      <MuiClientProvider>
        <CortexLayout>
          <RouteDashboard></RouteDashboard>
        </CortexLayout>
      </MuiClientProvider>
    </GlobalProvider>
  );
}