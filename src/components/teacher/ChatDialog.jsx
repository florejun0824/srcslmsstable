// src/components/teacher/ChatDialog.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ContentRenderer from './ContentRenderer';
import { useTheme } from '../../contexts/ThemeContext';
import { X, Send, ChevronDown, Sparkles } from 'lucide-react';
import './ChatDialog.css';

// --- SUGGESTION CHIPS ---
const SUGGESTIONS = [
    "How to create an exam?",
    "Tips for classroom management",
    "Write a lesson plan for Math",
    "Explain adaptive teaching",
];

// --- Memoized single message to prevent ContentRenderer re-renders on typing ---
const ChatMessage = memo(({ msg, chatbotProfilePic }) => {
    if (msg.sender === 'ai') {
        return (
            <div className={`message-row ai-row`}>
                <div className="message-row-inner">
                    <img src={chatbotProfilePic} alt="AI" className="msg-avatar" />
                    <div className="msg-body">
                        <div className="msg-text ai-text">
                            <div className="markdown-content">
                                <ContentRenderer text={msg.text} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    return (
        <div className={`message-row user-row`}>
            <div className="message-row-inner">
                <div className="user-bubble">
                    {msg.text}
                </div>
            </div>
        </div>
    );
});

// --- Memoized messages list so typing in input doesn't re-render all messages ---
const MessagesList = memo(({ messages, isAiThinking, chatbotProfilePic, messagesEndRef }) => (
    <div className="chat-messages" aria-live="polite">
        {messages.map((msg, index) => (
            <ChatMessage key={index} msg={msg} chatbotProfilePic={chatbotProfilePic} />
        ))}

        {/* Typing Indicator — shimmer skeleton */}
        {isAiThinking && (
            <div className="typing-row">
                <div className="typing-row-inner">
                    <img src={chatbotProfilePic} alt="AI" className="msg-avatar" />
                    <div className="typing-shimmer">
                        <div className="shimmer-line" />
                        <div className="shimmer-line" />
                        <div className="shimmer-line" />
                    </div>
                </div>
            </div>
        )}

        <div ref={messagesEndRef} />
    </div>
));

const chatbotProfilePic = '/chatbot.png';

// --- LIGHT THEME COLORS (Solid backgrounds) ---
const getThemeBackground = (overlay, monetTheme) => {
    switch (overlay) {
        case 'christmas': return '#f0faf4';
        case 'valentines': return '#fef2f4';
        case 'cyberpunk': return '#f5f3ff';
        default:
            return monetTheme.rgbString
                ? `rgba(${monetTheme.rgbString}, 0.06)`
                : '#ffffff';
    }
};

// Build a solid-feeling background that layers the tint over white
const getDialogBg = (overlay, monetTheme) => {
    const tint = getThemeBackground(overlay, monetTheme);
    return `linear-gradient(to bottom, ${tint}, #ffffff)`;
};

const ChatDialog = memo(({ isOpen, onClose, messages, onSendMessage, isAiThinking, userFirstName }) => {
    const messagesEndRef = useRef(null);
    const [inputValue, setInputValue] = useState('');
    const textareaRef = useRef(null);

    // Theme Hooks
    const { monetTheme, activeOverlay } = useTheme();

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, []);

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isAiThinking, isOpen, scrollToBottom]);

    // KEYBOARD FIX: Scroll to bottom when window resizes (keyboard open/close)
    useEffect(() => {
        if (!isOpen) return;

        const handleResize = () => scrollToBottom();

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleResize);
        } else {
            window.addEventListener('resize', handleResize);
        }

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleResize);
            } else {
                window.removeEventListener('resize', handleResize);
            }
        };
    }, [isOpen, scrollToBottom]);

    const handleSend = useCallback(() => {
        if (inputValue.trim()) {
            onSendMessage(inputValue.trim());
            setInputValue('');
            if (textareaRef.current) textareaRef.current.style.height = 'auto';
        }
    }, [inputValue, onSendMessage]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }, [handleSend]);

    const handleInput = useCallback(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, []);

    const handleFocus = useCallback(() => {
        setTimeout(() => scrollToBottom(), 300);
    }, [scrollToBottom]);

    const handleSuggestion = useCallback((text) => {
        onSendMessage(text);
    }, [onSendMessage]);

    const handleInputChange = useCallback((e) => {
        setInputValue(e.target.value);
    }, []);

    // Memoize dialogStyle so it doesn't recreate on every keystroke
    const dialogStyle = useMemo(() => ({
        ...monetTheme.variables,
        '--dialog-bg': getDialogBg(activeOverlay, monetTheme),
        '--user-bubble-bg': 'var(--monet-primary)',
        '--ai-bubble-bg': '#f1f5f9',
        '--text-color': '#1e293b',
        '--input-bg': 'rgba(0, 0, 0, 0.04)',
        '--header-bg': '#ffffff',
        '--border-color': 'rgba(0, 0, 0, 0.08)',
    }), [monetTheme.variables, monetTheme.rgbString, activeOverlay]);

    const hasMessages = messages && messages.length > 0;
    const hasInput = inputValue.trim().length > 0;

    // Memoize send button style
    const sendBtnStyle = useMemo(() => ({
        color: hasInput ? 'var(--monet-primary)' : 'currentColor'
    }), [hasInput]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="chat-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    />

                    {/* Dialog — full-screen, lightweight animation */}
                    <motion.div
                        className="chat-dialog"
                        role="dialog"
                        aria-label="AI Chat"
                        style={dialogStyle}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 16 }}
                        transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                    >
                        {/* Mobile Drag Handle */}
                        <div className="mobile-drag-handle"></div>

                        {/* === M3 TOP APP BAR === */}
                        <div className="chat-header">
                            <div className="chat-info">
                                <div className="avatar-wrapper">
                                    <img src={chatbotProfilePic} alt="Chatbot" className="chat-profile-pic" />
                                    <span className={`status-dot ${isAiThinking ? 'thinking' : 'online'}`} />
                                </div>
                                <div className="chat-meta">
                                    <div className="chat-title">Teacher Assistant</div>
                                    <div className="chat-status">
                                        {isAiThinking ? 'Thinking...' : 'Ready to help'}
                                    </div>
                                </div>
                            </div>

                            <button onClick={onClose} className="chat-close-btn" aria-label="Close chat">
                                <span className="desktop-icon"><X size={20} /></span>
                                <span className="mobile-icon"><ChevronDown size={24} /></span>
                            </button>
                        </div>

                        {/* === MESSAGES AREA === */}
                        {!hasMessages && !isAiThinking ? (
                            /* Empty State */
                            <div className="chat-empty-state">
                                <img src={chatbotProfilePic} alt="AI" className="empty-avatar" />
                                <div className="empty-title">
                                    Hi{userFirstName ? `, ${userFirstName}` : ''}! 👋
                                </div>
                                <div className="empty-subtitle">
                                    I'm your AI teaching assistant. Ask me anything about lessons, exams, or classroom strategies.
                                </div>
                                <div className="suggestion-chips">
                                    {SUGGESTIONS.map((s, i) => (
                                        <button
                                            key={i}
                                            className="suggestion-chip"
                                            onClick={() => handleSuggestion(s)}
                                        >
                                            <Sparkles size={12} style={{ display: 'inline', marginRight: 6, opacity: 0.6 }} />
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <MessagesList
                                messages={messages}
                                isAiThinking={isAiThinking}
                                chatbotProfilePic={chatbotProfilePic}
                                messagesEndRef={messagesEndRef}
                            />
                        )}

                        {/* === INPUT AREA === */}
                        <div className="chat-input-area">
                            <div className="input-wrapper">
                                <textarea
                                    ref={textareaRef}
                                    value={inputValue}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    onInput={handleInput}
                                    onFocus={handleFocus}
                                    placeholder="Ask anything..."
                                    className="chat-input"
                                    rows="1"
                                    aria-label="Type a message"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleSend}
                                className="send-btn"
                                disabled={!hasInput}
                                title="Send"
                                style={sendBtnStyle}
                            >
                                <Send size={22} fill={hasInput ? "currentColor" : "none"} strokeWidth={hasInput ? 0 : 2} />
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
});

export default ChatDialog;