import { useState } from 'react';
import { useRoute, useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useChat } from '@/hooks/use-chat';
import { useRides } from '@/hooks/use-rides';
import { ChatWindow } from '@/components/ChatWindow';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { FirebaseUser } from '@/lib/types';

export default function Chat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [match, params] = useRoute('/chat/:chatId');
  const [, setLocation] = useLocation();
  const chatId = params?.chatId;

  const { chats, isLoading: chatsLoading } = useChat();
  const { data: rides, isLoading: ridesLoading } = useRides();

  const chat = chats.find(c => c.id === chatId);
  const ride = rides?.find(r => r.id === chat?.rideId);
  const otherParticipantId = chat?.participants.find(id => id !== user?.uid);

  // Fetch other participant's user data (must be called before any conditional returns)
  const { data: otherParticipantUser } = useQuery({
    queryKey: ['user', otherParticipantId],
    queryFn: async () => {
      if (!otherParticipantId) return null;
      const userDoc = await getDoc(doc(db, 'users', otherParticipantId));
      if (userDoc.exists()) {
        return {
          uid: userDoc.id,
          ...userDoc.data(),
          createdAt: userDoc.data().createdAt?.toDate(),
        } as FirebaseUser;
      }
      return null;
    },
    enabled: !!otherParticipantId,
  });

  if (chatsLoading || ridesLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!chat || !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Chat not found</p>
      </div>
    );
  }

  // Determine participant details based on available data
  let otherParticipantName = 'Unknown User';
  let otherParticipantAvatar;
  let otherParticipantPhone;

  if (ride) {
    if (ride.driverId === otherParticipantId) {
      // Other participant is the driver
      otherParticipantName = ride.driver ? `${ride.driver.firstName} ${ride.driver.lastName || ''}`.trim() : 'Driver';
      otherParticipantAvatar = ride.driver?.profileImage;
      otherParticipantPhone = ride.driver?.phoneNumber;
    } else {
      // Other participant is a passenger - try to get from user data
      if (otherParticipantUser) {
        otherParticipantName = `${otherParticipantUser.firstName} ${otherParticipantUser.lastName || ''}`.trim();
        otherParticipantAvatar = otherParticipantUser.profileImage;
        otherParticipantPhone = otherParticipantUser.phoneNumber;
      } else {
        otherParticipantName = 'Passenger';
      }
    }
  } else {
    // No ride data available, use user data
    if (otherParticipantUser) {
      otherParticipantName = `${otherParticipantUser.firstName} ${otherParticipantUser.lastName || ''}`.trim();
      otherParticipantAvatar = otherParticipantUser.profileImage;
      otherParticipantPhone = otherParticipantUser.phoneNumber;
    }
  }

  const participantDetails = {
    [user.uid]: {
      name: `${user.firstName} ${user.lastName || ''}`.trim(),
      avatar: user.profileImage,
    },
    [otherParticipantId || '']: {
      name: otherParticipantName,
      avatar: otherParticipantAvatar,
      phoneNumber: otherParticipantPhone,
    }
  };

  const handleCall = (phoneNumber: string) => {
    window.open(`tel:${phoneNumber}`, '_self');
  };

  const handleBack = () => {
    setLocation(`/ride/${chat.rideId}`);
  };

  return (
    <div className="h-full">
      <ChatWindow
        chatId={chat.id}
        rideId={chat.rideId}
        participants={chat.participants}
        participantDetails={participantDetails}
        onCall={handleCall}
        onBack={handleBack}
      />
    </div>
  );
}