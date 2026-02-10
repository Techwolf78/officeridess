import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FirebaseMessage } from '@/lib/types';
import { format } from 'date-fns';

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
  const formatTime = (timestamp: Date) => {
    return format(timestamp, 'HH:mm');
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
          "text-xs mt-1",
          isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          {formatTime(message.timestamp)}
          {isOwn && message.readBy.length > 1 && (
            <span className="ml-1">✓✓</span>
          )}
        </div>
      </div>
    </div>
  );
}