import React from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthContext, useAuthState } from "@workspace/replit-auth-web";

import Lobby from "@/pages/Lobby";
import LoginPage from "@/pages/LoginPage";
import CompleteProfile from "@/pages/CompleteProfile";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import OfferRide from "@/pages/OfferRide";
import FindRides from "@/pages/FindRides";
import RegisterVehicle from "@/pages/RegisterVehicle";
import VerifyMobile from "@/pages/VerifyMobile";
import Admin from "@/pages/Admin";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route>
        <AppLayout>
          <Switch>
            <Route path="/" component={Lobby} />
            <Route path="/login" component={LoginPage} />
            <Route path="/complete-profile" component={CompleteProfile} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/offer-ride" component={OfferRide} />
            <Route path="/find-rides" component={FindRides} />
            <Route path="/register-vehicle" component={RegisterVehicle} />
            <Route path="/verify-mobile" component={VerifyMobile} />
            <Route path="/home" component={Home} />
            <Route path="/admin" component={Admin} />
            <Route component={NotFound} />
          </Switch>
        </AppLayout>
      </Route>
    </Switch>
  );
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const authState = useAuthState();
  return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <div style={{ overflowX: "hidden" }}>
              <Router />
            </div>
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
