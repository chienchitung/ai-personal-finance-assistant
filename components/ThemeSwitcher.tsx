import React, { useState, useRef, useEffect } from 'react';
import { Theme, Translation } from '../types';

interface ThemeSwitcherProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  t: Translation;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ theme, setTheme, t }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = () => {
    switch (theme) {
      case Theme.LIGHT: return 'fa-sun';
      case Theme.DARK: return 'fa-moon';
      default: return 'fa-desktop';
    }
  };

  const options = [
    { value: Theme.LIGHT, label: t.light, icon: 'fa-sun' },
    { value: Theme.DARK, label: t.dark, icon: 'fa-moon' },
    { value: Theme.SYSTEM, label: t.system, icon: 'fa-desktop' },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--bg-element)] hover:bg-[var(--bg-element-hover)] tech-glow border border-[var(--border-color)] transition-all"
        aria-label={t.theme}
      >
        <i className={`fas ${getIcon()} text-[var(--text-accent)]`}></i>
      </button>

      {isOpen && (
        <div className="absolute top-12 right-0 w-40 bg-[var(--bg-modal)] backdrop-blur-md border border-[var(--border-color)] rounded-lg shadow-lg tech-glow z-30 animate-fade-in-down">
          <ul className="p-2">
            {options.map((option) => (
              <li key={option.value}>
                <button
                  onClick={() => {
                    setTheme(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 text-left p-2 rounded-md hover:bg-[var(--bg-element)] transition-colors ${
                    theme === option.value ? 'bg-[var(--bg-element)]' : ''
                  }`}
                >
                  <i className={`fas ${option.icon} w-5 text-center text-[var(--text-accent)]`}></i>
                  <span className="text-[var(--text-primary)]">{option.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
       <style>{`
        @keyframes fade-in-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
