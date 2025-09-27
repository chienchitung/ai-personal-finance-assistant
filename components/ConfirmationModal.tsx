import React, { useState, useEffect } from 'react';
import { ParsedExpense, Translation } from '../types';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (expense: ParsedExpense) => void;
  expense: ParsedExpense;
  categories: string[];
  t: Translation;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  expense,
  categories,
  t,
}) => {
  const [editedExpense, setEditedExpense] = useState<ParsedExpense>(expense);

  useEffect(() => {
    setEditedExpense(expense);
  }, [expense]);

  if (!isOpen) return null;

  const handleChange = (field: keyof ParsedExpense, value: string | number) => {
    setEditedExpense((prev) => ({ ...prev, [field]: value }));
  };

  const handleConfirmClick = () => {
    onConfirm(editedExpense);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-modal)] border border-[var(--border-color)] rounded-2xl shadow-lg shadow-cyan-500/20 w-full max-w-md p-6 transform transition-all animate-fade-in-up">
        <h2 className="text-xl font-bold mb-6 text-center text-[var(--text-accent)] uppercase tracking-wider">{t.confirmAndSync}</h2>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase">{t.amount}</label>
                <input
                  type="number"
                  value={editedExpense.amount}
                  onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--cyan-main)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase">Currency</label>
                <input
                  type="text"
                  value={editedExpense.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--cyan-main)] focus:outline-none"
                />
              </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase">{t.date}</label>
            <input
              type="date"
              value={editedExpense.date}
              max={today}
              onChange={(e) => handleChange('date', e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--cyan-main)] focus:outline-none date-input-color-scheme"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase">{t.category}</label>
            <select
              value={editedExpense.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--cyan-main)] focus:outline-none"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat} style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)'}}>
                  {cat}
                </option>
              ))}
               {!categories.includes(editedExpense.category) && <option value={editedExpense.category} style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)'}}>{editedExpense.category}</option>}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1 uppercase">{t.note}</label>
            <input
              type="text"
              value={editedExpense.note}
              onChange={(e) => handleChange('note', e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--cyan-main)] focus:outline-none"
            />
          </div>
        </div>
        
        <div className="mt-8 grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="w-full bg-[var(--bg-button-secondary)] hover:bg-[var(--bg-button-secondary-hover)] text-[var(--text-button-secondary)] font-bold py-3 rounded-lg transition-all border border-transparent tech-glow"
          >
            {t.discard}
          </button>
          <button
            onClick={handleConfirmClick}
            className="w-full bg-[var(--bg-button-primary)] hover:bg-[var(--bg-button-primary-hover)] text-[var(--text-button-primary)] font-bold py-3 rounded-lg transition-all border border-transparent tech-glow"
          >
            {t.confirmAndSync}
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