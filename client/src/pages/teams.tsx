import { useState } from "react";
import { useEffect } from "react";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { TeamCard } from "@/components/teams/team-card";
import { CreateTeam } from "@/components/teams/create-team";
import { InviteModal } from "@/components/modals/invite-modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useModal } from "@/hooks/use-modal";
import { useToast } from "@/hooks/use-toast";
import { Users, PlusCircle, Search, UserPlus } from "lucide-react";
import { apiGet } from "@/lib/api-config";
import { Team, User, Project } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

// Simplified TeamCard component with proper member fetching
function SimpleTeamCard({ 
  team, 
  creator, 
  projectCount,
  currentUser 
}: { 
  team: Team; 
  creator?: User; 
  projectCount: number; 
  currentUser?: User;
}) {
  const { toast } = useToast();
  
  // Fetch team members for this specific team
  const { data: teamMembers = [] } = useQuery<any[]>({
    queryKey: [`/teams/${team.id}/members`],
    queryFn: () => apiGet(`/teams/${team.id}/members`),
    staleTime: 30000, // Cache for 30 seconds
  });

  const { refetch: refetchTeams } = useQuery<Team[]>({
    queryKey: ['/teams'],
    queryFn: () => apiGet('/teams'),
  });

  const handleTeamDeleted = () => {
    refetchTeams();
    toast({
      title: "Success",
      description: "Team deleted successfully",
    });
  };

  const handleMembersChange = () => {
    // This will trigger a refetch of team members
    queryClient.invalidateQueries({ queryKey: [`/teams/${team.id}/members`] });
  };

  // Extract user data from team members robustly
  let memberUsers: User[] = [];
  if (Array.isArray(teamMembers) && teamMembers.length > 0) {
    memberUsers = teamMembers.map(member => member.user ? member.user : member).filter(Boolean);
  }
  // Debug logging for member count issue
  console.log(`TeamCard: team=${team.name} id=${team.id} teamMembers=`, teamMembers, 'memberUsers=', memberUsers, 'count=', memberUsers.length);

  return (
    <TeamCard
      team={team}
      creator={creator}
      members={memberUsers}
      projectCount={projectCount}
      onMembersChange={handleMembersChange}
      onTeamDeleted={handleTeamDeleted}
      currentUser={currentUser}
    />
  );
}

