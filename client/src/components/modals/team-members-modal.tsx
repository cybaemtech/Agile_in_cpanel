import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest, apiGet, API_BASE_URL } from "@/lib/api-config";
import { Team } from "@shared/schema";

// User interface with camelCase field names as returned from API
interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  isActive: boolean;
  role: string;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}
import { UserPlus, UserMinus, Users, Trash2 } from "lucide-react";

interface TeamMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team;
  onMembersChange?: () => void;
  onTeamDeleted?: () => void;
}

interface TeamMember {
  id: number;
  teamId: number;
  userId: number;
  role: string;
  joinedAt: string;
  user: User;
}

export function TeamMembersModal({ isOpen, onClose, team, onMembersChange, onTeamDeleted }: TeamMembersModalProps) {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("MEMBER");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [editingRole, setEditingRole] = useState<string>("");

  // Fetch current user to check permissions
  const { data: currentUser } = useQuery<User>({
    queryKey: ['/auth/user'],
    queryFn: () => apiGet('/auth/user'),
    retry: false,
  });

  // Check if current user is Admin or Scrum Master
  const isAdmin = currentUser?.role === 'ADMIN';
  const isScrumMasterOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SCRUM' || currentUser?.role === 'SCRUM_MASTER';

  // Debug logging for permissions
  console.log('🔐 Team Management Permissions:', {
    currentUser: currentUser,
    userRole: currentUser?.role,
    isAdmin: isAdmin,
    isScrumMasterOrAdmin: isScrumMasterOrAdmin
  });

  // Fetch team members
  const { data: teamMembers = [], refetch: refetchMembers } = useQuery<TeamMember[]>({
    queryKey: [`/teams/${team.id}/members`],
    enabled: isOpen && !!team.id,
    queryFn: async () => {
      const res = await apiRequest('GET', `/teams/${team.id}/members`);
      const apiMembers = await res.json();
      
      console.log('✅ Fetched team members:', apiMembers.length, 'members');
      return apiMembers;
    }
  });

  // Fetch all users to show available users to add - FIXED ERROR HANDLING
  const { data: allUsers = [], error: usersError, isLoading: usersLoading, refetch: refetchUsers } = useQuery<User[]>({
    queryKey: ['/users'],
    enabled: isOpen,
    queryFn: async () => {
      console.log('🔍 Fetching users from API...');
      try {
        // Use apiGet which is simpler and doesn't require manual JSON parsing
        const apiUsers = await apiGet('/users');
        console.log('✅ Fetched users successfully:', apiUsers.length, 'users');
        return apiUsers;
      } catch (error) {
        console.error('❌ Error fetching users:', error);
        // Let React Query handle retries automatically
        throw new Error('Failed to load users - please ensure you are logged in');
      }
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 30000, // Cache for 30 seconds
  });

  // Get users who are not already team members
  const memberUserIds = new Set(teamMembers.map(member => member.userId));
  const availableUsers = allUsers.filter(user => !memberUserIds.has(user.id));

  // Debug logging
  console.log('👥 Debug team members:', {
    allUsersCount: allUsers.length,
    teamMembersCount: teamMembers.length,
    availableUsersCount: availableUsers.length,
    memberUserIds: Array.from(memberUserIds),
    usersError,
    usersLoading
  });

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (data: { userId: number; role: string }) => {
      // Map frontend roles to valid database enum values (database supports SCRUM_MASTER directly)
      const roleMapping: { [key: string]: string } = {
        'ADMIN': 'ADMIN',
        'ADMINISTRATOR': 'ADMIN',
        'MANAGER': 'MANAGER',
        'PROJECT_MANAGER': 'MANAGER',
        'SCRUM_MASTER': 'SCRUM_MASTER', // Database supports this directly
        'SCRUM': 'SCRUM_MASTER',
        'LEAD': 'LEAD',
        'TEAM_LEAD': 'LEAD',
        'MEMBER': 'MEMBER',
        'USER': 'MEMBER',
        'VIEWER': 'VIEWER'
      };
      
      // Ensure we always send a valid role, defaulting to MEMBER
      const normalizedRole = data.role.toUpperCase().trim();
      const apiRole = roleMapping[normalizedRole] || 'MEMBER';
      
      console.log('🔄 Adding member with role:', { 
        originalRole: data.role,
        normalizedRole,
        apiRole,
        userId: data.userId,
        teamId: team.id
      });
      
      return apiRequest('POST', `/teams/${team.id}/members`, { userId: data.userId, role: apiRole });
    },
    onSuccess: () => {
      refetchMembers();
      queryClient.invalidateQueries({ queryKey: ['/teams'] });
      queryClient.invalidateQueries({ queryKey: [`/teams/${team.id}/members`] });
      onMembersChange?.();
      setSelectedUserId("");
      setSelectedRole("MEMBER");
      toast({
        title: "Member added",
        description: "Team member has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add team member.",
        variant: "destructive",
      });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest('DELETE', `/teams/${team.id}/members/${userId}`);
    },
    onSuccess: () => {
      refetchMembers();
      queryClient.invalidateQueries({ queryKey: ['/teams'] });
      queryClient.invalidateQueries({ queryKey: [`/teams/${team.id}/members`] });
      onMembersChange?.();
      toast({
        title: "Member removed",
        description: "Team member has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove team member.",
        variant: "destructive",
      });
    },
  });

  // Update member role mutation
  const updateMemberRoleMutation = useMutation({
    mutationFn: async (data: { userId: number; role: string }) => {
      // Map frontend roles to valid database enum values (database supports SCRUM_MASTER directly)
      const roleMapping: { [key: string]: string } = {
        'ADMIN': 'ADMIN',
        'ADMINISTRATOR': 'ADMIN',
        'MANAGER': 'MANAGER', 
        'PROJECT_MANAGER': 'MANAGER',
        'SCRUM_MASTER': 'SCRUM_MASTER', // Database supports this directly
        'SCRUM': 'SCRUM_MASTER',
        'LEAD': 'LEAD',
        'TEAM_LEAD': 'LEAD',
        'MEMBER': 'MEMBER',
        'USER': 'MEMBER',
        'VIEWER': 'VIEWER'
      };
      
      // Ensure we always send a valid role, defaulting to MEMBER
      const normalizedRole = data.role.toUpperCase().trim();
      const apiRole = roleMapping[normalizedRole] || 'MEMBER';
      
      console.log('🔄 Updating role:', { 
        originalRole: data.role,
        normalizedRole,
        apiRole,
        userId: data.userId,
        teamId: team.id
      });
      
      return apiRequest('PATCH', `/teams/${team.id}/members/${data.userId}`, { role: apiRole });
    },
    onSuccess: () => {
      refetchMembers();
      queryClient.invalidateQueries({ queryKey: ['/teams'] });
      queryClient.invalidateQueries({ queryKey: [`/teams/${team.id}/members`] });
      onMembersChange?.();
      setEditingMemberId(null);
      setEditingRole("");
      toast({
        title: "Role updated",
        description: "Team member role has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update member role.",
        variant: "destructive",
      });
    },
  });

  const handleAddMember = () => {
    if (!selectedUserId) {
      toast({
        title: "Error",
        description: "Please select a user to add.",
        variant: "destructive",
      });
      return;
    }

    addMemberMutation.mutate({
      userId: parseInt(selectedUserId),
      role: selectedRole,
    });
  };

  const handleRemoveMember = (userId: number) => {
    removeMemberMutation.mutate(userId);
  };

  const handleEditRole = (memberId: number, currentRole: string) => {
    setEditingMemberId(memberId);
    setEditingRole(currentRole);
  };

  const handleSaveRole = (userId: number) => {
    if (!editingRole) return;
    updateMemberRoleMutation.mutate({
      userId,
      role: editingRole,
    });
  };

  const handleCancelEdit = () => {
    setEditingMemberId(null);
    setEditingRole("");
  };

  // Delete team mutation
  const deleteTeamMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/teams/${team.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/teams'] });
      onTeamDeleted?.();
      onClose();
      toast({
        title: "Team deleted",
        description: `Team "${team.name}" has been deleted successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete team.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteTeam = () => {
    deleteTeamMutation.mutate();
    setShowDeleteDialog(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Manage Team Members - {team.name}
          </DialogTitle>
          {(isAdmin || currentUser?.role === 'SCRUM' || currentUser?.role === 'SCRUM_MASTER') && (
            <div className="flex justify-end pt-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                disabled={deleteTeamMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Team
              </Button>
            </div>
          )}
        </DialogHeader>

  <div className="space-y-8">
          {/* Add new member section - Only for Scrum Masters and Admins */}
          {isScrumMasterOrAdmin && (
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-medium">Add New Member</h3>
              <div className="flex gap-2">
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={
                      usersLoading ? "Loading users..." : 
                      usersError ? "Error loading users" :
                      availableUsers.length === 0 ? "No available users" : 
                      "Select user"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {usersLoading ? (
                      <SelectItem value="loading" disabled>Loading users...</SelectItem>
                    ) : usersError ? (
                      <SelectItem value="error" disabled>Error: {usersError.message}</SelectItem>
                    ) : availableUsers.length === 0 ? (
                      <SelectItem value="empty" disabled>No users available (all users are already team members)</SelectItem>
                    ) : (
                      availableUsers.map(user => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.fullName || user.username} ({user.email})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">Member</SelectItem>
                    <SelectItem value="LEAD">Team Lead</SelectItem>
                    <SelectItem value="SCRUM_MASTER">Scrum Master</SelectItem>
                    <SelectItem value="MANAGER">PRJ/PRD Manager</SelectItem>
                    <SelectItem value="ADMIN">Administrator</SelectItem>
                  </SelectContent>
                </Select>
                
                {usersError ? (
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => refetchUsers()}
                    disabled={usersLoading}
                  >
                    🔄 Retry
                  </Button>
                ) : (
                  <Button 
                    onClick={handleAddMember}
                    disabled={!selectedUserId || !Number.isFinite(parseInt(selectedUserId)) || addMemberMutation.isPending}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Access Level Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-800 mb-2">Access Levels</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>Administrator:</strong> Full access - Can manage teams, create all work items, delete teams</p>
              <p><strong>PRJ/PRD Manager:</strong> Can add team members, create EPIC and FEATURE work items</p>
              <p><strong>Scrum Master:</strong> Can manage team activities, facilitate sprints, create EPIC and FEATURE work items</p>
              <p><strong>Team Lead:</strong> Can create EPIC and FEATURE work items, lead team activities</p>
              <p><strong>Member:</strong> Can create STORY, TASK, and BUG work items</p>
            </div>
          </div>

          {/* Current members section */}
          <div className="space-y-6">
            <h3 className="font-medium">Current Members ({teamMembers.length})</h3>
            
            {teamMembers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No team members yet</p>
                <p className="text-sm">Add members to start collaborating</p>
              </div>
            ) : (
              <div className="space-y-2">
                {teamMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.user?.avatarUrl || undefined} />
                        <AvatarFallback>
                          {member.user?.fullName?.split(' ').map(n => n[0]).join('') || 
                           member.user?.username?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.user?.fullName || member.user?.username}</p>
                        <p className="text-sm text-gray-500">{member.user?.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {editingMemberId === member.id ? (
                        // Edit mode - show role dropdown and save/cancel buttons
                        <>
                          <Select value={editingRole} onValueChange={setEditingRole}>
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MEMBER">Member</SelectItem>
                              <SelectItem value="LEAD">Team Lead</SelectItem>
                              <SelectItem value="SCRUM_MASTER">Scrum Master</SelectItem>
                              <SelectItem value="MANAGER">PRJ/PRD Manager</SelectItem>
                              <SelectItem value="ADMIN">Administrator</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSaveRole(member.userId)}
                            disabled={updateMemberRoleMutation.isPending || !editingRole}
                            className="text-green-600 hover:text-green-700 border-green-300 hover:border-green-400"
                          >
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEdit}
                            disabled={updateMemberRoleMutation.isPending}
                            className="text-gray-600 hover:text-gray-700"
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        // View mode - show role badge and action buttons
                        <>
                          <Badge variant="outline" className="min-w-[100px] justify-center">
                            {member.role}
                          </Badge>
                          {isScrumMasterOrAdmin && (
                            <div className="flex space-x-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditRole(member.id, member.role)}
                                disabled={updateMemberRoleMutation.isPending}
                                className="text-blue-600 hover:text-blue-700 border-blue-300 hover:border-blue-400"
                              >
                                Change Access
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveMember(member.userId)}
                                disabled={removeMemberMutation.isPending}
                                className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                              >
                                <UserMinus className="h-4 w-4 mr-1" />
                                Remove
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>

      {/* Delete Team Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the team "{team.name}"? This action cannot be undone.
              All team members will be removed and any projects assigned to this team will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTeam}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}