'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import NoteEditor from '@/components/notes/NoteEditor';

function NoteEditorWithParams() {
  const searchParams = useSearchParams();
  const noteId = searchParams.get('id') || undefined;

  return <NoteEditor noteId={noteId} />;
}

export default function NewNotePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-[#0F1210] flex items-center justify-center text-sm text-[#A3A7A8]">
        Loading editor...
      </div>
    }>
      <NoteEditorWithParams />
    </Suspense>
  );
}
