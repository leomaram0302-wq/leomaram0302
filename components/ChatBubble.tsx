import React from 'react';
import { Message, Sender } from '../types';

interface ChatBubbleProps {
  message: Message;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isBot = message.sender === Sender.Bot;

  return (
    <div className={`flex w-full mb-4 ${isBot ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[80%] p-4 rounded-2xl shadow-md text-sm leading-relaxed ${
          isBot
            ? 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
            : 'bg-gold-600 text-white rounded-tr-none'
        }`}
      >
        {isBot && (
          <div className="flex items-center mb-2">
            <div className="w-6 h-6 rounded-full bg-gold-500 flex items-center justify-center mr-2">
              <span className="text-slate-900 font-serif font-bold text-xs">A</span>
            </div>
            <span className="text-xs text-gold-500 font-semibold uppercase tracking-wide">Asesor Elite</span>
          </div>
        )}
        <div className="whitespace-pre-wrap">{message.text}</div>
        <div className={`text-[10px] mt-2 text-right ${isBot ? 'text-slate-500' : 'text-gold-200'}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;