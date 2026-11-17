import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'kunjappan';
  text: string;
  timestamp: string;
}

const QUICK_SUGGESTIONS = [
  'How to create a game?',
  'How to join a match with code?',
  'How to change my team & lineup?',
  'How does money splitting work?',
  'How to invite friends on WhatsApp?',
];

function getKunjappanReply(query: string): string {
  const lower = query.toLowerCase().trim();

  // Create match / schedule
  if (
    lower.includes('create') ||
    lower.includes('schedule') ||
    lower.includes('undaakk') ||
    lower.includes('തുടങ്ങ') ||
    lower.includes('എങ്ങനെ') && lower.includes('മാച്ച്')
  ) {
    return 'Schedule Match അമർത്തൂ! Football ⚽, Cricket 🏏, Badminton 🏸, അല്ലെങ്കിൽ Volleyball 🏐 തിരഞ്ഞെടുത്ത് date, turf venue, format നൽകി instant ആയി മാച്ച് create ചെയ്യാം!';
  }

  // Join match / Room code
  if (
    lower.includes('join') ||
    lower.includes('code') ||
    lower.includes('room') ||
    lower.includes('കയറ') ||
    lower.includes('കോഡ്')
  ) {
    return 'Captain WhatsApp ൽ അയച്ച 16-character റൂം കോഡ് ഉണ്ടോ? Navigation ഇൽ "Join with Room Code" ക്ലിക്ക് ചെയ്ത് കോഡ് പേസ്റ്റ് ചെയ്താൽ മതി, ഒറ്റ ക്ലിക്കിൽ സ്ക്വാഡിലോ മാച്ചിലോ ജോയിൻ ചെയ്യാം!';
  }

  // Team / Lineup / Bench / Formation
  if (
    lower.includes('team') ||
    lower.includes('lineup') ||
    lower.includes('formation') ||
    lower.includes('bench') ||
    lower.includes('pos') ||
    lower.includes('ലൈനപ്പ്') ||
    lower.includes('ടീം')
  ) {
    return 'Match Details പേജിൽ Lineup Editor ഉണ്ട്! confirmed പ്ലെയേഴ്സിനെ Team A, Team B അല്ലെങ്കിൽ Bench ലേക്ക് drag & drop ചെയ്യാം. ഫുട്ബോളിൽ Single-GK rule ഓർക്കണേ!';
  }

  // Expense / Split / Money / Paisa
  if (
    lower.includes('money') ||
    lower.includes('split') ||
    lower.includes('expense') ||
    lower.includes('cash') ||
    lower.includes('paisa') ||
    lower.includes('പൈസ') ||
    lower.includes('കാശ്')
  ) {
    return 'മാച്ച് കഴിഞ്ഞാൽ Expenses ടാബിൽ turf booking fee എന്റർ ചെയ്യാം. Playing status നൽകിയ എല്ലാ കളിക്കാർക്കും തുക തുല്യമായി automatic ആയി split ചെയ്തു കിട്ടും!';
  }

  // WhatsApp / Invite / Friends
  if (
    lower.includes('invite') ||
    lower.includes('whatsapp') ||
    lower.includes('friend') ||
    lower.includes('share') ||
    lower.includes('ഫ്രണ്ട്സ്') ||
    lower.includes('ക്ഷണ')
  ) {
    return 'Squad അല്ലെങ്കിൽ Match പേജിലെ "Share on WhatsApp" ബട്ടൺ ക്ലിക്ക് ചെയ്യൂ! ഓട്ടോമാറ്റിക് ഇൻവിറ്റേഷൻ മെസ്സേജും ലിങ്കും ഗ്രൂപ്പിലേക്ക് ഒറ്റ ടാപ്പിൽ അയക്കാം!';
  }

  // Cricket specific
  if (lower.includes('cricket') || lower.includes('over') || lower.includes('batting') || lower.includes('ക്രിക്കറ്റ്')) {
    return 'Cricket മാച്ചിൽ overs limit (e.g. 10 Overs), reorderable batting order, top-down fielding positions, toss results എന്നിവ വളരെ എളുപ്പത്തിൽ നിയന്ത്രിക്കാം!';
  }

  // Badminton specific
  if (lower.includes('badminton') || lower.includes('shuttle') || lower.includes('court') || lower.includes('ബാഡ്മിന്റൺ')) {
    return 'Badminton Hub ൽ Singles (1v1) അല്ലെങ്കിൽ Doubles (2v2) തിരഞ്ഞെടുക്കാം. ഇൻഡോർ കോർട്ട് ടൈമിങ്ങും 21-point rally set സ്കോറുകളും ട്രാക്ക് ചെയ്യാം!';
  }

  // Volleyball specific
  if (lower.includes('volleyball') || lower.includes('rotation') || lower.includes('വോളിബോൾ')) {
    return 'Volleyball ൽ 6v6 അല്ലെങ്കിൽ 4v4 കോർട്ട് ശേഷി, front-row/back-row rotation, setter/spiker റോളുകൾ, attendance quorum എന്നിവ ലൈവായി കാണാം!';
  }

  // RSVP / Attendance
  if (lower.includes('rsvp') || lower.includes('attendance') || lower.includes('playing') || lower.includes('varum') || lower.includes('വരില്ല')) {
    return 'മാച്ച് കാർഡിൽ Playing (ഇറങ്ങും), Maybe (നോക്കാം), അല്ലെങ്കിൽ Out (വരില്ല) ക്ലിക്ക് ചെയ്ത് നിങ്ങളുടെ attendance അറിയിക്കാം. Quorum തികഞ്ഞാൽ കളി ലോക്ക് ആകും!';
  }

  // Default friendly response
  return 'ഞാൻ കുഞ്ഞപ്പൻ 🤖! Kalikkanundo യിലെ മാച്ച് ഷെഡ്യൂളിംഗ്, WhatsApp റൂം കോഡുകൾ, പ്ലെയർ ലൈനപ്പുകൾ, expense splitting എന്നിവയെക്കുറിച്ച് ചോദിച്ചോളൂ. മലയാളത്തിലോ English ലോ ചോദിക്കാം!';
}

