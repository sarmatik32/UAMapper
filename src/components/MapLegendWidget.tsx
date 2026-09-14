import React, { useState } from 'react';
import { MapLegendConfig, MapLegendItem } from '../types';
import { getIconSvgContent } from './IconLibrary';
import { Layers, ChevronDown, ChevronUp, Edit2, Check, Plus, Trash2, X } from 'lucide-react';

interface MapLegendWidgetProps {
  config: MapLegendConfig;
  onUpdateConfig: (config: MapLegendConfig) => void;
  language: 'uk' | 'en';
  theme: 'light' | 'dark';
  fontFamily?: string;
}

export const MapLegendWidget: React.FC<MapLegendWidgetProps> = ({
  config,
  onUpdateConfig,
  language,
  theme,
  fontFamily,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCount, setEditingCount] = useState('');

  if (!config || !config.enabled) return null;

  const isUa = language === 'uk';
  const visibleItems = config.items?.filter((it) => it.visible !== false) || [];

  const handleStartEditCount = (item: MapLegendItem) => {
    setEditingId(item.id);
    setEditingCount(item.countText || '');
  };

  const handleSaveEditCount = (id: string) => {
    const updated = (config.items || []).map((it) =>
      it.id === id ? { ...it, countText: editingCount.trim() } : it
    );
    onUpdateConfig({ ...config, items: updated });
    setEditingId(null);
  };

  const handleToggleItemVisibility = (id: string) => {
    const updated = (config.items || []).map((it) =>
      it.id === id ? { ...it, visible: !it.visible } : it
    );
    onUpdateConfig({ ...config, items: updated });
  };

  const handleRemoveItem = (id: string) => {
    const updated = (config.items || []).filter((it) => it.id !== id);
    onUpdateConfig({ ...config, items: updated });
  };

  // Position classes
  let positionClasses = 'bottom-16 left-4';
  if (config.position === 'bottom-right') positionClasses = 'bottom-16 right-4';
  else if (config.position === 'top-left') positionClasses = 'top-16 left-4';
  else if (config.position === 'top-right') positionClasses = 'top-16 right-4';

  const renderIconBadge = (item: MapLegendItem) => {
    const color = item.color || '#ef4444';
    const isLight = theme === 'light';
    const iconContainerClass = isLight
      ? 'w-8 h-8 rounded-xl flex items-center justify-center p-1 bg-white border border-slate-300 shadow-sm shrink-0'
      : 'w-8 h-8 rounded-xl flex items-center justify-center p-1 bg-slate-900/90 border border-white/20 shadow-inner backdrop-blur-md shrink-0';

    if (item.customIconUrl) {
      return (
        <div className={iconContainerClass}>
          <div
            className="w-5 h-5"
            style={{
              backgroundColor: color,
              WebkitMaskImage: `url('${item.customIconUrl}')`,
              maskImage: `url('${item.customIconUrl}')`,
              WebkitMaskSize: 'contain',
              maskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              maskPosition: 'center',
            }}
          />
        </div>
      );
    }

    if (item.iconType === 'explosion') {
      return (
        <div className={`${iconContainerClass} text-base filter drop-shadow-sm`}>
          💥
        </div>
      );
    }

    if (item.iconType === 'arrow') {
      return (
        <div className={`${iconContainerClass} font-bold text-sm`} style={{ color }}>
          ➔
        </div>
      );
    }

    if (item.iconType === 'dot') {
      return (
        <div className={iconContainerClass}>
          <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: color }} />
        </div>
      );
    }

    // Default SVG icons
    const svgString = getIconSvgContent(item.iconType || 'plane', color, isLight ? '#0f172a' : '#ffffff');
    return (
      <div className={iconContainerClass}>
        <div
          className="w-5 h-5 flex items-center justify-center drop-shadow-sm"
          dangerouslySetInnerHTML={{ __html: svgString }}
        />
      </div>
    );
  };

  const isLight = theme === 'light';

  return (
    <div
      id="map-legend-widget-container"
      className={`absolute z-[990] ${positionClasses} select-none transition-all duration-300 pointer-events-auto max-w-[340px] w-auto`}
      style={{ fontFamily: fontFamily || 'inherit' }}
    >
      {/* Apple Frosted Glass Container with Specular Highlights */}
      <div
        className={`relative rounded-[22px] overflow-hidden transition-all duration-300 backdrop-blur-2xl backdrop-saturate-150 border ${
          isLight
            ? 'bg-white/95 border-slate-300/80 shadow-[0_20px_45px_rgba(0,0,0,0.18),inset_0_1px_1px_rgba(255,255,255,1)] text-slate-900'
            : 'bg-slate-950/85 border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.25)] text-white'
        }`}
        style={{ fontFamily: fontFamily || 'inherit' }}
      >
        {/* Top Rim Specular Highlight */}
        <div
          className={`absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r ${
            isLight
              ? 'from-transparent via-white to-transparent'
              : 'from-transparent via-white/50 to-transparent'
          } pointer-events-none`}
        />

        {/* Header */}
        <div
          className={`px-3.5 py-2.5 flex items-center justify-between border-b cursor-pointer transition-colors ${
            isLight
              ? 'border-slate-200/90 bg-slate-100/90 hover:bg-slate-200/70 text-slate-900'
              : 'border-white/15 bg-white/[0.06] hover:bg-white/[0.12] text-white'
          }`}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center border shadow-sm backdrop-blur-md ${
                isLight
                  ? 'bg-blue-600/10 border-blue-600/30 text-blue-600'
                  : 'bg-amber-400/20 border-amber-400/30 text-amber-400'
              }`}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
            </div>
            <span
              className={`text-[11.5px] font-black tracking-[0.08em] uppercase ${
                isLight
                  ? 'text-slate-900'
                  : 'text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'
              }`}
              style={{ fontFamily: fontFamily || 'inherit' }}
            >
              {config.title || (isUa ? 'УМОВНІ ПОЗНАЧЕННЯ:' : 'CONVENTIONAL SIGNS:')}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10.5px] font-black px-2 py-0.5 rounded-full border shadow-sm backdrop-blur-md ${
                isLight
                  ? 'bg-slate-200 border-slate-300/80 text-slate-800'
                  : 'bg-white/15 border-white/20 text-white'
              }`}
              style={{ fontFamily: fontFamily || 'inherit' }}
            >
              {visibleItems.length}
            </span>
            <button
              type="button"
              className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                isLight
                  ? 'bg-slate-200/80 hover:bg-slate-300 border-slate-300/80 text-slate-700'
                  : 'bg-white/10 hover:bg-white/20 border border-white/20 text-white/90'
              }`}
              title={isCollapsed ? (isUa ? 'Розгорнути' : 'Expand') : (isUa ? 'Згорнути' : 'Collapse')}
            >
              {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Content Body */}
        {!isCollapsed && (
          <div className="p-2.5 space-y-2 max-h-[290px] overflow-y-auto custom-scrollbar">
            {visibleItems.length === 0 ? (
              <div
                className={`py-3 px-2 text-center text-[11px] italic ${
                  isLight ? 'text-slate-500' : 'text-slate-300'
                }`}
              >
                {isUa
                  ? 'Немає умовних позначень. Налаштуйте їх у бічній панелі або натисніть "Автозаповнити".'
                  : 'No legend items. Configure them in the sidebar.'}
              </div>
            ) : (
              visibleItems.map((item) => {
                const isEditing = editingId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-2.5 px-2.5 py-1.5 rounded-[16px] border shadow-sm backdrop-blur-md transition-all duration-200 text-xs ${
                      isLight
                        ? 'bg-slate-100/90 hover:bg-slate-200/70 border-slate-200/90 text-slate-900'
                        : 'bg-white/[0.08] hover:bg-white/[0.14] border-white/15 text-white'
                    }`}
                  >
                    {/* Left: Icon + Name */}
                    <div className="flex items-center gap-2.5 min-w-0 pr-1">
                      {renderIconBadge(item)}
                      <span
                        className={`font-bold truncate text-[12.5px] tracking-tight ${
                          isLight
                            ? 'text-slate-900 font-extrabold'
                            : 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'
                        }`}
                        style={{ fontFamily: fontFamily || 'inherit' }}
                        title={item.name}
                      >
                        {item.name || (isUa ? 'Без назви' : 'Unnamed')}
                      </span>
                    </div>

                    {/* Right: Quantity in Apple Pill Capsule (Editable) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editingCount}
                            onChange={(e) => setEditingCount(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEditCount(item.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            autoFocus
                            placeholder="3 шт"
                            className={`w-16 px-2 py-0.5 text-[11px] font-black rounded-full border focus:outline-none shadow-inner ${
                              isLight
                                ? 'bg-white border-blue-600 text-slate-900'
                                : 'bg-slate-900 border-amber-400 text-amber-300'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEditCount(item.id)}
                            className={`w-5 h-5 rounded-full flex items-center justify-center shadow-sm font-bold ${
                              isLight
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                            }`}
                            title={isUa ? 'Зберегти' : 'Save'}
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => handleStartEditCount(item)}
                          className={`group/cnt cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-full border shadow-sm backdrop-blur-lg transition-all active:scale-95 ${
                            isLight
                              ? 'bg-blue-600/10 hover:bg-blue-600/20 border-blue-600/30 hover:border-blue-600/50 text-blue-700'
                              : 'bg-amber-400/20 hover:bg-amber-400/30 border-amber-400/40 hover:border-amber-400/70 text-amber-300'
                          }`}
                          title={isUa ? 'Натисніть щоб змінити кількість' : 'Click to edit count'}
                        >
                          <span
                            className={`font-black text-[11.5px] tracking-wide ${
                              isLight
                                ? 'text-blue-700'
                                : 'text-amber-300 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]'
                            }`}
                          >
                            {item.countText || item.count || '1 шт'}
                          </span>
                          <Edit2
                            className={`w-2.5 h-2.5 opacity-0 group-hover/cnt:opacity-100 transition-opacity ${
                              isLight ? 'text-blue-600' : 'text-amber-400/70 group-hover/cnt:text-amber-300'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
