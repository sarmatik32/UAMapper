import React, { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, X, KeyRound, ShieldAlert, ArrowRight } from 'lucide-react';
import { Language } from '../types';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  language: Language;
  theme: 'light' | 'dark';
}

const REQUIRED_PASSWORD = '25510032';

export const PasswordModal: React.FC<PasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  language,
  theme,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(null);
      setShowPassword(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 80);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === REQUIRED_PASSWORD) {
      setError(null);
      onSuccess();
      onClose();
    } else {
      setError(
        language === 'uk'
          ? 'Невірний пароль. Спробуйте ще раз.'
          : 'Incorrect password. Please try again.'
      );
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      inputRef.current?.focus();
    }
  };

  const isUk = language === 'uk';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div
        className={`relative w-full max-w-sm rounded-3xl p-6 shadow-2xl border transition-all duration-300 ${
          isShaking ? 'animate-shake' : ''
        } ${
          theme === 'light'
            ? 'bg-white/95 text-slate-900 border-slate-200/90 shadow-slate-900/20'
            : 'bg-slate-900/95 text-white border-white/15 shadow-black/60'
        }`}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
          title={isUk ? 'Закрити' : 'Close'}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-3 shadow-inner">
            <KeyRound className="w-7 h-7 text-amber-400" />
          </div>
          <h3 className="text-lg font-black tracking-tight">
            {isUk ? 'Панель керування' : 'Control Panel'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
            {isUk
              ? 'Введіть пароль для доступу до налаштувань та швидких кнопок виділення'
              : 'Enter password to unlock settings, district selection & tools'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="relative flex items-center">
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={isUk ? 'Введіть пароль...' : 'Enter password...'}
                autoComplete="current-password"
                className={`w-full px-4 py-3 rounded-2xl text-sm font-mono tracking-wider transition-all outline-none border ${
                  error
                    ? 'border-red-500 bg-red-500/10 text-red-200 placeholder-red-300/60 ring-2 ring-red-500/30'
                    : theme === 'light'
                    ? 'border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20'
                    : 'border-white/15 bg-white/5 text-white placeholder-slate-500 focus:border-amber-400 focus:bg-white/10 focus:ring-2 focus:ring-amber-400/20'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 p-1.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title={showPassword ? (isUk ? 'Сховати пароль' : 'Hide password') : (isUk ? 'Показати пароль' : 'Show password')}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-1.5 px-1 text-xs text-red-400 font-semibold animate-fade-in">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                theme === 'light'
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300'
              }`}
            >
              {isUk ? 'Скасувати' : 'Cancel'}
            </button>

            <button
              type="submit"
              className="flex-1 py-2.5 rounded-2xl text-xs font-black tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 active:scale-95"
            >
              <span>{isUk ? 'Увійти' : 'Unlock'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
