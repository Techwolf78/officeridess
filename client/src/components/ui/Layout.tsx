import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Home, Car, User, PlusCircle, Search, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

interface LayoutProps {
  children: ReactNode;
  showNav?: boolean;
  headerTitle?: string;
  className?: string;
}

export function Layout({ children, showNav = true, headerTitle, className }: LayoutProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const isDriver = user?.role === 'driver';

  return (
    <div className="app-container flex flex-col">
      {headerTitle && (
        <header className="px-6 py-4 bg-white/80 backdrop-blur-md border-b sticky top-0 z-50 flex items-center justify-between">
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
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t px-6 py-3 max-w-md mx-auto z-50">
          <div className="flex justify-between items-center">
            <Link href="/" className={cn("flex flex-col items-center gap-1", location === "/" ? "text-primary" : "text-muted-foreground")}>
              <Home size={24} strokeWidth={location === "/" ? 2.5 : 2} />
              <span className="text-[10px] font-medium">Home</span>
            </Link>

            {isDriver ? (
               <Link href="/create-ride" className="relative -top-6 bg-primary text-white p-4 rounded-full shadow-lg shadow-primary/30 hover:shadow-xl hover:-translate-y-1 transition-all">
                <PlusCircle size={28} />
              </Link>
            ) : (
              <Link href="/search" className="relative -top-6 bg-primary text-white p-4 rounded-full shadow-lg shadow-primary/30 hover:shadow-xl hover:-translate-y-1 transition-all">
                <Search size={28} />
              </Link>
            )}

            <Link href="/rides" className={cn("flex flex-col items-center gap-1", location === "/rides" ? "text-primary" : "text-muted-foreground")}>
              <Calendar size={24} strokeWidth={location === "/rides" ? 2.5 : 2} />
              <span className="text-[10px] font-medium">My Rides</span>
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}
