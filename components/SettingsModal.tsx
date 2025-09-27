import React, { useState, useEffect } from 'react';
import { Translation, AppSettings, availableVoices, AiVoice } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: AppSettings) => void;
  initialSettings: AppSettings;
  t: Translation;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSettings,
  t,
}) => {
  const [settings, setSettings] = useState<AppSettings>(initialSettings);

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(settings);
  };

  const handleQualityChange = (quality: 'standard' | 'high') => {
    setSettings(prev => ({...prev, audioQuality: quality}));
  };

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSettings(prev => ({...prev, aiVoice: e.target.value as AiVoice}));
  }

  const handleWakeWordToggle = () => {
    setSettings(prev => ({ ...prev, wakeWordEnabled: !prev.wakeWordEnabled }));
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-modal)] border border-[var(--border-color)] rounded-2xl shadow-lg shadow-cyan-500/20 w-full max-w-md p-6 transform transition-all animate-fade-in-up">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[var(--text-accent)] uppercase tracking-wider">{t.settings}</h2>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Close settings">
            <i className="fas fa-times fa-lg"></i>
          </button>
        </div>
        
        <div className="space-y-6">
           <div>
            <label className="block text-sm font-medium text-[var(--text-accent-secondary)] mb-2 uppercase">{t.wakeWord}</label>
            <div className="flex items-center justify-between bg-[var(--bg-input)] p-3 rounded-lg border border-[var(--border-color)]">
              <p className="text-sm text-[var(--text-secondary)]">{t.wakeWordDescription}</p>
              <button
                onClick={handleWakeWordToggle}
                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
                  settings.wakeWordEnabled ? 'bg-[var(--bg-button-primary)]' : 'bg-[var(--bg-button-secondary)]'
                }`}
                aria-checked={settings.wakeWordEnabled}
                role="switch"
              >
                <span
                  className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                    settings.wakeWordEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-accent-secondary)] mb-2 uppercase">{t.audioQuality}</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--bg-input)] rounded-lg border border-[var(--border-color)]">
              <button 
                onClick={() => handleQualityChange('standard')}
                className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${settings.audioQuality === 'standard' ? 'bg-[var(--bg-button-primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-element)]'}`}
              >
                {t.standard}
              </button>
              <button 
                onClick={() => handleQualityChange('high')}
                className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${settings.audioQuality === 'high' ? 'bg-[var(--bg-button-primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-element)]'}`}
              >
                {t.high}
              </button>
            </div>
          </div>
          
          <div>
            <label htmlFor="ai-voice-select" className="block text-sm font-medium text-[var(--text-accent-secondary)] mb-2 uppercase">{t.aiVoice}</label>
            <select
              id="ai-voice-select"
              value={settings.aiVoice}
              onChange={handleVoiceChange}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--cyan-main)] focus:outline-none"
            >
              {availableVoices.map((voice) => (
                <option key={voice} value={voice} style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)'}}>
                  {voice}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="mt-8">
          <button
            onClick={handleSave}
            className="w-full bg-[var(--bg-button-secondary)] hover:bg-[var(--bg-button-secondary-hover)] text-[var(--text-button-secondary)] font-bold py-3 rounded-lg transition-all border border-transparent tech-glow"
          >
            {t.saveChanges}
          </button>
        </div>
      </div>
       <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};