'use client';

import dynamic from 'next/dynamic';
import { GlobalProvider } from '@/app/GlobalContext';
import MuiClientProvider from '@/app/components/MuiClientProvider';
import CortexLayout from '@/app/components/CortexLayout';

const VizualiseDashboard = dynamic(
  () => import('@/app/components/VizualiseDashboard'),
  { ssr: false }
);

export default function Home() {
  return (
    <GlobalProvider>
      <MuiClientProvider>
        <CortexLayout>
          <VizualiseDashboard></VizualiseDashboard>
        </CortexLayout>
      </MuiClientProvider>
    </GlobalProvider>
  );
}