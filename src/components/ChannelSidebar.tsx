import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Star, Shield, Tv, Filter, X, Play } from 'lucide-react';
import { Channel } from '../types';
import { TranslationDict } from '../i18n/translations';

interface ChannelSidebarProps {
  channels: Channel[];
  selectedChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  t: TranslationDict;
}

export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
  channels,
  selectedChannel,
  onSelectChannel,
  categories,
  selectedCategory,
  onSelectCategory,
  t,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVip, setFilterVip] = useState<'all' | 'vip' | 'free'>('all');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('nivotv_favs');
      return saved ? JSON.parse(saved) : ['ch-1', 'ch-3'];
    } catch {
      return ['ch-1', 'ch-3'];
    }
  });
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [failedLogos, setFailedLogos] = useState<Record<string, boolean>>({});
  const activeItemRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to selected channel on initial load or channel switch
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedChannel?.id]);

  const toggleFavorite = (e: React.MouseEvent, channelId: string) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId];
      try {
        localStorage.setItem('nivotv_favs', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleImageError = (channelId: string) => {
    setFailedLogos((prev) => ({ ...prev, [channelId]: true }));
  };

  const filteredChannels = useMemo(() => {
    return channels.filter((ch) => {
      // Category filter
      if (selectedCategory !== 'All' && ch.groupTitle !== selectedCategory) {
        return false;
      }
      // VIP filter
      if (filterVip === 'vip' && !ch.isVip) return false;
      if (filterVip === 'free' && ch.isVip) return false;
      // Favorites filter
      if (onlyFavorites && !favorites.includes(ch.id)) return false;
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        return ch.name.toLowerCase().includes(query) || ch.groupTitle.toLowerCase().includes(query);
      }
      return true;
    });
  }, [channels, selectedCategory, filterVip, onlyFavorites, favorites, searchTerm]);

  return (
    <div
      id="channel-sidebar-container"
      className="flex flex-col h-full bg-zinc-900/90 backdrop-blur-md rounded-2xl border border-zinc-800/80 overflow-hidden shadow-xl min-h-0"
    >
      {/* Top Search & Filter Bar */}
      <div className="p-3 border-b border-zinc-800/80 space-y-2 flex-shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="channel-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-9 pr-8 py-2 bg-zinc-950/70 border border-zinc-800 focus:border-rose-500 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-zinc-400 hover:text-white transition"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Filter Pills: All, Favorites, VIP, Free */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
          <button
            onClick={() => {
              setOnlyFavorites(false);
              setFilterVip('all');
            }}
            className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition ${
              !onlyFavorites && filterVip === 'all'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
            }`}
          >
            All ({channels.length})
          </button>
          <button
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 whitespace-nowrap transition ${
              onlyFavorites
                ? 'bg-amber-500 text-black shadow-sm font-semibold'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
            }`}
          >
            <Star className="w-3 h-3 fill-current" />
            <span>{t.favorites} ({favorites.length})</span>
          </button>
          <button
            onClick={() => {
              setOnlyFavorites(false);
              setFilterVip(filterVip === 'vip' ? 'all' : 'vip');
            }}
            className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 whitespace-nowrap transition ${
              filterVip === 'vip'
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-sm font-semibold'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
            }`}
          >
            <Shield className="w-3 h-3" />
            <span>VIP</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-3 py-1.5 border-b border-zinc-800/60 flex items-center gap-1 overflow-x-auto no-scrollbar bg-zinc-950/40 flex-shrink-0">
        <button
          onClick={() => onSelectCategory('All')}
          className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap font-medium transition ${
            selectedCategory === 'All'
              ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
          }`}
        >
          {t.allCategories}
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap font-medium transition ${
              selectedCategory === cat
                ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Channel List - Independent Smooth Scroll */}
      <div
        id="channel-list-scrollable"
        className="flex-1 overflow-y-auto min-h-0 p-2 space-y-1 divide-y divide-transparent overscroll-contain"
      >
        {filteredChannels.length === 0 ? (
          <div className="py-14 text-center text-zinc-500 text-xs">
            <Tv className="w-8 h-8 mx-auto mb-2 opacity-40 text-rose-500" />
            <p className="font-medium text-zinc-400">No channels match the filter</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setOnlyFavorites(false);
                setFilterVip('all');
                onSelectCategory('All');
              }}
              className="mt-3 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredChannels.map((ch, idx) => {
            const isSelected = selectedChannel?.id === ch.id;
            const isFav = favorites.includes(ch.id);
            const hasFailedLogo = failedLogos[ch.id];

            return (
              <div
                key={ch.id}
                ref={isSelected ? activeItemRef : undefined}
                id={`channel-item-${ch.id}`}
                onClick={() => onSelectChannel(ch)}
                className={`w-full p-2.5 rounded-xl flex items-center justify-between gap-3 text-left transition-all cursor-pointer group select-none ${
                  isSelected
                    ? 'bg-rose-950/50 border border-rose-500/60 text-white shadow-md ring-1 ring-rose-500/30'
                    : 'hover:bg-zinc-800/60 text-zinc-300 border border-transparent hover:border-zinc-800'
                }`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSelectChannel(ch);
                }}
              >
                {/* Left: Number + Logo + Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span
                    className={`text-[11px] font-mono w-5 text-right flex-shrink-0 ${
                      isSelected ? 'text-rose-400 font-bold' : 'text-zinc-500'
                    }`}
                  >
                    {idx + 1}
                  </span>

                  <div className="w-9 h-9 rounded-lg bg-zinc-950 p-1 flex-shrink-0 border border-zinc-800 flex items-center justify-center overflow-hidden">
                    {ch.logo && !hasFailedLogo ? (
                      <img
                        src={ch.logo}
                        alt=""
                        className="w-full h-full object-contain"
                        onError={() => handleImageError(ch.id)}
                        loading="lazy"
                      />
                    ) : (
                      <Tv className={`w-4 h-4 ${isSelected ? 'text-rose-500' : 'text-zinc-500'}`} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className={`font-semibold text-xs truncate ${
                          isSelected ? 'text-white font-bold' : 'group-hover:text-white'
                        }`}
                      >
                        {ch.name}
                      </span>
                      {ch.isVip && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex-shrink-0">
                          VIP
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                      <span className="truncate max-w-[120px]">{ch.groupTitle}</span>
                      <span>•</span>
                      <span className="text-zinc-500">{ch.viewers || 80} {t.viewers}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Active status / Fav Star */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isSelected ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/20 border border-rose-500/30 px-1.5 py-0.5 rounded">
                      <Play className="w-2.5 h-2.5 fill-current" />
                      PLAYING
                    </span>
                  ) : (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        ch.streamHealth === 'online'
                          ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                          : ch.streamHealth === 'degraded'
                          ? 'bg-amber-500'
                          : ch.streamHealth === 'offline'
                          ? 'bg-rose-500'
                          : 'bg-zinc-600'
                      }`}
                      title={`Stream status: ${ch.streamHealth || 'unknown'}`}
                    />
                  )}

                  <button
                    onClick={(e) => toggleFavorite(e, ch.id)}
                    className="p-1 text-zinc-500 hover:text-amber-400 transition"
                    title={isFav ? 'Remove Favorite' : 'Add to Favorites'}
                    aria-label={`Favorite ${ch.name}`}
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        isFav ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Status */}
      <div className="p-2.5 border-t border-zinc-800/80 bg-zinc-950/70 text-[11px] text-zinc-400 flex items-center justify-between flex-shrink-0">
        <span>Showing {filteredChannels.length} of {channels.length}</span>
        <span className="flex items-center gap-1 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Proxy Engine Online
        </span>
      </div>
    </div>
  );
};
