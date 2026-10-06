import React, { useState, useEffect } from 'react';
import { X, MapPin, Check, Trash2, Edit3 } from 'lucide-react';
import { Settlement } from '../data/settlements';
import { Language } from '../types';

interface AddSettlementModalProps {
  isOpen: boolean;
  latLng: { lat: number; lng: number } | null;
  editingSettlement?: Settlement | null;
  onClose: () => void;
  onSave: (settlement: Settlement) => void;
  onDelete?: (id: string) => void;
  language: Language;
}

export const AddSettlementModal: React.FC<AddSettlementModalProps> = ({
  isOpen,
  latLng,
  editingSettlement,
  onClose,
  onSave,
  onDelete,
  language,
}) => {
  const isUa = language === 'uk';
  const [name, setName] = useState('');
  const [type, setType] = useState<'city' | 'town' | 'village' | 'district'>('village');
  const [priority, setPriority] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [district, setDistrict] = useState('');
  const [latVal, setLatVal] = useState<number>(0);
  const [lngVal, setLngVal] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      if (editingSettlement) {
        setName(editingSettlement.name);
        setType(editingSettlement.type);
        setPriority(editingSettlement.priority);
        setDistrict(editingSettlement.district || '');
        setLatVal(editingSettlement.lat);
        setLngVal(editingSettlement.lng);
      } else if (latLng) {
        setName('');
        setType('village');
        setPriority(3);
        setDistrict('Криворізький район');
        setLatVal(Number(latLng.lat.toFixed(6)));
        setLngVal(Number(latLng.lng.toFixed(6)));
      }
    }
  }, [isOpen, editingSettlement, latLng]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const targetId = editingSettlement ? editingSettlement.id : `custom_${Date.now()}`;

    const updatedSettlement: Settlement = {
      id: targetId,
      name: name.trim(),
      type,
      lat: Number(latVal),
      lng: Number(lngVal),
      priority,
      district: district.trim() || undefined,
    };

    onSave(updatedSettlement);
    onClose();
  };

  const setTypeAndPriority = (t: 'district' | 'city' | 'town' | 'village', p: 1 | 2 | 3 | 4) => {
    setType(t);
    setPriority(p);
  };

  const handleDelete = () => {
    if (editingSettlement && onDelete) {
      onDelete(editingSettlement.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              {editingSettlement ? <Edit3 className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                {editingSettlement
                  ? isUa ? 'Редагувати населений пункт' : 'Edit Settlement'
                  : isUa ? 'Додати точку населеного пункту' : 'Add Settlement Point'}
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                {latVal.toFixed(5)}, {lngVal.toFixed(5)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name Field */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {isUa ? 'Назва населеного пункту' : 'Settlement Name'} *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isUa ? 'напр. с. Перемога, м. Дніпро, Район' : 'e.g. Novosilka, District'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-white text-xs font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Coordinates (Lat / Lng) Inputs */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                {isUa ? 'Широта (Lat)' : 'Latitude'}
              </label>
              <input
                type="number"
                step="0.0001"
                required
                value={latVal}
                onChange={(e) => setLatVal(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                {isUa ? 'Довгота (Lng)' : 'Longitude'}
              </label>
              <input
                type="number"
                step="0.0001"
                required
                value={lngVal}
                onChange={(e) => setLngVal(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Settlement Style / Type Selector */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {isUa ? 'Тип та колір точки' : 'Point Type & Style'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTypeAndPriority('district', 1)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  type === 'district'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-400/50'
                    : 'bg-slate-950/50 border-white/10 text-slate-400 hover:border-white/20'
                }`}
              >
                <span className="w-3.5 h-3.5 rounded-full bg-amber-400 ring-2 ring-amber-500/80 shrink-0"></span>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold">{isUa ? 'Район' : 'District'}</div>
                  <div className="text-[9px] text-slate-400">{isUa ? 'Бурштинова точка' : 'Amber dot'}</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTypeAndPriority('city', 1)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  type === 'city'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 ring-1 ring-cyan-400/50'
                    : 'bg-slate-950/50 border-white/10 text-slate-400 hover:border-white/20'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-cyan-400 ring-2 ring-blue-500/80 shrink-0"></span>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold">{isUa ? 'Місто' : 'City'}</div>
                  <div className="text-[9px] text-slate-400">{isUa ? 'Неонова блакитна' : 'Cyan dot'}</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTypeAndPriority('town', 2)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  type === 'town'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-400/50'
                    : 'bg-slate-950/50 border-white/10 text-slate-400 hover:border-white/20'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-1.5 ring-emerald-500/70 shrink-0"></span>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold">{isUa ? 'Містечко / СМТ' : 'Town'}</div>
                  <div className="text-[9px] text-slate-400">{isUa ? 'Смарагдова точка' : 'Emerald dot'}</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTypeAndPriority('village', 3)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  type === 'village' && priority === 3
                    ? 'bg-sky-500/20 border-sky-500 text-sky-300 ring-1 ring-sky-400/50'
                    : 'bg-slate-950/50 border-white/10 text-slate-400 hover:border-white/20'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-sky-300 ring-1 ring-sky-400/60 shrink-0"></span>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold">{isUa ? 'Село' : 'Village'}</div>
                  <div className="text-[9px] text-slate-400">{isUa ? 'Блакитна точка' : 'Sky dot'}</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTypeAndPriority('village', 4)}
                className={`col-span-2 flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  type === 'village' && priority === 4
                    ? 'bg-slate-700/50 border-slate-400 text-slate-200 ring-1 ring-slate-400/50'
                    : 'bg-slate-950/50 border-white/10 text-slate-400 hover:border-white/20'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-200 ring-1 ring-slate-400/50 shrink-0"></span>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold">{isUa ? 'Мале село / Хутір' : 'Small Village / Hamlet'}</div>
                  <div className="text-[9px] text-slate-400">{isUa ? 'Компактна точка' : 'Small dot'}</div>
                </div>
              </button>
            </div>
          </div>

          {/* District Name (optional) */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {isUa ? 'Район (необов\'язково)' : 'District Name (Optional)'}
            </label>
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder={isUa ? 'Криворізький район' : 'District'}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/15 text-white text-xs font-semibold focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 pt-3 border-t border-white/10">
            {editingSettlement && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="py-2.5 px-3 rounded-xl bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 text-red-300 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                title={isUa ? 'Видалити проблему/точку' : 'Delete point'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              {isUa ? 'Скасувати' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold shadow-lg shadow-blue-500/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{editingSettlement ? (isUa ? 'Зберегти зміни' : 'Update Point') : (isUa ? 'Зберегти точку' : 'Save Point')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
