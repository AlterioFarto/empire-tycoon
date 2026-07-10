import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { emitEvent } from '../hooks/useSocket.js';

export function Chat() {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatMessages = useGameStore((s) => s.chatMessages);
  const players = useGameStore((s) => s.game?.players ?? []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    emitEvent('chat:message', { message: message.trim() });
    setMessage('');
  }

  function getPlayerName(id: string): string {
    return players.find((p) => p.id === id)?.name ?? id.slice(0, 6);
  }

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Chat</h3>
      <div className="flex-1 overflow-y-auto space-y-1 mb-2 text-sm max-h-32">
        {chatMessages.map((msg, i) => (
          <div key={i} className="text-gray-300">
            <span className="text-gray-500 font-medium">{getPlayerName(msg.playerId)}: </span>
            {msg.message}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} className="flex gap-1">
        <input
          type="text"
          className="flex-1 px-2 py-1.5 bg-gray-700 rounded text-sm border border-gray-600 focus:border-green-500 focus:outline-none"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={200}
        />
        <button
          type="submit"
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm transition"
        >
          Send
        </button>
      </form>
    </div>
  );
}
