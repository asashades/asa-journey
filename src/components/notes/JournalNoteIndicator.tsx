'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { Note } from '@/types';

interface JournalNoteIndicatorProps {
  notes: Note[];
  dateStr: string;
}

export default function JournalNoteIndicator({ notes, dateStr }: JournalNoteIndicatorProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState<'left' | 'right'>('right');
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside detection
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Screen bounds check
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const checkBounds = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const popoverWidth = 240; // w-60 is 240px
      const windowWidth = window.innerWidth;

      // If aligned to the right (right-0), the popover's left edge is at:
      const leftEdgeIfRightAligned = rect.right - popoverWidth;

      if (leftEdgeIfRightAligned < 16) {
        setPlacement('left');
      } else {
        setPlacement('right');
      }
    };

    checkBounds();
    window.addEventListener('resize', checkBounds);
    return () => window.removeEventListener('resize', checkBounds);
  }, [isOpen]);

  if (notes.length === 0) return null;

  return (
    <div ref={containerRef} className="relative inline-block select-none">
      {/* Indicator Badge Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-[#C8F7E4] text-[#00875A] border border-[#00DC7D]/20 hover:bg-[#B2F3D7] active:scale-95 transition-all"
        title={`${notes.length} note(s) linked to this day`}
      >
        <FontAwesomeIcon icon={faBook} className="h-3 w-3" />
      </button>

      {/* Popover */}
      {isOpen && (
        <div 
          className={`absolute ${placement === 'left' ? 'left-0' : 'right-0'} mt-1.5 w-60 max-w-[calc(100vw-32px)] rounded-xl bg-white dark:bg-[#111412] border border-[#EEF0EF] dark:border-[#2E3832] shadow-xl z-30 p-2 animate-in fade-in slide-in-from-top-1 duration-150`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-[10px] font-bold text-[#A3A7A8] uppercase tracking-wider px-2.5 py-1 border-b border-[#EEF0EF] dark:border-[#2E3832]/30 mb-1">
            Linked Notes
          </div>
          <div className="max-h-48 overflow-y-auto space-y-0.5 scrollbar-thin">
            {notes.map((note) => (
              <button
                key={note.id}
                onClick={() => {
                  router.push(`/notes/new?id=${note.id}`);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between text-left px-2.5 py-2 rounded-lg text-xs font-bold text-[#2F3331] dark:text-[#E4E7E6] hover:bg-gray-50 dark:hover:bg-[#161B19]/50 transition-colors group"
              >
                <span className="truncate max-w-[85%]">
                  {note.title || 'Untitled Note'}
                </span>
                <FontAwesomeIcon 
                  icon={faChevronRight} 
                  className="h-2.5 w-2.5 text-[#A3A7A8] group-hover:text-primary transition-colors shrink-0" 
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
