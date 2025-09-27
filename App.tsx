import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LiveServerMessage } from '@google/genai';
import { Language, ParsedExpense, Expense, Theme, AppSettings, AiVoice } from './types';
import { useLocalization } from './hooks/useLocalization';
import { connectToGemini } from './services/geminiService';
import { ConfirmationModal } from './components/ConfirmationModal';
import { CategoryManager } from './components/CategoryManager';
import { Dashboard } from './components/Dashboard';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { SettingsModal } from './components/SettingsModal';

// Audio encoding/decoding utilities
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


const Logo: React.FC = () => (
    <div className="mr-3" style={{ filter: `drop-shadow(0 0 5px var(--cyan-main))` }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="var(--cyan-main)" strokeWidth="1.5" />
            <path d="M12 5V19" stroke="var(--cyan-main)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M15 8H11.5C10.1193 8 9 9.11929 9 10.5C9 11.8807 10.1193 13 11.5 13H12.5C13.8807 13 15 14.1193 15 15.5C15 16.8807 13.8807 18 12.5 18H9" stroke="var(--cyan-main)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    </div>
);

const App: React.FC = () => {
  const { language, setLanguage, t } = useLocalization();
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('theme') as Theme) || Theme.SYSTEM
  );
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('appSettings');
    return saved ? JSON.parse(saved) : {
      audioQuality: 'standard',
      aiVoice: 'Zephyr',
      wakeWordEnabled: false,
    };
  });
  const [isRecording, setIsRecording] = useState(false);
  const [statusText, setStatusText] = useState(t.readyPrompt);
  const [transcript, setTranscript] = useState('');
  const [agentResponse, setAgentResponse] = useState('');
  const [parsedExpense, setParsedExpense] = useState<ParsedExpense | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [categories, setCategories] = useState<string[]>(() => {
    const savedCategories = localStorage.getItem('userCategories');
    if (savedCategories) {
      return JSON.parse(savedCategories);
    }
    return []; 
  });

  const sessionRef = useRef<any | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const agentResponseRef = useRef('');
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const wakeWordRecognizerRef = useRef<any | null>(null);
  
  // Refs for robust audio queueing system
  const audioQueueRef = useRef<string[]>([]);
  const isProcessingAudioRef = useRef<boolean>(false);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyCurrentTheme = () => {
      const systemPrefersDark = mediaQuery.matches;
      if (theme === 'dark' || (theme === 'system' && systemPrefersDark)) {
        root.classList.remove('light');
      } else {
        root.classList.add('light');
      }
    };
    
    applyCurrentTheme();
    mediaQuery.addEventListener('change', applyCurrentTheme);
    return () => mediaQuery.removeEventListener('change', applyCurrentTheme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const defaultCats = Object.values(t.defaultCategories);
    const savedCategoriesJson = localStorage.getItem('userCategories');
    if (!savedCategoriesJson || JSON.parse(savedCategoriesJson).length === 0) {
      setCategories(defaultCats);
      localStorage.setItem('userCategories', JSON.stringify(defaultCats));
    }
    const savedExpenses = localStorage.getItem('userExpenses');
    if (savedExpenses) {
        setExpenses(JSON.parse(savedExpenses));
    }
  }, [t.defaultCategories]);

  useEffect(() => {
    if (isRecording) {
      setStatusText(t.listening);
    } else if (settings.wakeWordEnabled) {
      setStatusText(t.listeningForWakeWord);
    } else {
      setStatusText(t.readyPrompt);
    }
  }, [isRecording, settings.wakeWordEnabled, t]);

  const processAudioQueue = useCallback(async () => {
    if (isProcessingAudioRef.current || audioQueueRef.current.length === 0 || !outputAudioContextRef.current) {
        return;
    }
    isProcessingAudioRef.current = true;

    const base64Chunk = audioQueueRef.current.shift();
    if (base64Chunk) {
        try {
            const outputAudioContext = outputAudioContextRef.current;
            
            if (nextStartTimeRef.current < outputAudioContext.currentTime) {
                nextStartTimeRef.current = outputAudioContext.currentTime;
            }

            const audioBuffer = await decodeAudioData(
                decode(base64Chunk),
                outputAudioContext,
                24000,
                1,
            );
            const source = outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputAudioContext.destination);
            source.addEventListener('ended', () => {
                audioSourcesRef.current.delete(source);
            });
            
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            audioSourcesRef.current.add(source);
        } catch (error) {
            console.error("Error processing audio chunk:", error);
        }
    }

    isProcessingAudioRef.current = false;
    if (audioQueueRef.current.length > 0) {
       processAudioQueue();
    }
  }, []);

  const handleMessage = async (message: LiveServerMessage) => {
    if (message.serverContent?.inputTranscription) {
      setTranscript((prev) => prev + message.serverContent.inputTranscription.text);
    }
     if (message.serverContent?.outputTranscription) {
      agentResponseRef.current += message.serverContent.outputTranscription.text;
      setAgentResponse(agentResponseRef.current);
    }

    const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
    if (base64EncodedAudioString) {
        audioQueueRef.current.push(base64EncodedAudioString);
        if (!isProcessingAudioRef.current) {
            processAudioQueue();
        }
    }
    
    if (message.serverContent?.interrupted) {
        audioQueueRef.current = []; // Clear pending audio
        for (const source of audioSourcesRef.current.values()) {
            source.stop();
            audioSourcesRef.current.delete(source);
        }
        nextStartTimeRef.current = 0;
    }

    if (message.serverContent?.turnComplete) {
      agentResponseRef.current = '';
    }

    if (message.toolCall?.functionCalls) {
        for (const fc of message.toolCall.functionCalls) {
            if (fc.name === 'logExpense' && fc.args) {
                const expenseData = fc.args as unknown as ParsedExpense;
                try {
                    if(expenseData.date) {
                       new Date(expenseData.date).toISOString();
                    } else {
                       throw new Error('Invalid Date');
                    }
                } catch (e) {
                    expenseData.date = new Date().toISOString().split('T')[0];
                }
                setParsedExpense(expenseData);
                setIsModalOpen(true);
                stopRecording();
            }
        }
    }
  };

  const startRecording = useCallback(async () => {
    if (isRecording) return;
    try {
      setTranscript('');
      setAgentResponse('');
      nextStartTimeRef.current = 0;
      audioQueueRef.current = [];
      isProcessingAudioRef.current = false;

      const audioConstraints: MediaTrackConstraints = settings.audioQuality === 'high'
        ? { sampleRate: 48000, echoCancellation: true, noiseSuppression: true }
        : { sampleRate: 16000 };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      streamRef.current = stream;

      setIsRecording(true);
      
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const sessionPromise = connectToGemini(language, categories, settings.aiVoice, {
        onMessage: handleMessage,
        onError: (e) => {
          console.error('Gemini Error:', e);
          setStatusText(t.errorOccurred);
          stopRecording();
        },
        onClose: () => {
          console.log('Gemini session closed.');
        },
        onOpen: async (resolvedPromise) => {
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            
            if (inputAudioContextRef.current.state === 'suspended') {
                await inputAudioContextRef.current.resume();
            }

            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            mediaStreamSourceRef.current = source;

            const gainNode = inputAudioContextRef.current.createGain();
            gainNode.gain.value = 2.5; // Amplify the input by 2.5x to improve sensitivity
            gainNodeRef.current = gainNode;

            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              resolvedPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(gainNode);
            gainNode.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current.destination);
        },
      });

      sessionRef.current = await sessionPromise;

    } catch (error) {
      console.error('Failed to start recording', error);
      if (error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')) {
          setStatusText(t.micPermissionDenied);
      } else {
          setStatusText(t.micStartError);
      }
      setIsRecording(false);
    }
  }, [isRecording, settings.audioQuality, language, categories, settings.aiVoice, t.errorOccurred, t.micPermissionDenied, t.micStartError, processAudioQueue]);
  
  const stopRecording = useCallback(() => {
    if (!isRecording && !sessionRef.current) return;
    setIsRecording(false);
    
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    
    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
        inputAudioContextRef.current.close();
        inputAudioContextRef.current = null;
    }
    
    audioQueueRef.current = [];
    isProcessingAudioRef.current = false;
    audioSourcesRef.current.forEach(source => source.stop());
    audioSourcesRef.current.clear();
    
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
        outputAudioContextRef.current.close();
        outputAudioContextRef.current = null;
    }
    
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
  }, [isRecording]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition API not supported in this browser.");
      if (settings.wakeWordEnabled) {
        setSettings(s => ({ ...s, wakeWordEnabled: false }));
      }
      return;
    }

    if (!settings.wakeWordEnabled || isRecording) {
      if (wakeWordRecognizerRef.current) {
        wakeWordRecognizerRef.current.stop();
      }
      return;
    }

    if (!wakeWordRecognizerRef.current) {
      const recognizer = new SpeechRecognition();
      wakeWordRecognizerRef.current = recognizer;
      recognizer.lang = language === Language.EN ? 'en-US' : 'zh-TW';
      recognizer.continuous = true;
      recognizer.interimResults = false;

      recognizer.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
        const wakeWordEn = "hey assistant";
        const wakeWordZh = "你好助理";
        if (transcript.includes(wakeWordEn) || transcript.includes(wakeWordZh)) {
          console.log("Wake word detected!");
          startRecording();
        }
      };

      recognizer.onend = () => {
        if (settings.wakeWordEnabled && !isRecording) {
          setTimeout(() => wakeWordRecognizerRef.current?.start(), 50);
        }
      };
      
      recognizer.onerror = (event: any) => {
        console.error('Wake word recognition error:', event.error);
        if (event.error === 'not-allowed') setStatusText(t.micPermissionDenied);
      };

      try {
        recognizer.start();
      } catch (e) {
        console.error("Could not start wake word recognizer:", e);
      }
    }

    return () => {
      if (wakeWordRecognizerRef.current) {
        wakeWordRecognizerRef.current.onend = null;
        wakeWordRecognizerRef.current.stop();
        wakeWordRecognizerRef.current = null;
      }
    };
  }, [settings.wakeWordEnabled, isRecording, language, startRecording, t.micPermissionDenied]);

  const handleConfirm = (expenseData: ParsedExpense) => {
    const newExpense: Expense = {
        id: new Date().toISOString() + Math.random(),
        ...expenseData,
    };
    setExpenses(prevExpenses => {
      const updatedExpenses = [...prevExpenses, newExpense].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      localStorage.setItem('userExpenses', JSON.stringify(updatedExpenses));
      return updatedExpenses;
    });
    
    setIsModalOpen(false);
    setParsedExpense(null);
    setShowSyncSuccess(true);
    setTimeout(() => setShowSyncSuccess(false), 3000);
  };

  const handleDiscard = () => {
    setIsModalOpen(false);
    setParsedExpense(null);
  };

  const handleSaveCategories = (newCategories: string[]) => {
    setCategories(newCategories);
    localStorage.setItem('userCategories', JSON.stringify(newCategories));
    setIsCategoryManagerOpen(false);
  }

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    setIsSettingsModalOpen(false);
  };

  const handleDeleteExpense = (id: string) => {
    const updatedExpenses = expenses.filter(exp => exp.id !== id);
    setExpenses(updatedExpenses);
    localStorage.setItem('userExpenses', JSON.stringify(updatedExpenses));
  }

  const toggleLanguage = () => {
    setLanguage(language === Language.EN ? Language.ZH_TW : Language.EN);
  }

  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-primary)] flex flex-col items-center justify-center p-4 font-orbitron relative overflow-hidden">
      <div className="absolute top-0 right-0 p-6 flex items-center space-x-2 z-20">
        <ThemeSwitcher theme={theme} setTheme={setTheme} t={t} />
        <button onClick={() => setIsDashboardOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--bg-element)] hover:bg-[var(--bg-element-hover)] tech-glow border border-[var(--border-color)] transition-all" aria-label="Open Dashboard">
            <i className="fas fa-chart-pie text-[var(--text-accent)]"></i>
        </button>
        <button onClick={() => setIsCategoryManagerOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--bg-element)] hover:bg-[var(--bg-element-hover)] tech-glow border border-[var(--border-color)] transition-all" aria-label="Manage Categories">
            <i className="fas fa-list-alt text-[var(--text-accent)]"></i>
        </button>
        <button onClick={() => setIsSettingsModalOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--bg-element)] hover:bg-[var(--bg-element-hover)] tech-glow border border-[var(--border-color)] transition-all" aria-label="Open Settings">
            <i className="fas fa-sliders-h text-[var(--text-accent)]"></i>
        </button>
        <button onClick={toggleLanguage} className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--bg-element)] hover:bg-[var(--bg-element-hover)] tech-glow border border-[var(--border-color)] transition-all font-bold text-sm text-[var(--text-accent)]" aria-label="Toggle Language">
          {language === Language.EN ? '中' : 'EN'}
        </button>
      </div>

      <header className="text-center mb-10 z-10 flex items-center justify-center">
        <Logo />
        <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] uppercase tracking-wider" style={{ textShadow: '0 0 10px var(--cyan-main)' }}>{t.productName}</h1>
      </header>
      
      <main className="flex flex-col items-center justify-center flex-grow w-full max-w-2xl z-10">
        <button 
          onClick={isRecording ? () => stopRecording() : startRecording}
          className="relative flex items-center justify-center w-52 h-52 cursor-pointer group rounded-full focus:outline-none focus:ring-4 focus:ring-[var(--border-glow)]"
          aria-label={isRecording ? "Stop recording" : "Start recording"}
        >
          <div className="scanner-ring animate-scanner-1"></div>
          <div className="scanner-ring animate-scanner-2"></div>
          <div className="absolute inset-0 rounded-full bg-[var(--bg-element)] border-2 border-[var(--border-color)] tech-glow animate-rotate"></div>
          <div className="absolute inset-2 rounded-full bg-[var(--bg-color)]"></div>
          <div className="absolute inset-4 rounded-full bg-[var(--bg-element)] group-hover:bg-[var(--bg-element-hover)] transition-colors duration-300"></div>
          <i className={`fas fa-microphone text-7xl z-10 transition-colors duration-300 ${isRecording ? 'text-[var(--text-accent)]' : 'text-[var(--text-accent)]/80'}`} style={{ filter: `drop-shadow(0 0 5px var(--cyan-main))` }}></i>
        </button>
        
        <p className="mt-8 text-lg text-[var(--text-accent)]/80 h-8 transition-opacity duration-300 text-center tracking-wider" role="status">{statusText}</p>
        
        <div className="mt-4 w-full grid grid-cols-2 gap-4 h-24">
            <div className="h-full p-3 bg-[var(--bg-element)]/50 rounded-lg border border-[var(--border-color)] overflow-y-auto">
                <h3 className="text-xs text-[var(--text-secondary)] uppercase mb-1">{t.youSaid}</h3>
                <p className="text-[var(--text-accent)]/90 text-sm">{transcript || '...'}</p>
            </div>
            <div className="h-full p-3 bg-[var(--bg-element)]/50 rounded-lg border border-[var(--border-color)] overflow-y-auto">
                <h3 className="text-xs text-[var(--text-secondary)] uppercase mb-1">{t.agentResponse}</h3>
                <p className="text-[var(--text-accent)]/90 text-sm">{agentResponse || '...'}</p>
            </div>
        </div>
      </main>

      {parsedExpense && (
        <ConfirmationModal
          isOpen={isModalOpen}
          onClose={handleDiscard}
          onConfirm={handleConfirm}
          expense={parsedExpense}
          categories={categories}
          t={t}
        />
      )}

      <CategoryManager
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        onSave={handleSaveCategories}
        initialCategories={categories}
        t={t}
      />

      <Dashboard
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        expenses={expenses}
        onDeleteExpense={handleDeleteExpense}
        t={t}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSave={handleSaveSettings}
        initialSettings={settings}
        t={t}
      />

      {showSyncSuccess && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[var(--bg-color)] border border-[var(--border-color)] text-[var(--text-accent)] py-2 px-5 rounded-lg shadow-lg tech-glow flex items-center z-50" role="alert">
          <i className="fas fa-check-circle text-[var(--text-accent)] mr-2"></i>
          {t.syncComplete}
        </div>
      )}
    </div>
  );
};

export default App;