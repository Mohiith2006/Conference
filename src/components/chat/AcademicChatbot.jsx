import React, { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  X,
  Send,
  Key,
  RotateCcw,
  Sparkles,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import {
  askGeminiAssistant,
  isGeminiConfigured,
  getGeminiApiKey,
  setGeminiApiKey
} from "../../services/geminiService";
import { useAuth } from "../../context/useAuth";

// Quick suggestion chips
const QUICK_PROMPTS = [
  { label: "🌿 Explain Photosynthesis", query: "Explain photosynthesis" },
  { label: "🗼 Capital of France", query: "What's the capital of France?" },
  { label: "🧠 What is ML?", query: "What is machine learning?" },
  { label: "🏛 Active Conferences", query: "What are the active conferences?" },
  { label: "⭐ Review Process", query: "How does the review process work here?" },
  { label: "📄 My Submissions", query: "What is my paper status?" },
  { label: "💳 Registration Fees", query: "What are the conference registration fees?" },
  { label: "📅 Presentation Schedule", query: "What is my presentation schedule?" }
];

/**
 * Lightweight academic markdown renderer for chat bubbles.
 * Formats headings, bold text, code spans, bullet lists, and paragraphs cleanly.
 */
const FormattedMessage = ({ text, isUser }) => {
  if (isUser) {
    return <div className="font-sans text-xs leading-relaxed">{text}</div>;
  }

  const renderInline = (str) => {
    // Split on bold (**text**), code (`text`), and italic (*text*)
    const parts = str.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-ink-950">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={i}
            className="px-1 py-0.5 rounded bg-beige-200 text-ink-900 font-mono text-[11px] font-medium"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <em key={i} className="italic text-ink-700">
            {part.slice(1, -1)}
          </em>
        );
      }
      return part;
    });
  };

  const lines = text.split("\n");

  return (
    <div className="font-sans text-xs leading-relaxed space-y-1.5 text-ink-900">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Heading 3
        if (trimmed.startsWith("### ")) {
          return (
            <h4
              key={idx}
              className="font-serif font-bold text-ink-950 text-xs pt-1 pb-0.5 border-b border-beige-200"
            >
              {renderInline(trimmed.slice(4))}
            </h4>
          );
        }

        // Bullet point
        if (trimmed.startsWith("• ") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const content = trimmed.replace(/^[•\-\*]\s+/, "");
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1">
              <span className="text-terracotta-600 font-bold shrink-0 mt-0.5">•</span>
              <span className="flex-1">{renderInline(content)}</span>
            </div>
          );
        }

        // Numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1">
              <span className="font-mono text-[10px] font-bold text-ink-600 shrink-0 mt-0.5">
                {numMatch[1]}.
              </span>
              <span className="flex-1">{renderInline(numMatch[2])}</span>
            </div>
          );
        }

        // Regular paragraph
        return (
          <p key={idx} className="text-ink-800">
            {renderInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

export const AcademicChatbot = () => {
  const { currentUser, userProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      sender: "ai",
      text: `Hello! I am your **ConfHub AI Assistant**.

I can help with anything you'd like to ask—general knowledge, science, coding, history, or academic writing—as well as answer questions about ConfHub conferences, paper submissions, review rubrics, registration, and schedules.

Feel free to ask me anything!`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(getGeminiApiKey());
  const [keySavedMessage, setKeySavedMessage] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(isGeminiConfigured());
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, loading]);

  const handleSaveApiKey = (e) => {
    e.preventDefault();
    setGeminiApiKey(apiKeyInput.trim());
    setHasApiKey(isGeminiConfigured());
    setKeySavedMessage(true);
    setTimeout(() => setKeySavedMessage(false), 2500);
  };

  const handleClearApiKey = () => {
    setGeminiApiKey("");
    setApiKeyInput("");
    setHasApiKey(false);
    setKeySavedMessage(true);
    setTimeout(() => setKeySavedMessage(false), 2500);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: "ai",
        text: `Conversation restarted. I am ready to assist you with any conference, submission, review, or scheduling questions.`,
        timestamp: new Date()
      }
    ]);
  };

  const executeInquiry = async (textToSend) => {
    const userText = textToSend.trim();
    if (!userText || loading) return;

    const userMsg = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: userText,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const aiReply = await askGeminiAssistant(
        userText,
        currentUser,
        userProfile,
        messages
      );

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
      // Fallback guarantees answer is always provided
      setMessages((prev) => [
        ...prev,
        {
          id: `reply-fallback-${Date.now()}`,
          sender: "ai",
          text: "I am your ConfHub Advisor. You can check active conferences in Tab 1, track your papers in Tab 2, complete registration in Tab 3, view your presentation schedule in Tab 4, and download certificates in Tab 5.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    executeInquiry(input);
  };

  return (
    <>
      {/* ========================================================= */}
      {/* FLOATING ACTION BUTTON (FAB) */}
      {/* ========================================================= */}
      <div className="fixed bottom-6 right-6 z-[60]">
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Open AI Academic Assistant"
            className="w-12 h-12 bg-ink-900 hover:bg-ink-800 text-beige-50 border border-beige-300 rounded-sm shadow-xl transition-all flex items-center justify-center group active:scale-95"
            title="Ask ConfHub AI Academic Advisor"
          >
            <MessageSquare className="w-5 h-5 text-beige-100 group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-terracotta-600 rounded-full border border-white"></span>
          </button>
        ) : (
          /* ========================================================= */
          /* CHAT WINDOW POPUP */
          /* Monochromatic Beige Academic Styling (380px x 520px)      */
          /* ========================================================= */
          <div className="w-[370px] sm:w-[410px] h-[540px] bg-[#FAF9F6] border border-beige-300 rounded-sm shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200">
            {/* Header */}
            <div className="p-3 bg-beige-100 border-b border-beige-300 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-sm border border-ink-900 bg-white flex items-center justify-center font-serif text-xs font-bold text-ink-900 shadow-2xs">
                  🏛
                </div>
                <div>
                  <h3 className="font-serif font-bold text-xs text-ink-950 tracking-wide flex items-center gap-1.5">
                    ConfHub AI Assistant
                    <Sparkles className="w-3 h-3 text-terracotta-600" />
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        hasApiKey ? "bg-emerald-600" : "bg-ink-600"
                      }`}
                    />
                    <p className="text-[9px] font-mono text-ink-600 uppercase tracking-tight">
                      {hasApiKey ? "Gemini 1.5/2.0 Flash Connected" : "General & Platform AI Engine"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-1.5 rounded-sm transition ${
                    showSettings
                      ? "bg-beige-300 text-ink-900"
                      : "text-ink-600 hover:text-ink-900 hover:bg-beige-200"
                  }`}
                  title="Configure Gemini API Key"
                >
                  <Key className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={handleClearChat}
                  className="p-1.5 text-ink-600 hover:text-ink-900 hover:bg-beige-200 rounded-sm transition"
                  title="Restart Conversation"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-ink-600 hover:text-ink-900 hover:bg-beige-200 rounded-sm transition"
                  title="Close Assistant"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Slide-Down API Key Configuration Drawer */}
            {showSettings && (
              <div className="bg-beige-100/95 border-b border-beige-300 p-3 text-xs space-y-2.5 animate-in slide-in-from-top-2 duration-150 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="font-serif font-bold text-ink-900 text-xs flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-terracotta-600" />
                    Gemini API Key (Optional)
                  </div>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-terracotta-700 hover:underline flex items-center gap-0.5 font-mono"
                  >
                    Get Free Key <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                <p className="text-[10px] text-ink-600 leading-normal">
                  ConfHub includes a comprehensive built-in Academic Reasoning Engine that answers all conference, review, rubric, and scheduling questions. You may optionally connect your Google Gemini API key for open-ended LLM capabilities.
                </p>

                <form onSubmit={handleSaveApiKey} className="flex gap-1.5">
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="AIzaSy..."
                    className="flex-1 px-2 py-1 text-xs bg-white border border-beige-300 rounded-sm font-mono text-ink-900 focus:outline-none focus:border-ink-800"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-ink-900 hover:bg-ink-800 text-beige-50 text-xs rounded-sm font-medium transition"
                  >
                    Save
                  </button>
                  {apiKeyInput && (
                    <button
                      type="button"
                      onClick={handleClearApiKey}
                      className="px-2 py-1 bg-beige-200 hover:bg-beige-300 text-ink-700 text-xs rounded-sm transition"
                    >
                      Clear
                    </button>
                  )}
                </form>

                {keySavedMessage && (
                  <div className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                    <Check className="w-3 h-3" /> Key settings updated successfully!
                  </div>
                )}
              </div>
            )}

            {/* Scrollable Messages Viewport */}
            <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#FAF9F6]">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2 ${
                    m.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {m.sender === "ai" && (
                    <div className="w-6 h-6 rounded-sm border border-beige-300 bg-beige-100 text-ink-800 flex items-center justify-center text-[10px] font-serif font-bold shrink-0 mt-0.5 shadow-2xs">
                      🏛
                    </div>
                  )}

                  <div
                    className={`p-3 max-w-[88%] rounded-sm shadow-2xs ${
                      m.sender === "user"
                        ? "bg-ink-900 text-beige-50"
                        : "bg-white border border-beige-200"
                    }`}
                  >
                    <FormattedMessage text={m.text} isUser={m.sender === "user"} />
                  </div>
                </div>
              ))}

              {/* Loading Indicator */}
              {loading && (
                <div className="flex gap-2 justify-start items-center">
                  <div className="w-6 h-6 rounded-sm border border-beige-300 bg-beige-100 text-ink-800 flex items-center justify-center text-[10px] font-serif font-bold shrink-0 shadow-2xs">
                    🏛
                  </div>
                  <div className="p-3 bg-white border border-beige-200 text-ink-600 rounded-sm text-xs italic flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-600 animate-bounce"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-600 animate-bounce delay-100"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-600 animate-bounce delay-200"></span>
                    <span className="text-[11px] font-sans">
                      Analyzing academic guidelines & records...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Chips */}
            <div className="px-3 py-2 bg-beige-50/80 border-t border-beige-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {QUICK_PROMPTS.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => executeInquiry(chip.query)}
                  disabled={loading}
                  className="whitespace-nowrap px-2.5 py-1 text-[10px] font-sans font-medium bg-white hover:bg-beige-100 text-ink-800 border border-beige-300 rounded-full shadow-2xs transition active:scale-95 disabled:opacity-50"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Bottom Input Area */}
            <form
              onSubmit={handleFormSubmit}
              className="p-2.5 bg-beige-100 border-t border-beige-300 flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything (general knowledge, coding, or ConfHub)..."
                className="flex-1 px-3 py-2 text-xs bg-white border border-beige-300 rounded-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-ink-800"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2 bg-ink-900 hover:bg-ink-800 text-beige-50 rounded-sm disabled:opacity-40 transition shadow-2xs"
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
