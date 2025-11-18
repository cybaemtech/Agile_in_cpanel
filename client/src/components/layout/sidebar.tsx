import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { buttonVariants } from "@/components/ui/button";
import {
  LayoutDashboard,
  Layers,
  Users,
  Calendar,
  BarChart,
  Bug,
} from "lucide-react";
import { Team, Project, User } from "@shared/schema";
import CybaemLogo from "@/assets/cybaem-logo.png";

interface SidebarProps {
  user?: User;
  teams?: Team[];
  projects?: Project[];
  onCreateTeam?: () => void;
  onCreateProject?: () => void;
}

export function Sidebar({
  user,
  teams = [],
  projects = [],
  onCreateTeam,
  onCreateProject,
}: SidebarProps) {
  const [location, setLocation] = useLocation();

  return (
    <aside className="bg-white w-64 border-r border-neutral-200 flex-shrink-0 hidden md:flex flex-col h-full shadow-sm">
      <div className="p-4 border-b border-neutral-200 flex flex-col items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-50">
        {/* Show ProjectHub name before logo */}
        <span className="font-bold text-xl text-blue-700 mb-2 tracking-wide">ProjectHub</span>
        <img src={CybaemLogo} alt="Cybaem Tech Logo" className="h-10 opacity-90" />
        <p className="text-xs text-gray-500 mt-1 text-center">Agile Project Management</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          <div className="mb-3">
            <h2 className="text-xs uppercase font-semibold text-neutral-500 tracking-wider mb-2">
              Workspace
            </h2>
            <div className="h-px bg-gradient-to-r from-neutral-200 to-transparent"></div>
          </div>
          <ul className="space-y-1">
            <li>
              <Link href="/dashboard">
                <div
                  className={cn(
                    "flex items-center p-3 rounded-lg hover:bg-neutral-100 transition-colors duration-200 group",
                    location === "/dashboard"
                      ? "text-primary bg-primary/10 border-l-4 border-primary"
                      : "text-neutral-700 hover:text-primary"
                  )}
                >
                  <LayoutDashboard className="h-4 w-4 mr-3 group-hover:scale-110 transition-transform duration-200" />
                  <span className="font-medium">Dashboard</span>
                </div>
              </Link>
            </li>
            <li>
              <Link href="/teams">
                <div
                  className={cn(
                    "flex items-center p-3 rounded-lg hover:bg-neutral-100 transition-colors duration-200 group",
                    location === "/teams" || location.startsWith("/teams/")
                      ? "text-primary bg-primary/10 border-l-4 border-primary"
                      : "text-neutral-700 hover:text-primary"
                  )}
                >
                  <Users className="h-4 w-4 mr-3 group-hover:scale-110 transition-transform duration-200" />
                  <span className="font-medium">Team Management</span>
                </div>
              </Link>
            </li>
            <li>
              <Link href="/projects">
                <div
                  className={cn(
                    "flex items-center p-3 rounded-lg hover:bg-neutral-100 transition-colors duration-200 group",
                    location === "/" ||
                      location === "/projects" ||
                      location.startsWith("/projects/")
                      ? "text-primary bg-primary/10 border-l-4 border-primary"
                      : "text-neutral-700 hover:text-primary"
                  )}
                >
                  <Layers className="h-4 w-4 mr-3 group-hover:scale-110 transition-transform duration-200" />
                  <span className="font-medium">Project Management</span>
                </div>
              </Link>
            </li>
            <li>
              <Link href="/calendar">
                <div
                  className={cn(
                    "flex items-center p-3 rounded-lg hover:bg-neutral-100 transition-colors duration-200 group",
                    location === "/calendar"
                      ? "text-primary bg-primary/10 border-l-4 border-primary"
                      : "text-neutral-700 hover:text-primary"
                  )}
                >
                  <Calendar className="h-4 w-4 mr-3 group-hover:scale-110 transition-transform duration-200" />
                  <span className="font-medium">Calendar</span>
                </div>
              </Link>
            </li>
            <li>
              <Link href="/reports">
                <div
                  className={cn(
                    "flex items-center p-3 rounded-lg hover:bg-neutral-100 transition-colors duration-200 group",
                    location === "/reports"
                      ? "text-primary bg-primary/10 border-l-4 border-primary"
                      : "text-neutral-700 hover:text-primary"
                  )}
                >
                  <BarChart className="h-4 w-4 mr-3 group-hover:scale-110 transition-transform duration-200" />
                  <span className="font-medium">Reports</span>
                </div>
              </Link>
            </li>
            <li>
              <Link href="/project-bug-reports">
                <div
                  className={cn(
                    "flex items-center p-3 rounded-lg hover:bg-neutral-100 transition-colors duration-200 group",
                    location === "/project-bug-reports"
                      ? "text-primary bg-primary/10 border-l-4 border-primary"
                      : "text-neutral-700 hover:text-primary"
                  )}
                >
                  <Bug className="h-4 w-4 mr-3 group-hover:scale-110 transition-transform duration-200" />
                  <span className="font-medium">Project Bug Reviews</span>
                </div>
              </Link>
            </li>
           
          </ul>
        </div>
      </ScrollArea>

      {/* Footer - Clean and minimal */}
      <div className="p-4 border-t border-neutral-200">
        <div className="text-center">
          <p className="text-xs text-gray-500">
            User menu available in header
          </p>
        </div>
      </div>
    </aside>
  );
}
