import React, { useState, useMemo } from 'react';
import {
  X,
  Compass,
  MapPin,
  ArrowRightLeft,
  Navigation,
  Search,
  Plus,
  LocateFixed,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import {
  MAJOR_CITIES_RULER,
  INTER_CITY_MEASURE_PRESETS,
  CityRulerPreset,
} from '../data/cityRulerPresets';
import { Language } from '../types';

interface CityRulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  theme: 'light' | 'dark';
  onApplyInterCityPreset: (city1: CityRulerPreset, city2: CityRulerPreset) => void;
  onJumpToCity: (city: CityRulerPreset, createNewTrack?: boolean) => void;
  onAddCityPointToActive: (city: CityRulerPreset) => void;
}

// Great-circle distance calculation helper for distance preview
function getApproxDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export const CityRulerModal: React.FC<CityRulerModalProps> = ({
  isOpen,
  onClose,
  language,
  theme,
  onApplyInterCityPreset,
  onJumpToCity,
  onAddCityPointToActive,
}) => {
  const isUa = language === 'uk';
  const [activeTab, setActiveTab] = useState<'presets' | 'cities'>('presets');
  const [searchQuery, setSearchQuery] = useState('');

  // Custom 2-city calculator state
  const [fromCityId, setFromCityId] = useState<string>('city_kryvyi_rih');
  const [toCityId, setToCityId] = useState<string>('city_dnipro');

  const fromCity = useMemo(
    () => MAJOR_CITIES_RULER.find((c) => c.id === fromCityId) || MAJOR_CITIES_RULER[0],
    [fromCityId]
  );
  const toCity = useMemo(
    () => MAJOR_CITIES_RULER.find((c) => c.id === toCityId) || MAJOR_CITIES_RULER[1],
    [toCityId]
  );

  const calculatedDistanceKm = useMemo(() => {
    if (!fromCity || !toCity) return 0;
    return getApproxDistanceKm(fromCity.lat, fromCity.lng, toCity.lat, toCity.lng);
  }, [fromCity, toCity]);

  // Filtered cities for Tab 2
  const filteredCities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return MAJOR_CITIES_RULER;
    return MAJOR_CITIES_RULER.filter(
      (c) =>
        c.nameUa.toLowerCase().includes(q) ||
        c.nameEn.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className={`w-full max-w-xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border transition-all ${
          theme === 'light'
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-[#151a23] border-white/10 text-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className={`p-4 border-b flex items-center justify-between gap-3 ${
            theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#1a212d] border-white/10'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-500 flex items-center justify-center flex-shrink-0 shadow-xs">
              <Compass className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black truncate">
                {isUa ? 'Виміри лінійкою в містах' : 'City Ruler Measurements'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {isUa
                  ? 'Швидкі виміри між містами України або вибір окремого міста'
                  : 'Quick distance presets between Ukrainian cities & city jump'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors cursor-pointer flex-shrink-0"
            title={isUa ? 'Закрити' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          className={`px-4 pt-2.5 border-b flex gap-2 ${
            theme === 'light' ? 'border-slate-200 bg-slate-100/50' : 'border-white/5 bg-[#12161f]'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'presets'
                ? 'border-amber-500 text-amber-500 dark:text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>{isUa ? 'Виміри між містами' : 'Between Cities'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cities')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'cities'
                ? 'border-amber-500 text-amber-500 dark:text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>{isUa ? 'Перехід до міст' : 'Jump to Cities'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {activeTab === 'presets' ? (
            <>
              {/* Custom 2-city interactive ruler tool */}
              <div
                className={`p-3.5 rounded-xl border space-y-3 ${
                  theme === 'light'
                    ? 'bg-amber-50/60 border-amber-200/80'
                    : 'bg-amber-500/10 border-amber-500/20'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold text-amber-600 dark:text-amber-400 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isUa ? 'Вимір між будь-якими 2 містами' : 'Custom 2-City Measurement'}</span>
                  </span>
                  {calculatedDistanceKm > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-mono font-black text-xs shadow-xs">
                      ≈ {calculatedDistanceKm} {isUa ? 'км' : 'km'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      {isUa ? 'Місто відправлення (Звідки)' : 'From City'}
                    </label>
                    <select
                      value={fromCityId}
                      onChange={(e) => setFromCityId(e.target.value)}
                      className={`w-full px-2.5 py-1.5 rounded-lg border font-medium text-xs transition-colors ${
                        theme === 'light'
                          ? 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                          : 'bg-[#1b222e] border-white/10 text-white focus:border-amber-400'
                      }`}
                    >
                      {MAJOR_CITIES_RULER.map((c) => (
                        <option key={c.id} value={c.id}>
                          {isUa ? c.nameUa : c.nameEn} ({c.region})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      {isUa ? 'Місто прибуття (Куди)' : 'To City'}
                    </label>
                    <select
                      value={toCityId}
                      onChange={(e) => setToCityId(e.target.value)}
                      className={`w-full px-2.5 py-1.5 rounded-lg border font-medium text-xs transition-colors ${
                        theme === 'light'
                          ? 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                          : 'bg-[#1b222e] border-white/10 text-white focus:border-amber-400'
                      }`}
                    >
                      {MAJOR_CITIES_RULER.map((c) => (
                        <option key={c.id} value={c.id}>
                          {isUa ? c.nameUa : c.nameEn} ({c.region})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (fromCity && toCity) {
                      onApplyInterCityPreset(fromCity, toCity);
                      onClose();
                    }
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>
                    {isUa
                      ? `Накласти вимір: ${fromCity.nameUa} ↔ ${toCity.nameUa} (${calculatedDistanceKm} км)`
                      : `Apply Ruler: ${fromCity.nameEn} ↔ ${toCity.nameEn} (${calculatedDistanceKm} km)`}
                  </span>
                </button>
              </div>

              {/* 1-Click Popular Inter-City Presets */}
              <div className="space-y-2">
                <span className="font-bold text-slate-400 text-[11px] uppercase tracking-wider block">
                  {isUa ? 'Популярні міжміські виміри (1 клік)' : 'Popular Inter-City Presets (1-Click)'}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {INTER_CITY_MEASURE_PRESETS.map((preset) => {
                    const c1 = MAJOR_CITIES_RULER.find((c) => c.id === preset.city1Id);
                    const c2 = MAJOR_CITIES_RULER.find((c) => c.id === preset.city2Id);
                    if (!c1 || !c2) return null;
                    const dist = getApproxDistanceKm(c1.lat, c1.lng, c2.lat, c2.lng);

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          onApplyInterCityPreset(c1, c2);
                          onClose();
                        }}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                          theme === 'light'
                            ? 'bg-slate-50 border-slate-200 hover:bg-amber-50 hover:border-amber-300 text-slate-800'
                            : 'bg-[#181e29] border-white/5 hover:bg-amber-500/10 hover:border-amber-500/30 text-slate-200'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-xs block truncate">
                            {isUa ? preset.labelUa : preset.labelEn}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {c1.region} ↔ {c2.region}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-500 dark:text-amber-400 font-mono font-bold text-[11px] whitespace-nowrap flex-shrink-0">
                          {dist} {isUa ? 'км' : 'km'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Search input for cities */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    isUa
                      ? 'Пошук міста (наприклад: Дніпро, Кривий Ріг, Київ)...'
                      : 'Search city (e.g., Dnipro, Kyiv)...'
                  }
                  className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs transition-colors ${
                    theme === 'light'
                      ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                      : 'bg-[#181e29] border-white/10 text-white focus:border-amber-400'
                  }`}
                />
              </div>

              {/* List of cities */}
              <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                {filteredCities.map((city) => (
                  <div
                    key={city.id}
                    className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
                      theme === 'light'
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-[#181e29] border-white/5'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        <span className="font-extrabold text-xs">
                          {isUa ? city.nameUa : city.nameEn}
                        </span>
                        {city.isPopular && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-500">
                            {isUa ? 'Центр' : 'Hub'}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 pl-5 block">
                        {city.region} · {city.lat.toFixed(4)}, {city.lng.toFixed(4)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap pl-5 sm:pl-0">
                      <button
                        type="button"
                        onClick={() => {
                          onJumpToCity(city, false);
                          onClose();
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                          theme === 'light'
                            ? 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                            : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-200'
                        }`}
                        title={isUa ? 'Перемістити карту до міста' : 'Fly to city on map'}
                      >
                        <LocateFixed className="w-3 h-3" />
                        <span>{isUa ? 'Перейти' : 'Go'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onAddCityPointToActive(city);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 dark:text-amber-400 border border-amber-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                        title={isUa ? 'Додати місто до поточної лінійки' : 'Add city point to current ruler'}
                      >
                        <Plus className="w-3 h-3" />
                        <span>{isUa ? 'Додати точку' : '+ Point'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onJumpToCity(city, true);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors flex items-center gap-1 cursor-pointer"
                        title={isUa ? 'Почати окремий новий вимір у цьому місті' : 'Start a new measurement in this city'}
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{isUa ? 'Новий вимір' : 'New track'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className={`p-3 border-t flex items-center justify-between text-[11px] ${
            theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-[#1a212d] border-white/10 text-slate-400'
          }`}
        >
          <span>
            {isUa
              ? '💡 Нанесені точки лінійки можна вільно перетягувати або видаляти правою кнопкою миші'
              : '💡 Placed ruler points can be moved by dragging or deleted with right-click'}
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold cursor-pointer"
          >
            {isUa ? 'Закрити' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
