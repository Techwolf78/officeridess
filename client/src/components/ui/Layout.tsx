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
  // optional extra content that should appear inside the header (e.g. welcome text on home page)
  headerExtra?: ReactNode;
}


export function Layout({ children, showNav = true, headerTitle, className, headerExtra }: LayoutProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const { chats } = useChatRealtime();
  const isDriver = user?.role === 'driver';
  const isHome = location === "/home";


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
        <header
          className={cn(
            "px-4 bg-white/80 backdrop-blur-md border-b sticky top-0 z-50 flex flex-col items-start flex-shrink-0",
            // increase padding when we have extra header content (home page)
            (headerExtra || isHome) ? "py-4" : "py-4",
            // apply custom class for bottom corner rounding via traditional CSS
            (headerExtra || isHome) && "home-header"
          )}
        >
          <h1 className="font-display text-xl font-bold text-primary">{headerTitle}</h1>
          {(headerExtra || isHome) && (
            <div className="mt-4 w-full">
              {headerExtra}
            </div>
          )}
        </header>
      )}

      <main className={cn("flex-1 overflow-y-auto pb-20 no-scrollbar", className)}>
        {children}
      </main>

      {showNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t px-2 py-2 max-w-md mx-auto z-50">
          <div className="flex items-center">
            {/* Home */}
            <div className="flex-1 flex justify-center">
              <Link href="/home" className={cn("flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors", location === "/home" ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted")}>
                <Home size={24} strokeWidth={location === "/home" ? 2.5 : 2} />
                <span className="text-[10px] font-medium">Home</span>
              </Link>
            </div>

            {/* My Rides */}
            <div className="flex-1 flex justify-center">
              <Link href="/rides" className={cn("flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors", location === "/rides" ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted")}>
                <Calendar size={24} strokeWidth={location === "/rides" ? 2.5 : 2} />
                <span className="text-[10px] font-medium">My Rides</span>
              </Link>
            </div>

            {/* Floating action */}
            <div className="flex-1 flex flex-col items-center -mt-10">
              {isDriver ? (
                <>
                  <Link href="/create-ride" className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors">
                    <PlusCircle size={28} strokeWidth={2.5} />
                  </Link>
                  <span className="mt-1 text-[10px] font-medium text-primary">Offer</span>
                </>
              ) : (
                <>
                  <Link href="/search" className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors">
                    <Search size={28} strokeWidth={2.5} />
                  </Link>
                  <span className="mt-1 text-[10px] font-medium text-primary">Find</span>
                </>
              )}
            </div>

            {/* Inbox */}
            <div className="flex-1 flex justify-center">
              <Link href="/chat" className={cn("flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors relative", location === "/chat" ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted")}>
                <MessageCircle size={24} strokeWidth={location?.startsWith("/chat") ? 2.5 : 2} />
                <span className="text-[10px] font-medium">Inbox</span>
                {totalUnreadCount > 0 && (
                  <div className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                  </div>
                )}
              </Link>
            </div>

            {/* Profile */}
            <div className="flex-1 flex justify-center">
              <Link href="/profile" className={cn("flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors", location === "/profile" ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted")}>
                <User size={24} strokeWidth={location === "/profile" ? 2.5 : 2} />
                <span className="text-[10px] font-medium">Profile</span>
              </Link>
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
