import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

const ChatDialog = ({ isOpen, onClose, messages, onSendMessage, isAiThinking, userFirstName }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);
    const [conversationStarted, setConversationStarted] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = () => {
        if (input.trim()) {
            onSendMessage(input);
            setInput('');
            setConversationStarted(true);
        }
    };
    
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!isOpen) return null;

    const initialGreeting = messages.length === 0 && !conversationStarted ? [{
        sender: 'ai',
        text: `Hello${userFirstName ? ` ${userFirstName}` : ''}! How can I assist you today?`
    }] : [];

    const displayMessages = initialGreeting.concat(messages);

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[70vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-lg font-bold text-gray-800">Chat with your AI Assistant</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200"><XMarkIcon className="w-6 h-6 text-gray-600" /></button>
                </div>
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {displayMessages.map((msg, index) => (
                        <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                            {msg.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0 self-start"></div>}
                            <div className={`max-w-xl p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                                {msg.sender === 'ai' ? (
                                    <ReactMarkdown className="prose prose-sm prose-p:my-0 prose-ul:my-0 prose-li:my-0">
                                        {msg.text}
                                    </ReactMarkdown>
                                ) : (
                                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                )}
                            </div>
                        </div>
                    ))}
                    {isAiThinking && (<div className="flex items-end gap-2"><div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0"></div><div className="max-w-md p-3 rounded-2xl bg-gray-200 text-gray-500 text-sm">AI is typing...</div></div>)}
                    <div ref={messagesEndRef} />
                </div>
                <div className="p-4 border-t">
                    <div className="relative">
                        <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={handleKeyPress} placeholder="Ask a question..." className="w-full p-3 pr-16 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-blue-500" rows="1"/>
                        <button onClick={handleSend} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300" disabled={!input.trim() || isAiThinking}><PaperAirplaneIcon className="w-5 h-5" /></button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatDialog;