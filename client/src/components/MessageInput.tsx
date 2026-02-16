import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import { useTypingStatus } from '@/hooks/use-typing-status';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
  chatId?: string;
}

export function MessageInput({
  onSendMessage,
  disabled = false,
  placeholder = "Type a message...",
  chatId = ''
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const { setTyping } = useTypingStatus(chatId);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);

    // Notify that user is typing
    if (chatId) {
      setTyping(true);

      // Reset the timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 1 second of no input
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
      }, 1000);
    }
  }, [chatId, setTyping]);

  const handleBlur = useCallback(() => {
    // Clear typing status when focus leaves input
    if (chatId) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      setTyping(false);
    }
  }, [chatId, setTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      if (chatId) {
        setTyping(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t bg-background">
      <Input
        value={message}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1"
        autoFocus
      />
      <Button
        type="submit"
        size="sm"
        disabled={disabled || !message.trim()}
        className="px-3"
      >
        <Send className="w-4 h-4" />
      </Button>
    </form>
  );
}