import React, { useRef, useState, useEffect } from "react";
import { api } from "@/lib/api";
import { MessageSquare, X, Send } from "lucide-react";

function genSessionId() {
  let s = localStorage.getItem("chrono_chat_session");
  if (!s) {
    s = "sess_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("chrono_chat_session", s);
  }
  return s;
}

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hi! I'm ChronoBot — ask me anything about ChronoBook (signup, booking, availability, admin)." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const sessionId = useRef(genSessionId());
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  const send = async (e) => {
    e?.preventDefault?.();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setBusy(true);
    try {
      const r = await api.post("/chat", { session_id: sessionId.current, message: text });
      setMessages((m) => [...m, { role: "bot", text: r.data.reply || "…" }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "bot", text: "Sorry, I hit an error. Try again?" }]);
    } finally { setBusy(false); }
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        data-testid="chatbot-toggle"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-300/40 hover:scale-105 transition-transform z-50"
        aria-label="Open chatbot"
      >
        {open ? <X size={22} /> : <MessageSquare size={22} />}
      </button>

      {open && (
        <div
          data-testid="chatbot-panel"
          className="fixed bottom-24 right-6 w-[360px] max-w-[calc(100vw-3rem)] h-[480px] bg-white rounded-2xl border border-slate-200 flex flex-col z-50 shadow-2xl shadow-slate-200/60 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-3.5 flex items-center justify-between">
            <div>
              <div className="font-display font-bold tracking-tight">ChronoBot</div>
              <div className="text-[11px] text-indigo-200 font-medium">AI assistant · online</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
              <X size={18} />
            </button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm ${
                  m.role === "user"
                    ? "ml-auto bg-indigo-600 text-white rounded-br-sm"
                    : "bg-white border border-slate-100 text-slate-700 rounded-bl-sm shadow-sm"
                }`}
                data-testid={`chat-msg-${m.role}-${i}`}
              >
                {m.text}
              </div>
            ))}
            {busy && <div className="text-xs text-slate-400 font-medium">Typing…</div>}
          </div>
          <form onSubmit={send} className="border-t border-slate-100 p-3 flex gap-2 bg-white">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything…"
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
              data-testid="chatbot-input"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              data-testid="chatbot-send"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
