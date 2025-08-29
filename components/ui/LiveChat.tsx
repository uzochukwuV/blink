import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Reaction, marketChatService } from '~/lib/socialBetting';

interface LiveChatProps {
  marketId: string;
  userFid: number;
  username: string;
  displayName: string;
  className?: string;
}

export function LiveChat({ 
  marketId, 
  userFid, 
  username, 
  displayName, 
  className = '' 
}: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock real-time connection
  useEffect(() => {
    const connectToChat = async () => {
      try {
        const chatMessages = await marketChatService.getMarketChat(marketId, 50);
        setMessages(chatMessages);
        setIsConnected(true);
        setParticipantCount(Math.floor(Math.random() * 50) + 10);

        // Simulate receiving new messages
        const interval = setInterval(() => {
          if (Math.random() > 0.7) {
            const mockMessage: ChatMessage = {
              id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              marketId,
              authorFid: Math.floor(Math.random() * 1000) + 100,
              username: `user${Math.floor(Math.random() * 1000)}`,
              displayName: `User ${Math.floor(Math.random() * 1000)}`,
              message: [
                "This is looking bullish! 🚀",
                "I'm not so sure about this one...",
                "Just placed my bet on YES",
                "The odds are shifting quickly",
                "Anyone else seeing this pattern?",
                "Moon incoming! 🌙",
                "Be careful, this could dump",
                "Great analysis in the previous message!",
                "What do you think about the latest data?",
                "This reminds me of the market last week"
              ][Math.floor(Math.random() * 10)],
              timestamp: new Date(),
              type: 'message',
              reactions: [],
              isDeleted: false
            };
            
            setMessages(prev => [...prev, mockMessage].slice(-100)); // Keep last 100 messages
          }
        }, 3000 + Math.random() * 5000);

        return () => clearInterval(interval);
      } catch (error) {
        console.error('Error connecting to chat:', error);
      }
    };

    connectToChat();
  }, [marketId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !isConnected) return;

    const messageId = await marketChatService.sendMessage(
      marketId,
      userFid,
      newMessage.trim(),
      'message'
    );

    if (messageId) {
      // Optimistically add message to UI
      const optimisticMessage: ChatMessage = {
        id: messageId,
        marketId,
        authorFid: userFid,
        username,
        displayName,
        message: newMessage.trim(),
        timestamp: new Date(),
        type: 'message',
        reactions: [],
        isDeleted: false
      };

      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('');
    }
  };

  const addReaction = async (messageId: string, emoji: string) => {
    const success = await marketChatService.addReaction(messageId, userFid, emoji);
    if (success) {
      setMessages(prev => 
        prev.map(msg => {
          if (msg.id === messageId) {
            // Check if user already reacted with this emoji
            const existingReaction = msg.reactions.find(r => r.fid === userFid && r.emoji === emoji);
            if (existingReaction) {
              // Remove reaction
              return {
                ...msg,
                reactions: msg.reactions.filter(r => !(r.fid === userFid && r.emoji === emoji))
              };
            } else {
              // Add reaction
              return {
                ...msg,
                reactions: [...msg.reactions, { fid: userFid, emoji, timestamp: new Date() }]
              };
            }
          }
          return msg;
        })
      );
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const getMessageTypeIcon = (type: ChatMessage['type']) => {
    switch (type) {
      case 'bet_placed': return '💰';
      case 'prediction': return '🔮';
      case 'system': return '🤖';
      default: return null;
    }
  };

  return (
    <div className={`bg-card rounded-xl border border-border flex flex-col ${className}`}>
      {/* Chat Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <h3 className="font-semibold text-foreground">Live Chat</h3>
          </div>
          <div className="text-sm text-muted-foreground">
            {participantCount} participants
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-96">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground mb-2">💬</div>
            <div className="text-sm text-muted-foreground">No messages yet</div>
            <div className="text-xs text-muted-foreground">Be the first to start the conversation!</div>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessageComponent
              key={message.id}
              message={message}
              isOwnMessage={message.authorFid === userFid}
              onReaction={(emoji) => addReaction(message.id, emoji)}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-border">
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={isConnected ? "Type a message..." : "Connecting..."}
            disabled={!isConnected}
            className="flex-1 input text-sm"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || !isConnected}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

interface ChatMessageComponentProps {
  message: ChatMessage;
  isOwnMessage: boolean;
  onReaction: (emoji: string) => void;
}

function ChatMessageComponent({ message, isOwnMessage, onReaction }: ChatMessageComponentProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  
  const commonEmojis = ['👍', '👎', '🔥', '💯', '🚀', '❤️', '😂', '🤔'];
  
  const groupedReactions = message.reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = { count: 0, users: [] };
    }
    acc[reaction.emoji].count++;
    acc[reaction.emoji].users.push(reaction.fid);
    return acc;
  }, {} as Record<string, { count: number; users: number[] }>);

  return (
    <div className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
        {message.displayName.charAt(0)}
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-[80%] ${isOwnMessage ? 'text-right' : 'text-left'}`}>
        {/* Header */}
        <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-sm font-medium text-foreground">{message.displayName}</span>
          <span className="text-xs text-muted-foreground">
            {formatTime(message.timestamp)}
          </span>
          {getMessageTypeIcon(message.type) && (
            <span className="text-sm">{getMessageTypeIcon(message.type)}</span>
          )}
        </div>

        {/* Message */}
        <div className={`relative group`}>
          <div className={`inline-block px-3 py-2 rounded-lg text-sm ${
            isOwnMessage
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          }`}>
            {message.message}
          </div>

          {/* Reaction Button */}
          <button
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className="absolute -right-2 -bottom-1 w-6 h-6 bg-background border border-border rounded-full flex items-center justify-center text-xs hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
          >
            😊
          </button>
        </div>

        {/* Reactions */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className={`flex gap-1 mt-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(groupedReactions).map(([emoji, data]) => (
              <button
                key={emoji}
                onClick={() => onReaction(emoji)}
                className="flex items-center gap-1 px-2 py-1 bg-muted hover:bg-muted/80 rounded-full text-xs transition-colors"
              >
                <span>{emoji}</span>
                <span>{data.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Reaction Picker */}
        {showReactionPicker && (
          <div className="absolute z-10 mt-2 p-2 bg-background border border-border rounded-lg shadow-lg">
            <div className="flex gap-1">
              {commonEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onReaction(emoji);
                    setShowReactionPicker(false);
                  }}
                  className="w-8 h-8 hover:bg-muted rounded transition-colors flex items-center justify-center"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}