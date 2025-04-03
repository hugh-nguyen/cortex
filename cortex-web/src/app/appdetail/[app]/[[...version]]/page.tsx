'use client';

import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import MuiClientProvider from '@/app/components/MuiClientProvider';
import CortexLayout from '@/app/components/CortexLayout';
import { GlobalProvider } from '@/app/GlobalContext';

// Dynamically import to prevent SSR hydration issues
const AppDetailView = dynamic(
  () => import('@/app/components/AppDetailView'),
  { ssr: false }
);

export default function AppDetailPage() {
  const params = useParams();
  const appName = params.app as string;
  
  // Get version from params if available, otherwise pass null to use default
  let initialVersion: number | null = null;
  if (params.version && Array.isArray(params.version) && params.version.length > 0) {
    const versionParam = parseInt(params.version[0]);
    if (!isNaN(versionParam)) {
      initialVersion = versionParam;
    }
  }
  
  return (
    <GlobalProvider>
      <MuiClientProvider>
      <CortexLayout>
        <AppDetailView 
          appName={appName} 
          initialVersion={initialVersion}
          isRoutedPage={true}
        />
      </CortexLayout>
    </MuiClientProvider>
    </GlobalProvider>
  );
}