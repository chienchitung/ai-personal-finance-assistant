export enum Language {
  EN = 'en',
  ZH_TW = 'zh-tw'
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system',
}

export const availableVoices = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'] as const;
export type AiVoice = typeof availableVoices[number];

export interface AppSettings {
  audioQuality: 'standard' | 'high';
  aiVoice: AiVoice;
  wakeWordEnabled: boolean;
}

export interface Expense {
  id: string;
  amount: number;
  currency: string;
  category: string;
  date: string; // YYYY-MM-DD
  note: string;
}

export type ParsedExpense = Omit<Expense, 'id'>;

export interface Translation {
  productName: string;
  readyPrompt: string;
  listening: string;
  processing: string;
  confirmAndSync: string;
  discard: string;
  syncComplete: string;
  errorOccurred: string;
  amount: string;
  date: string;
  category: string;
  note: string;
  categories: string;
  manageCategories: string;
  addCategory: string;
  newCategory: string;
  micPermissionDenied: string;
  micStartError: string;
  dashboardTitle: string;
  totalExpenses: string;
  noExpenses: string;
  saveChanges: string;
  theme: string;
  light: string;
  dark: string;
  system: string;
  youSaid: string;
  agentResponse: string;
  settings: string;
  audioQuality: string;
  standard: string;
  high: string;
  aiVoice: string;
  wakeWord: string;
  wakeWordDescription: string;
  listeningForWakeWord: string;
  dateHeaders: {
    today: string;
    yesterday: string;
    thisWeek: string;
    thisMonth: string;
    older: string;
  };
  defaultCategories: {
    food: string;
    transport: string;
    entertainment: string;
    utilities: string;
    rent: string;
    shopping: string;
    wellness: string;
    other: string;
  };
}