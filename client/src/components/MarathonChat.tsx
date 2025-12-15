import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, ChevronRight } from 'lucide-react';
import type { Movie, Marathon } from '../types';

interface MarathonChatProps {
  movies: Movie[];
  onMarathonCreated: (marathon: Marathon) => void;
  headers: Record<string, string>;
}

interface Message {
  id: string;
  type: 'assistant' | 'user' | 'options' | 'generating';
  content: string;
  options?: { label: string; value: string; icon?: string }[];
}

interface MarathonPreferences {
  occasion?: string;
  audience?: string;
  startDate?: string;
  endDate?: string;
  phases?: { name: string; startDate: string; endDate: string; audience: string }[];
  vibe?: string[];
  drinkPreference?: string[];
  mustInclude?: string;
  avoid?: string;
  additionalNotes?: string;
}

const QUESTIONS = [
  {
    id: 'occasion',
    message: "Hey! I'm excited to help plan your movie marathon. What's the occasion?",
    options: [
      { label: 'Christmas / Holiday Season', value: 'christmas', icon: '🎄' },
      { label: 'Halloween', value: 'halloween', icon: '🎃' },
      { label: 'Just Because', value: 'custom', icon: '🎬' },
      { label: 'Other', value: 'other', icon: '✨' },
    ],
  },
  {
    id: 'dates',
    message: "When does your marathon run? I'll help you figure out how many movies to plan.",
    type: 'dates',
  },
  {
    id: 'audience',
    message: "Who's watching with you? This helps me pick appropriate movies for different phases.",
    options: [
      { label: 'Just me (solo binge)', value: 'solo', icon: '🧘' },
      { label: 'Friends coming over', value: 'friends', icon: '👯' },
      { label: 'Family with kids', value: 'family-kids', icon: '👨‍👩‍👧‍👦' },
      { label: 'Mix - different people different days', value: 'mixed', icon: '🔄' },
    ],
  },
  {
    id: 'phases',
    message: "Tell me about your schedule. When does family arrive? Leave? Any specific phases I should plan around?",
    type: 'phases',
  },
  {
    id: 'vibe',
    message: "What vibe are you going for? Pick all that apply!",
    options: [
      { label: 'Cozy & Nostalgic', value: 'cozy', icon: '🧣' },
      { label: 'Laugh-out-loud Comedy', value: 'comedy', icon: '😂' },
      { label: 'Dark & Twisted', value: 'dark', icon: '🖤' },
      { label: 'Family Friendly', value: 'family', icon: '👪' },
      { label: 'Action & Chaos', value: 'action', icon: '💥' },
      { label: 'Animated Classics', value: 'animated', icon: '🎨' },
    ],
    multiSelect: true,
  },
  {
    id: 'drinkPreference',
    message: "What's your drink situation? Pick all that apply - I'll mix it up throughout your marathon.",
    options: [
      { label: 'Full cocktail bar - go wild', value: 'full-bar', icon: '🍸' },
      { label: 'Wine & beer only', value: 'wine-beer', icon: '🍷' },
      { label: 'Mocktails & fancy sodas', value: 'mocktails', icon: '🧃' },
      { label: 'Hot drinks (cocoa, cider, coffee)', value: 'hot', icon: '☕' },
      { label: 'No drink pairings needed', value: 'none', icon: '🚫' },
    ],
    multiSelect: true,
  },
  {
    id: 'mustInclude',
    message: "Any movies that MUST be on the list? These are non-negotiable traditions!",
    type: 'freeform',
    placeholder: "e.g., Die Hard, Home Alone, Elf (or 'skip' if none)",
  },
  {
    id: 'avoid',
    message: "Anything to avoid? Movies you hate, triggers, or stuff you've seen too recently?",
    type: 'freeform',
    placeholder: "e.g., No musicals, skip anything too scary (or 'skip' if none)",
  },
  {
    id: 'additionalNotes',
    message: "Anything else I should know? Special requests, inside jokes to include, specific days that matter?",
    type: 'freeform',
    placeholder: "e.g., Christmas Eve needs to be extra special, we always watch something funny on the 23rd",
  },
];

