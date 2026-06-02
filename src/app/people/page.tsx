'use client';

import { useSearchParams } from 'next/navigation';
import TokenDetailPage from '@/components/collections/TokenDetailPage';
import { Suspense } from 'react';

function PersonDetailContent() {
  const searchParams = useSearchParams();
  const name = searchParams.get('name') || '';
  return <TokenDetailPage kind="person" name={name} />;
}

export default function PersonDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#00DC7D] border-t-transparent rounded-full animate-spin" /></div>}>
      <PersonDetailContent />
    </Suspense>
  );
}
