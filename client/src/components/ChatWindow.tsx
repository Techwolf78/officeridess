import { useState, useEffect } from 'react';
import { useChat } from '@/hooks/use-chat';
import { useMessages } from '@/hooks/use-messages';
import { useAuth } from '@/hooks/use-auth';
import { useConnectionStatus } from '@/hooks/use-connection-status';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Phone, MoreVertical, Wifi } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { FirebaseChat } from '@/lib/types';

interface ChatWindowProps {
  chatId: string;
  rideId: string;
  participants: string[];
  onBack?: () => void;
  onCall?: (phoneNumber: string) => void;
  participantDetails?: { [userId: string]: { name: string; avatar?: string; phoneNumber?: string } };
}

export function ChatWindow({
  chatId,
  rideId,
  participants,
  onBack,
  onCall,
  participantDetails = {}
}: ChatWindowProps) {
  const { user } = useAuth();
  const { sendMessage, markAsRead } = useChat();
  const isOnline = useConnectionStatus();
  const {
    messages,
    isLoading,
    hasMore,
    loadMore,
    unreadCount,
    markMessagesAsRead,
    addMessage
  } = useMessages({ chatId });

  const otherParticipantId = participants.find(id => id !== user?.uid);
  const otherParticipant = participantDetails[otherParticipantId || ''];

  // Mark messages as read when chat opens
  useEffect(() => {
    if (messages.length > 0 && unreadCount > 0 && user?.uid) {
      const unreadMessageIds = messages
        .filter(msg => !msg.readBy.includes(user.uid))
        .map(msg => msg.id);

      if (unreadMessageIds.length > 0) {
        // Update local state first
        markMessagesAsRead(unreadMessageIds);
        // Then update database and reset unread count
        markAsRead.mutate({ chatId, messageIds: unreadMessageIds });
      }
    }
  }, [messages, unreadCount, user?.uid, markMessagesAsRead, markAsRead, chatId]);

  const handleSendMessage = async (content: string) => {
    try {
      const result = await sendMessage.mutateAsync({
        chatId,
        content,
        type: 'text'
      });

      // Add the message optimistically to local state
      if (result && result.id) {
        // Convert Firestore Timestamp to Date if needed
        let timestamp: Date;
        const ts = result.timestamp as any; // Cast to any to allow instanceof checks
        if (ts instanceof Timestamp) {
          timestamp = ts.toDate();
        } else if (ts instanceof Date) {
          timestamp = ts;
        } else {
          timestamp = new Date();
        }

        addMessage({
          id: result.id,
          chatId: result.chatId,
          senderId: result.senderId,
          content: result.content,
          type: result.type,
          timestamp,
          readBy: result.readBy || [user?.uid || ''],
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleCall = () => {
    if (otherParticipant?.phoneNumber && onCall) {
      onCall(otherParticipant.phoneNumber);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Chat Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}

        <Avatar className="w-10 h-10">
          <AvatarImage src={otherParticipant?.avatar} />
          <AvatarFallback>
            {otherParticipant?.name?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-foreground">
              {otherParticipant?.name || 'Chat'}
            </h3>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <p className="text-sm text-muted-foreground">
              Ride #{rideId.slice(-6)}
            </p>
            {!isOnline && (
              <div className="flex items-center gap-1 ml-2 text-amber-600 text-xs" title="No internet connection">
                <Wifi className="w-3 h-3 opacity-50" />
                <span>Offline</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-1">
          {otherParticipant?.phoneNumber && onCall && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCall}
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              <Phone className="w-4 h-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <MessageList
        messages={messages}
        isLoading={isLoading}
        hasMore={hasMore}
        onLoadMore={loadMore}
        chatId={chatId}
        participants={Object.fromEntries(
          Object.entries(participantDetails).map(([id, details]) => [
            id,
            { name: details.name, avatar: details.avatar }
          ])
        )}
      />

      {/* Message Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        disabled={sendMessage.isPending}
        placeholder="Type a message..."
        chatId={chatId}
      />
    </div>
  );
}