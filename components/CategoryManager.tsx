import React, { useState } from 'react';
import { Translation } from '../types';

interface CategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (categories: string[]) => void;
  initialCategories: string[];
  t: Translation;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCategories,
  t,
}) => {
  const [categories, setCategories] = useState([...initialCategories]);
  const [newCategory, setNewCategory] = useState('');

  if (!isOpen) return null;

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      setCategories([...categories, newCategory.trim()]);
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (categoryToRemove: string) => {
    setCategories(categories.filter((cat) => cat !== categoryToRemove));
  };

  const handleSave = () => {
    onSave(categories);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-modal)] border border-[var(--border-color)] rounded-2xl shadow-lg shadow-cyan-500/20 w-full max-w-md p-6 transform transition-all animate-fade-in-up">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[var(--text-accent)] uppercase tracking-wider">{t.manageCategories}</h2>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <i className="fas fa-times fa-lg"></i>
          </button>
        </div>
        
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
          {categories.map((cat) => (
            <div key={cat} className="flex justify-between items-center bg-[var(--bg-element)] p-3 rounded-lg border border-[var(--border-color)]/50">
              <span className="text-[var(--text-accent-secondary)]">{cat}</span>
              <button onClick={() => handleRemoveCategory(cat)} className="text-red-500 hover:text-red-400">
                <i className="fas fa-trash-alt"></i>
              </button>
            </div>
          ))}
        </div>
        
        <div className="mt-6 flex space-x-2">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder={t.newCategory}
            className="flex-grow bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--cyan-main)] focus:outline-none"
            onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
          />
          <button
            onClick={handleAddCategory}
            className="bg-[var(--bg-button-primary)] hover:bg-[var(--bg-button-primary-hover)] text-[var(--text-button-primary)] font-bold py-2 px-4 rounded-lg transition-all border border-transparent tech-glow"
          >
            {t.addCategory}
          </button>
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