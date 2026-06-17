'use client';

import { useMemo } from 'react';
import { Note } from '@/types';
import { format } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faThumbtack, faStar, faBookBookmark, faCalendarAlt, faChevronRight } from '@fortawesome/free-solid-svg-icons';

interface NoteCardProps {
  note: Note;
  onClick: () => void;
}

export default function NoteCard({ note, onClick }: NoteCardProps) {
  // Create an excerpt using useMemo to prevent regex execution on every render frame
  const excerpt = useMemo(() => {
    const rawText = note.contentMarkdown || note.content || '';
    const cleanExcerpt = rawText
      .replace(/[#*`>_\-]/g, '') // remove markdown characters
      .replace(/\[!.*?\]/g, '')  // remove callout tags
      .trim();
    return cleanExcerpt.length > 120 
      ? cleanExcerpt.slice(0, 120) + '...' 
      : cleanExcerpt || 'No content';
  }, [note.contentMarkdown, note.content]);

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-[#161B19]/50 border border-[#CCD0CF]/60 dark:border-[#2E3832]/60 hover:border-[#00DC7D] dark:hover:border-[#00DC7D] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 relative group flex flex-col gap-3.5"
    >
      {/* Top row: Pinned & Title */}
      <div className="flex items-start justify-between gap-4 w-full">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-[#2F3331] dark:text-[#E4E7E6] group-hover:text-[#00A963] dark:group-hover:text-[#00DC7D] transition-colors leading-snug truncate">
            {note.title || 'Untitled'}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {note.pinned && (
            <span className="text-[#00DC7D]" title="Pinned">
              <FontAwesomeIcon icon={faThumbtack} className="h-3.5 w-3.5 rotate-45" />
            </span>
          )}
          {note.favorite && (
            <span className="text-[#FFB95C]" title="Favorite">
              <FontAwesomeIcon icon={faStar} className="h-3.5 w-3.5" />
            </span>
          )}
          <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3 text-[#A3A7A8] group-hover:translate-x-0.5 transition-transform duration-200 ml-1 opacity-70" />
        </div>
      </div>

      {/* Excerpt */}
      <p className="text-sm text-[#6F7476] dark:text-[#A3A7A8] font-light leading-relaxed line-clamp-2 w-full">
        {excerpt}
      </p>

      {/* Tags Row */}
      {note.tags && note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 w-full">
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-semibold bg-[#FAFAFA] dark:bg-[#202723] text-[#7A2EB8] dark:text-[#B79CFF] px-2 py-0.5 rounded-full border border-[#EEF0EF] dark:border-[#2E3832]/30"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-[#EEF0EF]/80 dark:border-[#2E3832]/30 w-full" />

      {/* Bottom row: Notebook & Date */}
      <div className="flex items-center justify-between text-[11px] font-semibold text-[#A3A7A8] w-full">
        <span className="flex items-center gap-1.5 truncate max-w-[65%]">
          <FontAwesomeIcon icon={faBookBookmark} className="h-3 w-3 text-[#6F7476] dark:text-[#A3A7A8] shrink-0" />
          <span className="truncate text-[#6F7476] dark:text-[#A3A7A8]">
            {note.notebookName || 'Uncategorized'}
          </span>
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <FontAwesomeIcon icon={faCalendarAlt} className="h-3 w-3 shrink-0" />
          <span>
            {(() => {
              if (note.linkedJournalDate) {
                const [year, month, day] = note.linkedJournalDate.split('-').map(Number);
                const date = new Date(year, month - 1, day);
                return format(date, 'MMM d, yyyy');
              }
              return format(note.updatedAt instanceof Date ? note.updatedAt : new Date(note.updatedAt), 'MMM d, yyyy');
            })()}
          </span>
        </span>
      </div>
    </button>
  );
}
