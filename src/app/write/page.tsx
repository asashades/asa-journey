'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import {
  MoonIcon,
  SparklesIcon,
  PlusCircleIcon,
  LightBulbIcon,
  BookOpenIcon,
  StarIcon,
  CheckIcon,
  FireIcon,
  XMarkIcon,
  StarIcon as OutlineStarIcon,
  CheckCircleIcon,
  TrashIcon,
  PencilSquareIcon,
  BoltIcon,
  QuoteIcon,
  InformationCircleIcon,
  BookIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';

const BulletIcon = ({ style }: { style: string }) => {
  switch (style) {
    case 'star':
      return <StarIcon className="w-5 h-5 text-[#F59E0B]" />;
    case 'checklist':
      return <CheckCircleIcon className="w-5 h-5 text-[#22C55E]" />;
    default:
      return <span className="w-2 h-2 rounded-full bg-[#8B8AA0]" />;
  }
};

const wisdomCategories = [
  { type: 'thought' as const, icon: BoltIcon, label: 'thought', color: '#C049FF' },
  { type: 'quote' as const, icon: QuoteIcon, label: 'quote', color: '#3B82F6' },
  { type: 'fact' as const, icon: InformationCircleIcon, label: 'fact', color: '#22C55E' },
  { type: 'excerpt' as const, icon: BookIcon, label: 'excerpt', color: '#F97316' },
  { type: 'lesson' as const, icon: AcademicCapIcon, label: 'lesson', color: '#8B5CF6' },
];

