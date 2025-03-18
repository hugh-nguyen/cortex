'use client';

import dynamic from 'next/dynamic';

// This path should match your file structure
const DependencyGraph = dynamic(
  () => import('@/app/components/DependencyGraph'),
  { ssr: false }
);

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <h1 className="text-3xl font-bold mb-8">Service Dependency Graph</h1>
      <DependencyGraph />
    </main>
  );
}