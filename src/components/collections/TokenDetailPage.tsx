'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  addDays,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faArrowLeft,
  faArrowUp,
  faArrowDown,
  faAt,
  faChartSimple,
  faCircleInfo,
  faLink,
  faPlus,
  faTag,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { DoMoreLess } from '@/types';
import { useData } from '@/contexts/DataContext';
import { HighlightedText } from '@/components/ui/HighlightedText';
import { ActivityHeatmap } from '@/components/ui/ActivityHeatmap';
import { Entry } from '@/types';

type TokenKind = 'tag' | 'person';
type TokenTab = 'entries' | 'insight' | 'details';

interface TokenDetailPageProps {
  kind: TokenKind;
  name: string;
}

type MatchedBullet = {
  entry: Entry;
  bulletId: string;
  bulletText: string;
};

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const relativeDate = (date: string) => {
  const days = differenceInCalendarDays(new Date(), parseISO(date));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 0) return 'coming soon';
  return `${days} days ago`;
};

const monthKey = (date: Date) => format(date, 'yyyy-MM');

export default function TokenDetailPage({ kind, name }: TokenDetailPageProps) {
  const router = useRouter();
  const {
    entries,
    tags,
    tagGroups,
    updateTag,
    updateTagGroup,
    createTagGroup,
    people,
    personGroups,
    updatePerson,
    updatePersonGroup,
    createPersonGroup,
  } = useData();
  const [activeTab, setActiveTab] = useState<TokenTab>('entries');
  const [aliasInput, setAliasInput] = useState('');
  const [aliasTargetInput, setAliasTargetInput] = useState('');
  const [groupInput, setGroupInput] = useState('');

  const normalizedName = decodeURIComponent(name).toLowerCase();
  const isPerson = kind === 'person';
  const token = `${isPerson ? '@' : '#'}${normalizedName}`;
  const accent = isPerson
    ? { bg: '#FFEEAA', soft: '#FFF8D9', text: '#8A5A00', icon: faAt }
    : { bg: '#EAD8FF', soft: '#F7EFFF', text: '#7A2EB8', icon: faTag };

  const entity = useMemo(() => {
    return isPerson
      ? people.find(person => person.name.toLowerCase() === normalizedName)
      : tags.find(tag => tag.name.toLowerCase() === normalizedName);
  }, [isPerson, normalizedName, people, tags]);

  const aliases = useMemo(() => {
    if (!entity || !('aliases' in entity)) return [];
    return entity.aliases || [];
  }, [entity]);

  const matchNames = useMemo(
    () => [normalizedName, ...aliases.map(alias => alias.toLowerCase())],
    [aliases, normalizedName]
  );

  const currentGroups = useMemo(() => {
    return isPerson
      ? personGroups.filter(group => group.people.some(person => matchNames.includes(person.toLowerCase())))
      : tagGroups.filter(group => group.tags.some(tag => matchNames.includes(tag.toLowerCase())));
  }, [isPerson, matchNames, personGroups, tagGroups]);

  const matchedBullets = useMemo<MatchedBullet[]>(() => {
    const matches: MatchedBullet[] = [];

    entries.forEach((entry) => {
      entry.bullets.forEach((bullet) => {
        const bucket = isPerson ? bullet.mentions : bullet.tags;
        const tokenMatcher = new RegExp(
          `(^|[^\\p{L}\\p{N}_-])${isPerson ? '@' : '#'}(${matchNames.map(escapeRegExp).join('|')})(?=$|[^\\p{L}\\p{N}_-])`,
          'iu'
        );
        const hasStructuredMatch = bucket.some(item => matchNames.includes(item.toLowerCase()));
        const hasTextMatch = tokenMatcher.test(bullet.text);

        if (hasStructuredMatch || hasTextMatch) {
          matches.push({ entry, bulletId: bullet.id, bulletText: bullet.text });
        }
      });
    });

    return matches.sort((a, b) => b.entry.date.localeCompare(a.entry.date));
  }, [entries, isPerson, matchNames]);

  const handleAddAlias = async () => {
    const alias = normalizeInputName(aliasInput);
    if (!alias || aliases.map(item => item.toLowerCase()).includes(alias) || alias === normalizedName) return;

    if (isPerson) {
      await updatePerson(normalizedName, { aliases: [...aliases, alias] });
    } else {
      await updateTag(normalizedName, { aliases: [...aliases, alias] });
    }

    setAliasInput('');
  };

  const handleAddAsAlias = async () => {
    const targetName = normalizeInputName(aliasTargetInput);
    if (!targetName || targetName === normalizedName) return;

    if (isPerson) {
      const target = people.find(person => person.name.toLowerCase() === targetName);
      if (!target) return;
      await updatePerson(target.name, {
        aliases: Array.from(new Set([...(target.aliases || []), normalizedName])),
      });
      router.push(`/people/${encodeURIComponent(target.name.toLowerCase())}`);
    } else {
      const target = tags.find(tag => tag.name.toLowerCase() === targetName);
      if (!target) return;
      await updateTag(target.name, {
        aliases: Array.from(new Set([...(target.aliases || []), normalizedName])),
      });
      router.push(`/tags/${encodeURIComponent(target.name.toLowerCase())}`);
    }
  };

  const handleAddGroup = async () => {
    const groupName = groupInput.trim();
    if (!groupName) return;

    if (isPerson) {
      const existingGroup = personGroups.find(group => group.name.toLowerCase() === groupName.toLowerCase());
      if (existingGroup) {
        await updatePersonGroup(existingGroup.id, {
          people: Array.from(new Set([...existingGroup.people, normalizedName])),
        });
      } else {
        await createPersonGroup(groupName, [normalizedName]);
      }
    } else {
      const existingGroup = tagGroups.find(group => group.name.toLowerCase() === groupName.toLowerCase());
      if (existingGroup) {
        await updateTagGroup(existingGroup.id, {
          tags: Array.from(new Set([...existingGroup.tags, normalizedName])),
        });
      } else {
        await createTagGroup(groupName, [normalizedName]);
      }
    }

    setGroupInput('');
  };

  const handleToggleDoMoreLess = async (value: DoMoreLess) => {
    if (isPerson) {
      await updatePerson(normalizedName, { doMoreLess: value });
    } else {
      await updateTag(normalizedName, { doMoreLess: value });
    }
  };

  const groupedEntries = useMemo(() => {
    const groups = new Map<string, MatchedBullet[]>();
    matchedBullets.forEach((match) => {
      const existing = groups.get(match.entry.date) || [];
      existing.push(match);
      groups.set(match.entry.date, existing);
    });
    return Array.from(groups.entries())
      .map(([date, bullets]) => ({ date, bullets }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [matchedBullets]);

  const activeDateSet = useMemo(() => new Set(groupedEntries.map(group => group.date)), [groupedEntries]);
  const today = useMemo(() => new Date(), []);
  const heatmapStart = subDays(today, 364);
  const heatmapDays = useMemo(
    () => Array.from({ length: 365 }, (_, index) => addDays(heatmapStart, index)),
    [heatmapStart]
  );
  const heatmapData = useMemo(
    () => heatmapDays.map((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return {
        date: day,
        dateKey,
        count: activeDateSet.has(dateKey) ? 1 : 0,
      };
    }),
    [activeDateSet, heatmapDays]
  );

  const stats = useMemo(() => {
    const dates = groupedEntries.map(group => group.date).sort();
    const first = dates[0] || null;
    const last = dates[dates.length - 1] || null;
    const firstDate = first ? parseISO(first) : null;
    const lastDate = last ? parseISO(last) : null;
    const monthSpan = firstDate && lastDate
      ? Math.max(1, differenceInCalendarMonths(lastDate, firstDate) + 1)
      : 1;
    const thisMonthCount = matchedBullets.filter(match => isSameMonth(parseISO(match.entry.date), today)).length;
    const weekdayCounts = Array.from({ length: 7 }, () => 0);
    const monthlyMonths = Array.from({ length: 12 }, (_, index) => startOfMonth(subMonths(today, 11 - index)));
    const monthlyCounts = monthlyMonths.map((month) => ({
      month,
      count: matchedBullets.filter(match => monthKey(parseISO(match.entry.date)) === monthKey(month)).length,
    }));

    matchedBullets.forEach((match) => {
      weekdayCounts[parseISO(match.entry.date).getDay()] += 1;
    });

    return {
      first,
      last,
      monthSpan,
      frequency: matchedBullets.length / monthSpan,
      thisMonthCount,
      weekdayCounts,
      monthlyCounts,
      maxWeekday: Math.max(1, ...weekdayCounts),
      maxMonth: Math.max(1, ...monthlyCounts.map(item => item.count)),
      totalEntries: groupedEntries.length,
      totalBullets: matchedBullets.length,
    };
  }, [groupedEntries, matchedBullets, today]);

  return (
    <div className="min-h-screen bg-white pb-28 font-sans">
      <main className="mx-auto max-w-[680px] px-6 py-8">
        <button
          onClick={() => router.push(`/collections?tab=${isPerson ? 'people' : 'tags'}&focus=${encodeURIComponent(normalizedName)}`)}
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[#6F7476] transition-colors hover:text-[#2F3331]"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5" />
          Collections
        </button>

        <header>
          <div className="flex items-center gap-3">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: accent.soft, color: accent.text }}
            >
              <FontAwesomeIcon icon={accent.icon} className="h-5 w-5" />
            </span>
            <h1 className="font-sans text-5xl font-bold tracking-normal text-[#151719]">
              {token}
            </h1>
          </div>
          <p className="mt-3 text-sm font-light text-[#6F7476]">
            {stats.totalBullets} {isPerson ? 'mentions' : 'uses'} across {stats.totalEntries} entries
          </p>
        </header>

        <nav className="mt-8 flex gap-1 border-b border-[#EEF0EF]">
          {(['entries', 'insight', 'details'] as TokenTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-semibold capitalize transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-[#2F3331] text-[#2F3331]'
                  : 'text-[#6F7476] hover:text-[#2F3331]'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>

        {activeTab === 'entries' && (
          <section className="mt-8">
            <ActivityHeatmap
              title="yearly heatmap"
              data={heatmapData}
              color={accent.bg}
              onDayClick={(day) => router.push(`/write?date=${day.dateKey}`)}
              getDayTitle={(day) => `${format(day.date, 'MMM d, yyyy')}${day.count > 0 ? ` ${token}` : ''}`}
            />

            <div className="mt-10 space-y-8">
              {groupedEntries.map((group) => (
                <button
                  key={group.date}
                  onClick={() => router.push(`/write?date=${group.date}`)}
                  className="block w-full text-left"
                >
                  <h2 className="font-sans text-2xl font-bold tracking-normal text-[#151719]">
                    {format(parseISO(group.date), 'MMM d, yyyy')}
                  </h2>
                  <p className="mt-0.5 text-sm font-light text-[#A3A7A8]">
                    {relativeDate(group.date)}
                  </p>
                  <div className="mt-4 space-y-3">
                    {group.bullets.map((bullet) => (
                      <div key={bullet.bulletId} className="flex items-start gap-3">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#9AA0A1]" />
                        <p className="text-base font-light leading-7 text-[#2F3331]">
                          <HighlightedText text={bullet.bulletText} interactive />
                        </p>
                      </div>
                    ))}
                  </div>
                </button>
              ))}

              {groupedEntries.length === 0 && (
                <p className="text-base italic text-[#A3A7A8]">
                  No entries for {token} yet.
                </p>
              )}
            </div>
          </section>
        )}

        {activeTab === 'insight' && (
          <section className="mt-8 space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <InsightDate label="first used" date={stats.first} />
              <InsightDate label="last used" date={stats.last} />
              <div>
                <p className="text-xs font-semibold uppercase text-[#A3A7A8]">frequency</p>
                <p className="mt-1 text-2xl font-bold text-[#2F3331]">{stats.frequency.toFixed(1)} / month</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[#A3A7A8]">{isPerson ? 'mention' : 'used'} this month</p>
                <p className="mt-1 text-2xl font-bold text-[#2F3331]">{stats.thisMonthCount}</p>
              </div>
            </div>

            <div>
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#6F7476]">
                <FontAwesomeIcon icon={faChartSimple} className="h-3.5 w-3.5" />
                weekday distribution
              </div>
              <div className="space-y-3">
                {stats.weekdayCounts.map((count, index) => (
                  <div key={dayLabels[index]} className="flex items-center gap-3">
                    <span className="w-9 text-xs font-semibold text-[#6F7476]">{dayLabels[index]}</span>
                    <div className="h-2 flex-1 rounded-full bg-[#EEF0EF]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(count / stats.maxWeekday) * 100}%`, backgroundColor: accent.bg }}
                      />
                    </div>
                    <span className="w-6 text-right text-xs font-semibold text-[#2F3331]">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#6F7476]">
                <FontAwesomeIcon icon={faChartSimple} className="h-3.5 w-3.5" />
                monthly variation
              </div>
              <div className="space-y-3">
                {stats.monthlyCounts.map(({ month, count }) => (
                  <div key={monthKey(month)} className="flex items-center gap-3">
                    <span className="w-10 text-xs font-semibold text-[#6F7476]">{format(month, 'MMM')}</span>
                    <div className="h-2 flex-1 rounded-full bg-[#EEF0EF]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(count / stats.maxMonth) * 100}%`, backgroundColor: accent.bg }}
                      />
                    </div>
                    <span className="w-6 text-right text-xs font-semibold text-[#2F3331]">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'details' && (
          <section className="mt-8 space-y-10">
            {/* Do More / Less Section */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: accent.soft, color: accent.text }}
                >
                  <FontAwesomeIcon icon={entity?.doMoreLess === 'more' ? faArrowUp : entity?.doMoreLess === 'less' ? faArrowDown : faArrowUp} className="h-3.5 w-3.5" />
                </span>
                <h2 className="font-sans text-2xl font-bold tracking-normal text-[#2F3331]">Do More / Less</h2>
              </div>

              <div className="relative inline-flex rounded-full p-1" style={{ backgroundColor: accent.soft }}>
                <button
                  onClick={() => handleToggleDoMoreLess('more')}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                    entity?.doMoreLess === 'more' ? 'shadow-sm' : 'opacity-60 hover:opacity-80'
                  }`}
                  style={{ backgroundColor: entity?.doMoreLess === 'more' ? accent.bg : 'transparent', color: accent.text }}
                >
                  <FontAwesomeIcon icon={faArrowUp} className="h-3.5 w-3.5" />
                  More
                </button>
                <button
                  onClick={() => handleToggleDoMoreLess('less')}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                    entity?.doMoreLess === 'less' ? 'shadow-sm' : 'opacity-60 hover:opacity-80'
                  }`}
                  style={{ backgroundColor: entity?.doMoreLess === 'less' ? accent.bg : 'transparent', color: accent.text }}
                >
                  <FontAwesomeIcon icon={faArrowDown} className="h-3.5 w-3.5" />
                  Less
                </button>
                {entity?.doMoreLess && (
                  <button
                    onClick={() => handleToggleDoMoreLess(null)}
                    className="ml-2 flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium opacity-50 transition-opacity hover:opacity-80"
                    style={{ color: accent.text }}
                    title="clear"
                  >
                    <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                  </button>
                )}
              </div>

              <p className="mt-4 text-sm font-light leading-6 text-[#6F7476]">
                {isPerson
                  ? 'Mark this person as "do more" or "do less" to highlight them in your lists and help you focus on the people that matter most.'
                  : 'Mark this tag as "do more" or "do less" to highlight it in your lists and help you focus on what matters.'}
              </p>
            </div>

            <DetailSection
              title="Aliases"
              icon={faLink}
              description={
                isPerson
                  ? 'Aliases help you avoid duplication of people when you use different names referring to the same person, e.g. @Michael and @Mike. Just add one of them as alias to the other and they will behave like same person in lists and stats as they should. Use aliases only for names referring to the same person. If you want to group different people together for better insights, e.g. @mom and @dad into "parents", have a look at person groups.'
                  : 'Aliases help you avoid duplication of tags when you use different names for the same topic, e.g. #work and #working. Use aliases only for names referring to the same thing. If you want to aggregate different tags together, have a look at tag groups.'
              }
            >
              <div className="flex flex-wrap gap-2">
                {aliases.map(alias => (
                  <span
                    key={alias}
                    className="rounded px-2 py-1 text-sm font-medium"
                    style={{ backgroundColor: accent.soft, color: accent.text }}
                  >
                    {isPerson ? '@' : '#'}{alias}
                  </span>
                ))}
                {aliases.length === 0 && (
                  <span className="text-sm italic text-[#A3A7A8]">no aliases yet.</span>
                )}
              </div>

              <div className="mt-5 space-y-3">
                <InlineAction
                  value={aliasInput}
                  onChange={setAliasInput}
                  onSubmit={handleAddAlias}
                  placeholder={`Add aliases, e.g. ${isPerson ? '@mike' : '#working'}`}
                  buttonLabel="Add aliases"
                />
                <InlineAction
                  value={aliasTargetInput}
                  onChange={setAliasTargetInput}
                  onSubmit={handleAddAsAlias}
                  placeholder={`Add as alias to existing ${isPerson ? '@person' : '#tag'}`}
                  buttonLabel="Add as alias"
                />
              </div>
            </DetailSection>

            <DetailSection
              title="Groups"
              icon={faCircleInfo}
              description={
                isPerson
                  ? 'Person groups come in handy if you want to keep track of a category of different people. For instance, if you want stats and insights on mentions of family members you could group @mom, @dad and @brother together. Groups aggregate different people. To link mentions that refer to essentially the same person, use aliases.'
                  : 'Tag groups come in handy if you want to keep track of a category of different tags. For instance, you can group #run, #gym and #walk into "exercise". Groups aggregate different tags. To link tags that refer to essentially the same thing, use aliases.'
              }
            >
              <div className="flex flex-wrap gap-2">
                {currentGroups.map(group => (
                  <span key={group.id} className="rounded bg-[#F2F2F3] px-2 py-1 text-sm font-semibold text-[#6F7476]">
                    {group.name}
                  </span>
                ))}
                {currentGroups.length === 0 && (
                  <span className="text-sm italic text-[#A3A7A8]">no groups yet.</span>
                )}
              </div>

              <div className="mt-5">
                <InlineAction
                  value={groupInput}
                  onChange={setGroupInput}
                  onSubmit={handleAddGroup}
                  placeholder={`Add groups, e.g. ${isPerson ? 'parents' : 'exercise'}`}
                  buttonLabel="Add groups"
                />
              </div>
            </DetailSection>
          </section>
        )}
      </main>
    </div>
  );
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeInputName = (value: string) => value.trim().replace(/^[@#]/, '').toLowerCase();

function InsightDate({ label, date }: { label: string; date: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-[#A3A7A8]">{label}</p>
      {date ? (
        <>
          <p className="mt-1 text-base font-bold text-[#2F3331]">{format(parseISO(date), 'MMM d, yyyy')}</p>
          <p className="text-xs font-light text-[#A3A7A8]">{relativeDate(date)}</p>
        </>
      ) : (
        <p className="mt-1 text-base italic text-[#A3A7A8]">not yet</p>
      )}
    </div>
  );
}

function DetailSection({
  title,
  icon,
  description,
  children,
}: {
  title: string;
  icon: IconDefinition;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <FontAwesomeIcon icon={icon} className="h-3.5 w-3.5 text-[#6F7476]" />
        <h2 className="font-sans text-2xl font-bold tracking-normal text-[#2F3331]">{title}</h2>
      </div>
      {children}
      <p className="mt-4 text-sm font-light leading-6 text-[#6F7476]">
        {description}
      </p>
    </section>
  );
}

function InlineAction({
  value,
  onChange,
  onSubmit,
  placeholder,
  buttonLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  buttonLabel: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onSubmit();
          }
        }}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-lg bg-[#F7F8F8] px-3 py-2 text-sm text-[#2F3331] placeholder-[#A3A7A8] focus:outline-none focus:ring-2 focus:ring-[#CCD0CF]"
      />
      <button
        onClick={onSubmit}
        className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#2F3331] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#151719]"
      >
        <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
        {buttonLabel}
      </button>
    </div>
  );
}
