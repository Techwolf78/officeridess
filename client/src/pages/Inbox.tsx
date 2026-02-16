import { Layout } from "@/components/ui/Layout";
import { useChatRealtime } from "@/hooks/use-chat-realtime";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FirebaseUser } from "@/lib/types";
import { MessageCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";

export default function Inbox() {
  const { user } = useAuth();
  const { chats, loading: chatsLoading } = useChatRealtime();
  const [, setLocation] = useLocation();
  const [allUsersLoaded, setAllUsersLoaded] = useState(false);

  // Sort chats by last message time
  const sortedChats = [...chats].sort((a, b) => {
    const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return timeB - timeA;
  });

  // Track when all user data is loaded
  useEffect(() => {
    if (chatsLoading || sortedChats.length === 0) {
      setAllUsersLoaded(false);
      return;
    }

    // Check if all user data is loaded
    const checkAllUsersLoaded = async () => {
      const userPromises = sortedChats.map(async (chat) => {
        const otherParticipantId = chat.participants.find((id: string) => id !== user?.uid);
        if (!otherParticipantId) return true;

        try {
          const userDoc = await getDoc(doc(db, "users", otherParticipantId));
          return userDoc.exists();
        } catch {
          return false;
        }
      });

      const results = await Promise.all(userPromises);
      setAllUsersLoaded(results.every(result => result));
    };

    checkAllUsersLoaded();
  }, [chatsLoading, sortedChats, user?.uid]);

  // Show skeleton loaders until all data is loaded
  if (chatsLoading || !allUsersLoaded) {
    return (
      <Layout headerTitle="Inbox" showNav={true}>
        <div className="flex flex-col h-full">
          <div className="divide-y">
            {/* WhatsApp-like skeleton loaders */}
            {Array.from({ length: Math.max(6, sortedChats.length) }).map((_, index) => (
              <ChatSkeleton key={index} />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout headerTitle="Inbox" showNav={true}>
      <div className="flex flex-col h-full">
        {sortedChats.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <MessageCircle size={32} className="text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
            <p className="text-muted-foreground text-center text-sm">
              Start chatting with drivers and passengers to see your conversations here
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {sortedChats.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                currentUserId={user?.uid || ""}
                onSelect={() => setLocation(`/chat/${chat.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

interface ChatListItemProps {
  chat: any;
  currentUserId: string;
  onSelect: () => void;
}

function ChatListItem({ chat, currentUserId, onSelect }: ChatListItemProps) {
  const otherParticipantId = chat.participants.find((id: string) => id !== currentUserId);
  const { data: otherUser } = useQuery({
    queryKey: ["user", otherParticipantId],
    queryFn: async () => {
      if (!otherParticipantId) return null;
      const userDoc = await getDoc(doc(db, "users", otherParticipantId));
      if (userDoc.exists()) {
        return {
          uid: userDoc.id,
          ...userDoc.data(),
          createdAt: userDoc.data().createdAt?.toDate?.(),
        } as FirebaseUser;
      }
      return null;
    },
    enabled: !!otherParticipantId,
  });

  const unreadCount = chat.unreadCounts?.[currentUserId] || 0;
  const displayName =
    otherUser && otherUser.firstName
      ? `${otherUser.firstName}${otherUser.lastName ? " " + otherUser.lastName : ""}`
      : "Unknown User";
  const displayImage = otherUser?.profileImage;
  const lastMessageText = chat.lastMessage || "No messages yet";
  const lastMessageTime = chat.lastMessageAt ? new Date(chat.lastMessageAt) : null;

  return (
    <button
      onClick={onSelect}
      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted transition-colors text-left"
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
          {displayImage ? (
            <img
              src={displayImage}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="font-bold text-primary text-sm">
              {displayName[0]?.toUpperCase() || "?"}
            </span>
          )}
        </div>
      </div>

      {/* Chat Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{displayName}</h3>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              Ride #{chat.rideId.slice(-6)}
            </span>
          </div>
          {lastMessageTime && (
            <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
              {formatMessageTime(lastMessageTime)}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">{lastMessageText}</p>
      </div>

      {/* Unread Badge */}
      {unreadCount > 0 && (
        <div className="flex-shrink-0 ml-2">
          <div className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </div>
        </div>
      )}
    </button>
  );
}

function formatMessageTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  
  return format(date, "MMM d");
}

function ChatSkeleton() {
  return (
    <div className="px-4 py-3 flex items-center gap-3 animate-pulse">
      {/* Avatar skeleton */}
      <div className="flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-muted animate-pulse"></div>
      </div>

      {/* Chat info skeleton */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
          <div className="h-3 bg-muted rounded w-12 animate-pulse"></div>
        </div>
        <div className="h-3 bg-muted rounded w-32 animate-pulse"></div>
      </div>

      {/* Unread badge skeleton (sometimes show) */}
      {Math.random() > 0.7 && (
        <div className="flex-shrink-0">
          <div className="w-5 h-5 rounded-full bg-muted animate-pulse"></div>
        </div>
      )}
    </div>
  );
}