export default function WritePage() {
  const { user } = useAuth();
  const {
    currentEntry,
    currentDate,
    setCurrentDate,
    addBullet,
    updateBullet,
    deleteBullet,
    toggleHighlight,
    updateDream,
    addWisdom,
    addNote,
    addIdea,
    isOnline,
  } = useData();

  const [dreamInput, setDreamInput] = useState('');
  const [bulletInput, setBulletInput] = useState('');
  const [bulletStyle, setBulletStyle] = useState<'bullet' | 'star' | 'checklist'>('bullet');
  const [showFABMenu, setShowFABMenu] = useState(false);
  const [showWisdomSubmenu, setShowWisdomSubmenu] = useState(false);
  const [showWisdomForm, setShowWisdomForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showIdeaForm, setShowIdeaForm] = useState(false);
  const [selectedWisdomType, setSelectedWisdomType] = useState<'thought' | 'quote' | 'fact' | 'excerpt' | 'lesson'>('thought');
  const [wisdomContent, setWisdomContent] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [ideaContent, setIdeaContent] = useState('');
  const [editingBulletId, setEditingBulletId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [showDreamInput, setShowDreamInput] = useState(false);

  const bulletInputRef = useRef<HTMLTextAreaElement>(null);
  const dreamInputRef = useRef<HTMLInputElement>(null);

  const today = new Date();
  const dateStr = format(today, 'MMM d');
  const dayStr = format(today, 'EEEE');
  const contextStr = `#${format(today, 'd')} / Today`;

  const handleAddBullet = async () => {
    if (!bulletInput.trim()) return;
    await addBullet(bulletInput, bulletStyle);
    setBulletInput('');
    bulletInputRef.current?.focus();
  };

  const handleBulletKeyDown = async (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      await handleAddBullet();
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      // Cycle through styles
      setBulletStyle(current => {
        if (current === 'bullet') return 'star';
        if (current === 'star') return 'checklist';
        return 'bullet';
      });
    }
  };

  const handleAddDream = async () => {
    if (!dreamInput.trim()) return;
    await updateDream(dreamInput);
    setDreamInput('');
    setShowDreamInput(false);
  };

  const handleDreamKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await handleAddDream();
    }
  };

  const handleAddWisdom = async () => {
    if (!wisdomContent.trim()) return;
    await addWisdom(selectedWisdomType, wisdomContent);
    setWisdomContent('');
    setShowWisdomForm(false);
    setShowWisdomSubmenu(false);
    setShowFABMenu(false);
  };

  const handleAddNote = async () => {
    if (!noteTitle.trim() && !noteContent.trim()) return;
    await addNote(noteTitle || 'Untitled', noteContent);
    setNoteTitle('');
    setNoteContent('');
    setShowNoteForm(false);
    setShowFABMenu(false);
  };

  const handleAddIdea = async () => {
    if (!ideaContent.trim()) return;
    await addIdea(ideaContent);
    setIdeaContent('');
    setShowIdeaForm(false);
    setShowFABMenu(false);
  };

  const handleEditBullet = async (bulletId: string) => {
    if (!editingText.trim()) {
      setEditingBulletId(null);
      return;
    }
    await updateBullet(bulletId, { text: editingText });
    setEditingBulletId(null);
    setEditingText('');
  };

  const startEditing = (bulletId: string, text: string) => {
    setEditingBulletId(bulletId);
    setEditingText(text);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 min-h-screen">
      {/* Offline indicator */}
      {!isOnline && (
        <div className="mb-4 px-4 py-2 bg-[#F59E0B]/20 border border-[#F59E0B] rounded-lg text-sm text-[#F59E0B] text-center">
          you're offline, data will sync when back online
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold">{dateStr}</h1>
            <p className="text-[#8B8AA0]">{dayStr}</p>
          </div>
          <div className="text-right">
            <span className="text-sm font-semibold text-[#C049FF]">{contextStr}</span>
          </div>
        </div>
      </div>

      {/* Dream Section */}
      <div className="mb-6">
        <button
          onClick={() => setShowDreamInput(!showDreamInput)}
          className="flex items-center gap-2 text-[#F59E0B] hover:text-[#FBBF24] transition-colors mb-2"
        >
          <MoonIcon className="w-5 h-5" />
          <span className="text-sm font-medium">dream</span>
          {currentEntry?.dream && (
            <span className="ml-2 px-2 py-0.5 bg-[#F59E0B]/20 rounded-full text-xs">logged</span>
          )}
        </button>

        {showDreamInput && (
          <div className="bg-[#1E1A2B] rounded-lg p-4 border border-[#4A4560]">
            <p className="text-sm text-[#8B8AA0] mb-2">
              yo, spill the tea—what kinda wild dreams did you have last night?
            </p>
            <div className="flex gap-2">
              <input
                ref={dreamInputRef}
                type="text"
                value={dreamInput}
                onChange={(e) => setDreamInput(e.target.value)}
                onKeyDown={handleDreamKeyDown}
                placeholder="describe your dream..."
                className="flex-1 bg-[#2F2B3A] border border-[#4A4560] rounded-lg px-3 py-2 text-white placeholder-[#8B8AA0] focus:outline-none focus:border-[#C049FF] transition-colors"
              />
              <button
                onClick={handleAddDream}
                className="px-4 py-2 bg-[#F59E0B] text-black rounded-lg font-medium hover:bg-[#FBBF24] transition-colors"
              >
                save
              </button>
            </div>
          </div>
        )}

        {currentEntry?.dream && !showDreamInput && (
          <div className="bg-[#1E1A2B] rounded-lg p-4 border border-[#F59E0B]/30">
            <div className="flex items-start gap-2">
              <MoonIcon className="w-4 h-4 text-[#F59E0B] mt-1 flex-shrink-0" />
              <p className="text-sm text-[#8B8AA0] whitespace-pre-line">{currentEntry.dream}</p>
            </div>
          </div>
        )}
      </div>

      {/* Journal Bullets */}
      <div className="mb-6">
        <p className="flex items-center gap-2 text-[#8B8AA0] mb-3">
          <span className="text-sm">drop your thoughts here.. no cap!</span>
          <span
            onClick={() => setBulletStyle(prev => prev === 'bullet' ? 'star' : prev === 'star' ? 'checklist' : 'bullet')}
            className="ml-auto px-2 py-1 bg-[#2F2B3A] rounded text-xs cursor-pointer hover:bg-[#4A4560] transition-colors"
            title="Tab to change style"
          >
            {bulletStyle === 'bullet' ? '•' : bulletStyle === 'star' ? '★' : '✓'}
          </span>
        </p>

        {/* Existing Bullets */}
        <div className="space-y-3 mb-4">
          {currentEntry?.bullets.map((bullet) => (
            <div key={bullet.id} className="flex items-start gap-3 group">
              <div className="mt-1 flex-shrink-0">
                <BulletIcon style={bullet.style} />
              </div>
              {editingBulletId === bullet.id ? (
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleEditBullet(bullet.id)}
                    className="flex-1 bg-[#2F2B3A] border border-[#C049FF] rounded px-2 py-1 text-white focus:outline-none"
                    autoFocus
                  />
                  <button onClick={() => handleEditBullet(bullet.id)} className="text-[#22C55E]">
                    <CheckIcon className="w-5 h-5" />
                  </button>
                  <button onClick={() => setEditingBulletId(null)} className="text-[#8B8AA0]">
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex-1">
                  <p className={`text-white ${bullet.isHighlight ? 'font-semibold' : ''}`}>
                    {bullet.text}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[#8B8AA0]">
                      {format(bullet.createdAt, 'h:mm a')}
                    </span>
                    {bullet.isHighlight && (
                      <span className="px-2 py-0.5 bg-[#C049FF]/20 text-[#C049FF] text-xs rounded-full">highlight</span>
                    )}
                    {bullet.tags.map(tag => (
                      <span key={tag} className="text-xs text-[#3B82F6]">#{tag}</span>
                    ))}
                    {bullet.mentions.map(mention => (
                      <span key={mention} className="text-xs text-[#F97316]">@{mention}</span>
                    ))}
                    <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleHighlight(bullet.id)}
                        className="p-1 hover:bg-[#2F2B3A] rounded"
                        title="toggle highlight"
                      >
                        <SparklesIcon className={`w-4 h-4 ${bullet.isHighlight ? 'text-[#C1049FF]' : 'text-[#8B8AA0]'}`} />
                      </button>
                      <button
                        onClick={() => startEditing(bullet.id, bullet.text)}
                        className="p-1 hover:bg-[#2F2B3A] rounded"
                        title="edit"
                      >
                        <PencilSquareIcon className="w-4 h-4 text-[#8B8AA0]" />
                      </button>
                      <button
                        onClick={() => deleteBullet(bullet.id)}
                        className="p-1 hover:bg-[#EF4444]/20 rounded"
                        title="delete"
                      >
                        <TrashIcon className="w-4 h-4 text-[#EF4444]" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bullet Input */}
        <div className="flex items-start gap-3">
          <div className="mt-1 flex-shrink-0">
            <BulletIcon style={bulletStyle} />
          </div>
          <div className="flex-1 relative">
            <textarea
              ref={bulletInputRef}
              value={bulletInput}
              onChange={(e) => setBulletInput(e.target.value)}
              onKeyDown={handleBulletKeyDown}
              placeholder="add a bullet..."
              rows={2}
              className="w-full bg-transparent border-b border-[#4A4560] py-2 text-white placeholder-[#8B8AA0] focus:outline-none focus:border-[#C049FF] transition-colors resize-none"
            />
            <span className="absolute right-0 bottom-2 text-xs text-[#8B8AA0]/50">Enter to save, Tab to change style</span>
          </div>
        </div>
      </div>

      {/* FAB Speed Dial */}
      <div className="fixed right-4 bottom-24 z-50">
        {showFABMenu && (
          <div className="absolute bottom-14 right-0 bg-[#1E1A2B] rounded-xl border border-[#4A4560] p-2 space-y-1 shadow-lg min-w-[140px]">
            <button
              onClick={() => { setShowWisdomSubmenu(!showWisdomSubmenu); setShowNoteForm(false); setShowIdeaForm(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#2F2B3A] text-[#3B82F6] text-sm"
            >
              <SparklesIcon className="w-5 h-5" />
              wisdom
            </button>
            {showWisdomSubmenu && (
              <div className="ml-4 space-y-1 border-l border-[#4A4560] pl-2">
                {wisdomCategories.map(({ type, icon: Icon, label, color }) => (
                  <button
                    key={type}
                    onClick={() => { setSelectedWisdomType(type); setShowWisdomForm(true); setShowFABMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#2F2B3A] text-sm transition-colors"
                    style={{ color }}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => { setShowNoteForm(true); setShowWisdomSubmenu(false); setShowIdeaForm(false); setShowFABMenu(false); }}
              className="w-dropdown-item flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#2F2B3A] text-[#22C55E] text-sm w-full"
            >
              <BookOpenIcon className="w-5 h-5" />
              note
            </button>
            <button
              onClick={() => { setShowIdeaForm(true); setShowWisdomSubmenu(false); setShowNoteForm(false); setShowFABMenu(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#2F2B3A] text-[#F97316] text-sm"
            >
              <LightBulbIcon className="w-5 h-5" />
              idea
            </button>
          </div>
        )}

        {/* Floating Action Button */}
        <button
          onClick={() => setShowFABMenu(!showFABMenu)}
          className={`w-14 h-14 rounded-full gradient-brand flex items-center justify-center shadow-lg hover:scale-105 transition-transform ${showFABMenu ? 'rotate-45' : ''}`}
        >
          <PlusCircleIcon className="w-7 h-7 text-white" />
        </button>
      </div>

      {/* Wisdom Form Modal */}
      {showWisdomForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E1A2B] rounded-xl p-6 w-full max-w-sm border border-[#4A4560]">
            <div className="flex items-center gap-2 mb-4">
              {wisdomCategories.find(w => w.type === selectedWisdomType)?.icon && (
                (() => {
                  const Icon = wisdomCategories.find(w => w.type === selectedWisdomType)!.icon;
                  const color = wisdomCategories.find(w => w.type === selectedWisdomType)!.color;
                  return <Icon className="w-6 h-6" style={{ color }} />;
                })()
              )}
              <span className="font-semibold capitalize">{selectedWisdomType}</span>
            </div>
            <textarea
              value={wisdomContent}
              onChange={(e) => setWisdomContent(e.target.value)}
              placeholder="drop your wisdom..."
              rows={4}
              className="w-full bg-[#2F2B3A] border border-[#4A4560] rounded-lg px-4 py-3 text-white placeholder-[#8B8AA0] focus:outline-none focus:border-[#C049FF] transition-colors resize-none mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowWisdomForm(false)}
                className="flex-1 py-2 rounded-lg border border-[#4A4560] text-[#8B8AA0] hover:bg-[#2F2B3A] transition-colors"
              >
                cancel
              </button>
              <button
                onClick={handleAddWisdom}
                className="flex-1 py-2 rounded-lg gradient-brand text-white font-semibold hover:opacity-90 transition-opacity"
              >
                saved
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note Form Modal */}
      {showNoteForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E1A2B] rounded-xl p-6 w-full max-w-sm border border-[#4A4560]">
            <div className="flex items-center gap-2 mb-4">
              <BookOpenIcon className="w-6 h-6 text-[#22C55E]" />
              <span className="font-semibold">new note</span>
            </div>
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="title (optional)"
              className="w-full bg-[#2F2B3A] border border-[#4A4560] rounded-lg px-4 py-2 text-white placeholder-[#8B8AA0] focus:outline-none focus:border-[#C049FF] transition-colors mb-3"
              autoFocus
            />
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="write your note..."
              rows={4}
              className="w-full bg-[#2F2B3A] border border-[#4A4560] rounded-lg px-4 py-3 text-white placeholder-[#8B8AA0] focus:outline-none focus:border-[#C049FF] transition-colors resize-none mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowNoteForm(false)}
                className="flex-1 py-2 rounded-lg border border-[#4A4560] text-[#8B8AA0] hover:bg-[#2F2B3A] transition-colors"
              >
                cancel
              </button>
              <button
                onClick={handleAddNote}
                className="flex-1 py-2 rounded-lg bg-[#22C55E] text-white font-semibold hover:bg-[#16A34A] transition-colors"
              >
                saved
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Idea Form Modal */}
      {showIdeaForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E1A2B] rounded-xl p-6 w-full max-w-sm border border-[#4A4560]">
            <div className="flex items-center gap-2 mb-4">
              <LightBulbIcon className="w-6 h-6 text-[#F97316]" />
              <span className="font-semibold">new idea</span>
            </div>
            <textarea
              value={ideaContent}
              onChange={(e) => setIdeaContent(e.target.value)}
              placeholder="drop your idea..."
              rows={3}
              className="w-full bg-[#2F2B3A] border border-[#4A4560] rounded-lg px-4 py-3 text-white placeholder-[#8B8AA0] focus:outline-none focus:border-[#C049FF] transition-colors resize-none mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowIdeaForm(false)}
                className="flex-1 py-2 rounded-lg border border-[#4A4560] text-[#8B8AA0] hover:bg-[#2F2B3A] transition-colors"
              >
                cancel
              </button>
              <button
                onClick={handleAddIdea}
                className="flex-1 py-2 rounded-lg bg-[#F97316] text-white font-semibold hover:bg-[#EA580C] transition-colors"
              >
                captured
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Streak indicator */}
      <div className="fixed top-4 right-4">
        <div className="flex items-center gap-1 px-3 py-1.5 bg-[#1E1A2B] rounded-full border border-[#4A4560]">
          <FireIcon className="w-4 h-4 text-[#F97316]" />
          <span className="text-xs font-medium">streak</span>
        </div>
      </div>
    </div>
  );
}
