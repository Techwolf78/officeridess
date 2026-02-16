import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { CreateSupportTicketRequest } from "@/lib/types";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export function useCreateSupportTicket() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createTicket = useMutation({
    mutationFn: async (ticketData: CreateSupportTicketRequest) => {
      if (!user?.uid) throw new Error("User not found");

      const ticketsCollection = collection(db, "supportTickets");
      const docRef = await addDoc(ticketsCollection, {
        ...ticketData,
        userId: user.uid,
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        id: docRef.id,
        ...ticketData,
        userId: user.uid,
        status: 'open' as const,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supportTickets"] });
    },
  });

  return createTicket;
}