export function MarathonChat({ movies, onMarathonCreated, headers }: MarathonChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [preferences, setPreferences] = useState<MarathonPreferences>({});
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMulti, setSelectedMulti] = useState<string[]>([]);
  const [dateInputs, setDateInputs] = useState({ start: '', end: '' });
  const [phaseInputs, setPhaseInputs] = useState([
    { name: 'Solo Phase', startDate: '', endDate: '', audience: 'solo' },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Start the conversation (only once, even in strict mode)
    if (!initializedRef.current) {
      initializedRef.current = true;
      addAssistantMessage(QUESTIONS[0].message, QUESTIONS[0].options);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addAssistantMessage = (content: string, options?: Message['options']) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: options ? 'options' : 'assistant',
      content,
      options,
    }]);
  };

  const addUserMessage = (content: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'user',
      content,
    }]);
  };

  const handleOptionSelect = (value: string, label: string) => {
    const question = QUESTIONS[currentQuestion];

    if (question.multiSelect) {
      setSelectedMulti(prev =>
        prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
      );
      return;
    }

    addUserMessage(label);

    setPreferences(prev => ({ ...prev, [question.id]: value }));

    setTimeout(() => moveToNextQuestion(), 500);
  };

  const handleMultiSelectConfirm = () => {
    const question = QUESTIONS[currentQuestion];
    const labels = selectedMulti.map(v =>
      question.options?.find(o => o.value === v)?.label || v
    ).join(', ');

    addUserMessage(labels || 'None selected');
    setPreferences(prev => ({ ...prev, [question.id]: selectedMulti }));
    setSelectedMulti([]);

    setTimeout(() => moveToNextQuestion(), 500);
  };

  const handleDateSubmit = () => {
    if (!dateInputs.start || !dateInputs.end) return;

    const start = new Date(dateInputs.start);
    const end = new Date(dateInputs.end);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    addUserMessage(`${dateInputs.start} to ${dateInputs.end} (${days} days)`);
    setPreferences(prev => ({
      ...prev,
      startDate: dateInputs.start,
      endDate: dateInputs.end
    }));

    setTimeout(() => moveToNextQuestion(), 500);
  };

  const handlePhaseSubmit = () => {
    const validPhases = phaseInputs.filter(p => p.name && p.startDate && p.endDate);
    if (validPhases.length === 0) {
      addUserMessage('No specific phases - just go with the flow!');
    } else {
      const summary = validPhases.map(p => `${p.name}: ${p.startDate} to ${p.endDate}`).join('\n');
      addUserMessage(summary);
    }
    setPreferences(prev => ({ ...prev, phases: validPhases }));

    setTimeout(() => moveToNextQuestion(), 500);
  };

  const handleFreeformSubmit = () => {
    const question = QUESTIONS[currentQuestion];
    const value = inputValue.trim() || 'skip';

    addUserMessage(value === 'skip' ? 'Nothing specific' : value);

    if (value !== 'skip') {
      setPreferences(prev => ({ ...prev, [question.id]: value }));
    }
    setInputValue('');

    setTimeout(() => moveToNextQuestion(), 500);
  };

  const moveToNextQuestion = () => {
    const nextQ = currentQuestion + 1;

    if (nextQ >= QUESTIONS.length) {
      generateMarathon();
      return;
    }

    // Skip phases question if not mixed audience
    if (QUESTIONS[nextQ].id === 'phases' && preferences.audience !== 'mixed') {
      setCurrentQuestion(nextQ + 1);
      const skipTo = QUESTIONS[nextQ + 1];
      addAssistantMessage(skipTo.message, skipTo.options);
      return;
    }

    setCurrentQuestion(nextQ);
    const question = QUESTIONS[nextQ];
    addAssistantMessage(question.message, question.options);
  };

  const generateMarathon = async () => {
    setIsGenerating(true);
    setMessages(prev => [...prev, {
      id: 'generating',
      type: 'generating',
      content: 'Perfect! Let me craft your personalized marathon...',
    }]);

    try {
      const response = await fetch('/api/marathon/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          preferences,
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
        throw new Error('Failed to generate marathon');
      }

      const marathon = await response.json();

      // Remove generating message and add success
      setMessages(prev => prev.filter(m => m.id !== 'generating'));
      addAssistantMessage(
        `Done! I've created "${marathon.name}" with ${marathon.entries.length} movies. ` +
        `Each one is picked specifically for its spot in your schedule, with drink and snack pairings. ` +
        `Check it out!`
      );

      onMarathonCreated(marathon);
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== 'generating'));
      addAssistantMessage(
        "Oops! Something went wrong generating your marathon. Make sure you have an Anthropic API key configured in settings, then try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const addPhase = () => {
    setPhaseInputs(prev => [...prev, {
      name: '',
      startDate: '',
      endDate: '',
      audience: 'family'
    }]);
  };

  const updatePhase = (index: number, field: string, value: string) => {
    setPhaseInputs(prev => prev.map((p, i) =>
      i === index ? { ...p, [field]: value } : p
    ));
  };

  const renderInput = () => {
    if (isGenerating) return null;
    if (currentQuestion >= QUESTIONS.length) return null;

    const question = QUESTIONS[currentQuestion];

    if (question.type === 'dates') {
      return (
        <div className="p-4 border-t border-white/10 bg-gray-900/50">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">Start Date</label>
              <input
                type="date"
                value={dateInputs.start}
                onChange={(e) => setDateInputs(prev => ({ ...prev, start: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-primary-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">End Date</label>
              <input
                type="date"
                value={dateInputs.end}
                onChange={(e) => setDateInputs(prev => ({ ...prev, end: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-primary-500"
              />
            </div>
            <button
              onClick={handleDateSubmit}
              disabled={!dateInputs.start || !dateInputs.end}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      );
    }

    if (question.type === 'phases') {
      return (
        <div className="p-4 border-t border-white/10 bg-gray-900/50 space-y-3">
          <p className="text-xs text-gray-400">Define viewing phases (e.g., "Before family arrives", "With Grandma", "Late night with friends")</p>
          {phaseInputs.map((phase, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Phase name"
                value={phase.name}
                onChange={(e) => updatePhase(i, 'name', e.target.value)}
                className="flex-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-sm focus:outline-none focus:border-primary-500"
              />
              <input
                type="date"
                value={phase.startDate}
                onChange={(e) => updatePhase(i, 'startDate', e.target.value)}
                className="px-2 py-1.5 bg-white/5 border border-white/10 rounded text-sm focus:outline-none focus:border-primary-500"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={phase.endDate}
                onChange={(e) => updatePhase(i, 'endDate', e.target.value)}
                className="px-2 py-1.5 bg-white/5 border border-white/10 rounded text-sm focus:outline-none focus:border-primary-500"
              />
              <select
                value={phase.audience}
                onChange={(e) => updatePhase(i, 'audience', e.target.value)}
                className="px-2 py-1.5 bg-white/5 border border-white/10 rounded text-sm focus:outline-none focus:border-primary-500"
              >
                <option value="solo">Solo</option>
                <option value="friends">Friends</option>
                <option value="family">Family</option>
                <option value="kids">Kids Present</option>
                <option value="grandparents">Grandparents</option>
              </select>
            </div>
          ))}
          <div className="flex gap-2">
            <button
              onClick={addPhase}
              className="text-sm text-primary-400 hover:text-primary-300"
            >
              + Add phase
            </button>
            <div className="flex-1" />
            <button
              onClick={handlePhaseSubmit}
              className="px-4 py-1.5 bg-primary-600 hover:bg-primary-500 rounded-lg text-sm transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      );
    }

    if (question.type === 'freeform') {
      return (
        <div className="p-4 border-t border-white/10 bg-gray-900/50">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFreeformSubmit()}
              placeholder={question.placeholder}
              className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm focus:outline-none focus:border-primary-500"
            />
            <button
              onClick={handleFreeformSubmit}
              className="p-2 bg-primary-600 hover:bg-primary-500 rounded-full transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      );
    }

    if (question.multiSelect) {
      return (
        <div className="p-4 border-t border-white/10 bg-gray-900/50">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">
              {selectedMulti.length} selected
            </span>
            <button
              onClick={handleMultiSelectConfirm}
              className="px-4 py-1.5 bg-primary-600 hover:bg-primary-500 rounded-lg text-sm transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  const quickStart = () => {
    // Use the user's actual test preferences
    const quickPrefs: MarathonPreferences = {
      occasion: 'christmas',
      startDate: '2025-12-14',
      endDate: '2026-01-06',
      vibe: ['cozy', 'comedy', 'dark', 'family', 'action', 'animated'],
      drinkPreference: ['full-bar', 'wine-beer', 'mocktails'],
      mustInclude: undefined,
      avoid: '8-bit Christmas, Trading Places, Die Hard',
      additionalNotes: 'Grandma arrives on the 24th and will be here through the weekend. Movies after Christmas don\'t need to be Christmas movies, but we are going through to epiphany',
    };

    setPreferences(quickPrefs);
    addAssistantMessage("Quick start! Using your test preferences (Dec 14 - Jan 6, mixed vibes, full bar + wine/beer + mocktails, avoiding 8-bit Christmas/Trading Places/Die Hard, Grandma arrives 24th). Generating...");

    setTimeout(() => {
      setIsGenerating(true);
      generateMarathonWithPrefs(quickPrefs);
    }, 500);
  };

  const generateMarathonWithPrefs = async (prefs: MarathonPreferences) => {
    setMessages(prev => [...prev, {
      id: 'generating',
      type: 'generating',
      content: 'Perfect! Let me craft your personalized marathon...',
    }]);

    const today = new Date();
    const startDate = prefs.startDate || today.toISOString().split('T')[0];
    const endDate = prefs.endDate || new Date(today.getTime() + 13 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
      const response = await fetch('/api/marathon/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
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
        throw new Error('Failed to generate marathon');
      }

      const marathon = await response.json();

      setMessages(prev => prev.filter(m => m.id !== 'generating'));
      addAssistantMessage(
        `Done! I've created "${marathon.name}" with ${marathon.entries.length} movies. ` +
        `Each one is picked specifically for its spot in your schedule, with drink and snack pairings. ` +
        `Check it out!`
      );

      onMarathonCreated(marathon);
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== 'generating'));
      addAssistantMessage(
        "Oops! Something went wrong generating your marathon. Make sure you have an Anthropic API key configured in settings, then try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900/50 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-gray-900/80">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
          <Sparkles size={20} />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold">Marathon Planner</h2>
          <p className="text-xs text-gray-400">Let's build your perfect movie schedule</p>
        </div>
        {messages.length <= 1 && !isGenerating && (
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
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.type === 'generating' ? (
              <div className="w-full max-w-[85%] space-y-3">
                <div className="px-4 py-3 rounded-2xl bg-white/5 text-gray-300">
                  <div className="flex items-center gap-3 mb-3">
                    <Loader2 size={18} className="animate-spin text-primary-400" />
                    <span>{message.content}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all duration-1000 ease-out animate-progress"
                        style={{
                          animation: 'progress 45s ease-out forwards',
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">This may take 30-60 seconds for large libraries...</p>
                  </div>
                </div>
                <style>{`
                  @keyframes progress {
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
            ) : message.type === 'user' ? (
              <div className="max-w-[80%] px-4 py-2 rounded-2xl bg-primary-600 text-white">
                {message.content}
              </div>
            ) : (
              <div className="max-w-[85%] space-y-3">
                <div className="px-4 py-3 rounded-2xl bg-white/10 text-gray-100">
                  {message.content}
                </div>
                {message.options && (
                  <div className="flex flex-wrap gap-2">
                    {message.options.map((opt) => {
                      const isSelected = selectedMulti.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          onClick={() => handleOptionSelect(opt.value, opt.label)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all ${
                            isSelected
                              ? 'bg-primary-600 text-white'
                              : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                          }`}
                        >
                          {opt.icon && <span>{opt.icon}</span>}
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {renderInput()}
    </div>
  );
}
