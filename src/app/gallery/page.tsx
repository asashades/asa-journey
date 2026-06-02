'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faImages,
  faBorderAll,
  faBars,
  faMagnifyingGlass,
  faChevronLeft,
  faChevronRight,
  faXmark,
  faTrash,
  faCamera,
  faArrowRight,
  faCalendarDays,
  faTimes,
  faLocationDot,
} from '@fortawesome/free-solid-svg-icons';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import type { Entry, MediaItem } from '@/types';

interface FlatMediaItem {
  id: string;
  fileKey: string;
  publicUrl: string;
  type: 'image' | 'audio';
  caption?: string;
  entryDate: string;
  bulletText?: string;
  tags: string[];
}

export default function GalleryPage() {
  const router = useRouter();
  const { entries, saveEntry } = useData();

  // Layout and filter states
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Deletion state
  const [mediaToDelete, setMediaToDelete] = useState<{ id: string; entryDate: string } | null>(null);

  // 1. Flatten all media items from entries (entry-level media + bullet-level media)
  const allMediaItems = useMemo(() => {
    const items: FlatMediaItem[] = [];

    // Sort entries descending to show latest memories first
    const sortedEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date));

    sortedEntries.forEach((entry) => {
      // Aggregate entry-level media
      if (Array.isArray(entry.media)) {
        entry.media.forEach((media) => {
          if (media.type === 'image') {
            // Find all tags in this entry's bullets as contextual tags
            const entryTags = Array.from(
              new Set(entry.bullets.flatMap((b) => b.tags || []))
            );
            items.push({
              ...media,
              entryDate: entry.date,
              tags: entryTags,
            });
          }
        });
      }

      // Aggregate bullet-level media
      if (Array.isArray(entry.bullets)) {
        entry.bullets.forEach((bullet) => {
          if (Array.isArray(bullet.media)) {
            bullet.media.forEach((media) => {
              if (media.type === 'image') {
                items.push({
                  ...media,
                  entryDate: entry.date,
                  bulletText: bullet.text,
                  tags: bullet.tags || [],
                });
              }
            });
          }
        });
      }
    });

    return items;
  }, [entries]);

  // 2. Extract all unique tags present across media-bearing entries/bullets for filters
  const availableTags = useMemo(() => {
    const tagsSet = new Set<string>();
    allMediaItems.forEach((item) => {
      item.tags.forEach((tag) => tagsSet.add(tag.toLowerCase()));
    });
    return Array.from(tagsSet).sort();
  }, [allMediaItems]);

  // 3. Filtered media list based on search and tags
  const filteredMedia = useMemo(() => {
    return allMediaItems.filter((item) => {
      // Tag filter
      if (selectedTag && !item.tags.map((t) => t.toLowerCase()).includes(selectedTag.toLowerCase())) {
        return false;
      }

      // Search query filter (matches caption, bullet text, date, or tags)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesCaption = item.caption?.toLowerCase().includes(query) || false;
        const matchesBullet = item.bulletText?.toLowerCase().includes(query) || false;
        const matchesDate = item.entryDate.includes(query) || false;
        const matchesTags = item.tags.some((t) => t.toLowerCase().includes(query));
        return matchesCaption || matchesBullet || matchesDate || matchesTags;
      }

      return true;
    });
  }, [allMediaItems, selectedTag, searchQuery]);

  // 4. Group filtered media items by month/year for sticky/clean grid headers
  const groupedMedia = useMemo(() => {
    const groups: { [key: string]: FlatMediaItem[] } = {};

    filteredMedia.forEach((item) => {
      try {
        const dateObj = parseISO(item.entryDate);
        const monthYear = format(dateObj, 'MMMM yyyy'); // e.g. "May 2026"
        if (!groups[monthYear]) {
          groups[monthYear] = [];
        }
        groups[monthYear].push(item);
      } catch (err) {
        // Fallback if date is not parseable
        const fallback = 'Other memories';
        if (!groups[fallback]) {
          groups[fallback] = [];
        }
        groups[fallback].push(item);
      }
    });

    return groups;
  }, [filteredMedia]);

  // 5. Handle Keyboard Nav for Lightbox (Left / Right / Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;

      if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : filteredMedia.length - 1));
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev !== null && prev < filteredMedia.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'Escape') {
        setLightboxIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, filteredMedia]);

  // 6. Delete media action
  const executeMediaDelete = async () => {
    if (!mediaToDelete) return;
    const { id: mediaId, entryDate } = mediaToDelete;

    const entry = entries.find((e) => e.date === entryDate);
    if (!entry) return;

    try {
      // A. If entry-level media
      if (entry.media?.some((m) => m.id === mediaId)) {
        const remainingMedia = entry.media.filter((m) => m.id !== mediaId);
        const { media, location, ...rest } = entry;
        await saveEntry({
          ...rest,
          ...(remainingMedia.length > 0 ? { media: remainingMedia } : {}),
          ...(location ? { location } : {}),
          updatedAt: new Date(),
        });
      } else {
        // B. If bullet-level media
        const updatedBullets = entry.bullets.map((bullet) => {
          if (bullet.media?.some((m) => m.id === mediaId)) {
            const remainingMedia = bullet.media.filter((m) => m.id !== mediaId);
            const { media, ...bulletRest } = bullet;
            return {
              ...bulletRest,
              ...(remainingMedia.length > 0 ? { media: remainingMedia } : {}),
            };
          }
          return bullet;
        });

        const { location, ...entryRest } = entry;
        await saveEntry({
          ...entryRest,
          bullets: updatedBullets,
          ...(location ? { location } : {}),
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
    } finally {
      // Close lightbox and clear delete target
      setLightboxIndex(null);
      setMediaToDelete(null);
    }
  };

  // Date formatter helper
  const formatDatePretty = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'EEEE, MMMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const currentMediaItem = lightboxIndex !== null ? filteredMedia[lightboxIndex] : null;

  return (
    <div className="min-h-screen bg-background pb-28 font-sans">
      <div className="max-w-[600px] mx-auto px-6 pt-8 pb-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold text-[#2F3331] mb-2 font-sans tracking-tight">
              Gallery
            </h1>
            <p className="text-[#6F7476] font-light text-sm">visual timeline of your journey</p>
          </div>
          <div className="flex bg-[#E8E9EA] p-0.5 rounded-full ring-1 ring-[#CCD0CF]/40">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 ${
                viewMode === 'grid'
                  ? 'bg-white text-[#00A963] shadow-sm'
                  : 'text-[#6F7476] hover:text-[#2F3331]'
              }`}
              title="Grid View"
            >
              <FontAwesomeIcon icon={faBorderAll} className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`p-2 w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 ${
                viewMode === 'timeline'
                  ? 'bg-white text-[#00A963] shadow-sm'
                  : 'text-[#6F7476] hover:text-[#2F3331]'
              }`}
              title="Timeline View"
            >
              <FontAwesomeIcon icon={faBars} className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Filtering Bar */}
        <div className="mb-6 space-y-3">
          {/* Search bar */}
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Search captions, tags, notes, dates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-9 bg-white border border-[#CCD0CF] rounded-full text-sm text-[#2F3331] placeholder-[#A3A7A8] focus:outline-none focus:border-[#00DC7D] focus:ring-1 focus:ring-[#00DC7D] shadow-sm transition-colors"
            />
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute left-3.5 text-[#A3A7A8] w-4 h-4"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 p-1 rounded-full text-[#A3A7A8] hover:bg-[#F2F2F3] hover:text-[#2F3331] transition-colors"
              >
                <FontAwesomeIcon icon={faTimes} className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Scrollable tags chips */}
          {availableTags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-gray-200 -mx-1 px-1">
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                  selectedTag === null
                    ? 'bg-[#E9FFF4] text-[#00A963]'
                    : 'bg-white border border-[#CCD0CF] text-[#6F7476] hover:bg-[#F2F2F3]'
                }`}
              >
                All Photos
              </button>
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                  className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-colors flex items-center gap-1 ${
                    tag === selectedTag
                      ? 'bg-[#E9FFF4] text-[#00A963] font-semibold border border-transparent'
                      : 'bg-white border border-[#CCD0CF] text-[#6F7476] hover:bg-[#F2F2F3]'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Gallery Area */}
        {filteredMedia.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-[#E4E7E6] p-8 shadow-sm">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#E9FFF4] text-[#00A963]">
              <FontAwesomeIcon icon={faCamera} className="w-7 h-7" />
            </div>
            <h3 className="mb-1 text-lg font-bold text-[#2F3331]">No memories here yet</h3>
            <p className="max-w-[320px] mb-6 text-sm text-[#6F7476] font-light leading-relaxed">
              {searchQuery || selectedTag
                ? 'No images match your search criteria. Try removing filters!'
                : 'Upload images in your daily writing logs to build your visual journal timeline.'}
            </p>
            {!searchQuery && !selectedTag && (
              <button
                onClick={() => router.push('/write')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#2F3331] text-sm font-semibold text-white transition-colors hover:bg-black shadow-md shadow-black/10"
              >
                <span>Write Today</span>
                <FontAwesomeIcon icon={faArrowRight} className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* layout A: Minimal Grid grouped by month */
          <div className="space-y-8">
            {Object.entries(groupedMedia).map(([monthYear, items]) => (
              <div key={monthYear} className="space-y-3">
                <h2 className="sticky top-0 bg-background py-2 z-10 text-xs font-bold uppercase tracking-wider text-[#6F7476] font-sans border-b border-border">
                  {monthYear}
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  {items.map((item) => {
                    // Find actual flat index in current filtered list for lightbox trigger
                    const originalIndex = filteredMedia.findIndex((fm) => fm.id === item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => setLightboxIndex(originalIndex)}
                        className="group relative aspect-square overflow-hidden rounded-xl bg-white border border-[#E4E7E6] shadow-sm cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
                      >
                        <img
                          src={item.publicUrl}
                          alt={item.caption || 'memory'}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2.5">
                          <span className="text-[10px] text-white/80 font-medium">
                            {formatDatePretty(item.entryDate).split(',')[1]?.trim() || item.entryDate}
                          </span>
                          {item.caption && (
                            <p className="text-xs text-white font-semibold truncate leading-tight mt-0.5">
                              {item.caption}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* layout B: Vertical Dashed path Timeline layout */
          <div className="relative pl-8 border-l-2 border-dashed border-[#CCD0CF] ml-4 mr-2 space-y-10 py-2">
            {filteredMedia.map((item, idx) => {
              const entry = entries.find(e => e.date === item.entryDate);
              const location = entry?.location;

              return (
                <div key={item.id} className="relative group animate-in fade-in slide-in-from-bottom-4 duration-300">
                  {/* Circle dot on the dashed line */}
                  <div className="absolute -left-[45px] top-4 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#00DC7D] shadow-sm z-10 transition-transform duration-200 group-hover:scale-110">
                    <div className="h-2 w-2 rounded-full bg-white" />
                  </div>

                  {/* Timeline Card */}
                  <div className="bg-white rounded-2xl border border-[#E4E7E6] p-5 shadow-sm hover:shadow-md transition-all duration-300">
                    {/* Card Header: Date & Location Badge */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-[#A3A7A8] font-bold block mb-0.5">
                          {formatDatePretty(item.entryDate).split(',')[0]}
                        </span>
                        <h3 className="font-bold text-base text-[#2F3331]">
                          {formatDatePretty(item.entryDate).split(',').slice(1).join(',').trim()}
                        </h3>
                      </div>
                      
                      {/* Location Badge with Click-to-Expand Coordinates details */}
                      {location && (
                        <LocationDetailSection location={location} />
                      )}
                    </div>

                    {/* Image Thumbnail with Overlay */}
                    <div
                      onClick={() => setLightboxIndex(idx)}
                      className="group/img relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-[#FAFAFA] border border-[#E4E7E6] cursor-pointer mb-4"
                    >
                      <img
                        src={item.publicUrl}
                        alt={item.caption || 'memory'}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                        loading="lazy"
                      />
                      {item.caption && (
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-8">
                          <p className="text-xs font-semibold text-white truncate">{item.caption}</p>
                        </div>
                      )}
                    </div>

                    {/* Bullet Quote Context */}
                    {item.bulletText && (
                      <div className="pl-3.5 border-l-2 border-[#00DC7D] text-[#6F7476] text-sm italic font-light mb-4">
                        "{item.bulletText}"
                      </div>
                    )}

                    {/* Footer Tags & Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#FAFAFA]">
                      {item.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              onClick={() => setSelectedTag(tag.toLowerCase())}
                              className="bg-[#F2F2F3] text-[#6F7476] text-[9px] font-semibold px-2 py-0.5 rounded-md hover:bg-[#E8E9EA] hover:text-[#2F3331] cursor-pointer transition-colors"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div />
                      )}
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/write?date=${item.entryDate}`)}
                          className="text-xs font-bold text-[#00A963] hover:text-[#00B866] transition-colors flex items-center gap-1"
                        >
                          <span>View Entry</span>
                          <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setMediaToDelete({ id: item.id, entryDate: item.entryDate })}
                          className="text-[#A3A7A8] hover:text-[#FF453A] p-1.5 rounded-full hover:bg-red-50 transition-colors"
                          title="Delete memory"
                        >
                          <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 7. Fullscreen Lightbox Modal */}
      {lightboxIndex !== null && currentMediaItem && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex flex-col justify-between animate-in fade-in duration-200">
          {/* Top Bar inside Lightbox */}
          <div className="p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/50 to-transparent">
            <div className="text-white">
              <span className="text-xs font-bold text-[#00DC7D] tracking-wider uppercase block">
                {formatDatePretty(currentMediaItem.entryDate)}
              </span>
              <span className="text-[10px] text-[#A3A7A8]">
                {lightboxIndex + 1} of {filteredMedia.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMediaToDelete({ id: currentMediaItem.id, entryDate: currentMediaItem.entryDate })}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-[#FF453A] hover:bg-white/10 transition-colors"
                title="Delete Photo"
              >
                <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLightboxIndex(null)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Central Image and Controls container */}
          <div className="relative flex-1 flex items-center justify-center px-4">
            {/* Left Nav Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : filteredMedia.length - 1));
              }}
              className="absolute left-4 w-12 h-12 rounded-full bg-black/40 text-white/80 hover:bg-black/60 hover:text-white transition-colors flex items-center justify-center z-20"
            >
              <FontAwesomeIcon icon={faChevronLeft} className="w-5 h-5" />
            </button>

            {/* Main Photo */}
            <div className="max-w-full max-h-[70vh] flex items-center justify-center relative select-none">
              <img
                src={currentMediaItem.publicUrl}
                alt={currentMediaItem.caption || 'memory'}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
              />
            </div>

            {/* Right Nav Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prev) => (prev !== null && prev < filteredMedia.length - 1 ? prev + 1 : 0));
              }}
              className="absolute right-4 w-12 h-12 rounded-full bg-black/40 text-white/80 hover:bg-black/60 hover:text-white transition-colors flex items-center justify-center z-20"
            >
              <FontAwesomeIcon icon={faChevronRight} className="w-5 h-5" />
            </button>
          </div>

          {/* Bottom Context inside Lightbox */}
          <div className="p-6 text-white bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center text-center max-w-[600px] mx-auto w-full">
            {currentMediaItem.caption && (
              <h3 className="text-lg font-bold mb-1.5 leading-snug">
                {currentMediaItem.caption}
              </h3>
            )}
            {currentMediaItem.bulletText && (
              <p className="text-sm italic font-light text-gray-300 max-w-md mb-4">
                "{currentMediaItem.bulletText}"
              </p>
            )}
            <button
              onClick={() => {
                setLightboxIndex(null);
                router.push(`/write?date=${currentMediaItem.entryDate}`);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00DC7D] hover:bg-[#00B866] text-white text-xs font-bold rounded-full transition-all shadow-lg shadow-green-500/20"
            >
              <span>View Full Entry</span>
              <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* 8. Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={mediaToDelete !== null}
        onClose={() => setMediaToDelete(null)}
        onConfirm={executeMediaDelete}
        title="Delete Photo?"
        message="Are you sure you want to delete this memory photo from your journal? This cannot be undone."
        confirmText="Delete"
        cancelText="Keep Photo"
        isDestructive={true}
      />
    </div>
  );
}

function LocationDetailSection({ location }: { location: any }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm transition-all border shrink-0 ${
          isExpanded 
            ? 'bg-[#E9FFF4] border-[#00DC7D] text-[#00A963]' 
            : 'bg-white border-[#E4E7E6] text-[#6F7476] hover:bg-[#F2F2F3]'
        }`}
        title="View location details"
      >
        <FontAwesomeIcon icon={faLocationDot} className={`w-3 h-3 ${isExpanded ? 'text-[#00A963]' : 'text-[#FF9933]'}`} />
        <span className="max-w-[100px] truncate">{location.district || 'Location'}</span>
      </button>

      {isExpanded && (
        <div className="absolute right-0 top-8 z-20 w-48 rounded-xl border border-[#E4E7E6] bg-white p-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="text-[10px] font-semibold text-[#A3A7A8] uppercase tracking-wider mb-1">Coordinates</div>
          <div className="text-xs text-[#2F3331] font-mono leading-tight mb-2.5">
            <div>Lat: {location.latitude.toFixed(4)}</div>
            <div>Lng: {location.longitude.toFixed(4)}</div>
          </div>
          <a
            href={location.mapUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1 rounded-lg bg-[#00DC7D] py-1.5 text-center text-xs font-bold text-white transition-colors hover:bg-[#00B866]"
          >
            <span>Open Maps</span>
            <FontAwesomeIcon icon={faArrowRight} className="w-2.5 h-2.5" />
          </a>
        </div>
      )}
    </div>
  );
}