export default function Teams() {
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { modalType, modalProps, openModal, closeModal, isOpen } = useModal();
  
  // Add debug logging
  console.log('Teams component mounting...');
  
  // Fetch current user - with error handling
  const { data: currentUser, error: userError } = useQuery<User>({
    queryKey: ['/auth/user'],
    queryFn: () => apiGet('/auth/user'),
    retry: false, // Don't retry on auth failures
    refetchOnWindowFocus: false,
  });
  
  // Fetch teams
  const { data: teams = [], refetch: refetchTeams, isLoading: teamsLoading, error: teamsError } = useQuery<Team[]>({
    queryKey: ['/teams'],
    queryFn: () => apiGet('/teams'),
  });
  // Fetch projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['/projects'],
    queryFn: () => apiGet('/projects'),
  });
  
  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/users'],
    queryFn: () => apiGet('/users'),
  });

  // Debug logging
  console.log('Teams data:', { teams, teamsLoading, teamsError, currentUser, userError });

  // Create a helper function to get team member count
  const getTeamMemberCount = (teamId: number) => {
    // This will be replaced with actual API calls, but for now return a consistent count
    return 0;
  };
  
  const handleTeamCreated = async (team: Team) => {
    refetchTeams();
    toast({
      title: "Success",
      description: "Team created successfully",
    });
    return team;
  };
  
  // Filter teams: show teams where current user is a member (using /teams/{id}/members API)
  const [teamMemberships, setTeamMemberships] = useState<{[teamId: number]: boolean}>({});
  React.useEffect(() => {
    if (!currentUser || teams.length === 0) return;
    const fetchMemberships = async () => {
      const memberships: {[teamId: number]: boolean} = {};
      await Promise.all(teams.map(async (team) => {
        try {
          const members = await apiGet(`/teams/${team.id}/members`);
          memberships[team.id] = members.some((m: any) => m.user?.id === currentUser.id || m.id === currentUser.id);
        } catch {
          memberships[team.id] = false;
        }
      }));
      setTeamMemberships(memberships);
    };
    fetchMemberships();
  }, [teams, currentUser]);

  // Proper role-based access control
  const isAdminOrScrum = currentUser?.role === 'ADMIN' || currentUser?.role === 'SCRUM_MASTER';
  const canCreateProject = currentUser?.role === 'ADMIN' || currentUser?.role === 'SCRUM_MASTER';
  
  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.description?.toLowerCase().includes(searchQuery.toLowerCase());
    // TEMPORARY: Show all teams to all authenticated users
    return matchesSearch;
    
    // TODO: Restore proper filtering after role setup:
    // if (isAdminOrScrum) {
    //   return matchesSearch;
    // }
    // const isMember = teamMemberships[team.id];
    // return isMember && matchesSearch;
  });
  
  // Show loading state
  if (teamsLoading || projectsLoading || usersLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar 
          user={currentUser}
          teams={teams}
          projects={projects}
          onCreateTeam={isAdminOrScrum ? () => openModal("createTeam") : undefined}
          onCreateProject={canCreateProject ? () => openModal("createProject") : undefined}
        />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header 
            user={currentUser} 
            onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} 
          />
          
          <main className="flex-1 overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-center min-h-96">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading teams...</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }
  
  // Show error state
  if (teamsError) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar 
          user={currentUser}
          teams={teams}
          projects={projects}
          onCreateTeam={isAdminOrScrum ? () => openModal("createTeam") : undefined}
          onCreateProject={canCreateProject ? () => openModal("createProject") : undefined}
        />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header 
            user={currentUser} 
            onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} 
          />
          
          <main className="flex-1 overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-center min-h-96">
                <div className="text-center">
                  <div className="text-red-500 text-xl mb-4">⚠️</div>
                  <h3 className="text-lg font-medium text-red-600 mb-2">Failed to load teams</h3>
                  <p className="text-gray-600 mb-4">There was an error loading the teams data.</p>
                  <Button onClick={() => refetchTeams()}>Try Again</Button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }
  
  // Main render - add console log to verify we're reaching this point
  console.log('Rendering Teams main content, filteredTeams length:', filteredTeams.length);

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
          <Users className="h-5 w-5" />
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
                <h1 className="text-2xl font-semibold mb-1">Teams</h1>
                <p className="text-neutral-600">Manage your teams and team members</p>
              </div>
              <div className="flex space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    className="pl-9 w-[240px]"
                    placeholder="Search teams..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {isAdminOrScrum && (
                  <Button variant="outline" onClick={() => openModal("inviteMembers")}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite
                  </Button>
                )}
                {isAdminOrScrum && (
                  <Button onClick={() => openModal("createTeam")}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    New Team
                  </Button>
                )}
              </div>
            </div>
            
            {/* Teams grid */}
            {filteredTeams.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No teams found</h3>
                <p className="text-neutral-500 mb-4">
                  {searchQuery
                    ? "Try adjusting your search query"
                    : isAdminOrScrum
                      ? "Create your first team to start collaborating"
                      : "Contact an admin or scrum master to create teams"}
                </p>
                {!searchQuery && isAdminOrScrum && (
                  <Button onClick={() => openModal("createTeam")}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create Team
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTeams.map(team => {
                  const creator = users.find(user => user.id === team.createdBy);
                  const teamProjects = projects.filter(project => project.teamId === team.id);
                  
                  return (
                    <SimpleTeamCard
                      key={team.id}
                      team={team}
                      creator={creator}
                      projectCount={teamProjects.length}
                      currentUser={currentUser}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
      
      {/* Modals */}
      <CreateTeam
        isOpen={isOpen && modalType === "createTeam"}
        onClose={closeModal}
        onSuccess={handleTeamCreated}
        userId={currentUser?.id || 1}
      />
      
      <InviteModal
        isOpen={isOpen && modalType === "inviteMembers"}
        onClose={closeModal}
        teams={teams}
        onCreateTeam={(name: string) => {
          // Create a simple team object from name for the invite modal
          const newTeam = { name, description: null } as any;
          return handleTeamCreated(newTeam);
        }}
      />
    </div>
  );
}
