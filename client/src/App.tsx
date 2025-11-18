import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import ProjectDetails from "@/pages/project-details";
import Teams from "@/pages/teams";
import TeamDetails from "@/pages/team-details";
import Calendar from "@/pages/calendar";
import Reports from "@/pages/reports";
import ReportBug from "@/pages/report-bug";
import ProjectBugReports from "@/pages/project-bug-reports";
import LoginPage from "@/pages/login";
import Register from "@/pages/register";
import { useAuth } from "./hooks/useAuth";
import { useEffect } from "react";


function Routes() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect "/" → "/dashboard" or "/login"
  useEffect(() => {
    if (!isLoading && location === "/") {
      setLocation(isAuthenticated ? "/dashboard" : "/login");
    }
  }, [location, setLocation, isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public */}
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={Register} />

      {/* Protected */}
      <Route path="/dashboard">
        {isAuthenticated ? <Dashboard /> : <LoginPage />}
      </Route>
      <Route path="/projects">
        {isAuthenticated ? <Projects /> : <LoginPage />}
      </Route>
      <Route path="/projects/:id">
        {isAuthenticated ? <ProjectDetails /> : <LoginPage />}
      </Route>
      <Route path="/teams">
        {isAuthenticated ? <Teams /> : <LoginPage />}
      </Route>
      <Route path="/teams/:id">
        {isAuthenticated ? <TeamDetails /> : <LoginPage />}
      </Route>
      <Route path="/calendar">
        {isAuthenticated ? <Calendar /> : <LoginPage />}
      </Route>
      <Route path="/reports">
        {isAuthenticated ? <Reports /> : <LoginPage />}
      </Route>
      <Route path="/report-bug">
        {isAuthenticated ? <ReportBug /> : <LoginPage />}
      </Route>
      <Route path="/project-bug-reports">
        {isAuthenticated ? <ProjectBugReports /> : <LoginPage />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen">
          <Toaster />
          <WouterRouter base="/Agile">
            <Routes />
          </WouterRouter>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
