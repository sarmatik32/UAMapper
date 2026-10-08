import React, { useState } from 'react';
import {
  SlidersHorizontal,
  RotateCcw,
  X,
  Navigation,
  CircleDot,
  ShieldAlert,
  Tag,
  Palette,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { IconPreset, Language } from '../types';
import { ICON_TYPES } from './IconLibrary';
import {
  LIVE_THREAT_CATEGORIES,
  DEFAULT_LIVE_ICON_MAPPING,
  DEFAULT_UPLOADED_ICONS,
  renderLiveIconInnerHtml,
  renderDirectionLineHtml,
  renderLiveZoneHtml,
} from '../utils/liveIconConfig';

interface LiveIconSettingsPanelProps {
  language: Language;
  theme: 'light' | 'dark';
  customLibrary: { id: string; name: string; dataUrl: string }[];
  iconMapping: Record<string, string>;
  onIconMappingChange: (mapping: Record<string, string>) => void;
  iconPresets: Record<string, IconPreset>;
  onUpdateIconPreset: (iconIdOrType: string, updates: Partial<IconPreset>) => void;
  onResetToDefaults?: () => void;
  onClose?: () => void;
  autoHighlightLiveHromadas?: boolean;
  onToggleAutoHighlightLiveHromadas?: () => void;
}

export const LiveIconSettingsPanel: React.FC<LiveIconSettingsPanelProps> = ({
  language,
  theme,
  customLibrary = [],
  iconMapping = {},
  onIconMappingChange,
  iconPresets = {},
  onUpdateIconPreset,
  onResetToDefaults,
  onClose,
  autoHighlightLiveHromadas = true,
  onToggleAutoHighlightLiveHromadas,
}) => {
  const isUa = language === 'uk';
  const [selectedThreatId, setSelectedThreatId] = useState<string>('uav');

  // Accordion open/collapse states for settings sub-items
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    icon: true,       // 1. Icon & appearance (open by default)
    direction: false, // 2. Direction line & arrow (collapsed)
    zone: false,      // 3. Tactical danger zone (collapsed)
    label: false,     // 4. Label position (collapsed)
    hromadas: false,  // 5. Threat hromadas auto-highlight (collapsed)
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const allCollapsed = Object.values(openSections).every((v) => !v);
  const handleToggleAllSections = () => {
    const nextVal = allCollapsed;
    setOpenSections({
      icon: nextVal,
      direction: nextVal,
      zone: nextVal,
      label: nextVal,
      hromadas: nextVal,
    });
  };

  const currentCategory =
    LIVE_THREAT_CATEGORIES.find((c) => c.id === selectedThreatId) || LIVE_THREAT_CATEGORIES[0];
  const activeIconId =
    iconMapping[currentCategory.id] ||
    currentCategory.fallbackIcon ||
    DEFAULT_LIVE_ICON_MAPPING[currentCategory.id] ||
    'uav-kamikaze';

  const preset = iconPresets[activeIconId] || iconPresets[currentCategory.id] || {};
  const currentColor = preset.color || currentCategory.defaultColor;
  const currentBorderColor = preset.borderColor || currentCategory.defaultBorderColor;
  const currentSize =
    Number.isFinite(Number(preset.size)) && Number(preset.size) > 0
      ? Math.max(20, Math.min(96, Number(preset.size)))
      : 36;
  const currentRotation = Number.isFinite(Number(preset.rotation))
    ? Math.max(-180, Math.min(180, Number(preset.rotation)))
    : 0;
  const currentLineWidth =
    Number.isFinite(Number(preset.lineWidth)) && Number(preset.lineWidth) >= 0
      ? Math.max(0, Math.min(6, Number(preset.lineWidth)))
      : 1.5;

  const currentLineType = preset.directionLineType || 'solid';
  const currentLineLength =
    Number.isFinite(Number(preset.directionLineLength)) && Number(preset.directionLineLength) > 0
      ? Math.max(10, Math.min(100, Number(preset.directionLineLength)))
      : 32;
  const currentDirectionLineWidth =
    Number.isFinite(Number(preset.directionLineWidth)) && Number(preset.directionLineWidth) > 0
      ? Math.max(1, Math.min(6, Number(preset.directionLineWidth)))
      : 2.5;
  const currentDirectionLineOffset = Number.isFinite(Number(preset.directionLineOffset))
    ? Number(preset.directionLineOffset)
    : 0;

  // Combine user custom uploads with public/img pre-loaded images
  const allCustomIcons = [
    ...DEFAULT_UPLOADED_ICONS.filter(
      (def) =>
        !customLibrary.some(
          (c) => c.id === def.id || c.name === def.name || c.dataUrl === def.dataUrl
        )
    ),
    ...customLibrary,
  ];

  // Zone parameters
  const currentHasZone = Boolean(preset.hasZone);
  const currentZoneSize =
    Number.isFinite(Number(preset.zoneSize)) && Number(preset.zoneSize) > 0
      ? Math.max(20, Math.min(260, Number(preset.zoneSize)))
      : 70;
  const currentZoneColor = preset.zoneColor || currentColor;
  const currentZoneBorderStyle = preset.zoneBorderStyle || 'dashed';
  const currentZoneOpacity = Number.isFinite(Number(preset.zoneOpacity))
    ? Math.max(0.05, Math.min(0.6, Number(preset.zoneOpacity)))
    : 0.18;

  // Label position
  const currentLabelPosition = preset.labelPosition || 'auto';

  const handleSelectIcon = (threatId: string, iconId: string) => {
    const next = { ...iconMapping, [threatId]: iconId };
    onIconMappingChange(next);
  };

  const handleUpdateCurrentPreset = (updates: Partial<IconPreset>) => {
    onUpdateIconPreset(activeIconId, updates);
    onUpdateIconPreset(currentCategory.id, updates);
  };

  const handleApplyZoneToAll = () => {
    LIVE_THREAT_CATEGORIES.forEach((cat) => {
      const catIconId = iconMapping[cat.id] || cat.fallbackIcon;
      const zoneUpdates: Partial<IconPreset> = {
        hasZone: currentHasZone,
        zoneSize: currentZoneSize,
        zoneColor: currentZoneColor,
        zoneBorderStyle: currentZoneBorderStyle,
        zoneOpacity: currentZoneOpacity,
      };
      onUpdateIconPreset(catIconId, zoneUpdates);
      onUpdateIconPreset(cat.id, zoneUpdates);
    });
  };

  // Preview HTML
  const previewHtml = renderLiveIconInnerHtml(
    activeIconId,
    {
      color: currentColor,
      borderColor: currentBorderColor,
      size: currentSize,
      rotation: currentRotation,
      lineWidth: currentLineWidth,
    },
    allCustomIcons,
    currentColor
  );

  const previewDirectionLineHtml = renderDirectionLineHtml(
    0, // Direction 0 deg pointing straight up
    currentLineType,
    Math.min(22, Math.round(currentLineLength * 0.7)),
    currentDirectionLineWidth,
    currentColor,
    Math.min(32, currentSize),
    currentDirectionLineOffset
  );

  const previewZoneHtml = renderLiveZoneHtml(
    currentHasZone,
    Math.min(58, Math.round(currentZoneSize * 0.65)),
    currentZoneColor,
    currentZoneBorderStyle,
    currentZoneOpacity
  );

  return (
    <div className={`flex flex-col text-xs ${theme === 'light' ? 'text-slate-800' : 'text-slate-100'}`}>
      {/* Header if onClose provided */}
      {onClose && (
        <div className="flex items-center justify-between pb-2.5 border-b border-white/10 mb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-none">
                {isUa ? 'Налаштування іконок Live' : 'Live Mode Icons Settings'}
              </h3>
              <p className="text-[10px] opacity-60 mt-0.5">
                {isUa ? 'Іконки, лінії курсу, тактичні зони та підписи' : 'Icons, course lines, tactical zones & labels'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleToggleAllSections}
              className="text-[10px] text-slate-400 hover:text-white px-2 py-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
              title={isUa ? 'Згорнути або розгорнути всі секції' : 'Collapse or expand all sections'}
            >
              {allCollapsed ? (isUa ? 'Розгорнути всі' : 'Expand all') : (isUa ? 'Згорнути всі' : 'Collapse all')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 opacity-70 hover:opacity-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Threat Category Tabs / Selector */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] font-semibold opacity-70">
            {isUa ? 'Оберіть тип загрози:' : 'Select threat type:'}
          </label>
        </div>
        <div className="grid grid-cols-3 gap-1 max-h-28 overflow-y-auto pr-0.5 custom-scrollbar">
          {LIVE_THREAT_CATEGORIES.map((cat) => {
            const isSelected = cat.id === selectedThreatId;
            const mappedId = iconMapping[cat.id] || cat.fallbackIcon;
            const isCustom = customLibrary.some((i) => i.id === mappedId);

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedThreatId(cat.id)}
                className={`p-1.5 rounded-lg border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-red-500/20 border-red-500/70 shadow-sm ring-1 ring-red-500/40 text-white font-bold'
                    : theme === 'light'
                    ? 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-700'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                }`}
              >
                <span className="font-bold text-[10px] truncate leading-tight">
                  {isUa ? cat.labelUa.split(' ')[0] : cat.labelEn.split(' ')[0]}
                </span>
                <span className="text-[9px] opacity-60 truncate">
                  {isCustom ? (isUa ? '★ Власна' : '★ Custom') : (isUa ? 'Стандартна' : 'Standard')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Target Banner & Real-Time Preview Card */}
      <div
        className={`p-2.5 rounded-xl border mb-2.5 flex items-center justify-between gap-3 ${
          theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-white/10'
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="font-bold text-xs truncate">
            {isUa ? currentCategory.labelUa : currentCategory.labelEn}
          </div>
          <div className="text-[10px] opacity-60 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>
              {isUa ? 'Тип:' : 'Type:'} <code className="font-mono text-red-400 font-bold">{currentCategory.id}</code>
            </span>
            <span>•</span>
            <span>{currentSize}px</span>
            <span>•</span>
            <span className="capitalize">{currentLineType}</span>
          </div>
        </div>

        {/* Interactive Preview Box */}
        <div className="w-14 h-14 rounded-xl bg-black/65 border border-white/15 flex items-center justify-center relative shadow-inner overflow-hidden flex-shrink-0">
          {/* Tactical Danger Zone in preview */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            dangerouslySetInnerHTML={{ __html: previewZoneHtml }}
          />
          {/* Steady Direction Line in preview */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            dangerouslySetInnerHTML={{ __html: previewDirectionLineHtml }}
          />
          {/* Rotating Icon */}
          <div
            style={{
              width: `${Math.min(30, currentSize)}px`,
              height: `${Math.min(30, currentSize)}px`,
              transform: `rotate(${currentRotation}deg)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              zIndex: 2,
            }}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>

      {/* Accordion / Collapsible Sub-items (Скривающі підпункти) */}
      <div className="space-y-2 mb-2.5">
        {/* SUB-ITEM 1: Вигляд іконки (символ, колір, розмір) */}
        <div className={`rounded-xl border overflow-hidden transition-all ${
          theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/50 border-white/10'
        }`}>
          <button
            type="button"
            onClick={() => toggleSection('icon')}
            className={`w-full p-2.5 flex items-center justify-between text-left transition-colors cursor-pointer select-none ${
              openSections.icon ? (theme === 'light' ? 'bg-slate-100/70' : 'bg-white/5') : ''
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Palette className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="font-bold text-[11px] truncate">
                {isUa ? '1. Вигляд іконки (символ, колір, розмір)' : '1. Icon Appearance (symbol, color, size)'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="w-3 h-3 rounded-full border border-white/30" style={{ backgroundColor: currentColor }}></span>
              <span className="font-mono text-[9px] text-slate-400">{currentSize}px</span>
              {openSections.icon ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
            </div>
          </button>

          {openSections.icon && (
            <div className="p-3 border-t border-white/10 space-y-2.5 animate-fade-in">
              {/* Icon Selection Dropdown */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold opacity-70 flex items-center justify-between">
                  <span>{isUa ? 'Вибір символу / зображення:' : 'Select icon symbol / image:'}</span>
                  {customLibrary.length > 0 && (
                    <span className="text-[9px] text-emerald-400 font-mono">
                      {customLibrary.length} {isUa ? 'користувацьких' : 'custom'}
                    </span>
                  )}
                </label>
                <select
                  value={activeIconId}
                  onChange={(e) => handleSelectIcon(currentCategory.id, e.target.value)}
                  className={`w-full text-[11px] rounded-lg border px-2.5 py-1.5 outline-none font-medium cursor-pointer ${
                    theme === 'light'
                      ? 'bg-slate-50 border-slate-300 text-slate-800'
                      : 'bg-slate-950 border-white/15 text-slate-100'
                  }`}
                >
                  {allCustomIcons.length > 0 && (
                    <optgroup label={isUa ? '─── ВЛАСНІ ТА ЗАВАНТАЖЕНІ ІКОНКИ ───' : '─── CUSTOM / UPLOADED ICONS ───'}>
                      {allCustomIcons.map((item) => (
                        <option key={item.id} value={item.id}>
                          ★ {item.name}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  <optgroup label={isUa ? '─── СТАНДАРТНІ ІКОНКИ ───' : '─── STANDARD ICONS ───'}>
                    {ICON_TYPES.map((icon) => (
                      <option key={icon.id} value={icon.id}>
                        {isUa ? icon.nameUa : icon.nameEn}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Color & Border Color Controls */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold opacity-70 block mb-1">
                    {isUa ? 'Колір іконки:' : 'Icon Color:'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={currentColor.startsWith('#') ? currentColor : currentCategory.defaultColor}
                      onChange={(e) => handleUpdateCurrentPreset({ color: e.target.value })}
                      className="w-7 h-7 rounded-lg cursor-pointer border border-white/20 p-0 bg-transparent"
                    />
                    <span className="font-mono text-[10px] opacity-80 uppercase">
                      {currentColor}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold opacity-70 block mb-1">
                    {isUa ? 'Колір обводки:' : 'Outline Color:'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={currentBorderColor.startsWith('#') ? currentBorderColor : '#ffffff'}
                      onChange={(e) => handleUpdateCurrentPreset({ borderColor: e.target.value })}
                      className="w-7 h-7 rounded-lg cursor-pointer border border-white/20 p-0 bg-transparent"
                    />
                    <span className="font-mono text-[10px] opacity-80 uppercase">
                      {currentBorderColor}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sliders: Size, Rotation, Outline Width */}
              <div className="space-y-2 pt-1 border-t border-white/10">
                {/* Size */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-semibold opacity-70 mb-0.5">
                    <span>{isUa ? 'Розмір іконки:' : 'Icon Size:'}</span>
                    <span className="font-mono text-slate-200">{currentSize} px</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="96"
                    step="1"
                    value={currentSize}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      handleUpdateCurrentPreset({ size: Number.isFinite(val) ? val : 36 });
                    }}
                    className="w-full h-1.5 rounded-lg appearance-none bg-slate-700 accent-red-500 cursor-pointer"
                  />
                </div>

                {/* Rotation */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-semibold opacity-70 mb-0.5">
                    <span>{isUa ? 'Базовий поворот:' : 'Base Rotation:'}</span>
                    <span className="font-mono text-slate-200">{currentRotation}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={currentRotation}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      handleUpdateCurrentPreset({ rotation: Number.isFinite(val) ? val : 0 });
                    }}
                    className="w-full h-1.5 rounded-lg appearance-none bg-slate-700 accent-red-500 cursor-pointer"
                  />
                </div>

                {/* Outline thickness */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-semibold opacity-70 mb-0.5">
                    <span>{isUa ? 'Товщина обводки:' : 'Outline Width:'}</span>
                    <span className="font-mono text-slate-200">{currentLineWidth} px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="6"
                    step="0.5"
                    value={currentLineWidth}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      handleUpdateCurrentPreset({ lineWidth: Number.isFinite(val) ? val : 1.5 });
                    }}
                    className="w-full h-1.5 rounded-lg appearance-none bg-slate-700 accent-red-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SUB-ITEM 2: Лінія напрямку (курс цілі) */}
        <div className={`rounded-xl border overflow-hidden transition-all ${
          theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/50 border-white/10'
        }`}>
          <button
            type="button"
            onClick={() => toggleSection('direction')}
            className={`w-full p-2.5 flex items-center justify-between text-left transition-colors cursor-pointer select-none ${
              openSections.direction ? (theme === 'light' ? 'bg-slate-100/70' : 'bg-white/5') : ''
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Navigation className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="font-bold text-[11px] truncate">
                {isUa ? '2. Лінія напрямку (курс цілі)' : '2. Direction Line & Arrow'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">
                {currentLineType === 'none'
                  ? (isUa ? 'Вимкнено' : 'Off')
                  : currentLineType === 'arrow'
                  ? (isUa ? 'Стрілка' : 'Arrow')
                  : currentLineType}
              </span>
              {openSections.direction ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
            </div>
          </button>

          {openSections.direction && (
            <div className="p-3 border-t border-white/10 space-y-2.5 animate-fade-in">
              {/* Line Type */}
              <div>
                <div className="text-[10px] font-semibold opacity-70 mb-1">
                  {isUa ? 'Тип лінії або стрілки:' : 'Line or arrow type:'}
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'solid', labelUa: 'Суцільна', labelEn: 'Solid' },
                    { id: 'arrow', labelUa: 'Стрілка', labelEn: 'Arrow' },
                    { id: 'dashed', labelUa: 'Пунктир', labelEn: 'Dashed' },
                    { id: 'dotted', labelUa: 'Крапки', labelEn: 'Dotted' },
                    { id: 'gradient', labelUa: 'Градієнт', labelEn: 'Gradient' },
                    { id: 'none', labelUa: 'Вимкнено', labelEn: 'None' },
                  ].map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => handleUpdateCurrentPreset({ directionLineType: style.id as any })}
                      className={`py-1 px-1.5 rounded-lg border text-[10px] font-medium transition-all cursor-pointer text-center ${
                        currentLineType === style.id
                          ? 'bg-red-500/25 border-red-500/70 text-white font-bold ring-1 ring-red-500/40'
                          : theme === 'light'
                          ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {isUa ? style.labelUa : style.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              {currentLineType !== 'none' && (
                <div className="space-y-2 pt-1 border-t border-white/10">
                  {/* Line Length */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-semibold opacity-70 mb-0.5">
                      <span>{isUa ? 'Довжина лінії:' : 'Line Length:'}</span>
                      <span className="font-mono text-slate-200">{currentLineLength} px</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="2"
                      value={currentLineLength}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        handleUpdateCurrentPreset({ directionLineLength: Number.isFinite(val) ? val : 32 });
                      }}
                      className="w-full h-1.5 rounded-lg appearance-none bg-slate-700 accent-red-500 cursor-pointer"
                    />
                  </div>

                  {/* Line Width */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-semibold opacity-70 mb-0.5">
                      <span>{isUa ? 'Товщина лінії:' : 'Line Thickness:'}</span>
                      <span className="font-mono text-slate-200">{currentDirectionLineWidth} px</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="6"
                      step="0.5"
                      value={currentDirectionLineWidth}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        handleUpdateCurrentPreset({ directionLineWidth: Number.isFinite(val) ? val : 2.5 });
                      }}
                      className="w-full h-1.5 rounded-lg appearance-none bg-slate-700 accent-red-500 cursor-pointer"
                    />
                  </div>

                  {/* Line Offset from icon */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-semibold opacity-70 mb-0.5">
                      <span>{isUa ? 'Відступ лінії від корпусу іконки:' : 'Line Offset from Icon Border:'}</span>
                      <span className="font-mono text-slate-200">{currentDirectionLineOffset} px</span>
                    </div>
                    <input
                      type="range"
                      min="-8"
                      max="16"
                      step="1"
                      value={currentDirectionLineOffset}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        handleUpdateCurrentPreset({ directionLineOffset: Number.isFinite(val) ? val : 0 });
                      }}
                      className="w-full h-1.5 rounded-lg appearance-none bg-slate-700 accent-red-500 cursor-pointer"
                    />
                    <span className="text-[9px] opacity-60 block mt-0.5">
                      {isUa
                        ? '0 px — лінія виходить строго від зовнішнього контуру іконки без проміжку'
                        : '0 px — line starts right at the outer edge of the icon'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SUB-ITEM 3: Тактична зона (радіус небезпеки) */}
        <div className={`rounded-xl border overflow-hidden transition-all ${
          theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/50 border-white/10'
        }`}>
          <button
            type="button"
            onClick={() => toggleSection('zone')}
            className={`w-full p-2.5 flex items-center justify-between text-left transition-colors cursor-pointer select-none ${
              openSections.zone ? (theme === 'light' ? 'bg-slate-100/70' : 'bg-white/5') : ''
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <CircleDot className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="font-bold text-[11px] truncate">
                {isUa ? '3. Тактична зона (радіус небезпеки)' : '3. Tactical Zone (Danger Radius)'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                currentHasZone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-slate-400'
              }`}>
                {currentHasZone ? `${currentZoneSize}px` : (isUa ? 'Вимкнено' : 'Off')}
              </span>
              {openSections.zone ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
            </div>
          </button>

          {openSections.zone && (
            <div className="p-3 border-t border-white/10 space-y-2.5 animate-fade-in">
              {/* Toggle Zone */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold opacity-75">
                  {isUa ? 'Відображати зону навколо цілі:' : 'Show zone around target:'}
                </span>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={currentHasZone}
                    onChange={(e) => handleUpdateCurrentPreset({ hasZone: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-7 h-3.5 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-red-500"></div>
                </label>
              </div>

              {currentHasZone && (
                <div className="space-y-2 pt-1 border-t border-white/10 animate-fade-in">
                  {/* Zone Size */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-semibold opacity-70 mb-0.5">
                      <span>{isUa ? 'Діаметр зони:' : 'Zone Diameter:'}</span>
                      <span className="font-mono text-slate-200">{currentZoneSize} px</span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="260"
                      step="5"
                      value={currentZoneSize}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        handleUpdateCurrentPreset({ zoneSize: Number.isFinite(val) ? val : 70 });
                      }}
                      className="w-full h-1.5 rounded-lg appearance-none bg-slate-700 accent-red-500 cursor-pointer"
                    />
                  </div>

                  {/* Zone Color & Opacity */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold opacity-70 block mb-1">
                        {isUa ? 'Колір зони:' : 'Zone Color:'}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={currentZoneColor.startsWith('#') ? currentZoneColor : currentColor}
                          onChange={(e) => handleUpdateCurrentPreset({ zoneColor: e.target.value })}
                          className="w-7 h-7 rounded-lg cursor-pointer border border-white/20 p-0 bg-transparent"
                        />
                        <span className="font-mono text-[10px] opacity-80 uppercase">
                          {currentZoneColor}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[10px] font-semibold opacity-70 mb-1">
                        <span>{isUa ? 'Прозорість:' : 'Opacity:'}</span>
                        <span className="font-mono text-slate-200">{Math.round(currentZoneOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="0.55"
                        step="0.05"
                        value={currentZoneOpacity}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          handleUpdateCurrentPreset({ zoneOpacity: Number.isFinite(val) ? val : 0.18 });
                        }}
                        className="w-full h-1.5 rounded-lg appearance-none bg-slate-700 accent-red-500 cursor-pointer mt-1"
                      />
                    </div>
                  </div>

                  {/* Zone Border Style */}
                  <div>
                    <div className="text-[10px] font-semibold opacity-70 mb-1">
                      {isUa ? 'Контур зони:' : 'Zone Outline:'}
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: 'dashed', labelUa: 'Пунктир', labelEn: 'Dashed' },
                        { id: 'solid', labelUa: 'Суцільний', labelEn: 'Solid' },
                        { id: 'dotted', labelUa: 'Крапки', labelEn: 'Dotted' },
                      ].map((style) => (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => handleUpdateCurrentPreset({ zoneBorderStyle: style.id as any })}
                          className={`py-1 px-1.5 rounded-lg border text-[10px] font-medium transition-all cursor-pointer text-center ${
                            currentZoneBorderStyle === style.id
                              ? 'bg-red-500/25 border-red-500/70 text-white font-bold ring-1 ring-red-500/40'
                              : theme === 'light'
                              ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {isUa ? style.labelUa : style.labelEn}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Apply Zone to All Threats Button */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-white/10">
                    <span className="text-[10px] opacity-75">
                      {isUa ? 'Поширити на всі загрози:' : 'Apply to all threats:'}
                    </span>
                    <button
                      type="button"
                      onClick={handleApplyZoneToAll}
                      className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/35 text-red-300 border border-red-500/40 text-[10px] font-bold cursor-pointer transition-all active:scale-95"
                    >
                      {isUa ? 'Застосувати до всіх' : 'Apply to all'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SUB-ITEM 4: Розміщення підпису цілі */}
        <div className={`rounded-xl border overflow-hidden transition-all ${
          theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/50 border-white/10'
        }`}>
          <button
            type="button"
            onClick={() => toggleSection('label')}
            className={`w-full p-2.5 flex items-center justify-between text-left transition-colors cursor-pointer select-none ${
              openSections.label ? (theme === 'light' ? 'bg-slate-100/70' : 'bg-white/5') : ''
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Tag className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="font-bold text-[11px] truncate">
                {isUa ? '4. Розміщення підпису цілі (назва, швидкість)' : '4. Threat Label Placement'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-slate-300 capitalize">
                {currentLabelPosition === 'auto' ? (isUa ? 'Авто' : 'Auto') : currentLabelPosition}
              </span>
              {openSections.label ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
            </div>
          </button>

          {openSections.label && (
            <div className="p-3 border-t border-white/10 space-y-2 animate-fade-in">
              <div className="text-[10px] font-semibold opacity-70 mb-0.5">
                {isUa ? 'Оберіть сектор розташування підпису:' : 'Select label placement sector:'}
              </div>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'auto', labelUa: 'Авто (без накладок)', labelEn: 'Auto (opposite)' },
                  { id: 'top', labelUa: 'Зверху', labelEn: 'Top' },
                  { id: 'bottom', labelUa: 'Знизу', labelEn: 'Bottom' },
                  { id: 'left', labelUa: 'Зліва', labelEn: 'Left' },
                  { id: 'right', labelUa: 'Справа', labelEn: 'Right' },
                  { id: 'none', labelUa: 'Приховати', labelEn: 'Hide' },
                ].map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => handleUpdateCurrentPreset({ labelPosition: pos.id as any })}
                    className={`py-1.5 px-1 rounded-lg border text-[9px] font-medium transition-all cursor-pointer text-center ${
                      currentLabelPosition === pos.id
                        ? 'bg-red-500/25 border-red-500/70 text-white font-bold ring-1 ring-red-500/40'
                        : theme === 'light'
                        ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {isUa ? pos.labelUa : pos.labelEn}
                  </button>
                ))}
              </div>
              <p className="text-[9px] opacity-60 leading-tight pt-1">
                {isUa
                  ? 'ℹ️ Режим «Авто» динамічно розміщує підпис у протилежному секторі від стрілки курсу, виключаючи будь-яке накладання тексту на лінію польоту.'
                  : 'ℹ️ "Auto" places the label opposite to the heading line, preventing any overlap.'}
              </p>
            </div>
          )}
        </div>

        {/* SUB-ITEM 5: Авто-підсвітка громад де загрози (якщо є проп) */}
        {onToggleAutoHighlightLiveHromadas && (
          <div className={`rounded-xl border overflow-hidden transition-all ${
            theme === 'light' ? 'bg-amber-50/50 border-amber-200/70' : 'bg-amber-950/20 border-amber-500/30'
          }`}>
            <button
              type="button"
              onClick={() => toggleSection('hromadas')}
              className={`w-full p-2.5 flex items-center justify-between text-left transition-colors cursor-pointer select-none ${
                openSections.hromadas ? (theme === 'light' ? 'bg-amber-100/50' : 'bg-amber-900/20') : ''
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="font-bold text-[11px] truncate">
                  {isUa ? '5. Авто-підсвітка громад де загрози' : '5. Threat Hromadas Auto-Highlight'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  autoHighlightLiveHromadas ? 'bg-amber-500/30 text-amber-300' : 'bg-white/10 text-slate-400'
                }`}>
                  {autoHighlightLiveHromadas ? (isUa ? 'Увімкнено' : 'On') : (isUa ? 'Вимкнено' : 'Off')}
                </span>
                {openSections.hromadas ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
              </div>
            </button>

            {openSections.hromadas && (
              <div className="p-3 border-t border-amber-500/20 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="pr-2">
                    <div className="text-[11px] font-bold leading-tight">
                      {isUa ? 'Підсвічувати межі громад з цілями' : 'Highlight community borders with targets'}
                    </div>
                    <div className="text-[9px] opacity-70 leading-tight mt-0.5">
                      {isUa
                        ? 'Автоматично підсвічує контури ОТГ де зараз зафіксовано ворожі об’єкти'
                        : 'Automatically highlights polygons of territories currently having threat targets'}
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={autoHighlightLiveHromadas}
                      onChange={() => onToggleAutoHighlightLiveHromadas()}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Info & Reset */}
      <div className="flex items-center justify-between pt-1 border-t border-white/10">
        <p className="text-[10px] opacity-60 leading-tight">
          {isUa
            ? '✓ Зміни застосовуються до карти миттєво'
            : '✓ Changes apply to the live map instantly'}
        </p>

        {onResetToDefaults && (
          <button
            type="button"
            onClick={onResetToDefaults}
            className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 font-medium py-1 px-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{isUa ? 'Скинути' : 'Reset'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
