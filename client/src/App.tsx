import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Welcome from "@/pages/Welcome";
import Home from "@/pages/Home";
import Search from "@/pages/Search";
import RideDetails from "@/pages/RideDetails";
import CreateRide from "@/pages/CreateRide";
import MyRides from "@/pages/MyRides";
import Profile from "@/pages/Profile";
import Chat from "@/pages/Chat";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component, requireCompleteProfile = true, ...rest }: any) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F4]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!user) {
    return <Welcome />;
  }

  // If profile completion is required and user hasn't completed profile
  if (requireCompleteProfile && user && !user.firstName) {
    return <Register />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Welcome} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/home">
        <ProtectedRoute component={Home} />
      </Route>
      <Route path="/search">
        <ProtectedRoute component={Search} />
      </Route>
      <Route path="/ride/:id">
        <ProtectedRoute component={RideDetails} />
      </Route>
      <Route path="/create-ride">
        <ProtectedRoute component={CreateRide} />
      </Route>
      <Route path="/rides">
        <ProtectedRoute component={MyRides} />
      </Route>
      <Route path="/profile">
        <ProtectedRoute component={Profile} />
      </Route>
      <Route path="/chat/:chatId">
        <ProtectedRoute component={Chat} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
