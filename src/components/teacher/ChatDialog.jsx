import React, { useState, useEffect, useRef } from 'react';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import ContentRenderer from './ContentRenderer';
import { useTheme } from '../../contexts/ThemeContext'; 
import './ChatDialog.css'; 

const ChatDialog = ({ isOpen, onClose, messages, onSendMessage, isAiThinking }) => {
    const messagesEndRef = useRef(null);
    const [inputValue, setInputValue] = useState('');
    const textareaRef = useRef(null);
    
    // 1. Hook into the Monet Engine & Active Overlay
    const { monetTheme, activeOverlay } = useTheme();

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

    const chatbotProfilePic = '/chatbot.png';

    // 2. DEFINE THEME SPECIFIC COLORS
    const getThemeBackground = (overlay) => {
        switch (overlay) {
            case 'christmas': return 'rgba(15, 41, 30, 0.95)'; // Deep Evergreen
            case 'valentines': return 'rgba(42, 10, 18, 0.95)'; // Deep Burgundy
            case 'graduation': return 'rgba(26, 22, 0, 0.95)'; // Deep Gold/Black
            case 'rainy': return 'rgba(15, 23, 42, 0.95)'; // Slate 900
            case 'cyberpunk': return 'rgba(24, 10, 46, 0.95)'; // Deep Purple
            case 'spring': return 'rgba(42, 26, 31, 0.95)'; // Warm Dark
            case 'space': return 'rgba(11, 15, 25, 0.95)'; // Deep Void
            default: 
                // --- FIX: GENERIC IS NOW DARK MODE ---
                // If Monet string exists, use it at high opacity.
                // If not, fallback to Slate 950 (Dark Mode) instead of White.
                return monetTheme.rgbString 
                    ? `rgba(${monetTheme.rgbString}, 0.95)` 
                    : 'rgba(15, 23, 42, 0.95)'; 
        }
    };

    const getThemeGlow = (overlay) => {
        switch(overlay) {
             case 'christmas': return 'rgba(34, 197, 94, 0.2)';
             case 'valentines': return 'rgba(244, 63, 94, 0.2)';
             case 'cyberpunk': return 'rgba(217, 70, 239, 0.25)';
             default: return 'var(--monet-primary)';
        }
    }

    // 3. Construct Final Style
    const dialogStyle = {
        ...monetTheme.variables,   
        ...monetTheme.glassStyle,  
        
        // OVERRIDE glass background with Opaque Dark Color
        background: getThemeBackground(activeOverlay),
        
        // Keep blur high for aesthetics
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        
        // Chat-Specific Variables
        '--chat-bg': 'transparent', 
        '--chat-border': 'transparent', 
        '--header-bg': 'rgba(255, 255, 255, 0.05)', 
        '--input-bg': 'rgba(0, 0, 0, 0.3)', 
        
        // --- FIX: TEXT COLOR ---
        // Since background is always dark (Generic Dark or Theme Dark), 
        // we force text to be light (#f1f5f9) for readability.
        '--text-color': '#f1f5f9',
        
        '--user-bubble-bg': 'var(--monet-primary)', 
        '--ai-bubble-bg': 'rgba(255, 255, 255, 0.1)', 
        
        '--glow-1': getThemeGlow(activeOverlay),
        '--glow-2': 'var(--monet-secondary)',
    };

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
                style={dialogStyle}
            >
                {/* --- AMBIENT GLOW EFFECTS --- */}
                <div style={{
                    position: 'absolute', top: '-20%', left: '-20%', width: '300px', height: '300px',
                    background: `radial-gradient(circle, var(--glow-1) 0%, rgba(0,0,0,0) 70%)`,
                    pointerEvents: 'none', zIndex: 0, filter: 'blur(80px)', opacity: 0.4
                }} />
                <div style={{
                    position: 'absolute', bottom: '-20%', right: '-20%', width: '300px', height: '300px',
                    background: `radial-gradient(circle, var(--glow-2) 0%, rgba(0,0,0,0) 70%)`,
                    pointerEvents: 'none', zIndex: 0, filter: 'blur(80px)', opacity: 0.4
                }} />

                <div className="chat-header">
                    <div className="chat-info">
                        <img src={chatbotProfilePic} alt="Chatbot" className="chat-profile-pic" />
                        <div className="chat-meta">
                            <div className="chat-title">AI Assistant</div>
                            <div className="chat-status">{isAiThinking ? 'Thinking...' : 'Online'}</div>
                        </div>
                    </div>

                    <button onClick={onClose} className="chat-close-btn" aria-label="Close chat">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{width: '20px', height: '20px'}}>
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
                        style={{ backgroundColor: 'var(--monet-primary)', color: 'white' }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{width: '20px', height: '20px'}}>
                            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                        </svg>
                    </button>
                </div>
            </div>
        </CSSTransition>
    );
};

export default ChatDialog;