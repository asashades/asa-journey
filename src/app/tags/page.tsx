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
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#00DC7D] border-t-transparent rounded-full animate-spin" /></div>}>
      <TagDetailContent />
    </Suspense>
  );
}
