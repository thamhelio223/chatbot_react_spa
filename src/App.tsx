import {
  useState,
  useCallback,
  type FormEvent,
  useRef,
  useEffect, // Added useEffect
} from "react";
import { nanoid } from "nanoid";

// Import our stylesheets
import "./index.css";
import "./App.css";

// --- [DATA TYPES] ---
type N8nMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ConversationHistory = {
  id: string;
  title: string;
  messages: N8nMessage[];
};

// --- [ENV VAR] ---
const N8N_CHAT_API =
  import.meta.env.VITE_N8N_CHAT_API || "YOUR_FALLBACK_WEBHOOK_URL";

// --- [SUGGESTIONS ARRAY] ---
const suggestions = [
    "How is the onboarding process at Helios?",
  "What is Helios about?",
  "What are the main benefits or working at Helios?"
];

// --- [UI COMPONENTS (Inline SVGs)] ---
// ... (TypingIndicator, SendIcon, MenuIcon, PlusIcon, XIcon are the same)
const TypingIndicator = () => (
  <div className="message assistant">
    <div className="typing-indicator">
      <span />
      <span />
      <span />
    </div>
  </div>
);

const SendIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M2.66699 13.333V9.16634L7.33366 7.99967L2.66699 6.83301V2.66634L14.0003 7.99967L2.66699 13.333Z"
      fill="currentColor"
    />
  </svg>
);

const MenuIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="icon"
  >
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="20" y1="6" y2="6" />
    <line x1="4" x2="20" y1="18" y2="18" />
  </svg>
);

const PlusIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="icon"
  >
    <path d="M12 5V19" />
    <path d="M5 12H19" />
  </svg>
);

const XIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="icon"
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

// --- [NEW] Arrow Icons for Scroller ---
const ArrowLeftIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m15 18-6-6 6-6" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

