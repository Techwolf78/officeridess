import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from "@/lib/firebase";
import { useAuth } from './use-auth';
import { FirebaseChat, FirebaseMessage, CreateChatRequest, SendMessageRequest } from './types';

export function useChat(rideId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [chats, setChats] = useState<FirebaseChat[]>([]);

  // Fetch user's chats
  const { data: userChats, isLoading } = useQuery({
    queryKey: ['chats', user?.uid],
    queryFn: async () => {
      if (!user?.uid) return [];

      const q = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', user.uid)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        lastMessageAt: doc.data().lastMessageAt?.toDate(),
      })) as FirebaseChat[];
    },
    enabled: !!user?.uid,
  });

  // Real-time listener for chats
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedChats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        lastMessageAt: doc.data().lastMessageAt?.toDate(),
      })) as FirebaseChat[];

      setChats(updatedChats);
      queryClient.setQueryData(['chats', user.uid], updatedChats);
    });

    return unsubscribe;
  }, [user?.uid, queryClient]);

  // Get or create chat for a ride
  const getOrCreateChat = useMutation({
    mutationFn: async ({ rideId, participants }: CreateChatRequest) => {
      // Check if chat already exists for this ride with these specific participants
      const existingChat = chats.find(chat =>
        chat.rideId === rideId &&
        chat.participants.length === participants.length &&
        chat.participants.every(p => participants.includes(p))
      );
      if (existingChat) return existingChat;

      // Create new chat
      const chatData = {
        rideId,
        participants,
        createdAt: Timestamp.now(),
        lastMessageAt: Timestamp.now(),
        unreadCount: participants.reduce((acc, participantId) => ({
          ...acc,
          [participantId]: 0
        }), {}),
      };

      const docRef = await addDoc(collection(db, 'chats'), chatData);
      return { id: docRef.id, ...chatData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats', user?.uid] });
    },
  });

  // Send message
  const sendMessage = useMutation({
    mutationFn: async ({ chatId, content, type = 'text' }: SendMessageRequest) => {
      if (!user?.uid) throw new Error('User not authenticated');

      const messageData = {
        chatId,
        senderId: user.uid,
        content,
        type,
        timestamp: Timestamp.now(),
        readBy: [user.uid], // Sender has read their own message
      };

      const docRef = await addDoc(collection(db, 'messages'), messageData);

      // Update chat's last message
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: content,
        lastMessageAt: Timestamp.now(),
        // Increment unread count for other participants
        [`unreadCount.${user.uid}`]: 0, // Reset sender's count
      });

      // Update unread counts for other participants
      const chat = chats.find(c => c.id === chatId);
      if (chat) {
        const batch = writeBatch(db);
        chat.participants.forEach(participantId => {
          if (participantId !== user.uid) {
            const currentCount = chat.unreadCount?.[participantId] || 0;
            batch.update(doc(db, 'chats', chatId), {
              [`unreadCount.${participantId}`]: currentCount + 1,
            });
          }
        });
        await batch.commit();
      }

      return { id: docRef.id, ...messageData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats', user?.uid] });
    },
  });

  // Mark messages as read
  const markAsRead = useMutation({
    mutationFn: async ({ chatId, messageIds }: { chatId: string; messageIds: string[] }) => {
      if (!user?.uid) throw new Error('User not authenticated');

      const batch = writeBatch(db);

      // Update messages
      messageIds.forEach(messageId => {
        batch.update(doc(db, 'messages', messageId), {
          readBy: [user.uid], // In a real app, you'd append to existing readBy array
        });
      });

      // Reset unread count for current user
      batch.update(doc(db, 'chats', chatId), {
        [`unreadCount.${user.uid}`]: 0,
      });

      await batch.commit();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats', user?.uid] });
    },
  });

  return {
    chats: userChats || [],
    isLoading,
    getOrCreateChat,
    sendMessage,
    markAsRead,
  };
}