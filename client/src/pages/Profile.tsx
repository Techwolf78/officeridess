import { Layout } from "@/components/ui/Layout";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, LogOut, User, MapPin, Briefcase, Settings, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Profile() {
  const { user, logout, updateProfile } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  if (!user) return null;

  return (
    <Layout headerTitle="Profile" showNav={true}>
      <div className="px-6 py-8 pb-24">
        {/* Profile Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center text-4xl font-bold text-muted-foreground mb-4 border-4 border-white shadow-lg">
             {user.profileImage ? (
               <img src={user.profileImage} alt="Profile" className="w-full h-full rounded-full object-cover" />
             ) : (
               user.fullName?.[0] || "U"
             )}
          </div>
          <h2 className="text-xl font-bold">{user.fullName || "User"}</h2>
          <p className="text-muted-foreground text-sm">{user.phoneNumber}</p>
          <span className="mt-2 text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full capitalize">
            {user.role}
          </span>
        </div>

        {/* Menu Items */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-border/50">
             <div className="p-4 border-b border-border/50 flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-primary">
                 <Briefcase size={16} />
               </div>
               <div className="flex-1">
                 <p className="text-sm font-medium">Wallet Balance</p>
                 <p className="text-xs text-muted-foreground">Manage payment methods</p>
               </div>
               <span className="font-bold text-primary">${(user.walletBalance / 100).toFixed(2)}</span>
             </div>

             <button 
               onClick={() => updateProfile.mutate({ role: user.role === 'passenger' ? 'driver' : 'passenger' })}
               disabled={updateProfile.isPending}
               className="w-full p-4 border-b border-border/50 flex items-center gap-3 hover:bg-secondary/50 transition-colors text-left"
             >
               <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-primary">
                 <Shield size={16} />
               </div>
               <div className="flex-1">
                 <p className="text-sm font-medium">Switch to {user.role === 'passenger' ? 'Driver' : 'Passenger'}</p>
                 <p className="text-xs text-muted-foreground">{user.role === 'passenger' ? 'Post rides & earn' : 'Book rides'}</p>
               </div>
               {updateProfile.isPending && <Loader2 className="animate-spin text-muted-foreground" size={16} />}
             </button>
          </div>

          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-border/50">
             <div className="p-4 border-b border-border/50 flex items-center gap-3 hover:bg-secondary/50 cursor-pointer">
               <Settings size={18} className="text-muted-foreground" />
               <span className="text-sm font-medium">Settings</span>
             </div>
             <button 
               onClick={() => logout.mutate()}
               className="w-full p-4 flex items-center gap-3 hover:bg-red-50 cursor-pointer text-red-500 text-left"
             >
               <LogOut size={18} />
               <span className="text-sm font-medium">Logout</span>
             </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
