import React, { useRef, useState, useEffect } from "react";
import { MessageSquare, X } from "lucide-react";

const FAQ = [
  {
    id: "what-is",
    question: "What is ChronoBook?",
    answer:
      "ChronoBook is a meeting scheduler — like Calendly. You set your availability, create meeting types, share your booking page, and invitees pick a time that works. No more back-and-forth emails.",
  },
  {
    id: "signup",
    question: "How do I sign up?",
    answer:
      "Click Get started free on the homepage or go to /register. Enter your name, email, and password. After signing up you'll land on your dashboard where you can set up meeting types and availability.",
  },
  {
    id: "meeting-type",
    question: "How do I create a meeting type?",
    answer:
      "Go to Dashboard → Meeting Types tab. Enter a title (e.g. \"30 min call\"), pick a duration, and click Add. You can create multiple types with different lengths.",
  },
  {
    id: "availability",
    question: "How do I set my availability?",
    answer:
      "Open Dashboard → Availability tab. Toggle the days you're free, set start/end times for each day, and choose your timezone. Available slots are calculated automatically from these rules.",
  },
  {
    id: "share-link",
    question: "How do I share my booking link?",
    answer:
      "Your public page is at /u/your-username (shown on the Dashboard Overview tab). Click Copy link and share it via email, social media, or your website. Invitees book directly from that page.",
  },
  {
    id: "book-meeting",
    question: "How does someone book a meeting?",
    answer:
      "They open your /u/username page, pick a meeting type, choose an available date and time slot, enter their name and email, and confirm. Both of you receive a confirmation with meeting details.",
  },
  {
    id: "cancel",
    question: "Can I cancel or reschedule a booking?",
    answer:
      "Yes. Invitees can cancel via the link in their confirmation email. Hosts can view bookings on the Dashboard and reschedule confirmed bookings to a new available slot.",
  },
  {
    id: "admin",
    question: "What is the admin dashboard?",
    answer:
      "Admin accounts can access /admin to see platform-wide stats — total users, bookings, and recent activity. Regular users use /dashboard for their own meetings and settings.",
  },
];

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hi! I'm ChronoBot. Pick a question below and I'll help you get started with ChronoBook.",
    },
  ]);
  const [answered, setAnswered] = useState(new Set());
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  const askQuestion = (faq) => {
    if (answered.has(faq.id)) return;
    setAnswered((prev) => new Set(prev).add(faq.id));
    setMessages((m) => [
      ...m,
      { role: "user", text: faq.question },
      { role: "bot", text: faq.answer },
    ]);
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        data-testid="chatbot-toggle"
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-orange-600 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-orange-300/40 hover:scale-105 transition-transform z-50"
        aria-label="Open chatbot"
      >
        {open ? <X size={22} /> : <MessageSquare size={22} />}
      </button>

      {open && (
        <div
          data-testid="chatbot-panel"
          className="fixed inset-x-3 bottom-[4.5rem] sm:inset-x-auto sm:bottom-24 sm:right-6 w-auto sm:w-[360px] max-w-none sm:max-w-[calc(100vw-3rem)] h-[min(480px,calc(100dvh-6rem))] bg-white rounded-2xl border border-stone-200 flex flex-col z-50 shadow-2xl shadow-stone-200/60 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white px-4 py-3.5 flex items-center justify-between">
            <div>
              <div className="font-display font-bold tracking-tight">ChronoBot</div>
              <div className="text-[11px] text-orange-200 font-medium">Help assistant · online</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
              <X size={18} />
            </button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm ${
                  m.role === "user"
                    ? "ml-auto bg-orange-600 text-white rounded-br-sm"
                    : "bg-white border border-stone-100 text-stone-700 rounded-bl-sm shadow-sm"
                }`}
                data-testid={`chat-msg-${m.role}-${i}`}
              >
                {m.text}
              </div>
            ))}
          </div>
          <div className="border-t border-stone-100 p-3 bg-white">
            <p className="text-[11px] font-medium text-stone-400 mb-2 px-0.5">Choose a question</p>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
              {FAQ.map((faq) => {
                const done = answered.has(faq.id);
                return (
                <button
                  key={faq.id}
                  type="button"
                  onClick={() => askQuestion(faq)}
                  disabled={done}
                  data-testid={`chatbot-faq-${faq.id}`}
                  className={`text-left text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                    done
                      ? "border-stone-200 bg-stone-100 text-stone-400 cursor-default"
                      : "border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100 hover:border-orange-300"
                  }`}
                >
                  {faq.question}
                </button>
              );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
