import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Radio,
  RefreshCw,
  Sliders,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Search,
  MapPin,
  Clock,
  Layers,
  Eye,
  EyeOff,
  Activity,
  ShieldAlert,
} from 'lucide-react';
import { AirAlert, Language } from '../types';
import { formatAlertDuration, formatTimeOnly, getAlertVisuals } from '../utils/alertsService';

interface AirAlertsPanelProps {
  alerts: AirAlert[];
  isLoading: boolean;
  lastUpdated: string | null;
  showAlerts: boolean;
  onToggleShowAlerts: () => void;
  showAlertPolygons: boolean;
  onToggleShowAlertPolygons: () => void;
  showAlertMarkers: boolean;
  onToggleShowAlertMarkers: () => void;
  alertsOpacity: number;
  onChangeAlertsOpacity: (opacity: number) => void;
  alertsStrokeWidth?: number;
  onChangeAlertsStrokeWidth?: (width: number) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onRefresh: () => void;
  language: Language;
  onSelectAlert: (alert: AirAlert) => void;
}

export const AirAlertsPanel: React.FC<AirAlertsPanelProps> = ({
  alerts,
  isLoading,
  lastUpdated,
  showAlerts,
  onToggleShowAlerts,
  showAlertPolygons,
  onToggleShowAlertPolygons,
  showAlertMarkers,
  onToggleShowAlertMarkers,
  alertsOpacity,
  onChangeAlertsOpacity,
  alertsStrokeWidth = 2.5,
  onChangeAlertsStrokeWidth,
  soundEnabled,
  onToggleSound,
  onRefresh,
  language,
  onSelectAlert,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'red' | 'yellow' | 'oblast' | 'raion' | 'city'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const redCount = useMemo(
    () => alerts.filter((a) => getAlertVisuals(a).level === 'red').length,
    [alerts]
  );
  const yellowCount = useMemo(
    () => alerts.filter((a) => getAlertVisuals(a).level === 'yellow').length,
    [alerts]
  );
  const oblastCount = useMemo(() => alerts.filter((a) => a.location_type === 'oblast').length, [alerts]);
  const raionCount = useMemo(() => alerts.filter((a) => a.location_type === 'raion').length, [alerts]);
  const cityCount = useMemo(
    () => alerts.filter((a) => a.location_type === 'city' || a.location_type === 'hromada').length,
    [alerts]
  );

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      // Threat level filter
      if (activeTab === 'red' && getAlertVisuals(alert).level !== 'red') return false;
      if (activeTab === 'yellow' && getAlertVisuals(alert).level !== 'yellow') return false;

      // Location type filter
      if (activeTab === 'oblast' && alert.location_type !== 'oblast') return false;
      if (activeTab === 'raion' && alert.location_type !== 'raion') return false;
      if (activeTab === 'city' && alert.location_type !== 'city' && alert.location_type !== 'hromada')
        return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = alert.location_title.toLowerCase().includes(q);
        const oblMatch = alert.location_oblast ? alert.location_oblast.toLowerCase().includes(q) : false;
        const notesMatch = alert.notes ? alert.notes.toLowerCase().includes(q) : false;
        const threatMatch = (alert.threats || []).some(
          (t) => (t.source_message && t.source_message.toLowerCase().includes(q)) || (t.threat_type && t.threat_type.toLowerCase().includes(q))
        );
        return titleMatch || oblMatch || notesMatch || threatMatch;
      }

      return true;
    });
  }, [alerts, activeTab, searchQuery]);

  return (
    <div
      id="air-alerts-floating-panel"
      className="absolute top-16 right-4 sm:right-16 z-[1000] w-80 md:w-96 max-w-[calc(100vw-32px)] bg-slate-950/80 backdrop-blur-2xl backdrop-saturate-150 text-white rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.5)] border border-white/15 overflow-hidden transition-all duration-300 flex flex-col max-h-[80vh] ring-1 ring-white/10"
    >
      {/* Header */}
      <div className="p-3 bg-gradient-to-r from-red-950/70 via-slate-900/60 to-slate-900/70 backdrop-blur-xl border-b border-red-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-sm text-red-400 tracking-wide">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>{language === 'uk' ? 'Повітряні Тривоги' : 'Air Raid Alerts'}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono">
            {redCount > 0 && (
              <span className="px-1.5 py-0.5 font-bold bg-red-600/70 text-white rounded-full border border-red-400/40 flex items-center gap-0.5" title={language === 'uk' ? 'Червоний рівень (Ракетна небезпека)' : 'Red alert level (Missile/Air raid)'}>
                <span className="text-[10px]">🔴</span>
                <span>{redCount}</span>
              </span>
            )}
            {yellowCount > 0 && (
              <span className="px-1.5 py-0.5 font-bold bg-amber-600/70 text-amber-100 rounded-full border border-amber-400/40 flex items-center gap-0.5" title={language === 'uk' ? 'Жовтий рівень (Шахеди / Дрони)' : 'Yellow alert level (Drones/Shahed)'}>
                <span className="text-[10px]">🟡</span>
                <span>{yellowCount}</span>
              </span>
            )}
            {redCount === 0 && yellowCount === 0 && (
              <span className="px-1.5 py-0.5 font-mono font-bold bg-slate-700/60 text-slate-300 rounded-full border border-slate-600/40">
                {alerts.length}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Вимкнути звук' : 'Увімкнути звук'}
            className={`p-1.5 rounded-lg transition-colors ${
              soundEnabled
                ? 'text-amber-400 hover:bg-amber-500/20'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Settings Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            title={language === 'uk' ? 'Налаштування відображення' : 'Display settings'}
            className={`p-1.5 rounded-lg transition-colors ${
              showSettings ? 'bg-slate-800 text-red-400' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            title={language === 'uk' ? 'Оновити дані' : 'Refresh data'}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-red-400' : ''}`} />
          </button>

          {/* Collapse/Expand Button */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            {isMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Settings Subpanel */}
      {showSettings && !isMinimized && (
        <div className="p-3 bg-slate-950/80 border-b border-slate-800 text-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-300">{language === 'uk' ? 'Відображати на карті' : 'Show on map'}</span>
            <button
              onClick={onToggleShowAlerts}
              className={`flex items-center gap-1 px-2 py-0.5 rounded font-medium ${
                showAlerts
                  ? 'bg-red-600/80 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {showAlerts ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span>{showAlerts ? (language === 'uk' ? 'Увімкнено' : 'ON') : (language === 'uk' ? 'Вимкнено' : 'OFF')}</span>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-300">{language === 'uk' ? 'Контури областей/районів' : 'Region Polygons'}</span>
            <button
              onClick={onToggleShowAlertPolygons}
              className={`flex items-center gap-1 px-2 py-0.5 rounded font-medium ${
                showAlertPolygons
                  ? 'bg-blue-600/80 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>{showAlertPolygons ? (language === 'uk' ? 'Так' : 'Yes') : (language === 'uk' ? 'Ні' : 'No')}</span>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-300">{language === 'uk' ? 'Радарні мітки міст' : 'City Radar Markers'}</span>
            <button
              onClick={onToggleShowAlertMarkers}
              className={`flex items-center gap-1 px-2 py-0.5 rounded font-medium ${
                showAlertMarkers
                  ? 'bg-orange-600/80 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Radio className="w-3 h-3" />
              <span>{showAlertMarkers ? (language === 'uk' ? 'Так' : 'Yes') : (language === 'uk' ? 'Ні' : 'No')}</span>
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>{language === 'uk' ? 'Прозорість заливки' : 'Fill Opacity'}:</span>
              <span className="font-mono text-red-400">{Math.round(alertsOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.8"
              step="0.05"
              value={alertsOpacity}
              onChange={(e) => onChangeAlertsOpacity(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
          </div>

          <div className="space-y-1 pt-1 border-t border-slate-800/80">
            <div className="flex justify-between text-slate-400">
              <span>{language === 'uk' ? 'Товщина роздільної лінії / контуру' : 'Border / Outline Thickness'}:</span>
              <span className="font-mono text-red-400">{alertsStrokeWidth}px</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={alertsStrokeWidth}
              onChange={(e) => onChangeAlertsStrokeWidth?.(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
          </div>
        </div>
      )}

      {/* Main Body */}
      {!isMinimized && (
        <>
          {/* Controls Bar: Search & Tabs */}
          <div className="p-2 border-b border-slate-800 space-y-2 bg-slate-900/60">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={language === 'uk' ? 'Пошук області або міста...' : 'Search region or city...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 bg-slate-950/60 border border-slate-700/60 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500/80"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-col gap-1 bg-slate-950/60 p-1 rounded-lg text-[11px] font-medium">
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`flex-1 py-1 px-1.5 rounded text-center transition-all ${
                    activeTab === 'all'
                      ? 'bg-slate-700 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {language === 'uk' ? 'Всі' : 'All'} ({alerts.length})
                </button>
                <button
                  onClick={() => setActiveTab('red')}
                  className={`flex-1 py-1 px-1.5 rounded text-center transition-all flex items-center justify-center gap-1 ${
                    activeTab === 'red'
                      ? 'bg-red-600 text-white font-bold shadow'
                      : 'text-red-400 hover:text-red-300'
                  }`}
                >
                  <span>🔴</span>
                  <span>{language === 'uk' ? 'Червоні' : 'Red'}</span>
                  <span>({redCount})</span>
                </button>
                <button
                  onClick={() => setActiveTab('yellow')}
                  className={`flex-1 py-1 px-1.5 rounded text-center transition-all flex items-center justify-center gap-1 ${
                    activeTab === 'yellow'
                      ? 'bg-amber-600 text-white font-bold shadow'
                      : 'text-amber-400 hover:text-amber-300'
                  }`}
                >
                  <span>🟡</span>
                  <span>{language === 'uk' ? 'Жовті' : 'Yellow'}</span>
                  <span>({yellowCount})</span>
                </button>
              </div>

              <div className="flex gap-1 border-t border-slate-800/80 pt-1 text-[10px]">
                <button
                  onClick={() => setActiveTab('oblast')}
                  className={`flex-1 py-0.5 px-1 rounded text-center transition-all ${
                    activeTab === 'oblast'
                      ? 'bg-slate-700 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {language === 'uk' ? 'Області' : 'Obl'} ({oblastCount})
                </button>
                <button
                  onClick={() => setActiveTab('raion')}
                  className={`flex-1 py-0.5 px-1 rounded text-center transition-all ${
                    activeTab === 'raion'
                      ? 'bg-slate-700 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {language === 'uk' ? 'Райони' : 'Dist'} ({raionCount})
                </button>
                <button
                  onClick={() => setActiveTab('city')}
                  className={`flex-1 py-0.5 px-1 rounded text-center transition-all ${
                    activeTab === 'city'
                      ? 'bg-slate-700 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {language === 'uk' ? 'Міста' : 'City'} ({cityCount})
                </button>
              </div>
            </div>
          </div>

          {/* Alerts List */}
          <div className="overflow-y-auto max-h-64 divide-y divide-slate-800/60 text-xs p-1">
            {filteredAlerts.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                {alerts.length === 0 ? (
                  <div className="space-y-1">
                    <Activity className="w-6 h-6 text-emerald-500 mx-auto animate-pulse" />
                    <p className="font-semibold text-emerald-400">
                      {language === 'uk' ? 'Тривог не зафіксовано' : 'No active alerts'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {language === 'uk' ? 'Всі регіони спокійні' : 'All regions clear'}
                    </p>
                  </div>
                ) : (
                  <p>{language === 'uk' ? 'Нічого не знайдено' : 'No matches found'}</p>
                )}
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const visuals = getAlertVisuals(alert, language);
                const duration = formatAlertDuration(alert.started_at, language);
                const time = formatTimeOnly(alert.started_at);
                const isYellow = visuals.level === 'yellow';

                return (
                  <div
                    key={alert.id}
                    onClick={() => onSelectAlert(alert)}
                    className="p-2 hover:bg-slate-800/80 rounded-lg cursor-pointer transition-colors group flex items-start justify-between gap-2"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm shrink-0">{visuals.icon}</span>
                        <span
                          className={`font-bold truncate ${
                            isYellow ? 'text-amber-200 group-hover:text-amber-400' : 'text-slate-100 group-hover:text-red-400'
                          }`}
                        >
                          {alert.location_title}
                        </span>
                        <span
                          className="ml-auto px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 uppercase tracking-wider"
                          style={{
                            backgroundColor: `${visuals.fillColor}25`,
                            color: visuals.color,
                            border: `1px solid ${visuals.color}40`,
                          }}
                        >
                          {visuals.levelTitle}
                        </span>
                      </div>

                      {alert.location_oblast && alert.location_type !== 'oblast' && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                          <MapPin className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                          <span className="truncate">{alert.location_oblast}</span>
                        </div>
                      )}

                      <div className="flex items-center flex-wrap gap-1.5 text-[10px] text-slate-400 pt-0.5">
                        <span className="flex items-center gap-0.5 font-mono">
                          <Clock className="w-2.5 h-2.5 text-slate-500" />
                          {time}
                        </span>
                        <span className="font-mono font-medium text-amber-400">({duration})</span>
                        <span
                          className="px-1.5 py-0.2 rounded text-[9px] font-medium truncate max-w-[180px]"
                          style={{
                            backgroundColor: `${visuals.fillColor}20`,
                            color: visuals.color,
                          }}
                        >
                          {visuals.title}
                        </span>
                      </div>

                      {visuals.sourceMessage && visuals.sourceMessage !== alert.location_title && (
                        <div className="text-[10px] text-slate-400 italic pt-0.5 truncate flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: visuals.color }}></span>
                          <span className="truncate">{visuals.sourceMessage}</span>
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 pt-1">
                      <span className="p-1 rounded bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-white transition-colors">
                        <MapPin className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Info */}
          <div className="p-2 bg-slate-950/90 border-t border-slate-800/60 text-[10px] text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>alerts.in.ua</span>
            </span>
            <span>
              {lastUpdated
                ? `${language === 'uk' ? 'Оновлено' : 'Updated'}: ${formatTimeOnly(lastUpdated)}`
                : ''}
            </span>
          </div>
        </>
      )}
    </div>
  );
};
