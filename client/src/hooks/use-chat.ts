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
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { db } from "@/lib/firebase";
import { useAuth } from './use-auth';
import { FirebaseChat, FirebaseMessage, CreateChatRequest, SendMessageRequest } from '@/lib/types';

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
        unreadCounts: participants.reduce((acc, participantId) => ({
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

      // Fetch current chat to get all participants and unreadCounts
      const chatDocSnap = await getDoc(doc(db, 'chats', chatId));
      if (!chatDocSnap.exists()) throw new Error('Chat not found');
      
      const chatData = chatDocSnap.data() as FirebaseChat;
      
      // Build update object with all unreadCount changes
      const updateObj: Record<string, any> = {
        lastMessage: content,
        lastMessageAt: Timestamp.now(),
      };

      // Update unread counts for all participants
      chatData.participants.forEach(participantId => {
        if (participantId === user.uid) {
          updateObj[`unreadCounts.${participantId}`] = 0; // Reset sender's count
        } else {
          const currentCount = chatData.unreadCounts?.[participantId] || 0;
          updateObj[`unreadCounts.${participantId}`] = currentCount + 1; // Increment others' count
        }
      });

      // Single batch update with all fields
      const batch = writeBatch(db);
      batch.update(doc(db, 'chats', chatId), updateObj);
      await batch.commit();

      if (process.env.NODE_ENV === 'development') {
        console.log(`[useChat] Message sent, unreadCounts updated:`, {
          chatId,
          senderId: user.uid.slice(0, 6),
          updatedCounts: chatData.participants.reduce((acc, pId) => ({
            ...acc,
            [pId.slice(0, 6)]: updateObj[`unreadCounts.${pId}`]
          }), {})
        });
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
      const now = Timestamp.now();

      // Update messages - append to readBy and add readAtTimestamp
      messageIds.forEach(messageId => {
        batch.update(doc(db, 'messages', messageId), {
          readBy: [user.uid], // For now, just set to current user (should append in real implementation)
          [`readAtTimestamps.${user.uid}`]: now,
        });
      });

      // Reset unread count for current user
      batch.update(doc(db, 'chats', chatId), {
        [`unreadCounts.${user.uid}`]: 0,
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