import { useState, useEffect } from 'react';
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
  Timestamp
} from 'firebase/firestore';
import { db } from "@/lib/firebase";
import { useAuth } from './use-auth';
import { FirebaseMessage } from './types';

interface UseMessagesOptions {
  chatId: string;
  pageSize?: number;
}

export function useMessages({ chatId, pageSize = 50 }: UseMessagesOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<FirebaseMessage[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);

  // Initial messages query
  const { data: initialMessages, isLoading } = useQuery({
    queryKey: ['messages', chatId, 'initial'],
    queryFn: async () => {
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

      if (snapshot.docs.length > 0) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === pageSize);
      }

      return messagesData.reverse(); // Reverse to show oldest first
    },
    enabled: !!chatId,
  });

  // Real-time listener for new messages
  useEffect(() => {
    if (!chatId) return;

    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      })) as FirebaseMessage[];

      setMessages(updatedMessages);
      queryClient.setQueryData(['messages', chatId, 'realtime'], updatedMessages);
    });

    return unsubscribe;
  }, [chatId, queryClient]);

  // Load more messages (pagination)
  const loadMore = async () => {
    if (!lastDoc || !hasMore) return;

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
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === pageSize);

      // Prepend older messages
      setMessages(prev => [...moreMessages.reverse(), ...prev]);
    } else {
      setHasMore(false);
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

    // In a real implementation, you'd call the markAsRead mutation from useChat
    // For now, we'll just update the local state
  };

  return {
    messages: messages.length > 0 ? messages : (initialMessages || []),
    isLoading,
    hasMore,
    loadMore,
    unreadCount: getUnreadCount(),
    markMessagesAsRead,
  };
}