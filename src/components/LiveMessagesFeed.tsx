import React, { useState, useMemo, useRef, useEffect } from 'react';
import { NeptunMessage, Language } from '../types';
import { Radio, ChevronRight, ChevronLeft, RefreshCw, Search, X, ArrowLeftRight, Move } from 'lucide-react';

interface LiveMessagesFeedProps {
  messages: NeptunMessage[];
  isLoading: boolean;
  onRefresh: () => void;
  language: Language;
  theme: 'light' | 'dark';
  isLiveMode: boolean;
}

export const LiveMessagesFeed: React.FC<LiveMessagesFeedProps> = ({
  messages,
  isLoading,
  onRefresh,
  language,
  theme,
  isLiveMode,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Dock side: 'left' by default to avoid overlapping right floating action buttons (Panel & Buffer)
  const [dockSide, setDockSide] = useState<'left' | 'right'>(() => {
    return (localStorage.getItem('uamapper_live_feed_dock') as 'left' | 'right') || 'left';
  });

  // Free drag offset support
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
  });

  const isUa = language === 'uk';

  const handleToggleDock = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextSide = dockSide === 'left' ? 'right' : 'left';
    setDockSide(nextSide);
    setDragOffset(null);
    localStorage.setItem('uamapper_live_feed_dock', nextSide);
  };

  // Dragging logic
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag from header, ignore inputs and buttons
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    isDraggingRef.current = true;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: dragOffset?.x ?? 0,
      initY: dragOffset?.y ?? 0,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;
    setDragOffset({
      x: dragStartRef.current.initX + deltaX,
      y: dragStartRef.current.initY + deltaY,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Filter messages by search keyword if provided
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages.slice(0, 50);
    const q = searchQuery.toLowerCase().trim();
    return messages.filter(
      (m) => m.text?.toLowerCase().includes(q) || m.channel?.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [messages, searchQuery]);

  // If Live mode is disabled, hide completely
  if (!isLiveMode) return null;

  // Base position classes:
  // When dockSide === 'left': sits on left side (top-20 left-3 sm:left-4) - completely clear of right buttons!
  // When dockSide === 'right': sits shifted (top-20 right-20 sm:right-24) - safely clear of right edge buttons!
  const positionClasses = dockSide === 'left'
    ? 'top-20 left-3 sm:left-4'
    : 'top-20 right-20 sm:right-24';

  const transformStyle = dragOffset
    ? { transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }
    : undefined;

  return (
    <div
      style={transformStyle}
      className={`absolute ${positionClasses} z-35 select-none font-sans pointer-events-auto transition-shadow duration-300`}
    >
      {isCollapsed ? (
        // Ultra-compact, subtle pill tab on the side ("локонічно майже не помітно")
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className={`group px-3 py-1.5 rounded-full border backdrop-blur-md shadow-lg flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 ${
            theme === 'light'
              ? 'bg-slate-950/60 border-slate-800/40 text-slate-200 hover:bg-slate-950/80'
              : 'bg-black/50 border-white/10 text-slate-300 hover:bg-black/75 hover:border-white/20'
          }`}
          title={isUa ? 'Відкрити оперативну стрічку повідомлень' : 'Open radar messages feed'}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <Radio className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-12 transition-transform" />
          <span className="text-[11px] font-semibold tracking-tight text-white/90">
            {isUa ? 'Стрічка' : 'Feed'}
          </span>
          {messages.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[9px] font-bold border border-cyan-500/30">
              {messages.length}
            </span>
          )}
          {dockSide === 'left' ? (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5 text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
          )}
        </button>
      ) : (
        // Expanded sleek, unobtrusive side card
        <div
          className={`w-[285px] sm:w-[315px] max-h-[46vh] sm:max-h-[50vh] flex flex-col rounded-2xl border shadow-2xl backdrop-blur-xl transition-all animate-fadeIn overflow-hidden ${
            theme === 'light'
              ? 'bg-slate-950/80 border-slate-800/60 text-slate-200'
              : 'bg-black/75 border-white/15 text-slate-200'
          }`}
        >
          {/* Header - draggable handle */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="px-3 py-2 border-b border-white/10 flex items-center justify-between bg-white/[0.04] cursor-move active:cursor-grabbing select-none"
            title={isUa ? 'Перетягуйте для переміщення стрічки' : 'Drag to reposition'}
          >
            <div className="flex items-center gap-1.5">
              <Move className="w-3 h-3 text-slate-500" />
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span className="font-extrabold text-xs tracking-tight text-white flex items-center gap-1">
                <span>{isUa ? 'Оперативна стрічка' : 'Radar Feed'}</span>
              </span>
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold">
                {messages.length}
              </span>
            </div>

            <div className="flex items-center gap-1 pointer-events-auto">
              {/* Dock position flip button */}
              <button
                type="button"
                onClick={handleToggleDock}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                title={
                  isUa
                    ? dockSide === 'left'
                      ? 'Перемістити праворуч'
                      : 'Перемістити ліворуч'
                    : dockSide === 'left'
                    ? 'Dock to right'
                    : 'Dock to left'
                }
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>

              {/* Refresh button */}
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title={isUa ? 'Оновити повідомлення' : 'Refresh messages'}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
              </button>

              {/* Collapse button */}
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title={isUa ? 'Згорнути' : 'Collapse'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick search input */}
          <div className="p-2 border-b border-white/5 bg-white/[0.01]">
            <div className="relative flex items-center">
              <Search className="w-3 h-3 text-slate-500 absolute left-2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isUa ? 'Фільтр повідомлень...' : 'Filter messages...'}
                className="w-full pl-7 pr-6 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1.5 p-0.5 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2 text-xs divide-y divide-white/5 scrollbar-thin">
            {filteredMessages.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-[11px]">
                {isLoading ? (isUa ? 'Завантаження...' : 'Loading...') : (isUa ? 'Немає нових повідомлень' : 'No messages')}
              </div>
            ) : (
              filteredMessages.map((msg, idx) => {
                const timeStr = msg.date
                  ? new Date(msg.date).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
                  : '';
                const channelClean = msg.channel?.replace(/^@/, '') || 'Radar';

                return (
                  <div
                    key={`${msg.date}_${idx}`}
                    className="pt-2 first:pt-0 group hover:bg-white/[0.04] p-1.5 rounded-xl transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1 text-[10px]">
                      <span className="font-semibold text-cyan-400/90 truncate max-w-[160px] flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-cyan-400"></span>
                        {channelClean}
                      </span>
                      {timeStr && (
                        <span className="font-mono text-slate-400 font-medium shrink-0">
                          {timeStr}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed font-normal select-text break-words">
                      {msg.text}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="px-3 py-1.5 border-t border-white/5 bg-white/[0.02] flex items-center justify-between text-[10px] text-slate-400">
            <span className="truncate">{isUa ? 'Інформація з відкритих джерел' : 'Open-source intelligence'}</span>
            <span className="flex items-center gap-1 font-mono text-[9px] text-slate-400 shrink-0 ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>LIVE</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
