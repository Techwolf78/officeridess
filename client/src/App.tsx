import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { LoadScript } from "@react-google-maps/api";
import ErrorBoundary from "@/components/ErrorBoundary";

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
import Inbox from "@/pages/Inbox";
import Settings from "@/pages/Settings";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import FAQ from "@/pages/FAQ";
import HelpSupport from "@/pages/HelpSupport";
import RideWaiting from "@/pages/RideWaiting";
import RideTracking from "@/pages/RideTracking";
import RideCompletion from "@/pages/RideCompletion";
import RideRating from "@/pages/RideRating";
import NotFound from "@/pages/not-found";
import { ErrorTest } from "@/components/ErrorTest";

// Load Google Maps libraries once for entire app
const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function ProtectedRoute({ component: Component, requireCompleteProfile = true, ...rest }: any) {
  const { user, isLoading, error } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF9F4] gap-4">
        <Loader2 className="animate-spin text-primary" size={32} />
        <p className="text-primary font-medium">Loading please wait</p>
        {error && <p className="text-red-600 text-sm text-center px-4">{error}</p>}
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
      <Route path="/ride/:bookingId/waiting">
        <ProtectedRoute component={RideWaiting} />
      </Route>
      <Route path="/ride/:bookingId/tracking">
        <ProtectedRoute component={RideTracking} />
      </Route>
      <Route path="/ride/:bookingId/complete">
        <ProtectedRoute component={RideCompletion} />
      </Route>
      <Route path="/ride/:bookingId/rating">
        <ProtectedRoute component={RideRating} />
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
      <Route path="/settings">
        <ProtectedRoute component={Settings} />
      </Route>
      <Route path="/privacy">
        <ProtectedRoute component={PrivacyPolicy} />
      </Route>
      <Route path="/faq">
        <ProtectedRoute component={FAQ} />
      </Route>
      <Route path="/help-support">
        <ProtectedRoute component={HelpSupport} />
      </Route>
      <Route path="/chat">
        <ProtectedRoute component={Inbox} />
      </Route>
      <Route path="/chat/:chatId">
        <ProtectedRoute component={Chat} />
      </Route>
      <Route path="/error-test">
        <ProtectedRoute component={ErrorTest} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LoadScript 
          googleMapsApiKey={GOOGLE_MAPS_API_KEY} 
          libraries={GOOGLE_MAPS_LIBRARIES}
          loadingElement={
            <div className="min-h-screen flex items-center justify-center bg-[#FAF9F4]">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          }
        >
          <Toaster />
          <ErrorBoundary>
            <Router />
          </ErrorBoundary>
        </LoadScript>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
