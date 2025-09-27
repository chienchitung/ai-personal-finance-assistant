import React, { useMemo } from 'react';
import { Expense, Translation } from '../types';

interface DashboardProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  onDeleteExpense: (id: string) => void;
  t: Translation;
}

const groupExpensesByDate = (expenses: Expense[], t: Translation) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const startOfWeek = new Date(today);
  startOfWeek.setDate(startOfWeek.getDate() - today.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const groups: Record<string, Expense[]> = {};

  expenses.forEach(exp => {
    const expDate = new Date(exp.date + 'T00:00:00');
    let groupKey: string;

    if (expDate.getTime() >= today.getTime()) {
      groupKey = t.dateHeaders.today;
    } else if (expDate.getTime() >= yesterday.getTime()) {
      groupKey = t.dateHeaders.yesterday;
    } else if (expDate.getTime() >= startOfWeek.getTime()) {
      groupKey = t.dateHeaders.thisWeek;
    } else if (expDate.getTime() >= startOfMonth.getTime()) {
      groupKey = t.dateHeaders.thisMonth;
    } else {
      groupKey = expDate.toLocaleString(t.dateHeaders.today === 'Today' ? 'en-US' : 'zh-TW', { month: 'long', year: 'numeric' });
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(exp);
  });
  
  return groups;
};


export const Dashboard: React.FC<DashboardProps> = ({
  isOpen,
  onClose,
  expenses,
  onDeleteExpense,
  t,
}) => {
  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2);
  }, [expenses]);

  const groupedExpenses = useMemo(() => groupExpensesByDate(expenses, t), [expenses, t]);
  const groupOrder = [
    t.dateHeaders.today,
    t.dateHeaders.yesterday,
    t.dateHeaders.thisWeek,
    t.dateHeaders.thisMonth,
    ...Object.keys(groupedExpenses).filter(key => ![t.dateHeaders.today, t.dateHeaders.yesterday, t.dateHeaders.thisWeek, t.dateHeaders.thisMonth].includes(key))
     .sort((a,b) => new Date(b).getTime() - new Date(a).getTime())
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-modal)] border border-[var(--border-color)] rounded-2xl shadow-lg shadow-cyan-500/20 w-full max-w-lg h-[90vh] flex flex-col p-6 transform transition-all animate-fade-in-up">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-xl font-bold text-[var(--text-accent)] uppercase tracking-wider">{t.dashboardTitle}</h2>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <i className="fas fa-times fa-lg"></i>
          </button>
        </div>
        
        <div className="bg-[var(--bg-element)] p-4 rounded-xl mb-4 flex-shrink-0 border border-[var(--border-color)] tech-glow">
            <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase">{t.totalExpenses}</h3>
            <p className="text-3xl font-bold text-[var(--text-primary)]">${totalExpenses}</p>
        </div>

        <div className="flex-grow overflow-y-auto pr-2">
          {expenses.length === 0 ? (
            <div className="flex items-center justify-center h-full">
                <p className="text-[var(--text-secondary)]/70">{t.noExpenses}</p>
            </div>
          ) : (
            groupOrder.map(groupKey => {
              if (!groupedExpenses[groupKey]) return null;
              return (
                <div key={groupKey}>
                  <h3 className="text-md font-semibold text-[var(--text-accent)] my-4 px-1 tracking-widest">{groupKey}</h3>
                  <div className="space-y-2">
                  {groupedExpenses[groupKey].map((exp) => (
                    <div key={exp.id} className="bg-[var(--bg-element)]/80 p-3 rounded-lg flex items-center justify-between border border-[var(--border-color)]/80 hover:border-[var(--border-color)] transition-colors">
                      <div className="flex items-center space-x-4">
                          <div className="text-center w-12 border-r border-[var(--border-color)]/50 pr-4">
                              <p className="font-bold text-lg text-[var(--text-primary)]">{new Date(exp.date + 'T00:00:00').toLocaleDateString(t.dateHeaders.today === 'Today' ? 'en-US' : 'zh-TW', { day: '2-digit' })}</p>
                              <p className="text-xs text-[var(--text-accent)]/80">{new Date(exp.date + 'T00:00:00').toLocaleDateString(t.dateHeaders.today === 'Today' ? 'en-US' : 'zh-TW', { month: 'short' })}</p>
                          </div>
                          <div className="flex-1">
                              <p className="font-medium text-[var(--text-primary)] capitalize">{exp.note}</p>
                              <p className="text-xs text-[var(--text-secondary)]">{exp.category}</p>
                          </div>
                      </div>
                      <div className="text-right flex items-center space-x-3">
                          <p className="font-semibold text-md text-[var(--text-primary)]">
                            {exp.amount.toFixed(2)}
                            <span className="text-xs text-[var(--text-accent)]/70 ml-1">{exp.currency}</span>
                          </p>
                          <button onClick={() => onDeleteExpense(exp.id)} className="text-[var(--text-secondary)]/80 hover:text-red-500 text-sm">
                              <i className="fas fa-trash-alt"></i>
                          </button>
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              )
            })
          )}
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
        .overflow-y-auto::-webkit-scrollbar {
          width: 5px;
        }
        .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background-color: var(--cyan-main);
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
};