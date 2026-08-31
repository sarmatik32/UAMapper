import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Copy, 
  Download, 
  Check, 
  Sparkles, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  ShieldAlert, 
  Clock, 
  Radio, 
  Bot, 
  HelpCircle, 
  Share2, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon
} from 'lucide-react';
import { CustomMarker, Language, AirAlert, DrawnLine, TelegramChannelConfig } from '../types';
import { safeSetItem } from '../utils/storage';
import { optimizeImageForTelegram } from '../utils/imageOptimizer';

interface TelegramExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageBlob: Blob | null;
  isCapturing: boolean;
  language: Language;
  theme: 'light' | 'dark';
  markers: CustomMarker[];
  drawnLines?: DrawnLine[];
  activeAlerts?: AirAlert[];
  onRefreshCapture?: () => void;
}

const DEFAULT_CHANNELS: TelegramChannelConfig[] = [
  {
    id: 'krrig_alerts',
    name: 'Кривий Ріг / Оповіщення',
    usernameOrId: '@krrig_alerts',
    description: 'Офіційний канал моніторингу',
    isDefault: true,
  },
  {
    id: 'saved_messages',
    name: 'Збережене / Будь-який чат',
    usernameOrId: '',
    description: 'Поділитися в особисті або будь-яку групу',
    isDefault: false,
  },
];

