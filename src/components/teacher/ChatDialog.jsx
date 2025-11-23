import React, { useState, useEffect, useRef } from 'react';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import ContentRenderer from './ContentRenderer';
import './ChatDialog.css'; 

const ChatDialog = ({ isOpen, onClose, messages, onSendMessage, isAiThinking }) => {
    const messagesEndRef = useRef(null);
    const [inputValue, setInputValue] = useState('');
    const textareaRef = useRef(null);

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

    return (
        <CSSTransition
            in={isOpen}
            timeout={300}
            classNames="chat-dialog-transition"
            unmountOnExit
        >
            <div className="chat-dialog" role="dialog" aria-label="AI Chat">
                
                {/* --- ADDED: AMBIENT GLOW EFFECTS --- */}
                <div style={{
                    position: 'absolute', top: '-20%', left: '-20%', width: '300px', height: '300px',
                    background: 'radial-gradient(circle, rgba(0,122,255,0.15) 0%, rgba(0,0,0,0) 70%)',
                    pointerEvents: 'none', zIndex: 0, filter: 'blur(40px)'
                }} />
                <div style={{
                    position: 'absolute', bottom: '-20%', right: '-20%', width: '300px', height: '300px',
                    background: 'radial-gradient(circle, rgba(88,86,214,0.15) 0%, rgba(0,0,0,0) 70%)',
                    pointerEvents: 'none', zIndex: 0, filter: 'blur(40px)'
                }} />
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