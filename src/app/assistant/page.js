"use client";
import { useAura } from "@/context/AuraContext";
import { usePersonalization } from "@/context/PersonalizationContext";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { classifyIntent, generateResponse, getWelcomeMessage } from "@/lib/auraAssistant";

export default function AssistantPage() {
    return <AssistantContent />;
}

// Simple markdown renderer " react-markdown not installed, use basic formatter
function SimpleMarkdown({ text }) {
    const lines = text.split("\n");
    return (
        <div className="space-y-1">
            {lines.map((line, i) => {
                if (line.startsWith("# ")) return <h3 key={i} className="font-bold text-white text-sm">{line.slice(2)}</h3>;
                if (line.startsWith("## ")) return <h4 key={i} className="font-semibold text-gray-200 text-xs">{line.slice(3)}</h4>;
                if (line.startsWith("- ") || line.startsWith("• ")) return <p key={i} className="text-xs text-gray-300 pl-3">• {line.slice(2)}</p>;
                if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-bold text-white text-xs">{line.slice(2, -2)}</p>;
                if (line.trim() === "") return <div key={i} className="h-1" />;
                // Bold inline
                const boldParts = line.split(/\*\*(.*?)\*\*/);
                return (
                    <p key={i} className="text-xs text-gray-300 leading-relaxed">
                        {boldParts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-white font-semibold">{part}</strong> : part)}
                    </p>
                );
            })}
        </div>
    );
}

function AssistantContent() {
    const { wellness, cognitiveState, stateColor } = useAura();
    const { deviations } = usePersonalization();

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    const ctx = useMemo(() => ({
        wellnessScore: wellness.wellnessScore,
        stressScore: wellness.stressScore,
        fatigueScore: wellness.fatigueScore,
        focusScore: wellness.focusScore,
        burnoutRisk: wellness.burnoutRisk,
        cognitiveState,
        sessionMinutes: 0,
        deviations,
    }), [wellness.wellnessScore, wellness.stressScore, wellness.fatigueScore, wellness.focusScore, wellness.burnoutRisk, cognitiveState, deviations]);

    // Welcome message on mount
    useEffect(() => {
        const welcome = getWelcomeMessage(ctx);
        const timer = setTimeout(() => {
            setMessages([{ id: 1, role: "aura", text: welcome.text, actions: welcome.actions, ts: Date.now() }]);
        }, 0);
        return () => clearTimeout(timer);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const scrollBottom = () => {
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    };

    const sendMessage = useCallback((text) => {
        if (!text.trim()) return;
        const userMsg = { id: Date.now(), role: "user", text, ts: Date.now() };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setIsTyping(true);
        scrollBottom();

        setTimeout(() => {
            const intent = classifyIntent(text);
            const { text: responseText, actions } = generateResponse(intent, ctx);
            setMessages((prev) => [...prev, {
                id: Date.now() + 1, role: "aura",
                text: responseText, actions,
                ts: Date.now(),
            }]);
            setIsTyping(false);
            scrollBottom();
        }, 800 + Math.random() * 600);
    }, [ctx]);

    const handleSubmit = (e) => {
        e.preventDefault();
        sendMessage(input);
    };

    return (
        <div className="page-container max-w-3xl" style={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div className="page-header flex items-center gap-4 shrink-0">
                <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                    style={{
                        background: `radial-gradient(circle, ${stateColor}30 0%, transparent 70%)`,
                        border: `1.5px solid ${stateColor}40`,
                        animation: "orb-pulse 3s ease-in-out infinite",
                    }}
                >
                    
                </div>
                <div>
                    <h1 className="text-xl font-bold" style={{ fontFamily: "'Outfit',sans-serif" }}>
                        <span className="aura-gradient-text">AURA Assistant</span>
                    </h1>
                    <p className="text-[11px] text-gray-500">
                        Currently: <span style={{ color: stateColor }}>{cognitiveState}</span>  -  Wellness {wellness.wellnessScore}/100
                    </p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 pb-4">
                <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            {msg.role === "aura" && (
                                <div className="w-7 h-7 rounded-full shrink-0 mr-2 mt-1 flex items-center justify-center text-sm"
                                    style={{ background: `${stateColor}20`, border: `1px solid ${stateColor}30` }}>
                                    
                                </div>
                            )}
                            <div className="max-w-[85%]">
                                <div
                                    className={`rounded-2xl px-4 py-3 ${msg.role === "user"
                                        ? "rounded-br-sm"
                                        : "rounded-bl-sm"}`}
                                    style={msg.role === "user"
                                        ? { background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.25)" }
                                        : { background: "rgba(7,7,24,0.8)", border: "1px solid rgba(255,255,255,0.07)" }
                                    }
                                >
                                    {msg.role === "aura"
                                        ? <SimpleMarkdown text={msg.text} />
                                        : <p className="text-xs text-gray-200">{msg.text}</p>
                                    }
                                </div>

                                {/* Action chips */}
                                {msg.role === "aura" && msg.actions?.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {msg.actions.map((a, i) => (
                                            <button
                                                key={i}
                                                onClick={() => sendMessage(a)}
                                                className="text-[10px] px-3 py-1 rounded-full transition-all hover:opacity-80"
                                                style={{
                                                    background: `${stateColor}12`,
                                                    border: `1px solid ${stateColor}25`,
                                                    color: stateColor,
                                                }}
                                            >
                                                {a}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="text-[9px] text-gray-600 mt-1 px-1">
                                    {new Date(msg.ts).toLocaleTimeString()}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isTyping && (
                    <div className="flex items-center gap-2 px-4">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
                            style={{ background: `${stateColor}15`, border: `1px solid ${stateColor}25` }}></div>
                        <div className="flex gap-1 px-3 py-2 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)" }}>
                            {[0, 1, 2].map((i) => (
                                <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce"
                                    style={{ animationDelay: `${i * 0.15}s` }} />
                            ))}
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="shrink-0 pt-3 border-t border-white/5">
                <div className="flex gap-2">
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask AURA anything about your wellness..."
                        className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none transition-all"
                        style={{ caretColor: stateColor }}
                        onFocus={(e) => e.target.style.borderColor = `${stateColor}40`}
                        onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isTyping}
                        className="px-5 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                        style={{ background: `${stateColor}20`, color: stateColor, border: `1px solid ${stateColor}30` }}
                    >
                        Send 
                    </button>
                </div>
                <p className="text-[9px] text-gray-700 text-center mt-2">
                    AURA AI insights are assistive and not a medical diagnosis.
                </p>
            </form>
        </div>
    );
}