// --- [MAIN COMPONENT] ---
export default function App() {
  const [messages, setMessages] = useState<N8nMessage[]>([]);
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<
    ConversationHistory[]
  >([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  
  // --- [NEW] State for scroll arrows ---
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const suggestionBarRef = useRef<HTMLDivElement>(null); // Ref for the suggestion bar

  // ... (scrollToBottom, useEffects for scrolling/convos are the same)
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (activeConversationId) {
      const conv = conversationHistory.find((c) => c.id === activeConversationId);
      if (conv) {
        setMessages(conv.messages);
      }
    } else {
      setMessages([]);
    }
  }, [activeConversationId, conversationHistory]);

  // --- [NEW] useEffect for managing scroll arrow visibility ---
  useEffect(() => {
    const slider = suggestionBarRef.current;
    if (!slider) return;

    // This function checks the scroll state
    const checkScroll = () => {
      // A small buffer (1px) accounts for subpixel rendering
      const scrollLeft = Math.ceil(slider.scrollLeft);
      const scrollWidth = slider.scrollWidth;
      const clientWidth = slider.clientWidth;

      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    };

    // Check scroll on mount, on scroll, and on resize
    const handleScroll = () => checkScroll();
    const resizeObserver = new ResizeObserver(checkScroll);
    
    slider.addEventListener("scroll", handleScroll);
    resizeObserver.observe(slider);

    // Initial check (needs a tiny delay for DOM to be ready)
    const timer = setTimeout(checkScroll, 100);

    // Cleanup
    return () => {
      clearTimeout(timer);
      slider.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [messages.length]); // Re-run this effect if the message list changes (which shows/hides the bar)


  // --- [NEW] Handlers for the arrow buttons ---
  const handleScrollLeft = () => {
    suggestionBarRef.current?.scrollBy({ left: -200, behavior: "smooth" });
  };

  const handleScrollRight = () => {
    suggestionBarRef.current?.scrollBy({ left: 200, behavior: "smooth" });
  };

  // ... (startNewConversation, loadConversation, toggleSidebar are the same)
  const startNewConversation = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setText("");
    setIsLoading(false);
    setError(null);
    setHasInteracted(true);
    setIsSidebarOpen(false);
  }, []);

  const loadConversation = useCallback((convId: string) => {
    setActiveConversationId(convId);
    setHasInteracted(true);
    setIsSidebarOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
    setHasInteracted(true);
  }, []);

  // ... (handleSend, handleSubmit, handleSuggestionClick are the same)
  const handleSend = useCallback(
    async (messageContent: string) => {
      if (!messageContent.trim() || isLoading) return;

      setHasInteracted(true);
      setError(null);
      setText("");

      const userMessage: N8nMessage = {
        id: nanoid(),
        role: "user",
        content: messageContent,
      };

      const currentMessages = activeConversationId
        ? conversationHistory.find((c) => c.id === activeConversationId)?.messages || []
        : messages;

      const n8nMessageList = [...currentMessages, userMessage];

      const loadingMessage: N8nMessage = {
        id: "loader",
        role: "assistant",
        content: "...",
      };

      setMessages((prev) => [...prev, userMessage, loadingMessage]);
      setIsLoading(true);

      if (!N8N_CHAT_API || N8N_CHAT_API === "YOUR_FALLBACK_WEBHOOK_URL") {
        setError("Chat service is not configured.");
        setMessages(n8nMessageList);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(N8N_CHAT_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: n8nMessageList }),
        });

        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const result: { messages: N8nMessage[] } = await response.json();

        if (!result.messages) {
          throw new Error("Invalid response structure from n8n");
        }

        setMessages(result.messages);

        setConversationHistory((prevHistory) => {
          let updatedHistory = [...prevHistory];
          if (activeConversationId) {
            updatedHistory = updatedHistory.map((conv) =>
              conv.id === activeConversationId
                ? { ...conv, messages: result.messages }
                : conv
            );
          } else {
            const newConvId = nanoid();
            const newTitle =
              result.messages[0]?.content.substring(0, 30) + "..." || "New Chat";
            updatedHistory.unshift({
              id: newConvId,
              title: newTitle,
              messages: result.messages,
            });
            setActiveConversationId(newConvId);
          }
          return updatedHistory;
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unknown error occurred.";
        setError(`Sorry, I had trouble connecting: ${errorMessage}`);
        setMessages(n8nMessageList);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, activeConversationId, conversationHistory]
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSend(text);
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion);
  };

  return (
    <div
      className={`chat-app-container ${hasInteracted ? "interacted" : ""} ${
        isSidebarOpen ? "sidebar-open" : ""
      }`}
    >
      {/* ... (Sidebar and Main Chat Area JSX are the same) ... */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <button
            className="sidebar-button new-chat-button"
            onClick={startNewConversation}
          >
            <PlusIcon /> New Chat
          </button>
          <button
            className="sidebar-button close-sidebar-button"
            onClick={toggleSidebar}
          >
            <XIcon />
          </button>
        </div>
        <div className="conversation-list">
          {conversationHistory.length === 0 && (
            <div className="no-conversations">No past conversations.</div>
          )}
          {conversationHistory.map((conv) => (
            <button
              key={conv.id}
              className={`conversation-item ${
                activeConversationId === conv.id ? "active" : ""
              }`}
              onClick={() => loadConversation(conv.id)}
            >
              {conv.title}
            </button>
          ))}
        </div>
      </aside>

      <div className="sidebar-overlay" onClick={toggleSidebar}></div>

      <main className="main-chat-area">
        <header className="chat-header">
          <button
            className="sidebar-button sidebar-toggle-button"
            onClick={toggleSidebar}
          >
            <MenuIcon />
          </button>
          <div className="chat-header-title">
            <h1>Huddle Assistant</h1>
            <p>Here to answer all of your questions</p>
          </div>
        </header>

        <div className="message-list-container">
          <div className="message-list">
            {messages.length === 0 && !isLoading && !error && (
              <div className="welcome-message">
                <h2>Chatbot</h2>
                <p>Start a new conversation or select one from the sidebar.</p>
              </div>
            )}
            {messages.map((msg) =>
              msg.id === "loader" ? (
                <TypingIndicator key="loader" />
              ) : (
                <div key={msg.id} className={`message-wrapper ${msg.role}`}>
                  <div className="message">
                    {msg.content.split("\n").map((line, i) => (
                      <span key={i}>
                        {line}
                        <br />
                      </span>
                    ))}
                  </div>
                </div>
              ),
            )}
            {error && (
              <div className="message-wrapper assistant">
                <div className="message error">{error}</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* [UPDATED] Footer with new suggestion container */}
        <footer className="chat-footer">
          {messages.length === 0 && !isLoading && (
            <div className="suggestion-container">
              {/* --- [NEW] Left Arrow --- */}
              <button
                className="scroll-arrow left"
                onClick={handleScrollLeft}
                disabled={!canScrollLeft}
                aria-label="Scroll left"
              >
                <ArrowLeftIcon />
              </button>

              {/* --- The original suggestion bar --- */}
              <div className="suggestion-bar" ref={suggestionBarRef}>
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    className="suggestion-chip"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              {/* --- [NEW] Right Arrow --- */}
              <button
                className="scroll-arrow right"
                onClick={handleScrollRight}
                disabled={!canScrollRight}
                aria-label="Scroll right"
              >
                <ArrowRightIcon />
              </button>
            </div>
          )}

          {/* --- The original chat form --- */}
          <form onSubmit={handleSubmit} className="chat-form">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your message..."
              className="chat-input"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="chat-submit"
              disabled={isLoading || !text.trim()}
            >
              {isLoading ? <div className="spinner"></div> : <SendIcon />}
            </button>
          </form>
        </footer>
      </main>
    </div>
  );
}
