import { GoogleGenAI, Type, FunctionDeclaration, Modality } from '@google/genai';
import { Language } from '../types';

const logExpenseFunctionDeclaration: FunctionDeclaration = {
  name: 'logExpense',
  description: 'Logs an expense with its details. Resolve relative dates like "today" or "last Tuesday" to a precise YYYY-MM-DD format.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      amount: { type: Type.NUMBER, description: 'The numerical amount of the expense.' },
      currency: { type: Type.STRING, description: 'The currency of the expense, e.g., USD, TWD, JPY.' },
      category: { type: Type.STRING, description: 'The category of the expense from the provided list.' },
      date: { type: Type.STRING, description: 'The date of the expense in YYYY-MM-DD format.' },
      note: { type: Type.STRING, description: 'A descriptive note or the name of the merchant.' },
    },
    required: ['amount', 'currency', 'category', 'date', 'note'],
  },
};

const getSystemInstruction = (language: Language, categories: string[]): string => {
  if (language === Language.ZH_TW) {
    return `請全程使用繁體中文（台灣）進行交流。你是一位專業的會計助理。當使用者描述一筆支出時，你必須使用 \`logExpense\` 函式來結構化資料。呼叫函式後，請用友善的口吻確認，並詢問是否還有其他需要記錄的項目。例如：「好的，我已經將這筆[類別]支出記錄下來了。還有其他的嗎？」。至關重要的是，你必須將所有類型的日期參考—無論是相對的、模糊的還是絕對的—都準確地解析為具體的 YYYY-MM-DD 格式。這包括像是'今天'或'昨天'的簡單情況，也包括更複雜的表達，例如'下週五'、'十一月的最後一天'或'2022年8月15日'。請從使用者的自訂類別清單中推斷支出類別：[${categories.join(', ')}]。如果不確定，請使用'其他'。貨幣單位請使用 TWD。`;
  }
  return `You are an expert accounting assistant. When the user describes an expense, you must use the \`logExpense\` function to structure the data. After calling the function, provide a friendly, verbal confirmation and ask a follow-up question to see if they need anything else. For example: "Got it, I've logged the expense for [category]. Anything else today?". It is crucial that you accurately resolve all types of date references—relative, ambiguous, or absolute—into a specific YYYY-MM-DD format. This includes simple cases like 'today' or 'yesterday', as well as more complex ones like 'next Friday', 'the last day of November', or 'August 15th, 2022'. Infer the expense category from the user's custom list: [${categories.join(', ')}]. If you are unsure, use 'Other'. The currency should be USD.`;
};


export const connectToGemini = (
  language: Language,
  categories: string[],
  voiceName: string,
  callbacks: {
    onMessage: (message: any) => void;
    onError: (e: ErrorEvent) => void;
    onClose: (e: CloseEvent) => void;
    // FIX: Replaced `LiveSession` with `any` as it is not an exported member of `@google/genai`.
    onOpen: (sessionPromise: Promise<any>) => void;
  }
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
  const systemInstruction = getSystemInstruction(language, categories);

  const sessionPromise = ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    callbacks: {
      onopen: () => callbacks.onOpen(sessionPromise),
      onmessage: callbacks.onMessage,
      onerror: callbacks.onError,
      onclose: callbacks.onClose,
    },
    config: {
      responseModalities: [Modality.AUDIO],
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName } },
      },
      tools: [{ functionDeclarations: [logExpenseFunctionDeclaration] }],
      systemInstruction: systemInstruction,
    },
  });

  return sessionPromise;
};