'use client';

import NoteDashboard from '@/components/notes/NoteDashboard';

export default function NotesPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0F1210] pb-28">
      <div className="mx-auto max-w-[640px] md:max-w-[850px] lg:max-w-[1100px] xl:max-w-[1280px] 2xl:max-w-[1440px] px-6 pt-8">
        <NoteDashboard />
      </div>
    </div>
  );
}
