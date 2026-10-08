import React, { useState } from 'react';
import { Crosshair, RefreshCw, ScrollText, ExternalLink, X, ShieldAlert } from 'lucide-react';
import { Language } from '../types';
import { KrFeedItem } from '../utils/krMonitoringService';

interface KrModeToggleProps {
  isKrMode: boolean;
  onToggle: () => void;
  threatsCount: number;
  isLoading?: boolean;
  language: Language;
  theme: 'light' | 'dark';
  onRefresh?: () => void;
  feed?: KrFeedItem[];
  lastSyncedAt?: string;
  isPanelUnlocked?: boolean;
}

export const KrModeToggle: React.FC<KrModeToggleProps> = ({
  isKrMode,
  onToggle,
  threatsCount,
  isLoading = false,
  language,
  theme,
  onRefresh,
  feed = [],
  lastSyncedAt,
  isPanelUnlocked = true,
}) => {
  const isUa = language === 'uk';
  const [showFeedModal, setShowFeedModal] = useState<boolean>(false);

  return (
    <>
      <div className="flex items-center gap-1.5">
        {/* Main КР Toggle Button */}
        <button
          type="button"
          onClick={onToggle}
          className={`px-3 py-1.5 rounded-full border shadow-[0_8px_32px_0_rgba(0,0,0,0.25)] backdrop-blur-2xl backdrop-saturate-150 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer active:scale-95 ${
            isKrMode
              ? 'bg-amber-600/90 text-white border-amber-400/80 shadow-amber-500/30 ring-1 ring-amber-400/50'
              : theme === 'light'
              ? 'bg-white/70 hover:bg-white/90 border-slate-300/80 text-slate-700 ring-1 ring-black/5'
              : 'bg-slate-900/70 hover:bg-slate-900/90 border-white/15 text-slate-300 ring-1 ring-white/10'
          }`}
          title={
            isUa
              ? isKrMode
                ? 'Моніторинг КР (@krrig_alerts) увімкнено. Клікніть для вимкнення'
                : 'Увімкнути моніторинг КР (дані @krrig_alerts)'
              : isKrMode
              ? 'KR Monitoring (@krrig_alerts) active. Click to turn off'
              : 'Enable KR Monitoring (data @krrig_alerts)'
          }
        >
          <span className="relative flex h-2 w-2">
            {isKrMode && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isKrMode ? (threatsCount > 0 ? 'bg-red-400' : 'bg-emerald-400') : 'bg-slate-400'
              }`}
            ></span>
          </span>

          <Crosshair className={`w-3.5 h-3.5 ${isKrMode ? 'text-white' : 'text-slate-400'}`} />

          <span className="tracking-wider uppercase text-[11px] font-black">КР</span>

          {isKrMode && (
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-black ${
                threatsCount > 0 ? 'bg-red-500 text-white' : 'bg-white/20 text-white'
              }`}
            >
              {threatsCount}
            </span>
          )}
        </button>

        {/* KR Intelligence / Feed Button */}
        {isPanelUnlocked && (
          <button
            type="button"
            onClick={() => setShowFeedModal((prev) => !prev)}
            className={`p-1.5 rounded-full border shadow-md backdrop-blur-md transition-all cursor-pointer active:scale-90 ${
              showFeedModal
                ? 'bg-amber-600 text-white border-amber-400 shadow-amber-500/30'
                : theme === 'light'
                ? 'bg-white/70 hover:bg-white border-slate-300/70 text-slate-700'
                : 'bg-slate-900/70 hover:bg-slate-900 border-white/15 text-slate-300'
            }`}
            title={isUa ? 'Стрічка подій КР Моніторингу' : 'KR Monitoring Feed'}
          >
            <ScrollText className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Refresh KR Data Button */}
        {isKrMode && onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className={`p-1.5 rounded-full border shadow-md backdrop-blur-md transition-all cursor-pointer active:scale-90 ${
              theme === 'light'
                ? 'bg-white/70 hover:bg-white border-slate-300/70 text-slate-700'
                : 'bg-slate-900/70 hover:bg-slate-900 border-white/15 text-slate-300'
            }`}
            title={isUa ? 'Оновити дані КР' : 'Refresh KR data'}
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        )}
      </div>

      {/* Floating Modal for KR Live Intel & Telegram Feed */}
      {showFeedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className={`w-full max-w-lg p-5 rounded-2xl shadow-2xl border ${
              theme === 'light'
                ? 'bg-white/95 border-slate-200 text-slate-800'
                : 'bg-slate-950/95 border-white/15 text-slate-100'
            } backdrop-blur-xl max-h-[85vh] flex flex-col`}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <ShieldAlert className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    {isUa ? 'КР Моніторинг' : 'KR Monitoring'}
                  </h3>
                  <a
                    href="https://t.me/krrig_alerts"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-amber-400/90 hover:text-amber-300 flex items-center gap-1 transition-colors"
                  >
                    <span>@krrig_alerts</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFeedModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status & Stats */}
            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">
                  {isUa ? 'Активні цілі КР' : 'Active KR Targets'}
                </div>
                <div className="text-base font-black text-amber-400 flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      threatsCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-400'
                    }`}
                  ></span>
                  <span>{threatsCount}</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">
                  {isUa ? 'Статус оновлення' : 'Update Status'}
                </div>
                <div className="text-xs font-semibold text-slate-200 mt-0.5 truncate">
                  {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : (isUa ? 'Синхронізовано' : 'Synced')}
                </div>
              </div>
            </div>

            {/* Event Feed List */}
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>{isUa ? 'Оперативна стрічка повідомлень' : 'Operational Event Feed'}</span>
              <span className="text-[10px] text-slate-500 lowercase font-normal">
                {feed.length} {isUa ? 'записів' : 'entries'}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {feed.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  {isUa ? 'Немає свіжих повідомлень у стрічці' : 'No recent feed messages'}
                </div>
              ) : (
                feed.map((item) => {
                  const isDanger = item.tone === 'danger';
                  return (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
                        isDanger
                          ? 'bg-red-500/10 border-red-500/30 text-red-200'
                          : 'bg-white/5 border-white/10 text-slate-300'
                      }`}
                    >
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${
                          isDanger ? 'bg-red-500/25 text-red-300' : 'bg-white/10 text-slate-400'
                        }`}
                      >
                        {item.time || '—'}
                      </span>
                      <div className="flex-1 leading-relaxed">{item.text}</div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-white/10 mt-3 flex items-center justify-between text-[11px] text-slate-400">
              <a
                href="https://t.me/krrig_alerts"
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
              >
                <span>{isUa ? 'Джерело: @krrig_alerts' : 'Source: @krrig_alerts'}</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <button
                type="button"
                onClick={() => setShowFeedModal(false)}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors cursor-pointer"
              >
                {isUa ? 'Закрити' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
