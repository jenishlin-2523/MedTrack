import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { FaRobot, FaPaperPlane, FaTimes } from "react-icons/fa";

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  // UPDATED SYSTEM PROMPT: Added strict length constraints
  const systemPrompt = {
    role: "system",
    content: `You are a specialized Medical AI. 
    1. ONLY discuss health, medical symptoms, wellness, and medical advice.
    2. BE EXTREMELY CONCISE. Your response must be NO MORE than 1 or 2 short sentences.
    3. If a user asks about non-medical topics, say: "I only provide medical assistance."
    4. End with a brief disclaimer if the situation sounds urgent.`
  };

  const [chatHistory, setChatHistory] = useState([
    { role: "assistant", content: "Hello! How can I help with your health today?" },
  ]);
  
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    const updatedHistory = [...chatHistory, userMessage];
    
    setChatHistory(updatedHistory);
    setInput("");
    setLoading(true);

    try {
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama-3.1-8b-instant",
          messages: [systemPrompt, ...updatedHistory],
          // Added max_tokens to further force brevity
          max_tokens: 100, 
          temperature: 0.5,
        },
        {
          headers: {
            "Authorization": `Bearer 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`,
            "Content-Type": "application/json",
          },
        }
      );

      const botResponse = response.data.choices[0].message.content;
      setChatHistory([...updatedHistory, { role: "assistant", content: botResponse }]);
    } catch (err) {
      console.error("Chat Error:", err);
      setChatHistory([...updatedHistory, { role: "assistant", content: "Error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", bottom: "80px", right: "20px", zIndex: 1000 }}>
      {isOpen ? (
        <div style={{
          width: "320px", height: "400px", background: "white", borderRadius: "15px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column",
          border: "1px solid #eee", overflow: "hidden"
        }}>
          <div style={{ background: "#4CAF50", color: "white", padding: "12px 15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: "bold", fontSize: "14px" }}>Medical Assistant</span>
            <FaTimes onClick={() => setIsOpen(false)} style={{ cursor: "pointer" }} />
          </div>

          <div ref={scrollRef} style={{ flex: 1, padding: "15px", overflowY: "auto", background: "#f9f9f9" }}>
            {chatHistory.map((msg, index) => (
              <div key={index} style={{ marginBottom: "10px", textAlign: msg.role === "user" ? "right" : "left" }}>
                <div style={{
                  display: "inline-block", padding: "8px 12px", borderRadius: "12px", maxWidth: "85%",
                  background: msg.role === "user" ? "#4CAF50" : "#fff",
                  color: msg.role === "user" ? "white" : "#333",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)", fontSize: "13px", lineHeight: "1.4"
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && <div style={{ fontSize: "11px", color: "#888" }}>Typing...</div>}
          </div>

          <form onSubmit={handleSendMessage} style={{ display: "flex", padding: "10px", borderTop: "1px solid #eee" }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Symptoms..."
              style={{ flex: 1, border: "none", outline: "none", padding: "5px", fontSize: "13px" }}
            />
            <button type="submit" style={{ background: "none", border: "none", color: "#4CAF50", cursor: "pointer" }}>
              <FaPaperPlane />
            </button>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            width: "55px", height: "55px", borderRadius: "50%", background: "#4CAF50",
            border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)"
          }}
        >
          <FaRobot size={24} color="white" />
        </button>
      )}
    </div>
  );
};

export default ChatBot;