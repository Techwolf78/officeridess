import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Route, Redirect } from "wouter";
import Welcome from "@/pages/Welcome";
import Register from "@/pages/Register";

type ProtectedRouteProps = {
  path: string;
  component: React.ComponentType<any>;
  requireCompleteProfile?: boolean;
};

export function ProtectedRoute({ path, component: Component, requireCompleteProfile = true }: ProtectedRouteProps) {
  const { user, isLoading, error } = useAuth();

  return (
    <Route path={path}>
      {(params) => {
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
          return <Redirect to="/" />;
        }

        // Check for completed profile (firstName and phoneNumber are required)
        if (requireCompleteProfile && user && (!user.firstName || !user.phoneNumber)) {
          return <Redirect to="/register" />;
        }

        return <Component params={params} />;
      }}
    </Route>
  );
}

export function PublicRoute({ path, component: Component }: { path: string, component: React.ComponentType<any> }) {
  const { user, isLoading } = useAuth();

  return (
    <Route path={path}>
      {(params) => {
        if (isLoading) {
          return (
            <div className="min-h-screen flex items-center justify-center bg-[#FAF9F4]">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          );
        }

        if (user) {
          // If already logged in, redirect away from public pages
          if (!user.firstName || !user.phoneNumber) {
            // Only redirect to register if we aren't already there (though register is now a ProtectedRoute)
            return <Redirect to="/register" />;
          }
          return <Redirect to="/home" />;
        }

        return <Component params={params} />;
      }}
    </Route>
  );
}
