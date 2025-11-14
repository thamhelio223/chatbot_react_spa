import { useState, useCallback, type FormEvent, useRef, useEffect } from "react";
import { nanoid } from "nanoid";

// Import our new stylesheets
import "./index.css";
import "./App.css";

// --- [DATA TYPES] ---
type N8nMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

// Represents a single saved conversation in the sidebar
type ConversationHistory = {
  id: string;
  title: string;
  messages: N8nMessage[];
};

// --- [ENV VAR] ---
const N8N_CHAT_API =
  import.meta.env.VITE_N8N_CHAT_API || "YOUR_FALLBACK_WEBHOOK_URL";

// --- [UI COMPONENTS (Inline SVGs)] ---
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

// --- [MAIN COMPONENT] ---
export default function App() {
  const [messages, setMessages] = useState<N8nMessage[]>([]);
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New state for UI and conversation history
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false); // Track first interaction
  const [conversationHistory, setConversationHistory] = useState<
    ConversationHistory[]
  >([]); // Start with no history
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load active conversation messages when ID changes
  useEffect(() => {
    if (activeConversationId) {
      const conv = conversationHistory.find((c) => c.id === activeConversationId);
      if (conv) {
        setMessages(conv.messages);
      }
    } else {
      setMessages([]); // Clear messages for a new chat
    }
  }, [activeConversationId, conversationHistory]);

  const startNewConversation = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setText("");
    setIsLoading(false);
    setError(null);
    setHasInteracted(true); // Treat starting new as an interaction
    setIsSidebarOpen(false); // Close sidebar on mobile
  }, []);

  const loadConversation = useCallback((convId: string) => {
    setActiveConversationId(convId);
    setHasInteracted(true);
    setIsSidebarOpen(false); // Close sidebar when loading one
  }, []);

  // Toggle sidebar and mark as interacted
  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
    setHasInteracted(true);
  }, []);

  // Main submit handler
  const handleSubmit = useCallback(
    async (e : any) => {
      e.preventDefault();

      if (!text.trim() || isLoading) return;

      setHasInteracted(true); // Mark interaction
      setError(null);

      const userMessage: N8nMessage = {
        id: nanoid(),
        role: "user",
        content: text,
      };

      // Find the message history to send to n8n
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
      setText("");
      setIsLoading(true);

      if (!N8N_CHAT_API || N8N_CHAT_API === "YOUR_FALLBACK_WEBHOOK_URL") {
        setError("Chat service is not configured.");
        setMessages(n8nMessageList); // Remove loader
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

        setMessages(result.messages); // Update the live chat

        // Save/Update conversation history
        setConversationHistory((prevHistory) => {
          let updatedHistory = [...prevHistory];
          
          if (activeConversationId) {
            // Update existing conversation
            updatedHistory = updatedHistory.map(conv => 
              conv.id === activeConversationId
                ? { ...conv, messages: result.messages }
                : conv
            );
          } else {
            // Create a new conversation
            const newConvId = nanoid();
            const newTitle = result.messages[0]?.content.substring(0, 30) + "..." || "New Chat";
            updatedHistory.unshift({ // Add to the top
              id: newConvId,
              title: newTitle,
              messages: result.messages,
            });
            setActiveConversationId(newConvId); // Set the new conversation as active
          }
          return updatedHistory;
        });

      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unknown error occurred.";
        setError(`Sorry, I had trouble connecting: ${errorMessage}`);
        setMessages(n8nMessageList); // Rollback to pre-submit state
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, text, activeConversationId, conversationHistory],
  );

  return (
    <div
      className={`chat-app-container ${hasInteracted ? "interacted" : ""} ${
        isSidebarOpen ? "sidebar-open" : ""
      }`}
    >
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <button className="sidebar-button new-chat-button" onClick={startNewConversation}>
            <PlusIcon /> New Chat
          </button>
          <button className="sidebar-button close-sidebar-button" onClick={toggleSidebar}>
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
              className={`conversation-item ${activeConversationId === conv.id ? "active" : ""}`}
              onClick={() => loadConversation(conv.id)}
            >
              {conv.title}
            </button>
          ))}
        </div>
      </aside>
      
      {/* Click-to-close overlay for mobile */}
      <div className="sidebar-overlay" onClick={toggleSidebar}></div>

      {/* Main Chat Area */}
      <main className="main-chat-area">
        {/* Header with sidebar toggle */}
        <header className="chat-header">
          <button className="sidebar-button sidebar-toggle-button" onClick={toggleSidebar}>
            <MenuIcon />
          </button>
          <div className="chat-header-title">
            <h1>Huddle Assistant</h1>
            <p>Here to answer your queries</p>
          </div>
        </header>

        {/* Message display area */}
        <div className="message-list-container">
          <div className="message-list">
            {messages.length === 0 && !isLoading && !error && (
              <div className="welcome-message">
                <h2>How can i help you today ?</h2>
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

        {/* Text input form */}
        <footer className="chat-footer">
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
              {isLoading ? (
                <div className="spinner"></div>
              ) : (
                <SendIcon />
              )}
            </button>
          </form>
        </footer>
      </main>
    </div>
  );
}
