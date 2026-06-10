'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Note, Notebook } from '@/types';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import NoteCard from './NoteCard';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faMagnifyingGlass,
  faBookBookmark,
  faTags,
  faSort,
  faThumbtack,
  faStar,
  faArchive,
  faLink,
  faFolderPlus,
  faXmark,
  faCheck,
  faBookOpen,
  faPen,
  faCheckCircle
} from '@fortawesome/free-solid-svg-icons';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export default function NoteDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { 
    notes, 
    notebooks, 
    addNotebook, 
    updateNotebook, 
    deleteNotebook,
    addNote
  } = useData();

  // Filters & State
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null); // null = "All"
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pinned' | 'favorites' | 'archived' | 'linked'>('all');
  const [sortOption, setSortOption] = useState<'updated' | 'created' | 'title_az' | 'title_za' | 'pinned_first' | 'favorites_first'>('updated');

  // Notebook Manager Modal State
  const [showNotebookModal, setShowNotebookModal] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [newNotebookDesc, setNewNotebookDesc] = useState('');
  const [newNotebookColor, setNewNotebookColor] = useState('#00DC7D');
  const [editingNotebookId, setEditingNotebookId] = useState<string | null>(null);
  const [notebookToDelete, setNotebookToDelete] = useState<string | null>(null);
  const [showSavedToast, setShowSavedToast] = useState(false);

  // Helper to count notes per notebook
  const getNoteCount = (nbId: string | null) => {
    if (nbId === 'uncategorized') {
      return notes.filter(n => !n.notebookId && n.status !== 'archived' && n.status !== 'deleted').length;
    }
    if (nbId === null) {
      return notes.filter(n => n.status !== 'archived' && n.status !== 'deleted').length;
    }
    return notes.filter(n => n.notebookId === nbId && n.status !== 'archived' && n.status !== 'deleted').length;
  };

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

  // Extract all unique tags across notes
  const availableTags = useMemo(() => {
    const tagsSet = new Set<string>();
    notes.forEach(note => {
      if (note.tags) {
        note.tags.forEach(tag => tagsSet.add(tag.toLowerCase()));
      }
    });
    return Array.from(tagsSet);
  }, [notes]);

  // Filter & Sort notes
  const filteredAndSortedNotes = useMemo(() => {
    let result = [...notes];

    // Status filter
    if (activeFilter === 'archived') {
      result = result.filter(n => n.status === 'archived');
    } else {
      // Don't show deleted or archived by default
      result = result.filter(n => n.status !== 'archived' && n.status !== 'deleted');
    }

    // Pinned filter
    if (activeFilter === 'pinned') {
      result = result.filter(n => n.pinned);
    }

    // Favorites filter
    if (activeFilter === 'favorites') {
      result = result.filter(n => n.favorite);
    }

    // Linked to journal filter
    if (activeFilter === 'linked') {
      result = result.filter(n => n.linkedJournalDate);
    }

    // Notebook filter
    if (selectedNotebookId === 'uncategorized') {
      result = result.filter(n => !n.notebookId);
    } else if (selectedNotebookId !== null) {
      result = result.filter(n => n.notebookId === selectedNotebookId);
    }

    // Tag filter
    if (selectedTag !== null) {
      result = result.filter(n => n.tags && n.tags.some(t => t.toLowerCase() === selectedTag.toLowerCase()));
    }

    // Search query filter
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter(n => 
        (n.title && n.title.toLowerCase().includes(query)) ||
        (n.content && n.content.toLowerCase().includes(query)) ||
        (n.contentMarkdown && n.contentMarkdown.toLowerCase().includes(query)) ||
        (n.tags && n.tags.some(t => t.toLowerCase().includes(query))) ||
        (n.mentions && n.mentions.some(m => m.toLowerCase().includes(query)))
      );
    }

    // Sorting
    result.sort((a, b) => {
      const getRawDate = (date: any) => date instanceof Date ? date.getTime() : new Date(date).getTime();

      switch (sortOption) {
        case 'created':
          return getRawDate(b.createdAt) - getRawDate(a.createdAt);
        case 'title_az':
          return (a.title || '').localeCompare(b.title || '');
        case 'title_za':
          return (b.title || '').localeCompare(a.title || '');
        case 'pinned_first':
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return getRawDate(b.updatedAt) - getRawDate(a.updatedAt);
        case 'favorites_first':
          if (a.favorite && !b.favorite) return -1;
          if (!a.favorite && b.favorite) return 1;
          return getRawDate(b.updatedAt) - getRawDate(a.updatedAt);
        case 'updated':
        default:
          return getRawDate(b.updatedAt) - getRawDate(a.updatedAt);
      }
    });

    return result;
  }, [notes, selectedNotebookId, selectedTag, searchQuery, activeFilter, sortOption]);

  const handleCreateNotebook = async () => {
    const name = newNotebookName.trim();
    if (!name) return;
    if (editingNotebookId) {
      await updateNotebook(editingNotebookId, { 
        name, 
        description: newNotebookDesc, 
        color: newNotebookColor 
      });
      setEditingNotebookId(null);
    } else {
      await addNotebook(name, newNotebookDesc, newNotebookColor);
      setShowNotebookModal(false);
    }
    setNewNotebookName('');
    setNewNotebookDesc('');
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  const handleEditNotebook = (nb: Notebook) => {
    setEditingNotebookId(nb.id);
    setNewNotebookName(nb.name);
    setNewNotebookDesc(nb.description || '');
    setNewNotebookColor(nb.color || '#00DC7D');
    setShowNotebookModal(true);
  };

  const handleDeleteNotebook = (id: string) => {
    setNotebookToDelete(id);
  };

  const executeDeleteNotebook = async () => {
    if (notebookToDelete) {
      await deleteNotebook(notebookToDelete);
      if (selectedNotebookId === notebookToDelete) {
        setSelectedNotebookId(null);
      }
      setNotebookToDelete(null);
    }
  };

  const handleNewNoteClick = async () => {
    // Navigate directly to the new note screen
    router.push('/notes/new');
  };

  return (
    <div className="space-y-6">
      {/* Header section with Create note CTA */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-5xl font-bold font-sans text-[#2F3331] dark:text-[#E4E7E6]">Notes</h2>
          <p className="text-sm font-light text-[#6F7476] dark:text-[#A3A7A8] mt-1">Markdown editor, organization vault, themed exports</p>
        </div>
        <button
          onClick={handleNewNoteClick}
          className="flex h-11 px-4 items-center gap-2 rounded-full bg-[#00DC7D] text-white hover:bg-[#00B866] shadow-sm font-semibold transition-all active:scale-95 duration-200 shrink-0 text-sm"
        >
          <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
          <span>New Note</span>
        </button>
      </div>

      {/* 1. Swipeable Notebook Row */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase text-[#A3A7A8] tracking-wider flex items-center gap-1.5">
            <FontAwesomeIcon icon={faBookBookmark} className="h-3.5 w-3.5" />
            Notebooks
          </span>
          <button
            onClick={() => {
              setEditingNotebookId(null);
              setNewNotebookName('');
              setNewNotebookDesc('');
              setNewNotebookColor('#00DC7D');
              setShowNotebookModal(true);
            }}
            className="text-xs font-bold text-[#00DC7D] hover:text-[#00B866] transition-colors flex items-center gap-1"
          >
            <FontAwesomeIcon icon={faFolderPlus} className="h-3.5 w-3.5" />
            Manage
          </button>
        </div>

        <div className="flex items-center gap-4 overflow-x-auto py-3 pb-5 scrollbar-none -mx-6 px-6 select-none">
          {/* All Notes Book */}
          <button
            onClick={() => setSelectedNotebookId(null)}
            className={`relative w-24 h-32 rounded-r-lg shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between p-2.5 overflow-hidden group border border-black/10 shrink-0 select-none ${
              selectedNotebookId === null
                ? '-translate-y-1.5 ring-2 ring-[#00DC7D] shadow-lg shadow-[#00DC7D]/10 dark:shadow-[#00DC7D]/5'
                : 'opacity-85 hover:opacity-100 hover:-translate-y-0.5'
            }`}
            style={{
              backgroundColor: '#2F3331',
            }}
          >
            {/* Book spine overlay */}
            <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-black/15 dark:bg-black/35 rounded-r-[1px]" />
            {/* Book spine line indentation */}
            <div className="absolute left-3 top-0 bottom-0 w-[1px] bg-white/10 dark:bg-black/10" />

            {/* Bookmark ribbon */}
            {selectedNotebookId === null && (
              <div className="absolute right-3 top-0 w-2 h-5 bg-[#FF453A] rounded-b-sm shadow-sm transition-transform duration-300 animate-in slide-in-from-top-1" />
            )}

            {/* Book cover badge/label */}
            <div className="bg-white/95 dark:bg-[#1A1D1B]/95 backdrop-blur-[1px] rounded p-1 w-full text-center mt-1.5 border border-black/5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
              <span className="text-[10px] font-extrabold text-[#2F3331] dark:text-[#E4E7E6] tracking-tight block truncate uppercase font-sans">
                All Notes
              </span>
            </div>

            {/* Book notes count */}
            <div className="mt-auto text-left pl-3 text-[9px] text-white/90 dark:text-white/80 font-bold uppercase tracking-wider drop-shadow-sm select-none font-mono">
              <span>{getNoteCount(null)} {getNoteCount(null) === 1 ? 'note' : 'notes'}</span>
            </div>
          </button>

          {/* Uncategorized Book */}
          <button
            onClick={() => setSelectedNotebookId('uncategorized')}
            className={`relative w-24 h-32 rounded-r-lg shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between p-2.5 overflow-hidden group border border-black/10 shrink-0 select-none ${
              selectedNotebookId === 'uncategorized'
                ? '-translate-y-1.5 ring-2 ring-[#00DC7D] shadow-lg shadow-[#00DC7D]/10 dark:shadow-[#00DC7D]/5'
                : 'opacity-85 hover:opacity-100 hover:-translate-y-0.5'
            }`}
            style={{
              backgroundColor: '#6F7476',
            }}
          >
            {/* Book spine overlay */}
            <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-black/15 dark:bg-black/35 rounded-r-[1px]" />
            {/* Book spine line indentation */}
            <div className="absolute left-3 top-0 bottom-0 w-[1px] bg-white/10 dark:bg-black/10" />

            {/* Bookmark ribbon */}
            {selectedNotebookId === 'uncategorized' && (
              <div className="absolute right-3 top-0 w-2 h-5 bg-[#FF453A] rounded-b-sm shadow-sm transition-transform duration-300 animate-in slide-in-from-top-1" />
            )}

            {/* Book cover badge/label */}
            <div className="bg-white/95 dark:bg-[#1A1D1B]/95 backdrop-blur-[1px] rounded p-1 w-full text-center mt-1.5 border border-black/5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
              <span className="text-[10px] font-extrabold text-[#2F3331] dark:text-[#E4E7E6] tracking-tight block truncate uppercase font-sans">
                Uncategorized
              </span>
            </div>

            {/* Book notes count */}
            <div className="mt-auto text-left pl-3 text-[9px] text-white/90 dark:text-white/80 font-bold uppercase tracking-wider drop-shadow-sm select-none font-mono">
              <span>{getNoteCount('uncategorized')} {getNoteCount('uncategorized') === 1 ? 'note' : 'notes'}</span>
            </div>
          </button>

          {/* User Custom Books */}
          {allNotebooks.map(nb => {
            const isSelected = selectedNotebookId === nb.id;
            const count = getNoteCount(nb.id);
            return (
              <button
                key={nb.id}
                onClick={() => setSelectedNotebookId(nb.id)}
                className={`relative w-24 h-32 rounded-r-lg shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between p-2.5 overflow-hidden group border border-black/10 shrink-0 select-none ${
                  isSelected
                    ? '-translate-y-1.5 ring-2 ring-[#00DC7D] shadow-lg shadow-[#00DC7D]/10 dark:shadow-[#00DC7D]/5'
                    : 'opacity-85 hover:opacity-100 hover:-translate-y-0.5'
                }`}
                style={{
                  backgroundColor: nb.color || '#00DC7D',
                }}
              >
                {/* Book spine overlay */}
                <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-black/15 dark:bg-black/35 rounded-r-[1px]" />
                {/* Book spine line indentation */}
                <div className="absolute left-3 top-0 bottom-0 w-[1px] bg-white/10 dark:bg-black/10" />

                {/* Bookmark ribbon */}
                {isSelected && (
                  <div className="absolute right-3 top-0 w-2 h-5 bg-[#FF453A] rounded-b-sm shadow-sm transition-transform duration-300 animate-in slide-in-from-top-1" />
                )}

                {/* Book cover badge/label */}
                <div className="bg-white/95 dark:bg-[#1A1D1B]/95 backdrop-blur-[1px] rounded p-1 w-full text-center mt-1.5 border border-black/5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                  <span className="text-[10px] font-extrabold text-[#2F3331] dark:text-[#E4E7E6] tracking-tight block truncate uppercase font-sans">
                    {nb.name}
                  </span>
                </div>

                {/* Book notes count */}
                <div className="mt-auto text-left pl-3 text-[9px] text-white/90 dark:text-white/80 font-bold uppercase tracking-wider drop-shadow-sm select-none font-mono">
                  <span>{count} {count === 1 ? 'note' : 'notes'}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Tags Filter Row */}
      {availableTags.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase text-[#A3A7A8] tracking-wider flex items-center gap-1.5">
            <FontAwesomeIcon icon={faTags} className="h-3.5 w-3.5" />
            Filter by Tags
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-6 px-6">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 border ${
                selectedTag === null
                  ? 'bg-[#EAD8FF] border-transparent text-[#7A2EB8] font-bold'
                  : 'bg-white dark:bg-[#161B19]/30 border-[#CCD0CF]/40 dark:border-[#2E3832]/60 text-[#6F7476] dark:text-[#A3A7A8]'
              }`}
            >
              All Tags
            </button>
            {availableTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 border ${
                  selectedTag === tag
                    ? 'bg-[#EAD8FF] border-transparent text-[#7A2EB8] font-extrabold'
                    : 'bg-white dark:bg-[#161B19]/30 border-[#CCD0CF]/40 dark:border-[#2E3832]/60 text-[#6F7476] dark:text-[#A3A7A8] hover:border-[#C494FF]/40'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Search Bar */}
      <div className="relative w-full">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search notes, markdown content, tags, mentions..."
          className="w-full rounded-xl border border-[#CCD0CF] dark:border-[#2E3832] bg-white dark:bg-[#111412]/50 pl-10 pr-4 py-3 text-sm text-[#2F3331] dark:text-[#E4E7E6] placeholder-[#A3A7A8] focus:border-[#00DC7D] focus:outline-none focus:ring-1 focus:ring-[#00DC7D]/30 transition-all duration-200"
        />
        <FontAwesomeIcon
          icon={faMagnifyingGlass}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3A7A8]"
        />
      </div>

      {/* 4 & 5. Filter Chips & Sort Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full border-b border-[#EEF0EF] dark:border-[#2E3832]/30 pb-4">
        {/* Filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {([
            { id: 'all', label: 'All', icon: faBookOpen },
            { id: 'pinned', label: 'Pinned', icon: faThumbtack },
            { id: 'favorites', label: 'Favorites', icon: faStar },
            { id: 'linked', label: 'Linked', icon: faLink },
            { id: 'archived', label: 'Archived', icon: faArchive },
          ] as const).map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeFilter === f.id
                  ? 'bg-[#00DC7D]/10 text-[#00A963] border border-[#00DC7D]/25'
                  : 'bg-transparent text-[#6F7476] dark:text-[#A3A7A8] hover:bg-[#F2F2F3] dark:hover:bg-[#1C2320]/50'
              }`}
            >
              <FontAwesomeIcon icon={f.icon} className="h-3 w-3" />
              {f.label}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-[#6F7476] dark:text-[#A3A7A8]">
          <FontAwesomeIcon icon={faSort} className="h-3.5 w-3.5" />
          <span className="font-semibold">Sort:</span>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as any)}
            className="rounded-lg border border-[#CCD0CF] dark:border-[#2E3832] bg-white dark:bg-[#111412] px-2 py-1 text-xs text-[#2F3331] dark:text-[#E4E7E6] font-bold focus:outline-none focus:border-[#00DC7D]"
          >
            <option value="updated">Recently Updated</option>
            <option value="created">Recently Created</option>
            <option value="title_az">Title A-Z</option>
            <option value="title_za">Title Z-A</option>
            <option value="pinned_first">Pinned First</option>
            <option value="favorites_first">Favorites First</option>
          </select>
        </div>
      </div>

      {/* 6. Notes Grid/List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAndSortedNotes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            onClick={() => router.push(`/notes/new?id=${note.id}`)}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredAndSortedNotes.length === 0 && (
        <div className="text-center py-20 bg-[#FAFAFA] dark:bg-[#161B19]/20 rounded-3xl border border-dashed border-[#CCD0CF]/60 dark:border-[#2E3832]/60 p-6">
          <FontAwesomeIcon icon={faBookOpen} className="w-12 h-12 text-[#CCD0CF] dark:text-[#2E3832] mx-auto mb-3" />
          <h4 className="text-[#2F3331] dark:text-[#E4E7E6] font-bold text-sm">No notes found</h4>
          <p className="text-xs text-[#6F7476] dark:text-[#A3A7A8] mt-1.5 max-w-[280px] mx-auto leading-relaxed">
            Try resetting your filters, changing search query, or create a brand new Markdown note.
          </p>
          <button
            onClick={handleNewNoteClick}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#00DC7D] px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-[#00B866] active:scale-95 shadow-sm"
          >
            <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
            Create Note
          </button>
        </div>
      )}

      {/* Notebook Manager Modal */}
      {showNotebookModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111412] rounded-3xl w-full max-w-[480px] p-6 shadow-2xl border border-[#EEF0EF] dark:border-[#2E3832] animate-in zoom-in-95 duration-150 relative">
            <button
              onClick={() => setShowNotebookModal(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-[#A3A7A8] hover:bg-gray-100 dark:hover:bg-[#1C2320]/50"
            >
              <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
            </button>

            <h3 className="text-xl font-bold text-[#2F3331] dark:text-[#E4E7E6] mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faBookBookmark} className="text-[#00DC7D]" />
              {editingNotebookId ? 'Edit Notebook' : 'Create Notebook'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#6F7476] dark:text-[#A3A7A8] uppercase tracking-wider mb-1.5">Notebook Name</label>
                <input
                  type="text"
                  placeholder="e.g. Personal, Work, Ideas"
                  value={newNotebookName}
                  onChange={(e) => setNewNotebookName(e.target.value)}
                  className="w-full rounded-xl border border-[#CCD0CF] dark:border-[#2E3832] bg-white dark:bg-[#161B19]/30 px-4 py-3 text-sm text-[#2F3331] dark:text-[#E4E7E6] placeholder-[#A3A7A8] focus:border-[#00DC7D] focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6F7476] dark:text-[#A3A7A8] uppercase tracking-wider mb-1.5">Description (Optional)</label>
                <textarea
                  placeholder="Keep it descriptive..."
                  value={newNotebookDesc}
                  onChange={(e) => setNewNotebookDesc(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-[#CCD0CF] dark:border-[#2E3832] bg-white dark:bg-[#161B19]/30 px-4 py-2.5 text-sm text-[#2F3331] dark:text-[#E4E7E6] placeholder-[#A3A7A8] focus:border-[#00DC7D] focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6F7476] dark:text-[#A3A7A8] uppercase tracking-wider mb-1.5">Color Tag</label>
                 <div className="flex items-center gap-2">
                  {['#00DC7D', '#5D8AFF', '#FF9933', '#FF453A', '#B79CFF', '#8A5A00', '#FF8CC6'].map(col => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setNewNotebookColor(col)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                        newNotebookColor === col ? 'scale-110 ring-2 ring-[#00DC7D]/50 shadow-md' : 'opacity-85 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: col }}
                    >
                      {newNotebookColor === col && (
                        <FontAwesomeIcon icon={faCheck} className="text-white text-xs drop-shadow-sm" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCreateNotebook}
                  className="flex-1 py-3 rounded-xl bg-[#00DC7D] text-white hover:bg-[#00B866] text-xs font-bold shadow-sm transition-all"
                >
                  <FontAwesomeIcon icon={faCheck} className="mr-1" />
                  {editingNotebookId ? 'Save Changes' : 'Create Notebook'}
                </button>
                {editingNotebookId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingNotebookId(null);
                      setNewNotebookName('');
                      setNewNotebookDesc('');
                      setNewNotebookColor('#00DC7D');
                    }}
                    className="px-4 py-3 rounded-xl border border-[#CCD0CF] dark:border-[#2E3832] text-[#6F7476] dark:text-[#A3A7A8] text-xs font-bold hover:bg-gray-50 dark:hover:bg-[#1C2320]/50 transition-all"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {allNotebooks.length > 0 && !editingNotebookId && (
                <div className="border-t border-[#EEF0EF] dark:border-[#2E3832]/30 pt-3 mt-4 max-h-[140px] overflow-y-auto space-y-2">
                  <span className="block text-[10px] font-bold text-[#A3A7A8] uppercase tracking-wider">Existing Notebooks</span>
                  {allNotebooks.map(nb => (
                    <div key={nb.id} className="flex items-center justify-between bg-[#FAFAFA] dark:bg-[#161B19]/50 px-3 py-1.5 rounded-lg border border-[#EEF0EF] dark:border-[#2E3832]/20 text-xs">
                      <span className="flex items-center gap-2 text-[#2F3331] dark:text-[#E4E7E6] font-semibold">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: nb.color }} />
                        {nb.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditNotebook(nb)}
                          className="text-[#6F7476] hover:text-[#2F3331] font-bold"
                          title="Edit"
                        >
                          <FontAwesomeIcon icon={faPen} className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteNotebook(nb.id)}
                          className="text-red-500 hover:text-red-600 font-bold"
                          title="Delete"
                        >
                          <FontAwesomeIcon icon={faXmark} className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSavedToast && (
        <div className="fixed left-1/2 top-6 z-[110] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#2F3331] px-4 py-2 text-sm font-semibold text-white shadow-lg animate-in fade-in duration-200">
          <FontAwesomeIcon icon={faCheckCircle} className="h-4 w-4 text-[#00DC7D]" />
          <span>Notebook saved!</span>
        </div>
      )}

      <ConfirmModal
        isOpen={notebookToDelete !== null}
        onClose={() => setNotebookToDelete(null)}
        onConfirm={executeDeleteNotebook}
        title="Delete Notebook"
        message="Are you sure you want to delete this notebook? The notes in this notebook will not be deleted, but will be moved to Uncategorized."
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
      />
    </div>
  );
}
