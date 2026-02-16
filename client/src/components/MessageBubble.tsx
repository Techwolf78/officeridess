import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FirebaseMessage } from '@/lib/types';
import { format } from 'date-fns';
import { useState } from 'react';

interface MessageBubbleProps {
  message: FirebaseMessage;
  isOwn: boolean;
  senderName?: string;
  senderAvatar?: string;
}

export function MessageBubble({
  message,
  isOwn,
  senderName,
  senderAvatar
}: MessageBubbleProps) {
  const [showReadTime, setShowReadTime] = useState(false);

  // Ensure timestamp is a valid Date
  const getValidDate = (timestamp: any): Date => {
    if (!timestamp) return new Date();
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp === 'object' && 'toDate' in timestamp) {
      return timestamp.toDate();
    }
    const parsed = new Date(timestamp);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  const validTimestamp = getValidDate(message.timestamp);

  const formatTime = (timestamp: Date) => {
    try {
      return format(timestamp, 'HH:mm');
    } catch (error) {
      return 'Invalid time';
    }
  };

  const formatReadTime = (timestamp: Date) => {
    try {
      return format(timestamp, 'hh:mm a');
    } catch (error) {
      return 'Invalid time';
    }
  };

  // Determine read status
  const isSent = message.readBy.length >= 1; // At least seen by recipient
  const isRead = message.readBy.length > 1; // Both users have read
  const readAtTimestamp = message.readAtTimestamps ? Object.values(message.readAtTimestamps)[0] : null;

  // Get read status checkmark
  const getReadCheckmark = () => {
    if (isRead) {
      return (
        <span className="ml-1 text-primary font-bold" title={readAtTimestamp ? `Read ${formatReadTime(readAtTimestamp)}` : 'Read'}>
          ✓✓
        </span>
      );
    } else if (isSent) {
      return <span className="ml-1 font-bold" title="Delivered">✓✓</span>;
    } else {
      return <span className="ml-1 font-bold" title="Sending">✓</span>;
    }
  };

  return (
    <div className={cn(
      "flex gap-3 mb-4",
      isOwn ? "flex-row-reverse" : "flex-row"
    )}>
      {!isOwn && (
        <Avatar className="w-8 h-8">
          <AvatarImage src={senderAvatar} />
          <AvatarFallback className="text-xs">
            {senderName?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn(
        "max-w-[70%] px-4 py-2 rounded-2xl",
        isOwn
          ? "bg-primary text-primary-foreground ml-auto"
          : "bg-muted"
      )}>
        {!isOwn && senderName && (
          <div className="text-xs font-medium text-muted-foreground mb-1">
            {senderName}
          </div>
        )}

        <div className="text-sm break-words">
          {message.content}
        </div>

        <div className={cn(
          "text-xs mt-1 flex items-center",
          isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          <span>{formatTime(validTimestamp)}</span>
          {isOwn && getReadCheckmark()}
          {isOwn && isRead && readAtTimestamp && (
            <div
              className="ml-2 cursor-help text-xs opacity-70 hover:opacity-100"
              onMouseEnter={() => setShowReadTime(true)}
              onMouseLeave={() => setShowReadTime(false)}
              title={`Read at ${formatReadTime(readAtTimestamp)}`}
            >
              {showReadTime && `(${formatReadTime(readAtTimestamp)})`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}