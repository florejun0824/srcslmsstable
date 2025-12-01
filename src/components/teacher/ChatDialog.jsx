import React, { useState, useEffect, useRef } from 'react';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import ContentRenderer from './ContentRenderer';
import { useTheme } from '../../contexts/ThemeContext'; // Added Theme Context
import './ChatDialog.css'; 

const ChatDialog = ({ isOpen, onClose, messages, onSendMessage, isAiThinking }) => {
    const messagesEndRef = useRef(null);
    const [inputValue, setInputValue] = useState('');
    const textareaRef = useRef(null);
    const { activeOverlay } = useTheme(); // Hook into the theme

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isAiThinking, isOpen]);

    const handleSend = () => {
        if (inputValue.trim()) {
            onSendMessage(inputValue.trim());
            setInputValue('');
            if (textareaRef.current) textareaRef.current.style.height = 'auto';
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInput = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    };

    // Use the image from the public folder
    const chatbotProfilePic = '/chatbot.png';

    // --- MONET EFFECT: DYNAMIC STYLES GENERATOR ---
    const getThemeConfig = (overlay) => {
        switch (overlay) {
            case 'christmas':
                return {
                    '--chat-bg': 'rgba(15, 41, 30, 0.95)', // Deep Evergreen
                    '--chat-border': 'rgba(34, 197, 94, 0.3)',
                    '--header-bg': 'rgba(20, 83, 45, 0.8)',
                    '--input-bg': 'rgba(0, 0, 0, 0.3)',
                    '--text-color': '#e2e8f0',
                    '--user-bubble-bg': 'linear-gradient(135deg, #15803d, #166534)', // Green gradients
                    '--ai-bubble-bg': 'rgba(255, 255, 255, 0.1)',
                    '--glow-1': 'rgba(34, 197, 94, 0.2)',
                    '--glow-2': 'rgba(220, 38, 38, 0.2)', // Red tint
                };
            case 'valentines':
                return {
                    '--chat-bg': 'rgba(42, 10, 18, 0.95)', // Deep Burgundy
                    '--chat-border': 'rgba(244, 63, 94, 0.3)',
                    '--header-bg': 'rgba(80, 7, 36, 0.8)',
                    '--input-bg': 'rgba(0, 0, 0, 0.3)',
                    '--text-color': '#ffe4e6',
                    '--user-bubble-bg': 'linear-gradient(135deg, #be123c, #881337)', // Red/Rose gradients
                    '--ai-bubble-bg': 'rgba(255, 255, 255, 0.1)',
                    '--glow-1': 'rgba(244, 63, 94, 0.2)',
                    '--glow-2': 'rgba(251, 113, 133, 0.2)',
                };
            case 'graduation':
                return {
                    '--chat-bg': 'rgba(26, 22, 0, 0.95)', // Deep Gold/Black
                    '--chat-border': 'rgba(234, 179, 8, 0.3)',
                    '--header-bg': 'rgba(66, 32, 6, 0.8)',
                    '--input-bg': 'rgba(0, 0, 0, 0.3)',
                    '--text-color': '#fefce8',
                    '--user-bubble-bg': 'linear-gradient(135deg, #ca8a04, #a16207)', // Gold gradients
                    '--ai-bubble-bg': 'rgba(255, 255, 255, 0.1)',
                    '--glow-1': 'rgba(234, 179, 8, 0.2)',
                    '--glow-2': 'rgba(250, 204, 21, 0.2)',
                };
            case 'rainy':
                return {
                    '--chat-bg': 'rgba(15, 23, 42, 0.95)', // Slate 900
                    '--chat-border': 'rgba(56, 189, 248, 0.3)',
                    '--header-bg': 'rgba(30, 41, 59, 0.8)',
                    '--input-bg': 'rgba(0, 0, 0, 0.4)',
                    '--text-color': '#f1f5f9',
                    '--user-bubble-bg': 'linear-gradient(135deg, #0369a1, #0c4a6e)', // Ocean blues
                    '--ai-bubble-bg': 'rgba(255, 255, 255, 0.1)',
                    '--glow-1': 'rgba(56, 189, 248, 0.2)',
                    '--glow-2': 'rgba(14, 165, 233, 0.2)',
                };
            case 'cyberpunk':
                return {
                    '--chat-bg': 'rgba(24, 10, 46, 0.95)', // Deep Purple
                    '--chat-border': 'rgba(217, 70, 239, 0.4)',
                    '--header-bg': 'rgba(46, 16, 101, 0.8)',
                    '--input-bg': 'rgba(0, 0, 0, 0.4)',
                    '--text-color': '#fae8ff',
                    '--user-bubble-bg': 'linear-gradient(135deg, #d946ef, #9333ea)', // Neon Purple/Fuchsia
                    '--ai-bubble-bg': 'rgba(255, 255, 255, 0.1)',
                    '--glow-1': 'rgba(217, 70, 239, 0.25)',
                    '--glow-2': 'rgba(6, 182, 212, 0.25)', // Cyan hint
                };
            case 'spring':
                return {
                    '--chat-bg': 'rgba(42, 26, 31, 0.95)', // Warm Dark
                    '--chat-border': 'rgba(244, 114, 182, 0.3)',
                    '--header-bg': 'rgba(80, 20, 40, 0.8)',
                    '--input-bg': 'rgba(0, 0, 0, 0.2)',
                    '--text-color': '#fce7f3',
                    '--user-bubble-bg': 'linear-gradient(135deg, #ec4899, #db2777)', // Pink gradients
                    '--ai-bubble-bg': 'rgba(255, 255, 255, 0.1)',
                    '--glow-1': 'rgba(244, 114, 182, 0.2)',
                    '--glow-2': 'rgba(251, 113, 133, 0.2)',
                };
            case 'space':
                return {
                    '--chat-bg': 'rgba(11, 15, 25, 0.95)', // Deep Void
                    '--chat-border': 'rgba(99, 102, 241, 0.3)',
                    '--header-bg': 'rgba(17, 24, 39, 0.8)',
                    '--input-bg': 'rgba(0, 0, 0, 0.5)',
                    '--text-color': '#e0e7ff',
                    '--user-bubble-bg': 'linear-gradient(135deg, #4f46e5, #4338ca)', // Indigo gradients
                    '--ai-bubble-bg': 'rgba(255, 255, 255, 0.1)',
                    '--glow-1': 'rgba(99, 102, 241, 0.2)',
                    '--glow-2': 'rgba(129, 140, 248, 0.2)',
                };
            case 'none':
            default:
                // Fallback to CSS default (Glass/Light/Dark mode)
                // We return empty so CSS classes take over, OR specific overrides for "no theme"
                return {}; 
        }
    };

    const themeStyles = getThemeConfig(activeOverlay);

    return (
        <CSSTransition
            in={isOpen}
            timeout={300}
            classNames="chat-dialog-transition"
            unmountOnExit
        >
            <div 
                className="chat-dialog" 
                role="dialog" 
                aria-label="AI Chat"
                style={themeStyles} // Inject dynamic Monet styles
            >
                
                {/* --- AMBIENT GLOW EFFECTS (DYNAMIC) --- */}
                {activeOverlay !== 'none' && (
                    <>
                        <div style={{
                            position: 'absolute', top: '-20%', left: '-20%', width: '300px', height: '300px',
                            background: `radial-gradient(circle, var(--glow-1) 0%, rgba(0,0,0,0) 70%)`,
                            pointerEvents: 'none', zIndex: 0, filter: 'blur(60px)'
                        }} />
                        <div style={{
                            position: 'absolute', bottom: '-20%', right: '-20%', width: '300px', height: '300px',
                            background: `radial-gradient(circle, var(--glow-2) 0%, rgba(0,0,0,0) 70%)`,
                            pointerEvents: 'none', zIndex: 0, filter: 'blur(60px)'
                        }} />
                    </>
                )}
                {/* ------------------------------------ */}

                <div className="chat-header">
                    <div className="chat-info">
                        <img src={chatbotProfilePic} alt="Chatbot" className="chat-profile-pic" />
                        <div className="chat-meta">
                            <div className="chat-title">AI Assistant</div>
                            <div className="chat-status">{isAiThinking ? 'Thinking...' : 'Online'}</div>
                        </div>
                    </div>

                    <button onClick={onClose} className="chat-close-btn" aria-label="Close chat">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{width: '20px', height: '20px'}}>
                            <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>

                <div className="chat-messages" aria-live="polite">
                    <TransitionGroup component={null}>
                        {messages.map((msg, index) => (
                            <CSSTransition key={index} timeout={300} classNames="message">
                                <div className={`message-bubble ${msg.sender === 'user' ? 'user-message' : 'ai-message'}`}>
                                    {msg.sender === 'ai' && <img src={chatbotProfilePic} alt="AI" className="message-avatar" />}
                                    <div className="message-content">
                                        {msg.sender === 'ai' ? (
                                            <div className="markdown-content">
                                                <ContentRenderer text={msg.text} />
                                            </div>
                                        ) : (
                                            <div className="text-content">{msg.text}</div>
                                        )}
                                    </div>
                                </div>
                            </CSSTransition>
                        ))}
                    </TransitionGroup>

                    {isAiThinking && (
                        <div className="message-bubble ai-message typing-bubble">
                            <img src={chatbotProfilePic} alt="AI" className="message-avatar" />
                            <div className="message-content">
                                <div className="typing-indicator" aria-hidden="true">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                <div className="chat-input-area">
                    <textarea
                        ref={textareaRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onInput={handleInput}
                        placeholder="Type a message..."
                        className="chat-input"
                        rows="1"
                        aria-label="Type a message"
                    />
                    <button
                        type="button"
                        onClick={handleSend}
                        className="send-btn"
                        disabled={!inputValue.trim()}
                        title="Send message"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{width: '20px', height: '20px'}}>
                            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                        </svg>
                    </button>
                </div>
            </div>
        </CSSTransition>
    );
};

export default ChatDialog;