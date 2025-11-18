import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ProjectCard } from "@/components/projects/project-card";
import { CreateProject } from "@/components/projects/create-project";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useModal } from "@/hooks/use-modal";
import { useToast } from "@/hooks/use-toast";
import { Layers, PlusCircle, Search, Folder, Archive } from "lucide-react";
import { calculateProjectStats } from "@/lib/data-utils";
import { apiGet } from "@/lib/api-config";
import { User, Team, Project, WorkItem } from "@shared/schema";

export default function Projects() {
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "archived">("active");
  const { 
    modalType, 
    isOpen, 
    openModal, 
    closeModal 
  } = useModal();
  
  // Fetch all users
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/users'],
    queryFn: () => apiGet('/users'),
  });
  
  // Fetch authenticated user
  const { data: currentUser } = useQuery<User>({
    queryKey: ['/auth/user'],
    queryFn: () => apiGet('/auth/user'),
  });

  // Debug: Log current user and users
  console.log('Current user:', currentUser);
  console.log('All users:', users);
  
  // Fetch teams
  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['/teams'],
    queryFn: () => apiGet('/teams'),
  });
  
  // Fetch projects
  const { data: projects = [], refetch: refetchProjects } = useQuery<Project[]>({
    queryKey: ['/projects'],
    queryFn: () => apiGet('/projects'),
  });

  // Debug: Log projects to see what we're getting
  console.log('Projects fetched:', projects);
  
  // Fetch work items for all projects
  const { data: allWorkItems = [] } = useQuery<WorkItem[]>({
    queryKey: ['/work-items/all'],
    queryFn: async () => {
      if (!projects.length) return [];
      
      const workItemPromises = projects.map(async (project: Project) => {
        try {
          const items = await apiGet(`/projects/${project.id}/work-items`);
          return items.map((item: WorkItem) => ({
            ...item,
            projectKey: project.key,
            projectName: project.name
          }));
        } catch {
          return [];
        }
      });
      
      const results = await Promise.all(workItemPromises);
      return results.flat();
    },
    enabled: projects.length > 0,
  });
  
  const handleProjectSuccess = () => {
    refetchProjects();
    toast({
      title: "Success",
      description: "Project created successfully",
    });
  };
  
  // Build a map of teamId -> member user IDs by fetching from API
  const [teamMembersByTeamId, setTeamMembersByTeamId] = useState<Record<number, number[]>>({});
  React.useEffect(() => {
    if (!teams.length) return;
    const fetchAllTeamMembers = async () => {
      const map: Record<number, number[]> = {};
      await Promise.all(teams.map(async (team) => {
        try {
          const members = await apiGet(`/teams/${team.id}/members`);
          map[team.id] = members.map((m: any) => m.user?.id || m.id);
        } catch {
          map[team.id] = [];
        }
      }));
      setTeamMembersByTeamId(map);
    };
    fetchAllTeamMembers();
  }, [teams]);
  function teamMembersOf(teamId: number): number[] {
    return teamMembersByTeamId[teamId] || [];
  }

  // TEMPORARY FIX: Allow all authenticated users access for testing
  // Proper role-based access control
  const isAdminOrScrum = currentUser?.role === 'ADMIN' || currentUser?.role === 'SCRUM_MASTER';
  const canCreateProject = currentUser?.role === 'ADMIN' || currentUser?.role === 'SCRUM_MASTER';
  
  const filteredProjects = projects.filter((project: Project) => {
    // Apply status filter
    const matchesStatusFilter = statusFilter === "active" 
      ? project.status !== 'ARCHIVED' 
      : project.status === 'ARCHIVED';
    // Apply search filter
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase());
    // TEMPORARY: Show all projects to all authenticated users
    return matchesStatusFilter && matchesSearch;
    
    // TODO: Restore proper filtering after role setup:
    // if (isAdminOrScrum) {
    //   return matchesStatusFilter && matchesSearch;
    // }
    // // Only show if user is assigned as a member of the project's team
    // const isTeamMember = currentUser && project.teamId && teamMembersOf(project.teamId).includes(currentUser.id);
    // return isTeamMember && matchesStatusFilter && matchesSearch;
  });
  
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        user={currentUser}
        teams={teams}
        projects={projects}
        onCreateTeam={isAdminOrScrum ? () => openModal("createTeam") : undefined}
        onCreateProject={canCreateProject ? () => openModal("createProject") : undefined}
      />
      
      {/* Mobile menu toggle */}
      <div className="md:hidden fixed bottom-4 right-4 z-10">
        <Button
          className="rounded-full shadow-lg p-3 h-12 w-12"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Layers className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          user={currentUser} 
          onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} 
        />
        
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-semibold mb-1">Projects</h1>
                <p className="text-neutral-600">Manage and monitor all your projects</p>
              </div>
              <div className="flex space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    className="pl-9 w-[240px]"
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {canCreateProject && (
                  <Button onClick={() => openModal("createProject")}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    New Project
                  </Button>
                )}
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStatusFilter("active")}
                className={`px-4 py-2 rounded-md transition-all duration-200 ${
                  statusFilter === "active" 
                    ? "bg-white shadow-sm text-gray-900 font-medium" 
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                }`}
              >
                <Folder className="h-4 w-4 mr-2" />
                Active Projects
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStatusFilter("archived")}
                className={`px-4 py-2 rounded-md transition-all duration-200 ${
                  statusFilter === "archived" 
                    ? "bg-white shadow-sm text-gray-900 font-medium" 
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                }`}
              >
                <Archive className="h-4 w-4 mr-2" />
                Archived Projects
              </Button>
            </div>
            
            {/* Projects grid */}
            {filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <Layers className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No projects found</h3>
                <p className="text-neutral-500 mb-4">
                  {searchQuery
                    ? "Try adjusting your search query"
                    : canCreateProject 
                      ? "Create your first project to get started"
                      : "No projects available. Contact an admin or scrum master to create projects."}
                </p>
                {!searchQuery && canCreateProject && (
                  <Button onClick={() => openModal("createProject")}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create Project
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project: Project) => {
                  const creator = users.find((user: User) => user.id === project.createdBy);
                  const team = teams.find((team: Team) => team.id === project.teamId);
                  const memberCount = project.teamId ? teamMembersOf(project.teamId).length : 0;
                  // Calculate stats for this specific project
                  const projectItems = allWorkItems.filter(item => item.projectId === project.id);
                  const stats = calculateProjectStats(projectItems);
                  return (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      creator={creator}
                      team={team}
                      stats={stats}
                      memberCount={memberCount}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
      
      {/* Modals */}
      <CreateProject
        isOpen={isOpen && modalType === "createProject"}
        onClose={closeModal}
        onSuccess={handleProjectSuccess}
        teams={teams}
        userId={currentUser?.id || 22} // Default to admin user
      />
    </div>
  );
}
