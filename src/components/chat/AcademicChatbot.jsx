import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send } from "lucide-react";
import { askGeminiAssistant, isGeminiConfigured } from "../../services/geminiService";
import { useAuth } from "../../context/useAuth";

export const AcademicChatbot = () => {
  const { currentUser, userProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      sender: "ai",
      text: isGeminiConfigured
        ? "Greetings. I am your ConfHub Academic Advisor. Inquire about active conferences, submission deadlines, paper statuses, or your schedule."
        : "Greetings. I am your ConfHub Academic Advisor, running in rule-based mode (no Gemini API key configured, so open-ended questions use built-in answers instead of the LLM). I can still help with active conferences, submission deadlines, paper statuses, camera-ready/registration, certificates, and your schedule.",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    const userMsg = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: userText,
      timestamp: new Date()
    };

    // Append user's actual typed message
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Dynamic live Firestore queries based on actual user text
      const aiReply = await askGeminiAssistant(userText, currentUser, userProfile, messages);
      setMessages((prev) => [
        ...prev,
        {
          id: `reply-${Date.now()}`,
          sender: "ai",
          text: aiReply,
          timestamp: new Date()
        }
      ]);
    } catch (err) {
      console.error("Chatbot processing error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "ai",
          text: "I don't have that information right now. Try asking about 'active conferences' or 'my submissions'.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ========================================================= */}
      {/* FLOATING ACTION BUTTON (FAB) - FIXED BOTTOM-6 RIGHT-6 */}
      {/* ========================================================= */}
      <div className="fixed bottom-6 right-6 z-[60]">
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Open AI Academic Assistant"
            className="w-12 h-12 bg-ink-900 hover:bg-ink-800 text-beige-50 border border-beige-300 rounded-sm shadow-md transition-all flex items-center justify-center group active:scale-95"
            title="Ask ConfHub AI Academic Assistant"
          >
            <MessageSquare className="w-5 h-5 text-beige-100 group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-terracotta-600 rounded-full border border-white"></span>
          </button>
        ) : (
          /* ========================================================= */
          /* CHAT WINDOW POPUP (Approx 350px by 450px)                 */
          /* Monochromatic Beige Academic Styling                     */
          /* ========================================================= */
          <div className="w-[350px] h-[460px] bg-[#FAF9F6] border border-beige-300 rounded-sm shadow-xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200">
            
            {/* Header */}
            <div className="p-3 bg-beige-100 border-b border-beige-300 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-sm border border-ink-900 bg-white flex items-center justify-center font-serif text-[10px] font-bold text-ink-900">
                  🏛
                </div>
                <div>
                  <h3 className="font-serif font-bold text-xs text-ink-900 tracking-wide">
                    ConfHub Academic Advisor
                  </h3>
                  <p className="text-[9px] font-mono text-ink-500 uppercase">
                    {isGeminiConfigured ? "Gemini AI Powered" : "Rule-Based Mode"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="text-ink-500 hover:text-ink-900 p-1 rounded-sm transition"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Message Area */}
            <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs bg-[#FAF9F6]">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2 ${m.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.sender === "ai" && (
                    <div className="w-5 h-5 rounded-sm border border-beige-300 bg-beige-100 text-ink-800 flex items-center justify-center text-[10px] font-serif font-bold shrink-0 mt-0.5">
                      AI
                    </div>
                  )}

                  <div
                    className={`p-2.5 max-w-[85%] rounded-sm text-xs leading-relaxed ${
                      m.sender === "user"
                        ? "bg-ink-900 text-beige-50 font-sans shadow-2xs"
                        : "bg-white border border-beige-200 text-ink-800 font-sans shadow-2xs"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-2 justify-start">
                  <div className="w-5 h-5 rounded-sm border border-beige-300 bg-beige-100 text-ink-800 flex items-center justify-center text-[10px] font-serif font-bold shrink-0">
                    AI
                  </div>
                  <div className="p-2.5 bg-white border border-beige-200 text-ink-500 rounded-sm text-xs italic flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-400 animate-bounce"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-400 animate-bounce delay-100"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-400 animate-bounce delay-200"></span>
                    <span className="text-[10px] ml-1">Consulting conference rules...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Input Field */}
            <form onSubmit={handleSendMessage} className="p-2.5 bg-beige-100 border-t border-beige-300 flex items-center gap-2 shrink-0">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about deadlines, camera-ready, certs..."
                className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-beige-300 rounded-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-ink-800"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-1.5 bg-ink-900 hover:bg-ink-800 text-beige-50 rounded-sm disabled:opacity-40 transition"
                title="Send inquiry"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

          </div>
        )}
      </div>
    </>
  );
};
