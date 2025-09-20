import React, { useState, useEffect, useRef } from 'react';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import ContentRenderer from './ContentRenderer';

const ChatDialog = ({ isOpen, onClose, messages, onSendMessage, isAiThinking }) => {
    const messagesEndRef = useRef(null);
    const [inputValue, setInputValue] = useState('');
    const textareaRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isAiThinking, isOpen]);

    const handleSend = () => {
        if (inputValue.trim()) {
            onSendMessage(inputValue);
            setInputValue('');
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
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

    const chatbotProfilePic = 'https://i.ibb.co/Y4WNBnxS/ai-girl.png';

    return (
        <CSSTransition
            in={isOpen}
            timeout={300}
            classNames="chat-dialog"
            unmountOnExit
        >
            <div className="chat-dialog">
                <div className="chat-header">
                    <div className="chat-info">
                        <img src={chatbotProfilePic} alt="Chatbot" className="chat-profile-pic" />
                        <div>
                            <div className="font-bold">AI Assistant</div>
                            <div className="text-xs text-gray-500">
                                {isAiThinking ? 'Typing...' : 'Online'}
                            </div>
                        </div>
                    </div>
                    {/* FIXED: Close button now uses an SVG icon */}
                    <button onClick={onClose} className="chat-close-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
                <div className="chat-messages">
                    <TransitionGroup>
                        {messages.map((msg, index) => (
                            <CSSTransition key={index} timeout={300} classNames="message">
                                <div className={`message-bubble ${msg.sender === 'user' ? 'user-message' : 'ai-message'}`}>
                                    {msg.sender === 'ai' && <img src={chatbotProfilePic} alt="AI" className="message-avatar" />}
                                    <div className="message-content">
                                        {msg.sender === 'ai' ? (
                                            <div className="markdown-content text-xs">
                                                <ContentRenderer text={msg.text} />
                                            </div>
                                        ) : (
                                            <div className="text text-sm whitespace-pre-wrap">{msg.text}</div>
                                        )}
                                    </div>
                                </div>
                            </CSSTransition>
                        ))}
                    </TransitionGroup>
                    {isAiThinking && (
                        <div className="message-bubble ai-message">
                            <img src={chatbotProfilePic} alt="AI" className="message-avatar" />
                            <div className="message-content">
                                <div className="typing-indicator">
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
                    />
                    {/* FIXED: Send button now uses an SVG icon */}
                    <button type="button" onClick={handleSend} className="send-btn" disabled={!inputValue.trim()}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                        </svg>
                    </button>
                </div>
            </div>
        </CSSTransition>
    );
};

export default ChatDialog;