export const TelegramExportModal: React.FC<TelegramExportModalProps> = ({
  isOpen,
  onClose,
  imageBlob,
  isCapturing,
  language,
  theme,
  markers,
  drawnLines = [],
  activeAlerts = [],
  onRefreshCapture,
}) => {
  const isUa = language === 'uk';

  // Saved channels state
  const [channels, setChannels] = useState<TelegramChannelConfig[]>(() => {
    try {
      const saved = localStorage.getItem('visicom_telegram_channels');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
    return DEFAULT_CHANNELS;
  });

  const [selectedChannelId, setSelectedChannelId] = useState<string>(() => {
    return channels[0]?.id || 'krrig_alerts';
  });

  // New channel form state
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelUsername, setNewChannelUsername] = useState('');

  // Telegram Bot integration state
  const [botToken, setBotToken] = useState<string>(() => {
    return localStorage.getItem('visicom_tg_bot_token') || '';
  });
  const [showBotSettings, setShowBotSettings] = useState(false);
  const [isBotSending, setIsBotSending] = useState(false);
  const [botStatusMessage, setBotStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Caption state
  const generateInitialCaption = (): string => {
    const timeStr = new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    const selectedChan = channels.find(c => c.id === selectedChannelId);
    const signature = selectedChan?.usernameOrId ? `\n\n📍 ${selectedChan.usernameOrId}` : '\n\n📍 @krrig_alerts';
    return `⚠️ Оперативна обстановка станом на ${timeStr}${signature}`;
  };

  const [caption, setCaption] = useState<string>(generateInitialCaption);
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Update object URL when imageBlob changes
  useEffect(() => {
    if (!imageBlob) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageBlob);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageBlob]);

  // Save channels to localStorage
  const saveChannels = (updated: TelegramChannelConfig[]) => {
    setChannels(updated);
    safeSetItem('visicom_telegram_channels', JSON.stringify(updated));
  };

  const handleAddChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelUsername.trim()) return;
    let formattedUsername = newChannelUsername.trim();
    if (!formattedUsername.startsWith('@') && !formattedUsername.startsWith('-100') && !formattedUsername.startsWith('https://t.me/')) {
      if (/^[a-zA-Z0-9_]{4,}$/.test(formattedUsername)) {
        formattedUsername = `@${formattedUsername}`;
      }
    }
    const newChan: TelegramChannelConfig = {
      id: `custom_${Date.now()}`,
      name: newChannelName.trim() || formattedUsername,
      usernameOrId: formattedUsername,
      description: isUa ? 'Власний канал' : 'Custom channel',
      isDefault: false,
    };
    const next = [...channels, newChan];
    saveChannels(next);
    setSelectedChannelId(newChan.id);
    setNewChannelName('');
    setNewChannelUsername('');
    setIsAddingChannel(false);
  };

  const handleDeleteChannel = (id: string) => {
    if (channels.length <= 1) return;
    const next = channels.filter(c => c.id !== id);
    saveChannels(next);
    if (selectedChannelId === id) {
      setSelectedChannelId(next[0].id);
    }
  };

  const handleSaveBotToken = (token: string) => {
    setBotToken(token);
    safeSetItem('visicom_tg_bot_token', token.trim());
  };

  // Quick caption templates
  const addCurrentTimeTag = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' });
    setCaption(prev => `${prev}\n⏰ Час фіксації: ${timeStr} (${dateStr})`);
  };

  const addMarkersSummary = () => {
    if (markers.length === 0 && drawnLines.length === 0) {
      setCaption(prev => `${prev}\n📍 Обстановка на карті спокійна`);
      return;
    }
    const markerCounts: Record<string, number> = {};
    markers.forEach(m => {
      const name = m.title || m.iconType || 'Маркер';
      markerCounts[name] = (markerCounts[name] || 0) + 1;
    });
    const summaryList = Object.entries(markerCounts).map(([name, count]) => `• ${name}: ${count}`).join('\n');
    setCaption(prev => `${prev}\n\n📊 Виявлено на карті:\n${summaryList}`);
  };

  const addAirAlertsSummary = () => {
    if (!activeAlerts || activeAlerts.length === 0) {
      setCaption(prev => `${prev}\n🟢 Повітряних тривог не зафіксовано`);
      return;
    }
    const oblasts = activeAlerts.map(a => a.location_oblast || a.location_title).filter(Boolean);
    const unique = Array.from(new Set(oblasts)).slice(0, 8);
    setCaption(prev => `${prev}\n🚨 Повітряна тривога в областях:\n${unique.join(', ')}`);
  };

  const addHashtags = () => {
    setCaption(prev => `${prev}\n\n#Україна #Мапа #Тривога #ППО #Оперативно`);
  };

  // Selected channel object
  const selectedChannel = channels.find(c => c.id === selectedChannelId) || channels[0];

  // Sharing handlers
  const handleNativeShare = async () => {
    if (!imageBlob) return;
    try {
      const filename = `tactical_map_${Date.now()}.png`;
      const file = new File([imageBlob], filename, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: isUa ? 'Тактична карта (UA Mapper)' : 'Tactical Map',
          text: caption,
        });
        setCopiedStatus(isUa ? 'Поширено успішно!' : 'Shared successfully!');
        setTimeout(() => setCopiedStatus(null), 3000);
        return;
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      console.warn('Native share error', e);
    }

    // Fallback: Copy image & open channel
    handleCopyAndOpenTelegram();
  };

  const handleCopyAndOpenTelegram = async () => {
    if (!imageBlob) return;
    try {
      if (navigator.clipboard && typeof window.ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': imageBlob }),
        ]);
        setCopiedStatus(isUa ? 'Зображення в буфері! Відкриваємо Telegram...' : 'Image copied! Opening Telegram...');
      }
    } catch (e) {
      console.warn('Clipboard image write failed', e);
    }

    const username = selectedChannel?.usernameOrId?.replace(/^@/, '').replace('https://t.me/', '');
    const tgUrl = username 
      ? `https://t.me/${username}` 
      : `https://t.me/share/url?url=${encodeURIComponent('https://t.me/krrig_alerts')}&text=${encodeURIComponent(caption)}`;
    
    window.open(tgUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => setCopiedStatus(null), 3500);
  };

  const handleDownloadImage = () => {
    if (!imageBlob) return;
    const filename = `telegram_map_${Date.now()}.png`;
    const url = URL.createObjectURL(imageBlob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setCopiedStatus(isUa ? 'Зображення завантажено!' : 'Image downloaded!');
    setTimeout(() => setCopiedStatus(null), 2500);
  };

  // Bot API Send Photo
  const handleSendViaBot = async () => {
    if (!imageBlob) return;
    const token = botToken.trim();
    if (!token) {
      setBotStatusMessage({
        type: 'error',
        text: isUa ? 'Вкажіть токен Telegram-бота (від @BotFather)' : 'Please enter Telegram Bot token',
      });
      setShowBotSettings(true);
      return;
    }

    let targetChatId = selectedChannel?.usernameOrId?.trim();
    if (!targetChatId) {
      setBotStatusMessage({
        type: 'error',
        text: isUa ? 'Вкажіть юзернейм каналу (наприклад, @krrig_alerts або ID)' : 'Please select or enter channel username/ID',
      });
      return;
    }

    if (!targetChatId.startsWith('@') && !targetChatId.startsWith('-100') && !targetChatId.startsWith('-')) {
      targetChatId = `@${targetChatId}`;
    }

    setIsBotSending(true);
    setBotStatusMessage(null);

    try {
      // 1. Ensure image is optimized to fit within Telegram's 10 MB sendPhoto limit
      const { blob: optimizedBlob, filename, wasCompressed } = await optimizeImageForTelegram(imageBlob, 9.5 * 1024 * 1024);

      const formData = new FormData();
      formData.append('chat_id', targetChatId);
      formData.append('photo', optimizedBlob, filename);
      if (caption.trim()) {
        formData.append('caption', caption.trim());
      }

      let response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        body: formData,
      });

      let data = await response.json();

      // If sendPhoto failed specifically due to file size, retry via sendDocument (which allows up to 50 MB)
      if (!data.ok && (data.description?.toLowerCase().includes('too big for a photo') || data.description?.toLowerCase().includes('file_too_big') || data.description?.toLowerCase().includes('photo_invalid_dimensions'))) {
        const docFormData = new FormData();
        docFormData.append('chat_id', targetChatId);
        docFormData.append('document', imageBlob, `map_${Date.now()}.png`);
        if (caption.trim()) {
          docFormData.append('caption', caption.trim());
        }

        response = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
          method: 'POST',
          body: docFormData,
        });
        data = await response.json();
      }

      if (data.ok) {
        setBotStatusMessage({
          type: 'success',
          text: isUa 
            ? `Опубліковано в ${targetChatId}! 🚀${wasCompressed ? ' (Оптимізовано для Telegram)' : ''}` 
            : `Successfully published to ${targetChatId}! 🚀${wasCompressed ? ' (Optimized for Telegram)' : ''}`,
        });
      } else {
        const errorDesc = data.description || 'Unknown Telegram API error';
        let friendlyAdvice = errorDesc;
        if (errorDesc.includes('chat not found')) {
          friendlyAdvice = isUa 
            ? 'Канал не знайдено. Перевірте юзернейм або зробіть публікацію в канал.' 
            : 'Chat not found. Please check username.';
        } else if (errorDesc.includes('Unauthorized')) {
          friendlyAdvice = isUa 
            ? 'Невірний токен бота. Перевірте токен від @BotFather.' 
            : 'Invalid bot token. Check @BotFather.';
        } else if (errorDesc.includes('have no rights to send a message') || errorDesc.includes('need administrator rights')) {
          friendlyAdvice = isUa 
            ? 'Бот не має прав публікації. Додайте бота в адміністратори каналу з правом публікувати повідомлення.' 
            : 'Bot is not an administrator in this channel. Grant publish permissions.';
        } else if (errorDesc.includes('too big for a photo')) {
          friendlyAdvice = isUa
            ? 'Файл завеликий для фото у Telegram. Спробуйте ще раз або зменшіть масштаб карти.'
            : 'File is too large for Telegram photo. Try reducing zoom level.';
        }
        setBotStatusMessage({
          type: 'error',
          text: friendlyAdvice,
        });
      }
    } catch (err: any) {
      console.error('Bot publish error', err);
      setBotStatusMessage({
        type: 'error',
        text: isUa 
          ? `Помилка мережі: ${err.message || 'Не вдалося відправити запит до Telegram'}` 
          : `Network error: ${err.message}`,
      });
    } finally {
      setIsBotSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className={`w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${
        theme === 'light' 
          ? 'bg-white border-slate-200 text-slate-900' 
          : 'bg-[#0f141f] border-white/10 text-slate-100 shadow-[0_0_50px_rgba(0,0,0,0.8)]'
      }`}>
        
        {/* Modal Header */}
        <div className={`flex items-center justify-between px-5 py-3.5 border-b shrink-0 ${
          theme === 'light' ? 'bg-[#24A1DE]/10 border-slate-200' : 'bg-[#24A1DE]/15 border-white/10'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#24A1DE] text-white flex items-center justify-center shadow-md shadow-[#24A1DE]/30">
              <Send className="w-4 h-4 fill-current -translate-x-0.5 translate-y-0.5" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                <span>{isUa ? 'Експорт та публікація в Telegram' : 'Export & Share to Telegram'}</span>
                <span className="px-2 py-0.5 rounded-full bg-[#24A1DE]/20 text-[#24A1DE] font-mono text-[10px] uppercase font-bold tracking-wider">
                  TG Pro
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isUa ? 'Поділіться картою в один клік у будь-який канал або чат' : 'Share your tactical map directly to Telegram channels'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Top Section: Map Preview & Channel Picker */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Image Preview Box */}
            <div className="md:col-span-5 flex flex-col">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#24A1DE]" />
                  {isUa ? 'Знімок карти' : 'Map Snapshot'}
                </span>
                {onRefreshCapture && (
                  <button
                    onClick={onRefreshCapture}
                    disabled={isCapturing}
                    className="text-[10px] text-[#24A1DE] hover:underline font-normal cursor-pointer"
                  >
                    {isCapturing ? (isUa ? 'Зйомка...' : 'Capturing...') : (isUa ? 'Оновити знімок' : 'Refresh')}
                  </button>
                )}
              </label>

              <div className={`relative flex-1 min-h-[160px] sm:min-h-[190px] rounded-xl border overflow-hidden flex items-center justify-center p-1.5 ${
                theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-slate-900/80 border-white/10'
              }`}>
                {isCapturing ? (
                  <div className="flex flex-col items-center gap-2 text-slate-400 text-xs">
                    <div className="w-6 h-6 border-2 border-[#24A1DE] border-t-transparent rounded-full animate-spin" />
                    <span>{isUa ? 'Створення HD знімку...' : 'Rendering HD snapshot...'}</span>
                  </div>
                ) : previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Map Preview"
                    className="max-h-[190px] w-full object-contain rounded-lg shadow-sm"
                  />
                ) : (
                  <div className="text-slate-400 text-xs text-center p-4">
                    {isUa ? 'Зображення готується...' : 'Preparing image...'}
                  </div>
                )}

                {imageBlob && (
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[9px] font-mono text-white/90">
                    {(imageBlob.size / (1024 * 1024)).toFixed(2)} MB • PNG
                  </div>
                )}
              </div>
            </div>

            {/* Target Channel Picker */}
            <div className="md:col-span-7 flex flex-col">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-[#24A1DE]" />
                  {isUa ? 'Цільовий Telegram канал:' : 'Target Telegram Channel:'}
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingChannel(!isAddingChannel)}
                  className="text-[10px] text-[#24A1DE] hover:text-[#24A1DE]/80 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>{isUa ? 'Додати канал' : 'Add Channel'}</span>
                </button>
              </div>

              {/* Add custom channel inline form */}
              {isAddingChannel && (
                <form onSubmit={handleAddChannel} className={`p-2.5 rounded-xl border mb-2 space-y-2 animate-fadeIn ${
                  theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
                }`}>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder={isUa ? 'Назва (напр. Мій канал)' : 'Name'}
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      className={`px-2.5 py-1.5 text-xs rounded-lg border focus:outline-none focus:border-[#24A1DE] ${
                        theme === 'light' ? 'bg-white border-slate-300' : 'bg-[#141923] border-white/10'
                      }`}
                    />
                    <input
                      type="text"
                      placeholder={isUa ? '@channel_username або ID' : '@username or chat ID'}
                      value={newChannelUsername}
                      onChange={(e) => setNewChannelUsername(e.target.value)}
                      required
                      className={`px-2.5 py-1.5 text-xs rounded-lg border focus:outline-none focus:border-[#24A1DE] ${
                        theme === 'light' ? 'bg-white border-slate-300' : 'bg-[#141923] border-white/10'
                      }`}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingChannel(false)}
                      className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {isUa ? 'Скасувати' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-[#24A1DE] hover:bg-[#208fca] text-white text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
                    >
                      {isUa ? 'Зберегти' : 'Save'}
                    </button>
                  </div>
                </form>
              )}

              {/* Channels list options */}
              <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
                {channels.map((chan) => {
                  const isSelected = selectedChannelId === chan.id;
                  return (
                    <div
                      key={chan.id}
                      onClick={() => setSelectedChannelId(chan.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#24A1DE]/15 border-[#24A1DE] shadow-[0_0_12px_rgba(36,161,222,0.2)]'
                          : theme === 'light'
                            ? 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                            : 'bg-white/5 hover:bg-white/10 border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                          isSelected ? 'bg-[#24A1DE] text-white' : 'bg-slate-500/20 text-slate-400'
                        }`}>
                          <Send className="w-3 h-3 fill-current -translate-x-0.5 translate-y-0.5" />
                        </div>
                        <div className="truncate">
                          <div className="font-bold text-xs flex items-center gap-1.5 truncate">
                            <span className="truncate">{chan.name}</span>
                            {chan.usernameOrId && (
                              <span className="text-[10px] font-mono text-[#24A1DE] shrink-0 font-normal">
                                {chan.usernameOrId}
                              </span>
                            )}
                          </div>
                          {chan.description && (
                            <div className="text-[10px] text-slate-400 truncate">
                              {chan.description}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-[#24A1DE] text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                        {!chan.isDefault && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteChannel(chan.id);
                            }}
                            className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                            title={isUa ? 'Видалити канал' : 'Delete channel'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

          {/* Middle Section: Caption Customizer */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#24A1DE]" />
                {isUa ? 'Підпис до зображення:' : 'Caption & Message:'}
              </label>
              <button
                type="button"
                onClick={() => setCaption('')}
                className="text-[10px] text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {isUa ? 'Очистити' : 'Clear'}
              </button>
            </div>

            <textarea
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={isUa ? 'Введіть текст публікації...' : 'Write message or caption...'}
              className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-[#24A1DE] resize-none leading-relaxed font-sans ${
                theme === 'light'
                  ? 'bg-slate-50 border-slate-200 text-slate-800'
                  : 'bg-[#131822] border-white/10 text-slate-200 placeholder-slate-500'
              }`}
            />

            {/* Quick helper tag chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={addCurrentTimeTag}
                className={`px-2 py-1 rounded-lg text-[10px] font-medium border flex items-center gap-1 transition-all cursor-pointer ${
                  theme === 'light' 
                    ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700' 
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                }`}
              >
                <Clock className="w-3 h-3 text-[#24A1DE]" />
                <span>{isUa ? '+ Час' : '+ Time'}</span>
              </button>

              <button
                type="button"
                onClick={addMarkersSummary}
                className={`px-2 py-1 rounded-lg text-[10px] font-medium border flex items-center gap-1 transition-all cursor-pointer ${
                  theme === 'light' 
                    ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700' 
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                }`}
              >
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                <span>{isUa ? '+ Зведення цілей' : '+ Targets summary'}</span>
              </button>

              <button
                type="button"
                onClick={addAirAlertsSummary}
                className={`px-2 py-1 rounded-lg text-[10px] font-medium border flex items-center gap-1 transition-all cursor-pointer ${
                  theme === 'light' 
                    ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700' 
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                }`}
              >
                <ShieldAlert className="w-3 h-3 text-red-500" />
                <span>{isUa ? '+ Тривоги' : '+ Alerts'}</span>
              </button>

              <button
                type="button"
                onClick={addHashtags}
                className={`px-2 py-1 rounded-lg text-[10px] font-medium border flex items-center gap-1 transition-all cursor-pointer ${
                  theme === 'light' 
                    ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700' 
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                }`}
              >
                <span># Хештеги</span>
              </button>
            </div>
          </div>

          {/* Bot Auto-Post Accordion */}
          <div className={`rounded-xl border overflow-hidden transition-all ${
            theme === 'light' ? 'bg-slate-50/80 border-slate-200' : 'bg-white/[0.03] border-white/10'
          }`}>
            <button
              type="button"
              onClick={() => setShowBotSettings(!showBotSettings)}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#24A1DE]" />
                <span>{isUa ? 'Автопублікація через Telegram Бота (Bot API)' : 'Auto-publish via Telegram Bot API'}</span>
                {botToken && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title={isUa ? 'Токен збережено' : 'Token saved'} />
                )}
              </div>
              {showBotSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showBotSettings && (
              <div className="p-3.5 pt-0 border-t border-white/5 space-y-3">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {isUa 
                    ? 'Дозволяє відправляти карту прямо в канал в 1 клік. Для цього створіть бота через @BotFather, зробіть його адміністратором вашого каналу та вкажіть токен нижче:' 
                    : 'Allows sending map directly to channel. Create bot via @BotFather, make it admin in your channel and enter token below:'}
                </p>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-300">{isUa ? 'Bot Token (з @BotFather):' : 'Bot Token:'}</span>
                  </div>
                  <input
                    type="password"
                    value={botToken}
                    onChange={(e) => handleSaveBotToken(e.target.value)}
                    placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                    className={`w-full px-3 py-2 text-xs font-mono rounded-lg border focus:outline-none focus:border-[#24A1DE] ${
                      theme === 'light' ? 'bg-white border-slate-300 text-slate-800' : 'bg-[#141923] border-white/10 text-slate-200'
                    }`}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    {isUa ? 'Цільовий канал:' : 'Target channel:'} <strong className="text-[#24A1DE]">{selectedChannel?.usernameOrId || '@krrig_alerts'}</strong>
                  </span>

                  <button
                    type="button"
                    onClick={handleSendViaBot}
                    disabled={isBotSending || isCapturing}
                    className="px-4 py-2 bg-[#24A1DE] hover:bg-[#208fca] disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {isBotSending ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{isUa ? 'Відправка...' : 'Sending...'}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 fill-current" />
                        <span>{isUa ? 'Опублікувати ботом' : 'Publish with Bot'}</span>
                      </>
                    )}
                  </button>
                </div>

                {botStatusMessage && (
                  <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 animate-fadeIn ${
                    botStatusMessage.type === 'success' 
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                      : 'bg-red-500/10 border border-red-500/20 text-red-400'
                  }`}>
                    {botStatusMessage.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                    <span>{botStatusMessage.text}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Feedback banner */}
          {copiedStatus && (
            <div className="p-3 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-semibold flex items-center justify-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{copiedStatus}</span>
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 ${
          theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#0b0e14] border-white/10'
        }`}>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Download Button */}
            <button
              type="button"
              onClick={handleDownloadImage}
              className={`flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                theme === 'light'
                  ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
              }`}
            >
              <Download className="w-4 h-4 text-slate-400" />
              <span>{isUa ? 'Зберегти PNG' : 'Save PNG'}</span>
            </button>

            {/* Copy & Open TG */}
            <button
              type="button"
              onClick={handleCopyAndOpenTelegram}
              className={`flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                theme === 'light'
                  ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
              }`}
            >
              <Copy className="w-4 h-4 text-slate-400" />
              <span>{isUa ? 'Скопіювати & TG' : 'Copy & Open TG'}</span>
            </button>
          </div>

          {/* Primary Action Button: Share to Telegram */}
          <button
            type="button"
            onClick={handleNativeShare}
            disabled={isCapturing || !imageBlob}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#24A1DE] hover:bg-[#208fca] active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-[#24A1DE]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4 fill-current -translate-x-0.5 translate-y-0.5" />
            <span>{isUa ? 'Поділитися в Telegram' : 'Share to Telegram'}</span>
          </button>

        </div>

      </div>
    </div>
  );
};
