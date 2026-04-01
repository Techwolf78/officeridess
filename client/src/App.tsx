import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth.tsx";
import { Loader2 } from "lucide-react";
import { LoadScript } from "@react-google-maps/api";
import ErrorBoundary from "@/components/ErrorBoundary";
import { BackgroundManager } from "@/components/BackgroundManager";
import { ProtectedRoute, PublicRoute } from "@/components/ProtectedRoute";

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
import TermsOfService from "@/pages/TermsOfService";
import FAQ from "@/pages/FAQ";
import HelpSupport from "@/pages/HelpSupport";
import RideWaiting from "@/pages/RideWaiting";
import RideTracking from "@/pages/RideTracking";
import RideCompletion from "@/pages/RideCompletion";
import RideRating from "@/pages/RideRating";
import VerificationRequired from "@/pages/VerificationRequired";
import NotFound from "@/pages/not-found";
import { ErrorTest } from "@/components/ErrorTest";

// Load Google Maps libraries once for entire app
const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function Router() {
  return (
    <Switch>
      <PublicRoute path="/" component={Welcome} />
      <PublicRoute path="/login" component={Login} />
      <ProtectedRoute path="/register" component={Register} requireCompleteProfile={false} />
      
      <ProtectedRoute path="/home" component={Home} />
      <ProtectedRoute path="/search" component={Search} />
      <ProtectedRoute path="/verification-required" component={VerificationRequired} />
      <ProtectedRoute path="/ride/:id" component={RideDetails} />
      <ProtectedRoute path="/ride/:bookingId/waiting" component={RideWaiting} />
      <ProtectedRoute path="/ride/:bookingId/tracking" component={RideTracking} />
      <ProtectedRoute path="/ride/:bookingId/complete" component={RideCompletion} />
      <ProtectedRoute path="/ride/:bookingId/rating" component={RideRating} />
      <ProtectedRoute path="/create-ride" component={CreateRide} />
      <ProtectedRoute path="/rides" component={MyRides} />
      <ProtectedRoute path="/profile" component={Profile} />
      <ProtectedRoute path="/settings" component={Settings} />
      <PublicRoute path="/privacy" component={PrivacyPolicy} />
      <PublicRoute path="/terms" component={TermsOfService} />
      <ProtectedRoute path="/faq" component={FAQ} />
      <ProtectedRoute path="/help-support" component={HelpSupport} />
      <ProtectedRoute path="/chat" component={Inbox} />
      <ProtectedRoute path="/chat/:chatId" component={Chat} />
      <ProtectedRoute path="/error-test" component={ErrorTest} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BackgroundManager />
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
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
