import { useState, useEffect, useRef, useCallback } from 'react';
import { ref, set, onValue, off, remove } from 'firebase/database';
import { realtimeDb } from '@/lib/firebase';
import { useAuth } from './use-auth';

interface TypingStatus {
  userId: string;
  typing: boolean;
  lastUpdate: number;
}

export function useTypingStatus(chatId: string) {
  const { user } = useAuth();
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Set user as typing (with debouncing to avoid too many updates)
  const setTyping = useCallback((isTyping: boolean) => {
    if (!user?.uid || !chatId) return;

    const now = Date.now();
    // Debounce: don't update more than once per 300ms
    if (now - lastUpdateRef.current < 300) return;
    lastUpdateRef.current = now;

    const typingRef = ref(realtimeDb, `typing_status/${chatId}/${user.uid}`);

    if (isTyping) {
      // Set typing status with timestamp
      set(typingRef, {
        typing: true,
        lastUpdate: now,
      });

      // Auto-clear after 3 seconds of inactivity
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        remove(typingRef);
        setOtherUserTyping(false);
      }, 3000);
    } else {
      // Clear typing status
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      remove(typingRef);
    }
  }, [user?.uid, chatId]);

  // Listen to other user's typing status
  useEffect(() => {
    if (!user?.uid || !chatId) return;

    // We need to know who the other user is
    // For now, we'll listen to all users in the chat and filter out current user
    const typingStatusRef = ref(realtimeDb, `typing_status/${chatId}`);

    const unsubscribe = onValue(typingStatusRef, (snapshot) => {
      const data = snapshot.val() as Record<string, any> | null;

      if (!data) {
        setOtherUserTyping(false);
        setOtherUserId(null);
        return;
      }

      // Find if any other user is typing (not current user)
      let foundTypingUser: string | null = null;

      for (const [userId, status] of Object.entries(data)) {
        if (userId !== user.uid && typeof status === 'object') {
          const typingData = status as any;
          const now = Date.now();
          // Check if typing status is not stale (less than 5 seconds old)
          if (typingData.typing && now - typingData.lastUpdate < 5000) {
            foundTypingUser = userId;
            break;
          }
        }
      }

      setOtherUserTyping(!!foundTypingUser);
      setOtherUserId(foundTypingUser);
    });

    return () => {
      unsubscribe();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [user?.uid, chatId]);

  return {
    setTyping,
    otherUserTyping,
    otherUserId,
  };
}
