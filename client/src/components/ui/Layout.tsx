import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Home, Car, User, PlusCircle, Search, Calendar, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useChatRealtime } from "@/hooks/use-chat-realtime";

interface LayoutProps {
  children: ReactNode;
  showNav?: boolean;
  headerTitle?: string;
  className?: string;
}

export function Layout({ children, showNav = true, headerTitle, className }: LayoutProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const { chats } = useChatRealtime();
  const isDriver = user?.role === 'driver';

  // Calculate total unread count across all chats - recalculates whenever chats or user changes
  const totalUnreadCount = chats.reduce((sum, chat) => {
    const chatUnread = chat.unreadCounts?.[user?.uid || ''] || 0;
    return sum + chatUnread;
  }, 0);

  // Debug: Log when chats update
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const unreadPerChat = chats.map(c => ({ 
        rideId: c.rideId, 
        unread: c.unreadCounts?.[user?.uid || ''] || 0 
      }));
      console.log(`[Layout] Chats updated. Total unread: ${totalUnreadCount}`, unreadPerChat);
    }
  }, [chats, user?.uid]);

  return (
    <div className="app-container flex flex-col h-screen overflow-hidden">
      {headerTitle && (
        <header className="px-4 py-4 bg-white/80 backdrop-blur-md border-b sticky top-0 z-50 flex items-center justify-between flex-shrink-0">
          <h1 className="font-display text-xl font-bold text-primary">{headerTitle}</h1>
          <div className="flex items-center gap-3">
             <Link href="/profile" className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden">
               {user?.profileImage ? (
                 <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                  user?.firstName?.[0] || <User size={16} />
               )}
             </Link>
          </div>
        </header>
      )}

      <main className={cn("flex-1 overflow-y-auto pb-20 no-scrollbar", className)}>
        {children}
      </main>

      {showNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t px-2 py-2 max-w-md mx-auto z-50">
          <div className="flex justify-around items-center">
            <Link href="/home" className={cn("flex flex-col items-center gap-1 flex-1 py-2 rounded-lg transition-colors", location === "/home" ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted")}>
              <Home size={24} strokeWidth={location === "/home" ? 2.5 : 2} />
              <span className="text-[10px] font-medium">Home</span>
            </Link>

            {isDriver ? (
               <Link href="/create-ride" className={cn("flex flex-col items-center gap-1 flex-1 py-2 rounded-lg transition-colors", location === "/create-ride" ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted")}>
                  <PlusCircle size={24} strokeWidth={location === "/create-ride" ? 2.5 : 2} />
                  <span className="text-[10px] font-medium">Offer Ride</span>
               </Link>
            ) : (
              <Link href="/search" className={cn("flex flex-col items-center gap-1 flex-1 py-2 rounded-lg transition-colors", location === "/search" ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted")}>
                <Search size={24} strokeWidth={location === "/search" ? 2.5 : 2} />
                <span className="text-[10px] font-medium">Find Ride</span>
              </Link>
            )}

            <Link href="/rides" className={cn("flex flex-col items-center gap-1 flex-1 py-2 rounded-lg transition-colors", location === "/rides" ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted")}>
              <Calendar size={24} strokeWidth={location === "/rides" ? 2.5 : 2} />
              <span className="text-[10px] font-medium">My Rides</span>
            </Link>

            <Link href="/chat" className={cn("flex flex-col items-center gap-1 flex-1 py-2 rounded-lg transition-colors relative", location === "/chat" ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted")}>
              <MessageCircle size={24} strokeWidth={location?.startsWith("/chat") ? 2.5 : 2} />
              <span className="text-[10px] font-medium">Inbox</span>
              {totalUnreadCount > 0 && (
                <div className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                </div>
              )}
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}
