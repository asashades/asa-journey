'use client';

import { useSearchParams } from 'next/navigation';
import TokenDetailPage from '@/components/collections/TokenDetailPage';
import { Suspense } from 'react';

function TagDetailContent() {
  const searchParams = useSearchParams();
  const name = searchParams.get('name') || '';
  return <TokenDetailPage kind="tag" name={name} />;
}

export default function TagDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        {/* Dynamic Cosmic Orbit Loading Circle */}
        <div className="relative mb-6 flex h-16 w-16 items-center justify-center">
          <span className="absolute h-full w-full rounded-full border-2 border-[#00DC7D]/10" />
          <span className="absolute h-full w-full animate-spin rounded-full border-2 border-t-[#00DC7D] border-r-transparent border-b-transparent border-l-transparent" />
          <div className="h-3 w-3 animate-ping rounded-full bg-[#00DC7D] opacity-75" />
        </div>
        <h3 className="font-serif text-base font-bold text-[#2F3331]">Loading details</h3>
        <p className="mt-1 text-xs text-[#A3A7A8] font-mono animate-pulse">Sifting through your stars...</p>
      </div>
    }>
      <TagDetailContent />
    </Suspense>
  );
}
