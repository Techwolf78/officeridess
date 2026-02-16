import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { FirebaseChat } from "@/lib/types";

export function useChatRealtime() {
  const { user } = useAuth();
  const [chats, setChats] = useState<FirebaseChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db || !user?.uid) {
      setChats([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const q = query(
        collection(db, "chats"),
        where("participants", "array-contains", user.uid)
      );

      // Set up real-time listener - this fires on ANY change to matching docs
      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const chatsData: FirebaseChat[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            chatsData.push({
              id: doc.id,
              rideId: data.rideId,
              participants: data.participants,
              createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
              lastMessage: data.lastMessage,
              lastMessageAt: data.lastMessageAt instanceof Timestamp ? data.lastMessageAt.toDate() : new Date(),
              unreadCounts: data.unreadCounts || {},
            });
          });

          // Always update chats even if same number (Firestore data changed)
          setChats(chatsData);
          setLoading(false);
          setError(null);

          // Debug: Log when unread counts change
          if (process.env.NODE_ENV === 'development') {
            const totalUnread = chatsData.reduce((sum, chat) => {
              return sum + (chat.unreadCounts?.[user.uid] || 0);
            }, 0);
            console.log(`[Chat Realtime] Total unread for ${user.uid.slice(0, 6)}: ${totalUnread}`, chatsData);
          }
        },
        (err) => {
          console.error("Error listening to chats:", err);
          setError(err.message);
          setLoading(false);
        }
      );

      // Cleanup subscription on unmount
      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up chats listener:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  }, [user?.uid]);

  return { chats, loading, error };
}
