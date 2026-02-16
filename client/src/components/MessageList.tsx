import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { FirebaseMessage } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useTypingStatus } from '@/hooks/use-typing-status';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface MessageListProps {
  messages: FirebaseMessage[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  participants?: { [userId: string]: { name: string; avatar?: string } };
  chatId?: string;
}

export function MessageList({
  messages,
  isLoading,
  hasMore,
  onLoadMore,
  participants = {},
  chatId = ''
}: MessageListProps) {
  const { user } = useAuth();
  const { otherUserTyping } = useTypingStatus(chatId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto p-4 space-y-2"
    >
      {hasMore && (
        <div className="text-center mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Load earlier messages
          </Button>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <p className="text-lg mb-2">👋</p>
            <p>Start a conversation!</p>
          </div>
        </div>
      ) : (
        messages.map((message) => {
          const isOwn = message.senderId === user?.uid;
          const sender = participants[message.senderId];

          return (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={isOwn}
              senderName={sender?.name}
              senderAvatar={sender?.avatar}
            />
          );
        })
      )}

      {/* Typing Indicator */}
      {otherUserTyping && (
        <div className="flex items-center gap-2 mb-2">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-sm text-muted-foreground">typing...</span>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}