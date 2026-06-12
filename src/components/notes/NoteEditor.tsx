'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Note, Notebook } from '@/types';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import MarkdownRenderer from './MarkdownRenderer';
import SlashCommandMenu from './SlashCommandMenu';
import AIPreviewModal from './AIPreviewModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faEye,
  faPen,
  faThumbtack,
  faStar,
  faDownload,
  faFilePdf,
  faTrash,
  faBookBookmark,
  faCloudUploadAlt,
  faCheckCircle,
  faExclamationCircle,
  faTag,
  faAt,
  faSpinner,
  faMeteor,
  faBrain,
  faListCheck,
  faChevronDown,
  faChevronUp,
  faCalendarAlt,
  faXmark,
  faArchive,
  faSun,
  faMoon,
  faBold,
  faItalic,
  faCode,
  faHeading,
  faListUl
} from '@fortawesome/free-solid-svg-icons';

interface NoteEditorProps {
  noteId?: string; // If empty, we are creating a new note
}

export default function NoteEditor({ noteId }: NoteEditorProps) {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const {
    notes,
    notebooks,
    addNote,
    updateNote,
    deleteNote,
    addWisdom,
    updateWisdom,
    deleteWisdom,
    addIdea,
    updateIdea,
    deleteIdea,
    currentDate,
    wisdoms,
    ideas
  } = useData();

  // Load note or initialize a new one
  const existingNote = useMemo(() => {
    if (!noteId) return null;
    return notes.find(n => n.id === noteId) || null;
  }, [notes, noteId]);

  // Form states
  const [title, setTitle] = useState('');
  const [contentMarkdown, setContentMarkdown] = useState('');
  const [selectedNotebookId, setSelectedNotebookId] = useState<string>('');
  const [pinned, setPinned] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [linkedJournalDate, setLinkedJournalDate] = useState<string>('');
  const [status, setStatus] = useState<Note['status']>('draft');

  // Editor states
  const [editMode, setEditMode] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [localNoteId, setLocalNoteId] = useState<string | null>(noteId || null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPDFMenu, setShowPDFMenu] = useState(false);

  // Slash commands states
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashIndex, setSlashIndex] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // AI Refinement states
  const [showAIMenu, setShowAIMenu] = useState(false);
  const [isAIRefining, setIsAIRefining] = useState(false);
  const [aiRefineStatus, setAiRefineStatus] = useState('');
  const [aiPreview, setAiPreview] = useState<{
    isOpen: boolean;
    originalText: string;
    refinedText: string;
    action: 'beautify' | 'summarize' | 'wisdom';
  } | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const handleApplyAIRefine = (finalText: string) => {
    setContentMarkdown(finalText);
    performSave(title, finalText, selectedNotebookId, pinned, favorite, linkedJournalDate);
    setAiPreview(null);
  };

  const handleAIRefine = async (action: 'beautify' | 'summarize' | 'wisdom') => {
    if (!contentMarkdown.trim() || isAIRefining) return;
    
    setIsAIRefining(true);
    setShowAIMenu(false);
    
    if (action === 'beautify') setAiRefineStatus('Refining text structures...');
    else if (action === 'summarize') setAiRefineStatus('Generating summary & tasks...');
    else setAiRefineStatus('Extracting wisdom callouts...');

    try {
      const response = await fetch('/api/ai/refine-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteContent: contentMarkdown,
          action,
          userId: user?.uid || 'anonymous_user',
          aiConfig: userProfile?.settings?.aiConfig
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Gagal menyempurnakan catatan.');
      }

      const data = await response.json();
      if (data.success && data.refinedText) {
        setAiPreview({
          isOpen: true,
          originalText: contentMarkdown,
          refinedText: data.refinedText,
          action
        });
      }
    } catch (err: any) {
      console.error('[AI Refine Error]:', err);
      alert(err.message || 'Terjadi kesalahan saat memanggil AI.');
    } finally {
      setIsAIRefining(false);
      setAiRefineStatus('');
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContentMarkdown(value);
    setIsDirty(true);

    const selectionStart = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, selectionStart);

    // Look for the last slash '/' in the current line
    const lastNewline = textBeforeCursor.lastIndexOf('\n');
    const currentLineStart = lastNewline === -1 ? 0 : lastNewline + 1;
    const currentLineText = textBeforeCursor.substring(currentLineStart);
    
    const lastSlash = currentLineText.lastIndexOf('/');

    if (lastSlash !== -1) {
      const slashIndexInText = currentLineStart + lastSlash;
      // Make sure there is no space or newline between the slash and the cursor
      const afterSlashText = textBeforeCursor.substring(slashIndexInText + 1);
      
      if (!afterSlashText.includes(' ') && !afterSlashText.includes('\n')) {
        setShowSlashMenu(true);
        setSlashIndex(slashIndexInText);
        setSlashQuery(afterSlashText);
        return;
      }
    }

    setShowSlashMenu(false);
    setSlashIndex(null);
    setSlashQuery('');
  };

  const handleSlashSelect = useCallback((template: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const startPos = textarea.selectionStart;
    const text = contentMarkdown;

    if (slashIndex !== null) {
      const beforeSlash = text.substring(0, slashIndex);
      const afterCursor = text.substring(startPos);
      
      const newContent = beforeSlash + template + afterCursor;
      setContentMarkdown(newContent);
      
      const newCursorPos = slashIndex + template.length;
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
    
    setShowSlashMenu(false);
    setSlashIndex(null);
    setSlashQuery('');
  }, [contentMarkdown, slashIndex]);

  // Handle Bold, Italic, and other markdown formatting
  const applyFormatting = useCallback((type: 'bold' | 'italic' | 'code' | 'heading' | 'bullet' | 'todo') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = contentMarkdown;
    const selectedText = text.substring(start, end);

    let formatted = '';
    let cursorOffset = 0;

    switch (type) {
      case 'bold':
        formatted = `**${selectedText}**`;
        cursorOffset = 2;
        break;
      case 'italic':
        formatted = `*${selectedText}*`;
        cursorOffset = 1;
        break;
      case 'code':
        formatted = `\`${selectedText}\``;
        cursorOffset = 1;
        break;
      case 'heading':
        formatted = `\n### ${selectedText}`;
        cursorOffset = 5;
        break;
      case 'bullet':
        formatted = `\n- ${selectedText}`;
        cursorOffset = 3;
        break;
      case 'todo':
        formatted = `\n- [ ] ${selectedText}`;
        cursorOffset = 7;
        break;
    }

    const newContent = text.substring(0, start) + formatted + text.substring(end);
    setContentMarkdown(newContent);
    setIsDirty(true);

    setTimeout(() => {
      textarea.focus();
      if (selectedText.length > 0) {
        textarea.setSelectionRange(start + cursorOffset, end + cursorOffset);
      } else {
        textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
      }
    }, 0);
  }, [contentMarkdown]);

  // Handle hotkeys (Cmd+B/Ctrl+B, Cmd+I/Ctrl+I)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

    if (isCmdOrCtrl && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault();
      applyFormatting('bold');
    } else if (isCmdOrCtrl && (e.key === 'i' || e.key === 'I')) {
      e.preventDefault();
      applyFormatting('italic');
    }
  };

  // Counters
  const wordCount = useMemo(() => {
    return contentMarkdown.trim() ? contentMarkdown.trim().split(/\s+/).length : 0;
  }, [contentMarkdown]);

  const charCount = contentMarkdown.length;

  // Extracted tags & mentions display
  const extractedTags = useMemo(() => {
    const tagsMatches = contentMarkdown.match(/#([\w\-]+)/g) || [];
    return Array.from(new Set(tagsMatches.map(t => t.replace('#', ''))));
  }, [contentMarkdown]);

  const extractedMentions = useMemo(() => {
    const mentionsMatches = contentMarkdown.match(/@([\w\-]+)/g) || [];
    return Array.from(new Set(mentionsMatches.map(m => m.replace('@', ''))));
  }, [contentMarkdown]);

  // Get all unique notebooks including virtual ones from notes
  const allNotebooks = useMemo(() => {
    const list = [...notebooks];
    notes.forEach(note => {
      if (note.notebookId && note.notebookName) {
        const exists = list.some(nb => nb.id === note.notebookId);
        if (!exists) {
          list.push({
            id: note.notebookId,
            name: note.notebookName,
            userId: user?.uid || '',
            color: '#7E8A84', // Neutral cover color for virtual notebooks
            sortOrder: 9999,
            createdAt: note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt),
            updatedAt: note.updatedAt instanceof Date ? note.updatedAt : new Date(note.updatedAt)
          });
        }
      }
    });
    return [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [notebooks, notes]);

  // Sync state with existing note
  useEffect(() => {
    if (existingNote) {
      setTitle(existingNote.title || '');
      setContentMarkdown(existingNote.contentMarkdown || existingNote.content || '');
      setSelectedNotebookId(existingNote.notebookId || '');
      setPinned(existingNote.pinned || false);
      setFavorite(existingNote.favorite || false);
      setLinkedJournalDate(existingNote.linkedJournalDate || '');
      setStatus(existingNote.status || 'saved');
    }
  }, [existingNote]);

  // Sync state with search params (for new note passing inline draft)
  const searchParams = useSearchParams();
  useEffect(() => {
    if (!noteId) {
      const initialTitle = searchParams.get('title');
      const initialContent = searchParams.get('content');
      const initialLinkedDate = searchParams.get('linkedDate');
      if (initialTitle) setTitle(initialTitle);
      if (initialContent) setContentMarkdown(initialContent);
      if (initialLinkedDate) setLinkedJournalDate(initialLinkedDate);
    }
  }, [noteId, searchParams]);

  // Handle Note Auto-save / Manual-save logic

  const performSave = useCallback(async (
    currentTitle: string,
    currentMarkdown: string,
    nbId: string,
    isPinned: boolean,
    isFav: boolean,
    linkedDateVal: string,
    customStatus?: Note['status']
  ) => {
    setSaveStatus('saving');
    try {
      const activeNotebook = notebooks.find(n => n.id === nbId);
      const finalStatus = customStatus || (status === 'archived' ? 'archived' : 'saved');
      const noteData: Partial<Note> = {
        title: currentTitle,
        contentMarkdown: currentMarkdown,
        content: currentMarkdown,
        notebookId: nbId || undefined,
        notebookName: activeNotebook?.name || undefined,
        pinned: isPinned,
        favorite: isFav,
        tags: extractedTags,
        mentions: extractedMentions,
        status: finalStatus,
        wordCount: currentMarkdown.trim() ? currentMarkdown.trim().split(/\s+/).length : 0,
        characterCount: currentMarkdown.length,
        linkedJournalDate: linkedDateVal || undefined,
        linkedJournalEntryId: linkedDateVal || undefined,
        linkedJournalDates: linkedDateVal ? [linkedDateVal] : [],
        linkedJournalEntryIds: linkedDateVal ? [linkedDateVal] : [],
        linkedDate: linkedDateVal || undefined,
        linkedEntryId: linkedDateVal || undefined,
      };

      // Parse callouts from markdown
      const parsedCallouts: { type: string; content: string }[] = [];
      const lines = currentMarkdown.split('\n');
      let inBlockquote = false;
      let currentBlock: string[] = [];

      for (const line of lines) {
        if (line.trim().startsWith('>')) {
          inBlockquote = true;
          currentBlock.push(line.trim().replace(/^>\s?/, ''));
        } else {
          if (inBlockquote) {
            const blockText = currentBlock.join('\n').trim();
            const match = blockText.match(/^\[!(WISDOM|IDEA|LESSON|FACT|EXCERPT|THOUGHT|QUOTE)\]\s*([\s\S]*)$/i);
            if (match) {
              parsedCallouts.push({ type: match[1].toLowerCase(), content: match[2].trim() });
            }
            currentBlock = [];
            inBlockquote = false;
          }
        }
      }
      if (inBlockquote && currentBlock.length > 0) {
        const blockText = currentBlock.join('\n').trim();
        const match = blockText.match(/^\[!(WISDOM|IDEA|LESSON|FACT|EXCERPT|THOUGHT|QUOTE)\]\s*([\s\S]*)$/i);
        if (match) {
          parsedCallouts.push({ type: match[1].toLowerCase(), content: match[2].trim() });
        }
      }

      const parsedWisdoms = calloutsToWisdoms(parsedCallouts);
      const parsedIdeas = parsedCallouts.filter(c => c.type === 'idea');

      let activeNoteId = localNoteId;
      if (localNoteId) {
        // Update existing note
        await updateNote(localNoteId, noteData);
      } else {
        // Create new note
        const newNote = await addNote(
          currentTitle || 'Untitled', 
          currentMarkdown, 
          extractedTags, 
          linkedDateVal || undefined, 
          {
            ...noteData,
            source: 'collection'
          }
        );
        if (newNote) {
          activeNoteId = newNote.id;
          setLocalNoteId(newNote.id);
          // Update URL in Next.js without reloading
          window.history.replaceState(null, '', `/notes/new?id=${newNote.id}`);
        }
      }

      if (activeNoteId) {
        // Sync wisdom items
        const existingLinkedWisdoms = wisdoms.filter(w => w.sourceNoteId === activeNoteId);
        const embeddedWisdomIds: string[] = [];

        for (let i = 0; i < parsedWisdoms.length; i++) {
          const callout = parsedWisdoms[i];
          if (i < existingLinkedWisdoms.length) {
            const existing = existingLinkedWisdoms[i];
            await updateWisdom(existing.id, {
              content: callout.content,
              type: callout.type,
              tags: extractedTags,
              mentions: extractedMentions
            });
            embeddedWisdomIds.push(existing.id);
          } else {
            const newW = await addWisdom(callout.type, callout.content, currentDate);
            if (newW) {
              await updateWisdom(newW.id, {
                source: 'note',
                sourceNoteId: activeNoteId,
                tags: extractedTags,
                mentions: extractedMentions
              });
              embeddedWisdomIds.push(newW.id);
            }
          }
        }

        // Delete leftover wisdoms
        if (existingLinkedWisdoms.length > parsedWisdoms.length) {
          for (let i = parsedWisdoms.length; i < existingLinkedWisdoms.length; i++) {
            await deleteWisdom(existingLinkedWisdoms[i].id);
          }
        }

        // Sync idea items
        const existingLinkedIdeas = ideas.filter(i => i.sourceNoteId === activeNoteId);
        const embeddedIdeaIds: string[] = [];

        for (let i = 0; i < parsedIdeas.length; i++) {
          const callout = parsedIdeas[i];
          if (i < existingLinkedIdeas.length) {
            const existing = existingLinkedIdeas[i];
            await updateIdea(existing.id, {
              content: callout.content,
              tags: extractedTags,
              mentions: extractedMentions
            });
            embeddedIdeaIds.push(existing.id);
          } else {
            const newIdea = await addIdea(callout.content, currentDate);
            if (newIdea) {
              await updateIdea(newIdea.id, {
                source: 'note',
                sourceNoteId: activeNoteId,
                tags: extractedTags,
                mentions: extractedMentions
              });
              embeddedIdeaIds.push(newIdea.id);
            }
          }
        }

        // Delete leftover ideas
        if (existingLinkedIdeas.length > parsedIdeas.length) {
          for (let i = parsedIdeas.length; i < existingLinkedIdeas.length; i++) {
            await deleteIdea(existingLinkedIdeas[i].id);
          }
        }

        // Update note with embedded IDs
        await updateNote(activeNoteId, {
          embeddedWisdomIds,
          embeddedIdeaIds
        });
      }

      setSaveStatus('saved');
      setIsDirty(false);
    } catch (err) {
      console.error('Save Note Error:', err);
      setSaveStatus('error');
    }
  }, [localNoteId, notebooks, addNote, updateNote, addWisdom, updateWisdom, deleteWisdom, addIdea, updateIdea, deleteIdea, currentDate, wisdoms, ideas, extractedTags, extractedMentions]);

  // Back to Collections Handler
  const handleBack = () => {
    if (isDirty) {
      performSave(title, contentMarkdown, selectedNotebookId, pinned, favorite, linkedJournalDate);
    }
    router.push('/notes');
  };

  // Pinned Toggle Handler
  const handlePinToggle = () => {
    const nextPinned = !pinned;
    setPinned(nextPinned);
    performSave(title, contentMarkdown, selectedNotebookId, nextPinned, favorite, linkedJournalDate);
  };

  // Favorite Toggle Handler
  const handleFavoriteToggle = () => {
    const nextFav = !favorite;
    setFavorite(nextFav);
    performSave(title, contentMarkdown, selectedNotebookId, pinned, nextFav, linkedJournalDate);
  };

  // Archive/Unarchive Toggle Handler
  const handleArchiveToggle = async () => {
    const nextStatus = status === 'archived' ? 'saved' : 'archived';
    setStatus(nextStatus);
    performSave(title, contentMarkdown, selectedNotebookId, pinned, favorite, linkedJournalDate, nextStatus);
  };

  // Delete Note Handler
  const handleDeleteNote = async () => {
    if (!localNoteId) {
      router.push('/notes');
      return;
    }
    setShowDeleteConfirm(true);
  };

  const executeDeleteNote = async () => {
    if (localNoteId) {
      await deleteNote(localNoteId);
      router.push('/notes');
    }
  };

  // Export to Markdown file
  const handleExportMarkdown = () => {
    const fileTitle = (title || 'untitled').toLowerCase().replace(/\s+/g, '-');
    const today = format(new Date(), 'yyyy-MM-dd');
    const blob = new Blob([contentMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileTitle}-${today}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export to PDF
  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0F1210] pb-24 relative select-none">
      {/* Print-only layout container */}
      <div className="hidden print:block print-container p-12 font-sans print-theme-light bg-white text-black">
        <h1 className="text-4xl font-bold mb-4 text-black">{title || 'Untitled'}</h1>
        <div className="text-xs mb-6 flex gap-4 text-gray-500">
          {selectedNotebookId && (
            <span>Notebook: {notebooks.find(n => n.id === selectedNotebookId)?.name || 'Uncategorized'}</span>
          )}
          <span>Date: {(() => {
            if (linkedJournalDate) {
              const [year, month, day] = linkedJournalDate.split('-').map(Number);
              const d = new Date(year, month - 1, day);
              return format(d, 'MMMM d, yyyy');
            }
            const dateObj = existingNote?.createdAt || new Date();
            return format(dateObj instanceof Date ? dateObj : new Date(dateObj), 'MMMM d, yyyy');
          })()}</span>
        </div>
        <div className="prose max-w-none">
          <MarkdownRenderer content={contentMarkdown} />
        </div>
      </div>

      {/* Screen layout */}
      <div className="mx-auto max-w-[640px] md:max-w-[850px] lg:max-w-[1100px] xl:max-w-[1280px] 2xl:max-w-[1440px] px-6 pt-6 print:hidden">
        {/* Editor Top Bar */}
        <div className="flex items-center justify-between gap-4 border-b border-[#EEF0EF] dark:border-[#2E3832]/30 pb-4 mb-6">
          <button
            onClick={handleBack}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 dark:bg-[#161B19]/50 text-[#6F7476] dark:text-[#A3A7A8] border border-[#CCD0CF]/50 dark:border-[#2E3832]/60 hover:bg-[#F2F2F3] transition-colors"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
          </button>

          {/* Save Status / Sync Indicators */}
          <div className="flex items-center gap-2 text-xs">
            {saveStatus === 'saving' && (
              <div className="flex items-center gap-1.5 select-none">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span className="font-medium text-[11px] text-[#A3A7A8]">Saving...</span>
              </div>
            )}
            {saveStatus === 'saved' && (
              isDirty ? (
                <div className="flex items-center gap-1.5 select-none">
                  <span className="relative flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  <span className="font-medium text-[11px] text-amber-500 dark:text-amber-400">Unsaved Changes</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 select-none">
                  <span className="relative flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="font-medium text-[11px] text-[#A3A7A8]">Saved</span>
                </div>
              )
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center gap-1.5 select-none">
                <span className="relative flex h-2 w-2">
                  <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="font-medium text-[11px] text-red-500">Offline / Saving issue</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Save Button */}
            <button
              onClick={() => performSave(title, contentMarkdown, selectedNotebookId, pinned, favorite, linkedJournalDate)}
              disabled={!isDirty || saveStatus === 'saving'}
              className={`inline-flex h-9 items-center justify-center rounded-xl px-4 text-xs font-bold transition-all gap-1.5 ${
                isDirty && saveStatus !== 'saving'
                  ? 'bg-[#00DC7D] hover:bg-[#00B866] text-white shadow-md active:scale-95'
                  : 'bg-gray-100 dark:bg-[#161B19]/30 text-gray-400 dark:text-gray-600 cursor-not-allowed border border-[#CCD0CF]/30 dark:border-[#2E3832]/30'
              }`}
              title="Save changes manually"
            >
              <span>Save</span>
            </button>

            <button
              onClick={handlePinToggle}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition-all ${
                pinned
                  ? 'bg-[#E9FFF4] border-[#00DC7D]/30 text-[#00A963]'
                  : 'bg-white dark:bg-[#161B19]/30 border-[#CCD0CF]/50 dark:border-[#2E3832]/60 text-[#A3A7A8] hover:bg-gray-50'
              }`}
              title="Pin Note"
            >
              <FontAwesomeIcon icon={faThumbtack} className={`w-3.5 h-3.5 ${pinned ? 'rotate-45' : ''}`} />
            </button>
            <button
              onClick={handleFavoriteToggle}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition-all ${
                favorite
                  ? 'bg-[#FFF8ED] border-[#FF9933]/30 text-[#FF9933]'
                  : 'bg-white dark:bg-[#161B19]/30 border-[#CCD0CF]/50 dark:border-[#2E3832]/60 text-[#A3A7A8] hover:bg-gray-50'
              }`}
              title="Favorite Note"
            >
              <FontAwesomeIcon icon={faStar} className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Metadata row */}
        <div className="grid gap-3.5 p-4 bg-[#FAFAFA] dark:bg-[#161B19]/30 border border-[#EEF0EF] dark:border-[#2E3832]/60 rounded-2xl mb-6 text-sm">
          {/* Notebook Selector */}
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 font-bold text-[#6F7476] dark:text-[#A3A7A8] text-xs uppercase tracking-wider">
              <FontAwesomeIcon icon={faBookBookmark} className="h-3.5 w-3.5 text-[#A3A7A8]" />
              Notebook
            </span>
            <select
              value={selectedNotebookId}
              onChange={(e) => {
                setSelectedNotebookId(e.target.value);
                setIsDirty(true);
              }}
              className="rounded-lg border border-[#CCD0CF] dark:border-[#2E3832] bg-white dark:bg-[#111412] px-2.5 py-1 text-xs text-[#2F3331] dark:text-[#E4E7E6] font-bold focus:outline-none focus:border-[#00DC7D]"
            >
              <option value="">Uncategorized</option>
              {allNotebooks.map(nb => (
                <option key={nb.id} value={nb.id}>{nb.name}</option>
              ))}
            </select>
          </div>

          {/* Linked Journal Date Selector */}
          <div className="flex items-center justify-between gap-4 border-t border-[#EEF0EF] dark:border-[#2E3832]/20 pt-2.5">
            <span className="flex items-center gap-1.5 font-bold text-[#6F7476] dark:text-[#A3A7A8] text-xs uppercase tracking-wider">
              <FontAwesomeIcon icon={faCalendarAlt} className="h-3.5 w-3.5 text-[#A3A7A8]" />
              Journal Date
            </span>
            <div className="flex items-center gap-2">
              {linkedJournalDate ? (
                <>
                  <span className="text-xs font-bold text-[#00A963] bg-[#E9FFF4] px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                    {(() => {
                      const [year, month, day] = linkedJournalDate.split('-').map(Number);
                      const d = new Date(year, month - 1, day);
                      return format(d, 'MMM d, yyyy');
                    })()}
                  </span>
                  <button
                    onClick={() => {
                      setLinkedJournalDate('');
                      setIsDirty(true);
                    }}
                    className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors bg-red-50 dark:bg-red-950/20 hover:bg-red-100 p-1.5 rounded-lg border border-red-200/20 cursor-pointer"
                    title="Unlink date"
                  >
                    <FontAwesomeIcon icon={faXmark} className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Not Linked</span>
                  <input
                    type="date"
                    value={linkedJournalDate}
                    onChange={(e) => {
                      if (e.target.value) {
                        setLinkedJournalDate(e.target.value);
                        setIsDirty(true);
                      }
                    }}
                    className="rounded-lg border border-[#CCD0CF] dark:border-[#2E3832] bg-white dark:bg-[#111412] px-2.5 py-1 text-xs text-[#2F3331] dark:text-[#E4E7E6] font-bold focus:outline-none focus:border-[#00DC7D]"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Auto-extracted tags */}
          {extractedTags.length > 0 && (
            <div className="flex items-start justify-between gap-4 border-t border-[#EEF0EF] dark:border-[#2E3832]/20 pt-2.5">
              <span className="flex items-center gap-1.5 font-bold text-[#6F7476] dark:text-[#A3A7A8] text-xs uppercase tracking-wider mt-0.5">
                <FontAwesomeIcon icon={faTag} className="h-3.5 w-3.5 text-[#A3A7A8]" />
                Tags (Auto)
              </span>
              <div className="flex flex-wrap gap-1 justify-end max-w-[70%]">
                {extractedTags.map(tag => (
                  <span key={tag} className="text-[10px] bg-[#EAD8FF] text-[#7A2EB8] px-2 py-0.5 rounded-full font-semibold">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Auto-extracted mentions */}
          {extractedMentions.length > 0 && (
            <div className="flex items-start justify-between gap-4 border-t border-[#EEF0EF] dark:border-[#2E3832]/20 pt-2.5">
              <span className="flex items-center gap-1.5 font-bold text-[#6F7476] dark:text-[#A3A7A8] text-xs uppercase tracking-wider mt-0.5">
                <FontAwesomeIcon icon={faAt} className="h-3.5 w-3.5 text-[#A3A7A8]" />
                Mentions (Auto)
              </span>
              <div className="flex flex-wrap gap-1 justify-end max-w-[70%]">
                {extractedMentions.map(person => (
                  <span key={person} className="text-[10px] bg-[#FFEEAA] text-[#8A5A00] px-2 py-0.5 rounded-full font-semibold">
                    @{person}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Toolbar: Edit/Preview toggle + export options */}
        <div className="flex items-center justify-between gap-4 border-b border-[#EEF0EF] dark:border-[#2E3832]/20 pb-3 mb-6 text-sm">
          {/* Edit / Preview tab */}
          <div className="flex items-center gap-1 p-0.5 bg-gray-50 dark:bg-[#161B19]/50 rounded-lg">
            <button
              onClick={() => setEditMode(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                editMode
                  ? 'bg-white dark:bg-[#111412] text-[#2F3331] dark:text-[#E4E7E6] shadow-sm'
                  : 'text-[#6F7476] dark:text-[#A3A7A8] hover:text-[#2F3331]'
              }`}
            >
              <FontAwesomeIcon icon={faPen} className="w-3 h-3" />
              Write
            </button>
            <button
              onClick={() => setEditMode(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                !editMode
                  ? 'bg-white dark:bg-[#111412] text-[#2F3331] dark:text-[#E4E7E6] shadow-sm'
                  : 'text-[#6F7476] dark:text-[#A3A7A8] hover:text-[#2F3331]'
              }`}
            >
              <FontAwesomeIcon icon={faEye} className="w-3 h-3" />
              Preview
            </button>
          </div>

          {/* Export & Delete buttons */}
          <div className="flex items-center gap-2">
            {/* Cosmic AI Actions Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowAIMenu(!showAIMenu)}
                disabled={isAIRefining || !contentMarkdown.trim()}
                className="inline-flex h-8 px-3 items-center gap-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-[#8B00D4] via-[#6F42C1] to-[#00DC7D] shadow-[0_0_12px_rgba(139,0,212,0.25)] hover:shadow-[0_0_18px_rgba(139,0,212,0.45)] hover:scale-103 active:scale-97 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                title="Cosmic AI Assistant"
              >
                {isAIRefining ? (
                  <div className="relative flex h-3.5 w-3.5 items-center justify-center shrink-0">
                    <span className="absolute h-full w-full rounded-full border border-white/20" />
                    <span className="absolute h-full w-full animate-spin rounded-full border border-t-white border-r-transparent border-b-transparent border-l-transparent" />
                    <span className="h-1 w-1 animate-ping rounded-full bg-[#00DC7D] opacity-75" />
                  </div>
                ) : (
                  <FontAwesomeIcon icon={faMeteor} className="w-3.5 h-3.5" />
                )}
                <span>Cosmic AI</span>
                <FontAwesomeIcon icon={showAIMenu ? faChevronUp : faChevronDown} className="w-2.5 h-2.5" />
              </button>

              {showAIMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowAIMenu(false)} />
                  <div className="absolute right-0 mt-2 z-50 w-64 rounded-2xl border border-[#EEF0EF] dark:border-[#2E3133] bg-white/95 dark:bg-[#1E2022]/95 backdrop-blur-md p-2.5 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="text-[9px] font-black text-[#A3A7A8] uppercase tracking-wider px-2 py-1 mb-1 font-mono border-b border-[#EEF0EF]/40 dark:border-[#2E3133]/40">
                      Cosmic AI Actions
                    </div>
                    
                    <button
                      onClick={() => handleAIRefine('beautify')}
                      className="w-full flex items-start gap-2.5 p-2 rounded-xl text-left hover:bg-gray-50 dark:hover:bg-neutral-800/40 transition-colors text-xs font-semibold text-[#2F3331] dark:text-[#FAFAFA] cursor-pointer"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#E9FFF4] dark:bg-[#00DC7D]/10 text-[#00A963] dark:text-[#00DC7D] shrink-0 mt-0.5">
                        <FontAwesomeIcon icon={faPen} className="w-3 h-3" />
                      </span>
                      <div>
                        <span className="block font-bold">Beautify & Format</span>
                        <span className="block text-[9.5px] text-[#A3A7A8] font-light mt-0.5">Auto-format markdown & extract quotes</span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleAIRefine('summarize')}
                      className="w-full flex items-start gap-2.5 p-2 rounded-xl text-left hover:bg-gray-50 dark:hover:bg-neutral-800/40 transition-colors text-xs font-semibold text-[#2F3331] dark:text-[#FAFAFA] mt-1 cursor-pointer"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#E6F0FF] dark:bg-[#5D8AFF]/10 text-[#5D8AFF] shrink-0 mt-0.5">
                        <FontAwesomeIcon icon={faListCheck} className="w-3 h-3" />
                      </span>
                      <div>
                        <span className="block font-bold">Summarize & Tasks</span>
                        <span className="block text-[9.5px] text-[#A3A7A8] font-light mt-0.5">Add summary & extract inbox tasks</span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleAIRefine('wisdom')}
                      className="w-full flex items-start gap-2.5 p-2 rounded-xl text-left hover:bg-gray-50 dark:hover:bg-neutral-800/40 transition-colors text-xs font-semibold text-[#2F3331] dark:text-[#FAFAFA] mt-1 cursor-pointer"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F2EFFE] dark:bg-[#C494FF]/10 text-[#8B00D4] dark:text-[#C494FF] shrink-0 mt-0.5">
                        <FontAwesomeIcon icon={faBrain} className="w-3.5 h-3.5" />
                      </span>
                      <div>
                        <span className="block font-bold">Extract Wisdom</span>
                        <span className="block text-[9.5px] text-[#A3A7A8] font-light mt-0.5">Scan and append lessons & ideas</span>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handleExportMarkdown}
              className="inline-flex h-8 px-2.5 items-center gap-1.5 rounded-lg border border-[#CCD0CF]/60 dark:border-[#2E3832]/60 text-xs font-bold text-[#6F7476] dark:text-[#A3A7A8] hover:bg-gray-50 hover:text-black transition-all"
              title="Export to Markdown"
            >
              <FontAwesomeIcon icon={faDownload} className="w-3 h-3" />
              .MD
            </button>
            <button
              onClick={handleExportPDF}
              className="inline-flex h-8 px-2.5 items-center gap-1.5 rounded-lg border border-[#CCD0CF]/60 dark:border-[#2E3832]/60 text-xs font-bold text-[#6F7476] dark:text-[#A3A7A8] hover:bg-gray-50 hover:text-black transition-all ml-1"
              title="Export to PDF"
            >
              <FontAwesomeIcon icon={faFilePdf} className="w-3 h-3" />
              <span>PDF</span>
            </button>
            <button
              onClick={handleArchiveToggle}
              className={`inline-flex h-8 px-2.5 items-center gap-1.5 rounded-lg border transition-all ml-1 ${
                status === 'archived'
                  ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100'
                  : 'border-[#CCD0CF]/60 dark:border-[#2E3832]/60 text-[#6F7476] dark:text-[#A3A7A8] hover:bg-gray-50 hover:text-black'
              }`}
              title={status === 'archived' ? 'Unarchive Note' : 'Archive Note'}
            >
              <FontAwesomeIcon icon={faArchive} className="w-3.5 h-3.5" />
              <span>{status === 'archived' ? 'Unarchive' : 'Archive'}</span>
            </button>
            <button
              onClick={handleDeleteNote}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#CCD0CF]/60 dark:border-[#2E3832]/60 text-red-500 hover:bg-red-50 hover:border-red-200 transition-all ml-1"
              title="Delete Note"
            >
              <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Note Editor Workspace */}
        <div className="min-h-[45vh] flex flex-col relative">
          {isAIRefining && (
            <div className="absolute inset-0 bg-white/70 dark:bg-[#0F1210]/75 backdrop-blur-[2px] z-30 flex flex-col items-center justify-center gap-3 animate-in fade-in duration-200 rounded-2xl">
              <div className="relative flex h-16 w-16 items-center justify-center mb-1">
                <span className="absolute h-full w-full rounded-full border-2 border-[#00DC7D]/10" />
                <span className="absolute h-full w-full animate-spin rounded-full border-2 border-t-[#00DC7D] border-r-transparent border-b-transparent border-l-transparent" />
                <div className="absolute h-3 w-3 animate-ping rounded-full bg-[#00DC7D] opacity-75" />
                <FontAwesomeIcon icon={faMeteor} className="text-[#8B00D4] dark:text-[#C494FF] h-5 w-5 relative z-10 animate-pulse" />
              </div>
              <span className="text-xs font-bold bg-gradient-to-r from-[#8B00D4] to-[#00DC7D] bg-clip-text text-transparent uppercase tracking-wider animate-pulse font-mono">
                {aiRefineStatus}
              </span>
            </div>
          )}
          {editMode ? (
            <div className="flex-1 flex flex-col gap-4">
              {/* Title input */}
              <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setIsDirty(true);
                }}
                className="w-full bg-transparent text-3xl font-bold font-serif text-[#2F3331] dark:text-[#E4E7E6] placeholder-[#CCD0CF] focus:outline-none focus:ring-0 leading-snug border-none p-0"
              />

              {/* Formatting Helper Toolbar */}
              <div className="flex items-center gap-1.5 pb-2 border-b border-[#EEF0EF]/40 dark:border-[#2E3832]/20 overflow-x-auto scrollbar-none py-1 select-none">
                <button
                  type="button"
                  onClick={() => applyFormatting('bold')}
                  className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-[#161B19]/50 text-[#6F7476] dark:text-[#A3A7A8] hover:text-[#2F3331] dark:hover:text-[#E4E7E6] transition-colors cursor-pointer"
                  title="Bold (Cmd+B)"
                >
                  <FontAwesomeIcon icon={faBold} className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormatting('italic')}
                  className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-[#161B19]/50 text-[#6F7476] dark:text-[#A3A7A8] hover:text-[#2F3331] dark:hover:text-[#E4E7E6] transition-colors cursor-pointer"
                  title="Italic (Cmd+I)"
                >
                  <FontAwesomeIcon icon={faItalic} className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormatting('heading')}
                  className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-[#161B19]/50 text-[#6F7476] dark:text-[#A3A7A8] hover:text-[#2F3331] dark:hover:text-[#E4E7E6] transition-colors cursor-pointer"
                  title="Heading"
                >
                  <FontAwesomeIcon icon={faHeading} className="w-3.5 h-3.5" />
                </button>
                <div className="h-4 w-[1px] bg-[#EEF0EF] dark:bg-[#2E3832]/40 mx-1" />
                <button
                  type="button"
                  onClick={() => applyFormatting('bullet')}
                  className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-[#161B19]/50 text-[#6F7476] dark:text-[#A3A7A8] hover:text-[#2F3331] dark:hover:text-[#E4E7E6] transition-colors cursor-pointer"
                  title="Bullet List"
                >
                  <FontAwesomeIcon icon={faListUl} className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormatting('todo')}
                  className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-[#161B19]/50 text-[#6F7476] dark:text-[#A3A7A8] hover:text-[#2F3331] dark:hover:text-[#E4E7E6] transition-colors cursor-pointer"
                  title="Checklist"
                >
                  <FontAwesomeIcon icon={faListCheck} className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormatting('code')}
                  className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-[#161B19]/50 text-[#6F7476] dark:text-[#A3A7A8] hover:text-[#2F3331] dark:hover:text-[#E4E7E6] transition-colors cursor-pointer"
                  title="Inline Code"
                >
                  <FontAwesomeIcon icon={faCode} className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Textarea Markdown */}
              <textarea
                ref={textareaRef}
                placeholder="Write your note in Markdown. Type '/' for format commands..."
                value={contentMarkdown}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                rows={18}
                className="w-full bg-transparent text-base font-normal leading-relaxed text-[#2F3331] dark:text-[#E4E7E6] placeholder-[#A3A7A8] focus:outline-none focus:ring-0 resize-none border-none p-0 mt-2 flex-1 font-mono"
              />
            </div>
          ) : (
            <div className="flex-1 bg-transparent py-2 border-none">
              {title && (
                <h1 className="text-3xl font-bold font-serif text-[#2F3331] dark:text-[#E4E7E6] mb-5 leading-snug">
                  {title}
                </h1>
              )}
              {contentMarkdown.trim() ? (
                <MarkdownRenderer 
                  content={contentMarkdown} 
                  onContentChange={(newContent) => {
                    setContentMarkdown(newContent);
                    setIsDirty(true);
                    performSave(title, newContent, selectedNotebookId, pinned, favorite, linkedJournalDate);
                  }}
                />
              ) : (
                <p className="text-sm italic text-[#A3A7A8]">No content yet. Toggle write mode to start typing.</p>
              )}
            </div>
          )}

          {showSlashMenu && (
            <SlashCommandMenu
              triggerQuery={slashQuery}
              onSelect={handleSlashSelect}
              onClose={() => setShowSlashMenu(false)}
            />
          )}

          {aiPreview && (
            <AIPreviewModal
              isOpen={aiPreview.isOpen}
              onClose={() => setAiPreview(null)}
              onConfirm={handleApplyAIRefine}
              originalText={aiPreview.originalText}
              refinedText={aiPreview.refinedText}
              action={aiPreview.action}
            />
          )}
        </div>

        {/* Footer info: Counts */}
        <div className="mt-8 border-t border-[#EEF0EF] dark:border-[#2E3832]/10 pt-3 flex items-center justify-between text-[11px] font-bold uppercase text-[#A3A7A8] tracking-wider select-none">
          <span>
            {wordCount} words
          </span>
          <span>
            {charCount} characters
          </span>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={executeDeleteNote}
        title="Delete Note"
        message="Are you sure you want to delete this note? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
      />
    </div>
  );
}

function calloutsToWisdoms(callouts: { type: string; content: string }[]): { type: any; content: string }[] {
  return callouts
    .filter(c => c.type !== 'idea')
    .map(c => {
      let wType: any = 'thought';
      const typeLower = c.type.toLowerCase();
      if (typeLower === 'wisdom' || typeLower === 'thought') wType = 'thought';
      else if (typeLower === 'lesson') wType = 'lesson';
      else if (typeLower === 'fact') wType = 'fact';
      else if (typeLower === 'excerpt') wType = 'excerpt';
      else if (typeLower === 'quote') wType = 'quote';
      return { type: wType, content: c.content };
    });
}
