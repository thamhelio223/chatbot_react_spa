import { useState, useCallback, type FormEvent, useRef, useEffect } from "react";
import { nanoid } from "nanoid";

// Import our new stylesheets
import "./index.css";
import "./App.css";

// 1. Define the SIMPLE message type (matches your n8n format)
type N8nMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

// 2. Get the Webhook URL
// Make sure to create a .env.local file in your project root
// and add: VITE_N8N_CHAT_API=your_webhook_url_here
const N8N_CHAT_API =import.meta.env.VITE_N8N_CHAT_API || "YOUR_FALLBACK_WEBHOOK_URL";

// 3. A simple "typing" indicator component
const TypingIndicator = () => (
  <div className="message assistant">
    <div className="typing-indicator">
      <span />
      <span />
      <span />
    </div>
  </div>
);

// 4. Send/Submit Icon (using inline SVG)
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
      fill="white"
    />
  </svg>
);

// 5. The Main Chat Component
export default function App() {
  const [messages, setMessages] = useState<N8nMessage[]>([]);
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    console.log(N8N_CHAT_API)
    scrollToBottom();
  }, [messages]);

  // The main submit handler
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      if (!text.trim() || isLoading) {
        return;
      }

      // Clear any previous errors
      setError(null);

      // --- This is the key logic ---

      // 1. Create the new user message
      const userMessage: N8nMessage = {
        id: nanoid(),
        role: "user",
        content: text,
      };

      // 2. Create the list to send to n8n (user message + history)
      const n8nMessageList = [...messages, userMessage];

      // 3. A fake "loading" message for the UI
      const loadingMessage: N8nMessage = {
        id: "loader", // Use a stable ID for the loader
        role: "assistant",
        content: "...",
      };

      // 4. Optimistically update the UI with user message + loader
      setMessages([...n8nMessageList, loadingMessage]);
      setText("");
      setIsLoading(true);

      // 5. Call the n8n Webhook
      if (!N8N_CHAT_API || N8N_CHAT_API === "YOUR_FALLBACK_WEBHOOK_URL") {
        console.error("VITE_N8N_CHAT_API is not set.");
        setError(
          "Chat service is not configured. Please contact the administrator.",
        );
        setMessages(n8nMessageList); // Remove loader
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(N8N_CHAT_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: n8nMessageList, // Send the list *without* the loader
          }),
        });

        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        // 6. Get the *entire* history back from n8n
        const result: { messages: N8nMessage[] } = await response.json();

        if (!result.messages) {
          throw new Error("Invalid response structure from n8n");
        }

        // 7. Set the UI to match the new, complete history
        setMessages(result.messages);
      } catch (err) {
        console.error("Error fetching from n8n:", err);
        const errorMessage =
          err instanceof Error ? err.message : "An unknown error occurred.";
        setError(
          `Sorry, I had trouble connecting: ${errorMessage}`,
        );
        // On error, remove the loader but keep the user's message
        setMessages(n8nMessageList);
      } finally {
        // 9. Reset loading state
        setIsLoading(false);
      }
    },
    [messages, isLoading, text], // Dependencies
  );

  return (
    <div className="chat-app-container">
      {/* Header */}
      <header className="chat-header">
        <h1>N8N Chat Assistant</h1>
        <p>Powered by Vite, React, and N8N</p>
      </header>

      {/* Message display area */}
      <div className="message-list-container">
        <div className="message-list">
          {messages.map((msg) =>
            // Check for our special loader ID
            msg.id === "loader" ? (
              <TypingIndicator key="loader" />
            ) : (
              <div key={msg.id} className={`message-wrapper ${msg.role}`}>
                <div className="message">
                  {/* Simple markdown for newlines */}
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
          {/* Error message display */}
          {error && (
            <div className="message-wrapper assistant">
              <div className="message error">{error}</div>
            </div>
          )}
          {/* Empty div for auto-scrolling */}
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
            {isLoading ? "..." : <SendIcon />}
          </button>
        </form>
      </footer>
    </div>
  );
}
