'use client';

import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  MoonIcon,
  SparklesIcon,
  BookOpenIcon,
  LightBulbIcon,
  StarIcon,
  TagIcon,
  AtSymbolIcon,
  Cog6ToothIcon,
  ArrowRightStartOnRectangleIcon,
  QuestionMarkCircleIcon,
  ArrowDownTrayIcon,
  ChevronRightIcon,
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

type ModuleTab = 'dreams' | 'highlights' | 'tags' | 'people' | 'notes' | 'wisdom' | 'ideas' | 'settings' | 'faq';

export default function OtherPage() {
  const router = useRouter();
  const { user, signOut, isGuest } = useAuth();
  const {
    entries,
    highlights,
    tags,
    people,
    wisdoms,
    notes,
    ideas,
    deleteNote,
    deleteIdea,
    addGoal,
  } = useData();

  const [activeTab, setActiveTab] = useState<ModuleTab>('dreams');
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  const handleAddGoal = async () => {
    if (!goalInput.trim()) return;
    await addGoal(goalInput);
    setGoalInput('');
    setShowAddGoal(false);
  };

  const handleExportJSON = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      entries,
      highlights,
      tags,
      people,
      wisdoms,
      notes,
      ideas,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `asa-journey-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = () => {
    let md = '# ASA Journey Export\n\n';
    md += `*Exported on ${format(new Date(), 'MMMM d, yyyy')}*\n\n`;

    md += '## Entries\n\n';
    entries.forEach(entry => {
      md += `## ${entry.date}\n\n`;
      if (entry.dream) md += `**Dream:** ${entry.dream}\n\n`;
      entry.bullets.forEach(bullet => {
        const icon = bullet.style === 'star' ? '★' : bullet.style === 'checklist' ? '✓' : '•';
        const highlight = bullet.isHighlight ? '**' : '';
        md += `${icon} ${highlight}${bullet.text}${highlight}\n`;
      });
      md += '\n---\n\n';
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `asa-journey-export-${format(new Date(), 'yyyy-MM-dd')}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSignOut = async () => {
    if (confirm('sign out? your data is safe tho')) {
      await signOut();
      router.push('/auth');
    }
  };

  const tabs = [
    { id: 'dreams' as const, label: 'Dreams', icon: MoonIcon, count: entries.filter(e => e.dream).length },
    { id: 'highlights' as const, label: 'Highlights', icon: StarIcon, count: highlights.length },
    { id: 'tags' as const, label: 'Tags', icon: TagIcon, count: tags.length },
    { id: 'people' as const, label: 'People', icon: AtSymbolIcon, count: people.length },
    { id: 'notes' as const, label: 'Notes', icon: BookOpenIcon, count: notes.length },
    { id: 'wisdom' as const, label: 'Wisdom', icon: SparklesIcon, count: wisdoms.length },
    { id: 'ideas' as const, label: 'Ideas', icon: LightBulbIcon, count: ideas.length },
    { id: 'settings' as const, label: 'Settings', icon: Cog6ToothIcon, count: 0 },
    { id: 'faq' as const, label: 'FAQ', icon: QuestionMarkCircleIcon, count: 0 },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-6 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">other</h1>
        <p className="text-[#8B8AA0]">collections & settings</p>
      </div>

      {/* Module Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-[#1E1A2B] text-[#C049FF] border border-[#C049FF]'
                : 'bg-[#1E1A2B] text-[#8B8AA0] border border-[#4A4560] hover:border-[#8B8AA0]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-[#2F2B3A] rounded-full text-xs">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'dreams' && (
        <div className="space-y-4">
          {entries.filter(e => e.dream).map((entry) => (
            <div key={entry.id} className="bg-[#1E1A2B] rounded-xl p-4 border border-[#F59E0B]/30">
              <p className="text-xs text-[#F59E0B] mb-2">{entry.date}</p>
              <p className="text-white whitespace-pre-line">{entry.dream}</p>
            </div>
          ))}
          {entries.filter(e => e.dream).length === 0 && (
            <div className="text-center py-8">
              <MoonIcon className="w-12 h-12 text-[#4A4560] mx-auto mb-3" />
              <p className="text-[#8B8AA0]">no dreams logged yet</p>
              <p className="text-sm text-[#4A4560]">head to write to log your dreams</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'highlights' && (
        <div className="space-y-4">
          {highlights.map((h) => (
            <div key={h.id} className="bg-[#1E1A2B] rounded-xl p-4 border border-[#C049FF]/30">
              <p className="text-white">{h.content}</p>
              <p className="text-xs text-[#4A4560] mt-2">{h.entryDate}</p>
            </div>
          ))}
          {highlights.length === 0 && (
            <div className="text-center py-8">
              <StarIcon className="w-12 h-12 text-[#4A4560] mx-auto mb-3" />
              <p className="text-[#8B8AA0]">no highlights yet</p>
              <p className="text-sm text-[#4A4560]">make a bullet and toggle highlight</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'tags' && (
        <div className="space-y-4">
          {tags.map((tag) => (
            <div key={tag.id} className="bg-[#1E1A2B] rounded-xl p-4 border border-[#4A4560] flex justify-between items-center">
              <span className="text-[#3B82F6]">#{tag.name}</span>
              <span className="text-sm text-[#8B8AA0]">{tag.count}x</span>
            </div>
          ))}
          {tags.length === 0 && (
            <div className="text-center py-8">
              <TagIcon className="w-12 h-12 text-[#4A4560] mx-auto mb-3" />
              <p className="text-[#8B8AA0]">no tags yet</p>
              <p className="text-sm text-[#4A4560]">use # in your bullets to create tags</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'people' && (
        <div className="space-y-4">
          {people.map((p) => (
            <div key={p.id} className="bg-[#1E1A2B] rounded-xl p-4 border border-[#4A4560] flex justify-between items-center">
              <span className="text-[#F97316]">@{p.name}</span>
              <span className="text-sm text-[#8B8AA0]">{p.mentions}x</span>
            </div>
          ))}
          {people.length === 0 && (
            <div className="text-center py-8">
              <AtSymbolIcon className="w-12 h-12 text-[#4A4560] mx-auto mb-3" />
              <p className="text-[#8B8AA0]">no mentions yet</p>
              <p className="text-sm text-[#4A4560]">use @ in your bullets to mention people</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="space-y-4">
          {notes.map((note) => (
            <div key={note.id} className="bg-[#1E1A2B] rounded-xl p-4 border border-[#22C55E]/30">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">{note.title}</h3>
                <button onClick={() => deleteNote(note.id)} className="text-[#EF4444] hover:bg-[#EF4444]/10 p-1 rounded">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-white whitespace-pre-line mb-2">{note.content}</p>
              <p className="text-xs text-[#4A4560]">{format(note.createdAt, 'MMM d, yyyy')}</p>
            </div>
          ))}
          {notes.length === 0 && (
            <div className="text-center py-8">
              <BookOpenIcon className="w-12 h-12 text-[#4A4560] mx-auto mb-3" />
              <p className="text-[#8B8AA0]">no notes yet</p>
              <p className="text-sm text-[#4A4560]">use the + button in write to add notes</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'wisdom' && (
        <div className="space-y-4">
          {wisdoms.map((w) => (
            <div key={w.id} className="bg-[#1E1A2B] rounded-xl p-4 border border-[#3B82F6]/30">
              <span className="text-xs text-[#3B82F6] uppercase">{w.type}</span>
              <p className="text-white mt-2">{w.content}</p>
              <p className="text-xs text-[#4A4560] mt-2">{format(w.createdAt, 'MMM d, yyyy')}</p>
            </div>
          ))}
          {wisdoms.length === 0 && (
            <div className="text-center py-8">
              <SparklesIcon className="w-12 h-12 text-[#4A4560] mx-auto mb-3" />
              <p className="text-[#8B8AA0]">no wisdom captured yet</p>
              <p className="text-sm text-[#4A4560]">use the + button in write to add wisdom</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'ideas' && (
        <div className="space-y-4">
          {ideas.map((idea) => (
            <div key={idea.id} className="bg-[#1E1A2B] rounded-xl p-4 border border-[#F97316]/30">
              <div className="flex justify-between items-start mb-2">
                <p className="text-white">{idea.content}</p>
                <button onClick={() => deleteIdea(idea.id)} className="text-[#EF4444] hover:bg-[#EF4444]/10 p-1 rounded">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-[#4A4560]">{format(idea.createdAt, 'MMM d, yyyy')}</p>
            </div>
          ))}
          {ideas.length === 0 && (
            <div className="text-center py-8">
              <LightBulbIcon className="w-12 h-12 text-[#4A4560] mx-auto mb-3" />
              <p className="text-[#8B8AA0]">no ideas captured yet</p>
              <p className="text-sm text-[#4A4560]">use the + button in write to add ideas</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Profile */}
          <div className="bg-[#1E1A2B] rounded-xl p-4 border border-[#4A4560]">
            <h3 className="font-semibold mb-3">profile</h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full gradient-brand flex items-center justify-center">
                <span className="text-xl">{(user?.displayName || 'G')[0].toUpperCase()}</span>
              </div>
              <div className="flex-1">
                <p className="font-medium">{user?.displayName || 'Guest'}</p>
                <p className="text-sm text-[#8B8AA0]">{user?.email || 'guest mode'}</p>
              </div>
            </div>
          </div>

          {/* Export */}
          <div className="bg-[#1E1A2B] rounded-xl p-4 border border-[#4A4560]">
            <h3 className="font-semibold mb-3">export your data</h3>
            <p className="text-sm text-[#8B8AA0] mb-3">download all your entries and thoughts</p>
            <div className="flex gap-2">
              <button
                onClick={handleExportJSON}
                className="flex-1 py-2 rounded-lg bg-[#2F2B3A] text-white text-sm hover:bg-[#4A4560] transition-colors flex items-center justify-center gap-2"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                JSON
              </button>
              <button
                onClick={handleExportMarkdown}
                className="flex-1 py-2 rounded-lg bg-[#2F2B3A] text-white text-sm hover:bg-[#4A4560] transition-colors flex items-center justify-center gap-2"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                Markdown
              </button>
            </div>
          </div>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="w-full py-3 rounded-lg border border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowRightStartOnRectangleIcon className="w-5 h-5" />
            sign out
          </button>

          {isGuest && (
            <div className="bg-[#F59E0B]/10 rounded-xl p-4 border border-[#F59E0B]">
              <p className="text-sm text-[#F59E0B]">
                you're browsing as guest. your data is saved locally but won't sync across devices. sign up or sign in to unlock full features!
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'faq' && (
        <div className="space-y-6">
          <div className="bg-[#1E1A2B] rounded-xl p-4 border border-[#4A4560]">
            <h3 className="font-semibold mb-4">quick guide</h3>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="text-[#C049FF] mb-1">Formatting</h4>
                <ul className="space-y-2 text-[#8B8AA0]">
                  <li><code className="bg-[#2F2B3A] px-1 rounded">#tag</code> — create a tag</li>
                  <li><code className="bg-[#2F2B3A] px-1 rounded">@name</code> — mention someone</li>
                  <li><code className="bg-[#2F2B3A] px-1 rounded">*bold*</code> — mark as highlight</li>
                  <li><code className="bg-[#2F2B3A] px-1 rounded">Tab</code> — change bullet style</li>
                </ul>
              </div>

              <div>
                <h4 className="text-[#3B82F6] mb-1">Wisdom Categories</h4>
                <ul className="space-y-2 text-[#8B8AA0]">
                  <li><strong>⚡ thought</strong> — random idea or realization</li>
                  <li><strong>💬 quote</strong> — quote from others</li>
                  <li><strong>✨ fact</strong> — mind-blowing fact</li>
                  <li><strong>📝 excerpt</strong> — text snippet from a book/article</li>
                  <li><strong>📚 lesson</strong> — lesson learned</li>
                </ul>
              </div>

              <div>
                <h4 className="text-[#22C55E] mb-1">Tips</h4>
                <ul className="space-y-2 text-[#8B8AA0]">
                  <li>write in the morning or before sleeping</li>
                  <li>keep longform thinking in notes</li>
                  <li>tag your ideas to find them later</li>
                  <li>use highlights to remember good stuff</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
