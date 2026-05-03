/// <reference types="vite/client" />
import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, Loader2, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ВАЖНО: В реальных (коммерческих) проектах хранить токены на клиенте небезопасно!
const OPENROUTER_API_KEY = "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";

const SYSTEM_PROMPT = `Ты — эксперт по физике плазмы и управляемому термоядерному синтезу. Твоя задача — помогать слушателям школьного доклада: объяснять простым языком принципы токамаков и стеллараторов, критерий Лоусона, реакцию D+T, преимущества ИТЭР. Отвечай на русском, кратко, но научно точно. Если вопрос не по теме, мягко возвращай разговор к термоядерной энергетике. Оформляй списки и важные термины (используй **жирный текст**).`;

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const QUICK_QUESTIONS = [
  "Что такое Токамак?",
  "В чем разница токамака и стелларатора?",
  "Что такое реакция D+T?"
];

const FAQ_ITEMS = [
  {
    "q": "В чем отличие токамака от стелларатора?",
    "a": "В токамаке плазма удерживается током, протекающим через саму плазму. В стеллараторе магнитное поле создается только внешними катушками сложной формы."
  },
  {
    "q": "Опасен ли термоядерный реактор?",
    "a": "Он предельно безопасен. Цепная реакция невозможна: при любой проблеме плазма мгновенно остывает и процесс синтеза прекращается."
  },
  {
    "q": "Что такое критерий Лоусона?",
    "a": "Условие по плотности, температуре и времени удержания плазмы, необходимое для самоподдерживающейся реакции без внешнего нагрева."
  },
  {
    "q": "Зачем нужен проект ИТЭР?",
    "a": "ИТЭР строится для того, чтобы доказать физическую и инженерную осуществимость термоядерной энергии в коммерческих масштабах."
  }
];

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Привет! Я — **Термояд-ИИ**, ваш интерактивный эксперт по физике плазмы. Задавайте любые вопросы по теме доклада «Термоядерный синтез — энергия будущего»!' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    try {
      const apiMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...newMessages.map(m => ({ role: m.role, content: m.content }))
      ];

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY.trim()}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost", // Используем localhost, как в вашем рабочем Python-скрипте
          "X-Title": "Fusion-AI" 
        },
        body: JSON.stringify({
          // Используем запрашиваемую модель
          model: "openrouter/free", 
          messages: apiMessages,
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        let errorMessage = errText;
        try {
           const errJson = JSON.parse(errText);
           if (errJson.error && errJson.error.message) {
              errorMessage = errJson.error.message;
           }
        } catch(e) {}
        
        if (response.status === 401) {
           throw new Error(`Ошибка авторизации (401). Ваш API-ключ недействителен, удален или заблокирован в OpenRouter. Сгенерируйте новый ключ на сайте OpenRouter. (${errorMessage})`);
        }
        
        if (response.status === 403) {
           throw new Error(`Лимит ключа OpenRouter исчерпан или доступ запрещен. Проверьте лимиты на https://openrouter.ai/settings/keys. Подробности: ${errorMessage}`);
        }
        
        throw new Error(`HTTP ${response.status}: ${errorMessage}`);
      }

      const data = await response.json();
      
      const assistantMessage: Message = { 
        role: 'assistant', 
        content: data.choices[0].message.content 
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Ошибка при обращении к API:", error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `⚠️ **Ошибка связи с реактором!** Пожалуйста, проверьте подключение или правильность токена. \n\n*Техническая инфо: ${error instanceof Error ? error.message : String(error)}*` 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#050505] text-slate-300 font-sans overflow-hidden">
      <nav className="h-16 border-b border-white/10 px-4 md:px-8 flex items-center justify-between bg-black/40 backdrop-blur-md shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-600 via-purple-600 to-blue-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]"></div>
          <div>
            <h1 className="text-xl font-bold tracking-tighter text-white uppercase">Термояд-ИИ</h1>
            <p className="text-[10px] text-orange-500 tracking-[0.2em] uppercase font-semibold hidden sm:block">Эксперт по синтезу будущего</p>
          </div>
        </div>
        <div className="hidden md:flex gap-6 text-[11px] uppercase tracking-widest font-medium opacity-70">
          <a href="#" className="hover:text-orange-500 transition-colors">ITER Project</a>
          <a href="#" className="hover:text-orange-500 transition-colors">Физика Плазмы</a>
          <a href="#" className="hover:text-orange-500 transition-colors">Контакт</a>
        </div>
      </nav>

      <main className="flex-1 flex gap-px bg-white/5 overflow-hidden">
        {/* Left Sidebar (Desktop) */}
        <aside className="hidden lg:flex w-72 bg-black/60 p-6 flex-col gap-6 shrink-0 z-10 overflow-y-auto">
          <div>
            <h2 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3 block">Текущий статус реактора</h2>
            <div className="space-y-3">
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-[10px] text-slate-400">T₁ (Температура)</span>
                  <span className="text-sm font-mono text-orange-400">150.2 MK</span>
                </div>
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className="w-[85%] h-full bg-orange-500"></div>
                </div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-[10px] text-slate-400">Давление P</span>
                  <span className="text-sm font-mono text-blue-400">2.45 атм</span>
                </div>
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className="w-[60%] h-full bg-blue-500"></div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3 block">
              Быстрые вопросы
            </h2>
            <div className="space-y-2">
              {QUICK_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-orange-950/30 border border-white/5 hover:border-orange-900/50 transition-all duration-200 text-[11px] text-slate-300 hover:text-orange-200 group leading-relaxed"
                >
                  <span className="text-orange-500/50 mr-2 group-hover:text-orange-400 transition-colors">›</span>
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto">
            <div className="p-4 rounded-xl border border-orange-900/30 bg-orange-950/10 text-orange-200/80">
              <h3 className="text-xs font-serif italic mb-2 text-orange-400">Критерий Лоусона</h3>
              <p className="text-[11px] leading-relaxed">
                Условие nτE ≥ 10²¹ м⁻³·с·кэВ должно быть выполнено для запуска самоподдерживающейся реакции D+T.
              </p>
            </div>
          </div>
        </aside>

        {/* Main Chat Area */}
        <section className="flex-1 flex flex-col bg-[#080808] relative">
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-600/5 rounded-full blur-[100px]"></div>
          </div>

          <div className="flex-1 p-4 md:p-8 space-y-6 overflow-y-auto relative z-10 w-full max-w-4xl mx-auto custom-scrollbar">
            {messages.map((message, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                key={idx}
                className={`flex gap-3 md:gap-4 w-full`}
              >
                {message.role === 'user' ? (
                  <>
                    <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-[10px] text-slate-500 font-bold shrink-0">USER</div>
                    <div className="max-w-xl p-4 rounded-2xl rounded-tl-none bg-white/5 border border-white/10 text-sm leading-relaxed text-slate-200">
                      {message.content}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 rounded bg-orange-600 flex items-center justify-center text-[10px] text-white font-bold shrink-0 shadow-[0_0_10px_rgba(234,88,12,0.5)]">AI</div>
                    <div className="max-w-xl p-4 rounded-2xl rounded-tl-none bg-orange-500/5 border border-orange-500/20 text-sm leading-relaxed text-slate-200">
                      <div className="markdown-body prose prose-invert prose-orange max-w-none prose-p:leading-relaxed prose-pre:bg-black/50 prose-a:text-orange-400 hover:prose-a:text-orange-300 !text-slate-200">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
            
            {isTyping && (
               <motion.div 
                 initial={{ opacity: 0 }} 
                 animate={{ opacity: 1 }}
                 className="flex gap-3 md:gap-4 w-full"
               >
                 <div className="w-8 h-8 rounded bg-orange-600 flex items-center justify-center text-[10px] text-white font-bold shrink-0 shadow-[0_0_10px_rgba(234,88,12,0.5)]">AI</div>
                 <div className="max-w-xl p-4 rounded-2xl rounded-tl-none bg-orange-500/5 border border-orange-500/20 text-sm leading-relaxed text-slate-200 flex items-center gap-3">
                   <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                   <span className="text-xs text-orange-400 font-medium tracking-wide">Синтезирую ответ...</span>
                 </div>
               </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 md:p-6 bg-black/40 border-t border-white/5 z-20">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
              className="relative flex items-center max-w-4xl mx-auto"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Спроси эксперта о токамаках или звездном топливе..."
                className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-6 pr-16 text-sm focus:outline-none focus:border-orange-500/50 transition-all shadow-inner text-slate-200 placeholder-slate-500"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="absolute right-2 p-2 bg-orange-600 hover:bg-orange-500 text-white rounded-full transition-all disabled:opacity-50 min-w-10 min-h-10 flex items-center justify-center group"
              >
                <Send className="w-4 h-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </form>
            <p className="text-center text-[10px] text-slate-600 mt-4 tracking-wider uppercase font-medium">Powered by OpenRouter & Physics Engine v2.4</p>
          </div>
        </section>

        {/* Right Sidebar (Desktop) - FAQ */}
        <aside className="hidden lg:flex w-72 bg-black/60 flex-col p-6 gap-6 border-l border-white/5 shrink-0 z-10 overflow-y-auto custom-scrollbar">
          <div>
            <h2 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2"><MessageSquare className="w-3 h-3"/> FAQ (Частые вопросы)</span>
              <span className="text-orange-500 border border-orange-500/30 px-1.5 rounded-sm bg-orange-500/10 text-[8px]">INFO</span>
            </h2>
            <div className="space-y-4">
              {FAQ_ITEMS.map((item, idx) => (
                <div 
                  key={idx} 
                  className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-orange-500/30 transition-all cursor-pointer group shadow-sm"
                  onClick={() => handleSend(item.q)}
                  title="Нажмите, чтобы спросить ИИ"
                >
                  <h3 className="text-orange-400 font-medium mb-2 text-[13px] leading-snug group-hover:text-orange-300 transition-colors">
                    {item.q}
                  </h3>
                  <p className="text-slate-400 text-[11px] leading-relaxed group-hover:text-slate-300 transition-colors">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-auto pt-6">
            <div className="flex gap-3 justify-center items-center">
              <div className="w-8 h-8 border border-white/20 rounded flex items-center justify-center opacity-40 text-xs font-bold transition-all">H</div>
              <div className="w-8 h-8 border border-orange-500/50 rounded flex items-center justify-center text-xs font-bold text-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.2)] transition-all">D</div>
              <div className="w-8 h-8 border border-white/20 rounded flex items-center justify-center opacity-40 text-xs font-bold transition-all">T</div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

