import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, Wand2 } from 'lucide-react';
import type { Movie, Marathon } from '../types';

interface MarathonChatProps {
  movies: Movie[];
  onMarathonCreated: (marathon: Marathon) => void;
  headers: Record<string, string>;
}

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  quickReplies?: string[];
  /** Set on the assistant message that declared the plan ready */
  ready?: boolean;
}

interface MarathonPhase {
  name: string;
  startDate: string;
  endDate: string;
  audience: string;
  drinks?: string;
}

interface MarathonPreferences {
  occasion?: string;
  startDate?: string;
  endDate?: string;
  movieCount?: number;
  phases?: MarathonPhase[];
  vibe?: string[];
  drinkPreference?: string[];
  mustInclude?: string;
  avoid?: string;
  additionalNotes?: string;
}

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hey! Tell me about the marathon you have in mind, in your own words: when it runs, who's watching, what you like to drink, any must-haves. " +
    "For example: \"A bunch of movies for the month before Christmas with my partner, cocktails on most nights, kids over on the weekends.\" " +
    "I'll ask a few follow-ups and then build the schedule.",
  quickReplies: [
    'Christmas season with the family',
    'Halloween month, just me',
    'A cozy weekend with my partner',
    'Friends over for a long weekend',
  ],
};

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

export function MarathonChat({ movies, onMarathonCreated, headers }: MarathonChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [readyPreferences, setReadyPreferences] = useState<MarathonPreferences | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking, isGenerating]);

  useEffect(() => {
    if (!isThinking && !isGenerating) inputRef.current?.focus();
  }, [isThinking, isGenerating]);

  const addMessage = (message: Omit<ChatMessage, 'id'>) => {
    setMessages(prev => [...prev, { id: `${Date.now()}-${prev.length}`, ...message }]);
  };

  const sendMessage = async (text: string) => {
    const content = text.trim();
    if (!content || isThinking || isGenerating) return;

    setInputValue('');
    const history = [...messages, { id: 'pending', role: 'user' as const, content }];
    addMessage({ role: 'user', content });
    setIsThinking(true);

    try {
      const response = await fetch('/api/marathon/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          today: todayIso(),
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to continue conversation');
      }

      const ready = data.status === 'ready' && data.preferences;
      setReadyPreferences(ready ? data.preferences : null);
      addMessage({
        role: 'assistant',
        content: data.message,
        quickReplies: ready ? [] : data.quickReplies,
        ready: Boolean(ready),
      });
    } catch (error) {
      addMessage({
        role: 'assistant',
        content:
          `Sorry, I couldn't process that (${error instanceof Error ? error.message : 'unknown error'}). ` +
          'Make sure an Anthropic API key is set in Settings, then try again.',
      });
    } finally {
      setIsThinking(false);
    }
  };

  const buildMarathon = async (prefs: MarathonPreferences, intro: string) => {
    setIsGenerating(true);
    setReadyPreferences(null);
    addMessage({ role: 'assistant', content: intro });

    const startDate = prefs.startDate || todayIso();
    const endDate = prefs.endDate || new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
      const response = await fetch('/api/marathon/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          preferences: { ...prefs, startDate, endDate },
          movieLibrary: movies.map(m => ({
            id: m.id,
            title: m.title,
            year: m.year,
            genres: m.genres,
            rating: m.rating,
            contentRating: m.contentRating,
            duration: m.duration,
            summary: m.summary?.slice(0, 200),
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to generate marathon');
      }

      const marathon = await response.json();
      addMessage({
        role: 'assistant',
        content:
          `Done! I've created "${marathon.name}" with ${marathon.entries.length} movies. ` +
          'Each one is picked for its spot in your schedule, with drink and snack pairings. Check it out!',
      });
      onMarathonCreated(marathon);
    } catch (error) {
      setReadyPreferences(prefs);
      addMessage({
        role: 'assistant',
        content:
          `Something went wrong building the marathon (${error instanceof Error ? error.message : 'unknown error'}). ` +
          'You can try again, or tell me what to change.',
        ready: true,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const quickStart = () => {
    const quickPrefs: MarathonPreferences = {
      occasion: 'christmas',
      startDate: '2025-12-14',
      endDate: '2026-01-06',
      vibe: ['cozy', 'comedy', 'dark', 'family', 'action', 'animated'],
      drinkPreference: ['full-bar', 'wine-beer', 'mocktails'],
      avoid: '8-bit Christmas, Trading Places, Die Hard',
      additionalNotes:
        "Grandma arrives on the 24th and will be here through the weekend. Movies after Christmas don't need to be Christmas movies, but we are going through to epiphany",
    };
    addMessage({ role: 'user', content: 'Quick start with my usual Christmas setup' });
    buildMarathon(
      quickPrefs,
      'Quick start! Dec 14 to Jan 6, mixed vibes, full bar plus wine, beer and mocktails, skipping 8-bit Christmas, Trading Places and Die Hard, Grandma arrives on the 24th. Building it now...'
    );
  };

  const busy = isThinking || isGenerating;

  return (
    <div className="flex flex-col h-full bg-gray-900/50 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-gray-900/80">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
          <Sparkles size={20} />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold">Marathon Planner</h2>
          <p className="text-xs text-gray-400">Describe it in your own words. I'll ask what I need.</p>
        </div>
        {messages.length <= 1 && !busy && (
          <button
            onClick={quickStart}
            className="px-3 py-1.5 text-xs bg-primary-600/20 hover:bg-primary-600/30 text-primary-400 rounded-lg transition-colors"
          >
            Quick Start
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => {
          const isLast = index === messages.length - 1;
          return (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.role === 'user' ? (
                <div className="max-w-[80%] px-4 py-2 rounded-2xl bg-primary-600 text-white whitespace-pre-wrap">
                  {message.content}
                </div>
              ) : (
                <div className="max-w-[85%] space-y-3">
                  <div className="px-4 py-3 rounded-2xl bg-white/10 text-gray-100 whitespace-pre-wrap">
                    {message.content}
                  </div>
                  {isLast && !busy && message.quickReplies && message.quickReplies.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {message.quickReplies.map((reply) => (
                        <button
                          key={reply}
                          onClick={() => sendMessage(reply)}
                          className="px-4 py-2 rounded-full text-sm bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-all"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  )}
                  {isLast && !busy && message.ready && readyPreferences && (
                    <button
                      onClick={() => buildMarathon(readyPreferences, 'Great, building your marathon now...')}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 text-white font-medium transition-colors"
                    >
                      <Wand2 size={18} />
                      Build this marathon
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {isThinking && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl bg-white/10 text-gray-400 flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-primary-400" />
              <span className="text-sm">Thinking...</span>
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="flex justify-start">
            <div className="w-full max-w-[85%] px-4 py-3 rounded-2xl bg-white/5 text-gray-300">
              <div className="flex items-center gap-3 mb-3">
                <Loader2 size={18} className="animate-spin text-primary-400" />
                <span>Picking movies and pairing drinks...</span>
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full"
                    style={{ animation: 'marathon-progress 45s ease-out forwards' }}
                  />
                </div>
                <p className="text-xs text-gray-500">This may take 30-60 seconds for large libraries...</p>
              </div>
              <style>{`
                @keyframes marathon-progress {
                  0% { width: 5%; }
                  10% { width: 15%; }
                  30% { width: 35%; }
                  50% { width: 55%; }
                  70% { width: 70%; }
                  90% { width: 85%; }
                  100% { width: 95%; }
                }
              `}</style>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10 bg-gray-900/50">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage(inputValue)}
            disabled={busy}
            placeholder={
              readyPreferences
                ? 'Want to change anything? Or build it above.'
                : 'e.g. Two weeks before Halloween, friends over on Fridays, wine and beer...'
            }
            className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm focus:outline-none focus:border-primary-500 disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(inputValue)}
            disabled={busy || !inputValue.trim()}
            className="p-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
