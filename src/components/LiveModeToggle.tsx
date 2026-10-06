import React from 'react';
import { Radio, RefreshCw } from 'lucide-react';
import { Language } from '../types';

interface LiveModeToggleProps {
  isLiveMode: boolean;
  onToggle: () => void;
  threatsCount: number;
  isLoading?: boolean;
  language: Language;
  theme: 'light' | 'dark';
  onRefresh?: () => void;
}

export const LiveModeToggle: React.FC<LiveModeToggleProps> = ({
  isLiveMode,
  onToggle,
  threatsCount,
  isLoading = false,
  language,
  theme,
  onRefresh,
}) => {
  const isUa = language === 'uk';

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={onToggle}
        className={`px-3 py-1.5 rounded-full border shadow-[0_8px_32px_0_rgba(0,0,0,0.25)] backdrop-blur-2xl backdrop-saturate-150 flex items-center gap-2 text-xs font-bold transition-all cursor-pointer active:scale-95 ${
          isLiveMode
            ? 'bg-red-600/90 text-white border-red-400/80 shadow-red-500/30 ring-1 ring-red-400/50'
            : theme === 'light'
            ? 'bg-white/70 hover:bg-white/90 border-slate-300/80 text-slate-700 ring-1 ring-black/5'
            : 'bg-slate-900/70 hover:bg-slate-900/90 border-white/15 text-slate-300 ring-1 ring-white/10'
        }`}
        title={
          isUa
            ? isLiveMode
              ? 'Режим Live увімкнено. Клікніть для вимкнення'
              : 'Увімкнути режим Live (загрози в реальному часі)'
            : isLiveMode
            ? 'Live mode active. Click to turn off'
            : 'Enable Live mode (real-time threats)'
        }
      >
        <span className="relative flex h-2 w-2">
          {isLiveMode && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isLiveMode ? 'bg-red-300' : 'bg-slate-400'
            }`}
          ></span>
        </span>

        <Radio className={`w-3.5 h-3.5 ${isLiveMode ? 'text-white' : 'text-slate-400'}`} />

        <span className="tracking-wider uppercase text-[11px] font-black">LIVE</span>

        {isLiveMode && (
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full font-black bg-white/20 text-white">
            {threatsCount}
          </span>
        )}
      </button>

      {isLiveMode && onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className={`p-1.5 rounded-full border shadow-md backdrop-blur-md transition-all cursor-pointer active:scale-90 ${
            theme === 'light'
              ? 'bg-white/70 hover:bg-white border-slate-300/70 text-slate-700'
              : 'bg-slate-900/70 hover:bg-slate-900 border-white/15 text-slate-300'
          }`}
          title={isUa ? 'Оновити дані Live' : 'Refresh Live data'}
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-red-400' : ''}`} />
        </button>
      )}
    </div>
  );
};
