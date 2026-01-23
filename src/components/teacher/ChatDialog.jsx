// src/components/teacher/ChatDialog.jsx
import React, { useState, useEffect, useRef } from 'react';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import ContentRenderer from './ContentRenderer';
import { useTheme } from '../../contexts/ThemeContext'; 
import { X, Send, ChevronDown } from 'lucide-react'; 
import './ChatDialog.css'; 

// --- HELPER COMPONENT FOR MESSAGES ---
const MessageItem = ({ msg, chatbotProfilePic, ...props }) => {
    const nodeRef = useRef(null);

    return (
        <CSSTransition nodeRef={nodeRef} {...props}>
            <div ref={nodeRef} className={`message-bubble ${msg.sender === 'user' ? 'user-message' : 'ai-message'}`}>
                {msg.sender === 'ai' && (
                    <div className="avatar-container">
                        <img src={chatbotProfilePic} alt="AI" className="message-avatar" />
                    </div>
                )}
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
    );
};

const ChatDialog = ({ isOpen, onClose, messages, onSendMessage, isAiThinking }) => {
    const messagesEndRef = useRef(null);
    const [inputValue, setInputValue] = useState('');
    const textareaRef = useRef(null);
    const dialogRef = useRef(null);
    
    // Theme Hooks
    const { monetTheme, activeOverlay } = useTheme();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isAiThinking, isOpen]);

    // KEYBOARD FIX: Scroll to bottom when window resizes (keyboard open/close)
    useEffect(() => {
        if (!isOpen) return;
        
        const handleResize = () => {
            scrollToBottom();
        };

        // Listen for visual viewport resize (better for mobile keyboards)
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
    }, [isOpen]);

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

    // KEYBOARD FIX: Ensure visibility when focusing input
    const handleFocus = () => {
        setTimeout(() => {
            scrollToBottom();
        }, 300); // Small delay to allow keyboard animation
    };

    const chatbotProfilePic = '/chatbot.png';

    // --- SOLID THEME COLORS ---
    const getThemeBackground = (overlay) => {
        switch (overlay) {
            case 'christmas': return '#0f291e'; 
            case 'valentines': return '#2a0a12'; 
            case 'cyberpunk': return '#0a0a14'; 
            default: 
                return monetTheme.rgbString 
                    ? `rgb(${monetTheme.rgbString})` 
                    : '#18181b'; 
        }
    };

    const dialogStyle = {
        ...monetTheme.variables,
        '--dialog-bg': getThemeBackground(activeOverlay),
        '--user-bubble-bg': 'var(--monet-primary)', 
        '--ai-bubble-bg': '#27272a', 
        '--text-color': '#f3f4f6', 
        '--input-bg': 'rgba(255, 255, 255, 0.08)',
        '--header-bg': getThemeBackground(activeOverlay),
        '--border-color': 'rgba(255, 255, 255, 0.1)',
    };

    return (
        <CSSTransition
            in={isOpen}
            timeout={300}
            classNames="chat-dialog-transition"
            unmountOnExit
            nodeRef={dialogRef}
        >
            <div 
                ref={dialogRef} 
                className="chat-dialog" 
                role="dialog" 
                aria-label="AI Chat"
                style={dialogStyle}
            >
                {/* Mobile Drag Indicator */}
                <div className="mobile-drag-handle"></div>

                <div className="chat-header">
                    <div className="chat-info">
                        <div className="avatar-wrapper">
                            <img src={chatbotProfilePic} alt="Chatbot" className="chat-profile-pic" />
                            <span className={`status-dot ${isAiThinking ? 'thinking' : 'online'}`} />
                        </div>
                        <div className="chat-meta">
                            <div className="chat-title">Teacher Assistant</div>
                            <div className="chat-status">
                                {isAiThinking ? 'Typing...' : 'Active now'}
                            </div>
                        </div>
                    </div>

                    <button onClick={onClose} className="chat-close-btn" aria-label="Close chat">
                        <span className="desktop-icon"><X size={20} /></span>
                        <span className="mobile-icon"><ChevronDown size={24} /></span>
                    </button>
                </div>

                <div className="chat-messages" aria-live="polite">
                    <TransitionGroup component={null}>
                        {messages.map((msg, index) => (
                            <MessageItem 
                                key={index} 
                                msg={msg} 
                                chatbotProfilePic={chatbotProfilePic}
                                timeout={300} 
                                classNames="message" 
                            />
                        ))}
                    </TransitionGroup>

                    {isAiThinking && (
                        <div className="message-bubble ai-message typing-bubble">
                            <div className="avatar-container">
                                <img src={chatbotProfilePic} alt="AI" className="message-avatar" />
                            </div>
                            <div className="message-content typing-content">
                                <div className="typing-indicator" aria-hidden="true">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                <div className="chat-input-area">
                    <div className="input-wrapper">
                        <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onInput={handleInput}
                            onFocus={handleFocus} // Added focus handler
                            placeholder="Message..."
                            className="chat-input"
                            rows="1"
                            aria-label="Type a message"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleSend}
                        className="send-btn"
                        disabled={!inputValue.trim()}
                        title="Send"
                        style={{ color: inputValue.trim() ? 'var(--monet-primary)' : 'currentColor' }}
                    >
                        <Send size={24} fill={inputValue.trim() ? "currentColor" : "none"} strokeWidth={inputValue.trim() ? 0 : 2} />
                    </button>
                </div>
            </div>
        </CSSTransition>
    );
};

export default ChatDialog;