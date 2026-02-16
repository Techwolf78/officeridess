import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
  startAfter,
  DocumentSnapshot,
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { db } from "@/lib/firebase";
import { useAuth } from './use-auth';
import { FirebaseMessage } from '@/lib/types';

interface UseMessagesOptions {
  chatId: string;
  pageSize?: number;
}

// Global cache for messages by chatId
const messagesCacheRef = new Map<string, {
  messages: FirebaseMessage[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
  timestamp: number;
}>();

export function useMessages({ chatId, pageSize = 20 }: UseMessagesOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<FirebaseMessage[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const realTimeListenerRef = useRef<(() => void) | null>(null);

  // Initial messages query - Load only 20 most recent messages
  const { data: initialMessages, isLoading } = useQuery({
    queryKey: ['messages', chatId, 'initial'],
    queryFn: async () => {
      // Check cache first (valid for 5 minutes)
      const cache = messagesCacheRef.get(chatId);
      const now = Date.now();
      if (cache && (now - cache.timestamp) < 5 * 60 * 1000) {
        setMessages(cache.messages);
        setLastDoc(cache.lastDoc);
        setHasMore(cache.hasMore);
        return cache.messages;
      }

      // Fetch initial 20 messages (newest first)
      const q = query(
        collection(db, 'messages'),
        where('chatId', '==', chatId),
        orderBy('timestamp', 'desc'),
        limit(pageSize)
      );

      const snapshot = await getDocs(q);
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      })) as FirebaseMessage[];

      // Set pagination state
      if (snapshot.docs.length > 0) {
        const oldestDoc = snapshot.docs[snapshot.docs.length - 1];
        setLastDoc(oldestDoc);
        setHasMore(snapshot.docs.length === pageSize);
        
        // Cache this data
        const reversedMessages = messagesData.reverse();
        messagesCacheRef.set(chatId, {
          messages: reversedMessages,
          lastDoc: oldestDoc,
          hasMore: snapshot.docs.length === pageSize,
          timestamp: now
        });
      } else {
        setHasMore(false);
      }

      return messagesData.reverse(); // Reverse to show oldest first
    },
    enabled: !!chatId,
  });

  // Set initial messages when loaded
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  // Real-time listener for new messages (append only strategy)
  useEffect(() => {
    if (!chatId) return;

    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      orderBy('timestamp', 'asc')
    );

    realTimeListenerRef.current = onSnapshot(q, (snapshot) => {
      const allMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      })) as FirebaseMessage[];

      // Update messages - use real-time data as source of truth
      // This ensures we always have the latest state from Firestore
      setMessages(allMessages);
      
      // Update cache
      const cache = messagesCacheRef.get(chatId);
      if (cache) {
        messagesCacheRef.set(chatId, {
          ...cache,
          messages: allMessages,
          timestamp: Date.now()
        });
      }
    });

    return () => {
      if (realTimeListenerRef.current) {
        realTimeListenerRef.current();
      }
    };
  }, [chatId]);

  // Load more messages (pagination - load older messages)
  const loadMore = async () => {
    if (!lastDoc || !hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const q = query(
        collection(db, 'messages'),
        where('chatId', '==', chatId),
        orderBy('timestamp', 'desc'),
        startAfter(lastDoc),
        limit(pageSize)
      );

      const snapshot = await getDocs(q);
      const moreMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      })) as FirebaseMessage[];

      if (snapshot.docs.length > 0) {
        const oldestDoc = snapshot.docs[snapshot.docs.length - 1];
        setLastDoc(oldestDoc);
        setHasMore(snapshot.docs.length === pageSize);

        // Prepend older messages to beginning
        setMessages(prev => [...moreMessages.reverse(), ...prev]);

        // Update cache
        const newMessages = [...moreMessages.reverse(), ...messages];
        messagesCacheRef.set(chatId, {
          messages: newMessages,
          lastDoc: oldestDoc,
          hasMore: snapshot.docs.length === pageSize,
          timestamp: Date.now()
        });
      } else {
        setHasMore(false);
      }
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Get unread messages count for current user
  const getUnreadCount = () => {
    if (!user?.uid) return 0;
    return messages.filter(msg =>
      msg.senderId !== user.uid && !msg.readBy.includes(user.uid)
    ).length;
  };

  // Mark messages as read
  const markMessagesAsRead = async (messageIds: string[]) => {
    if (!user?.uid) return;

    // Update local state optimistically
    setMessages(prev => prev.map(msg =>
      messageIds.includes(msg.id) && !msg.readBy.includes(user.uid)
        ? { ...msg, readBy: [...msg.readBy, user.uid] }
        : msg
    ));

    // Update cache
    const cache = messagesCacheRef.get(chatId);
    if (cache) {
      const updatedMessages = cache.messages.map(msg =>
        messageIds.includes(msg.id) && !msg.readBy.includes(user.uid)
          ? { ...msg, readBy: [...msg.readBy, user.uid] }
          : msg
      );
      messagesCacheRef.set(chatId, {
        ...cache,
        messages: updatedMessages,
        timestamp: Date.now()
      });
    }
  };

  // Add message to local state (for optimistic updates)
  const addMessage = (message: FirebaseMessage) => {
    setMessages(prev => [...prev, message]);
    
    // Update cache
    const cache = messagesCacheRef.get(chatId);
    if (cache) {
      messagesCacheRef.set(chatId, {
        ...cache,
        messages: [...cache.messages, message],
        timestamp: Date.now()
      });
    }
  };

  return {
    messages,
    isLoading,
    hasMore,
    loadMore,
    unreadCount: getUnreadCount(),
    markMessagesAsRead,
    addMessage,
  };
}