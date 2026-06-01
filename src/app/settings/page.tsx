'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRightFromBracket,
  faCircleInfo,
  faDownload,
  faGear,
  faTag,
  faAt,
  faPen,
  faFire,
} from '@fortawesome/free-solid-svg-icons';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useState } from 'react';

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOut, isGuest, userProfile, updateUserSettings } = useAuth();
  const { entries, highlights, tags, people, wisdoms, notes, ideas } = useData();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const defaultSettings = {
    darkMode: true,
    moduleVisibility: {
      dreams: true,
      highlights: true,
      tags: true,
      people: true,
      notes: true,
      wisdom: true,
      ideas: true,
      focus: false,
    },
    autoTagging: true,
    autoMentioning: true,
    language: 'en' as const,
    dailyWordGoal: 50,
    showStreakWidget: true,
    showWordGoalWidget: true,
  };

  const settings = userProfile?.settings || defaultSettings;

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
        const icon = bullet.style === 'star' ? '*' : bullet.style === 'checklist' ? '- [ ]' : '-';
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

  const handleSignOut = () => {
    setShowSignOutConfirm(true);
  };

  const executeSignOut = async () => {
    await signOut();
    router.push('/auth');
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24">
      <div className="mx-auto max-w-[600px] px-6 pt-8">
        <h1 className="mb-2 font-sans text-5xl font-bold text-[#2F3331]">Settings</h1>
        <p className="text-[#6F7476]">account, export, and quick guide</p>
      </div>

      <div className="mx-auto mt-12 max-w-[600px] space-y-12 px-6">
        <section>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2F3331]">
              <span className="text-lg font-bold text-white">{(user?.displayName || 'G')[0].toUpperCase()}</span>
            </div>
            <div>
              <h2 className="font-sans text-2xl font-bold text-[#2F3331]">{user?.displayName || 'Guest'}</h2>
              <p className="text-sm text-[#A3A7A8]">{user?.email || 'guest mode'}</p>
            </div>
          </div>

          {isGuest && (
            <div className="flex items-start gap-3 rounded-lg bg-[#FFCC33]/20 p-4 text-sm text-[#2F3331]">
              <FontAwesomeIcon icon={faCircleInfo} className="mt-0.5 h-4 w-4 shrink-0" />
              <p>guest data is saved locally and will not sync across devices.</p>
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faDownload} className="h-4 w-4 text-[#6F7476]" />
            <h2 className="font-sans text-2xl font-bold text-[#2F3331]">Export</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleExportJSON}
              className="rounded-lg bg-[#F2F2F3] px-4 py-3 text-sm font-semibold text-[#2F3331] transition-colors hover:bg-[#E5E5E5]"
            >
              JSON
            </button>
            <button
              onClick={handleExportMarkdown}
              className="rounded-lg bg-[#F2F2F3] px-4 py-3 text-sm font-semibold text-[#2F3331] transition-colors hover:bg-[#E5E5E5]"
            >
              Markdown
            </button>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faGear} className="h-4 w-4 text-[#6F7476]" />
            <h2 className="font-sans text-2xl font-bold text-[#2F3331]">Modules</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-[#EEF0EF] bg-white p-4">
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={faTag} className="h-5 w-5 text-[#5D8AFF]" />
                <div>
                  <p className="text-sm font-semibold text-[#2F3331]">Auto-tagging</p>
                  <p className="text-xs text-[#A3A7A8]">automatically tag #hashtags you write</p>
                </div>
              </div>
              <button
                onClick={() => updateUserSettings({ autoTagging: !settings.autoTagging })}
                className={`flex h-8 w-12 items-center rounded-full px-1 transition-all ${settings.autoTagging ? 'bg-[#00DC7D]' : 'bg-[#E4E7E6]'}`}
              >
                <div className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${settings.autoTagging ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#EEF0EF] bg-white p-4">
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={faAt} className="h-5 w-5 text-[#E97C9B]" />
                <div>
                  <p className="text-sm font-semibold text-[#2F3331]">Auto-mentioning</p>
                  <p className="text-xs text-[#A3A7A8]">automatically mention @people you write</p>
                </div>
              </div>
              <button
                onClick={() => updateUserSettings({ autoMentioning: !settings.autoMentioning })}
                className={`flex h-8 w-12 items-center rounded-full px-1 transition-all ${settings.autoMentioning ? 'bg-[#00DC7D]' : 'bg-[#E4E7E6]'}`}
              >
                <div className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${settings.autoMentioning ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faPen} className="h-4 w-4 text-[#6F7476]" />
            <h2 className="font-sans text-2xl font-bold text-[#2F3331]">Daily Goal & Stats</h2>
          </div>
          <div className="space-y-3">
            {/* Daily Word Goal Input */}
            <div className="rounded-lg border border-[#EEF0EF] bg-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E9FFF4] text-base">
                  🏆
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#2F3331]">Daily Word Target</p>
                  <p className="text-xs text-[#A3A7A8]">set your daily word milestone</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="500"
                  value={settings.dailyWordGoal ?? 50}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 5) {
                      updateUserSettings({ dailyWordGoal: val });
                    }
                  }}
                  className="w-16 rounded-lg bg-[#F2F2F3] border border-[#E4E7E6] px-2 py-1.5 text-center text-sm font-bold text-[#2F3331] focus:ring-2 focus:ring-[#00DC7D] focus:outline-none"
                />
                <span className="text-xs font-semibold text-[#6F7476]">words</span>
              </div>
            </div>

            {/* Show/Hide Streak Widget */}
            <div className="flex items-center justify-between rounded-lg border border-[#EEF0EF] bg-white p-4">
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={faFire} className="h-5 w-5 text-[#FF9933]" />
                <div>
                  <p className="text-sm font-semibold text-[#2F3331]">Show Streak Badge</p>
                  <p className="text-xs text-[#A3A7A8]">show daily streak flame on Write page</p>
                </div>
              </div>
              <button
                onClick={() => updateUserSettings({ showStreakWidget: settings.showStreakWidget !== false })}
                className={`flex h-8 w-12 items-center rounded-full px-1 transition-all ${settings.showStreakWidget !== false ? 'bg-[#00DC7D]' : 'bg-[#E4E7E6]'}`}
              >
                <div className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${settings.showStreakWidget !== false ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Show/Hide Word Goal Battery Widget */}
            <div className="flex items-center justify-between rounded-lg border border-[#EEF0EF] bg-white p-4">
              <div className="flex items-center gap-3">
                <span className="text-lg">🔋</span>
                <div>
                  <p className="text-sm font-semibold text-[#2F3331]">Show Battery Word Goal</p>
                  <p className="text-xs text-[#A3A7A8]">show portrait battery widget on Write page</p>
                </div>
              </div>
              <button
                onClick={() => updateUserSettings({ showWordGoalWidget: settings.showWordGoalWidget !== false })}
                className={`flex h-8 w-12 items-center rounded-full px-1 transition-all ${settings.showWordGoalWidget !== false ? 'bg-[#00DC7D]' : 'bg-[#E4E7E6]'}`}
              >
                <div className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${settings.showWordGoalWidget !== false ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faGear} className="h-4 w-4 text-[#6F7476]" />
            <h2 className="font-sans text-2xl font-bold text-[#2F3331]">Quick Guide</h2>
          </div>
          <div className="space-y-5 text-sm leading-6 text-[#6F7476]">
            <p><code className="rounded bg-[#F2F2F3] px-2 py-1 text-[#5D8AFF]">#tag</code> creates a tag, and <code className="rounded bg-[#F2F2F3] px-2 py-1 text-[#E97C9B]">@name</code> mentions a person.</p>
            <p>Use wisdom categories for thoughts, quotes, facts, excerpts, and lessons so Collections can filter them cleanly.</p>
            <p>Use the speed dial in Write to add wisdom, notes, ideas, images, and location without leaving the journal.</p>
          </div>
        </section>

        <button
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#FF453A] py-3 font-semibold text-[#FF453A] transition-colors hover:bg-[#FF453A]/5"
        >
          <FontAwesomeIcon icon={faArrowRightFromBracket} className="h-4 w-4" />
          sign out
        </button>
      </div>

      <ConfirmModal
        isOpen={showSignOutConfirm}
        onClose={() => setShowSignOutConfirm(false)}
        onConfirm={executeSignOut}
        title="Sign Out"
        message="Are you sure you want to sign out? Your data is safely stored in the cloud."
        confirmText="Sign Out"
        isDestructive={false}
      />
    </div>
  );
}