export function KunjappanChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'kunjappan',
      text: 'ഹായ്! ഞാൻ കുഞ്ഞപ്പൻ 🤖. എന്താ സഹായിക്കേണ്ടത്? Kalikkanundo യിൽ ഫുട്ബോൾ, ക്രിക്കറ്റ്, ബാഡ്മിന്റൺ, വോളിബോൾ മാച്ചുകൾ സംഘടിപ്പിക്കാൻ എന്നോട് ചോദിക്കാം!',
      timestamp: 'Just now',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [isOpen, messages, isTyping]);

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Realistic brief assistant typing response delay
    setTimeout(() => {
      const replyText = getKunjappanReply(text);
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'kunjappan',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 400);
  };

  return (
    <>
      {/* 1. Floating Action Trigger Button */}
      {!isOpen && (
        <div className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-40 flex items-center gap-2.5">
          {/* Subtle Tagline Pill on Desktop */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-primary/30 bg-[#142D25]/95 px-3 py-1 text-xs font-semibold text-primary shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-right-4 duration-300">
            <Sparkles className="h-3 w-3 animate-spin text-primary" style={{ animationDuration: '4s' }} />
            <span>എന്താ പ്രശ്നം? കുഞ്ഞപ്പൻ സഹായിക്കാം!</span>
          </div>

          {/* Trigger Circle Button */}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Open Kunjappan AI Assistant"
            className="group relative flex h-13 w-13 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
          >
            <span className="text-2xl select-none" role="img" aria-label="Robot">
              🤖
            </span>
            {/* Online Pulse Indicator */}
            <span className="absolute top-1 right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-primary-foreground" />
            </span>
          </button>
        </div>
      )}

      {/* 2. Floating Chat Window */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Kunjappan Chat Assistant"
          className="fixed z-50 flex flex-col overflow-hidden bg-[#0B1F19] border border-primary/40 shadow-2xl transition-all
            /* Desktop placement */
            lg:bottom-6 lg:right-6 lg:w-[380px] lg:h-[530px] lg:rounded-3xl lg:animate-in lg:zoom-in-95 lg:duration-200
            /* Mobile placement: Bottom sheet */
            inset-x-3 bottom-20 h-[75vh] max-h-[540px] rounded-2xl animate-in slide-in-from-bottom duration-300"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-[#294237] bg-[#142D25]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30">
                <span className="text-xl" role="img" aria-label="Kunjappan">
                  🤖
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-black text-foreground">Kunjappan</h3>
                  <span className="text-[10px] font-mono font-bold bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.2 rounded">
                    കുഞ്ഞപ്പൻ
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Your Game Assistant • Online</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-surface hover:text-foreground transition-colors"
              aria-label="Close Chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 bg-gradient-to-b from-[#0B1F19] to-[#081813]">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="h-6 w-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs shrink-0 select-none">
                      🤖
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-sm ${
                      isUser
                        ? 'bg-primary text-primary-foreground font-semibold rounded-tr-xs'
                        : 'bg-[#142D25] border border-[#294237] text-foreground rounded-tl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <span
                      className={`block text-[9px] mt-1 text-right ${
                        isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}
                    >
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                <div className="h-6 w-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs shrink-0 select-none">
                  🤖
                </div>
                <div className="rounded-2xl rounded-tl-xs bg-[#142D25] border border-[#294237] px-3.5 py-2 text-xs flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Pills */}
          <div className="p-2 sm:p-2.5 border-t border-border/60 bg-[#142D25]/70 overflow-x-auto flex gap-1.5 no-scrollbar select-none">
            {QUICK_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleSend(suggestion)}
                className="whitespace-nowrap rounded-lg border border-[#294237] bg-[#0B1F19] px-2.5 py-1 text-[11px] font-semibold text-foreground/90 hover:border-primary/50 hover:text-primary transition-colors shrink-0"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 sm:p-3 border-t border-[#294237] bg-[#142D25] flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="ചോദിക്കൂ... / Ask in English or Manglish"
              className="flex-1 h-10 rounded-xl border border-border bg-[#0B1F19] px-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-sm transition-all hover:bg-primary-hover disabled:opacity-40 disabled:pointer-events-none shrink-0"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
