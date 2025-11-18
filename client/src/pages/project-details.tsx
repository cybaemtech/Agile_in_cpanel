import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Project, User, Team, WorkItem } from "@shared/schema";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { CreateItemModal } from "@/components/modals/create-item-modal";
import { EditItemModal } from "@/components/modals/edit-item-modal";
import { DeleteItemModal } from "@/components/modals/delete-item-modal";
import { KanbanBoard } from "@/components/ui/kanban-board";
import { TimelineView } from "@/components/ui/timeline-view";
import { DeadlinesView } from "@/components/ui/deadlines-view";
import { ProjectCalendar } from "@/components/ui/project-calendar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, apiGet } from "@/lib/api-config";
import { useModal } from "@/hooks/use-modal";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Filter, 
  Plus, 
  Layers, 
  ListFilter,
  ArrowDownUp,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Users,
  X,
  UserPlus,
  UserMinus
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient } from "@/lib/queryClient";

// Helper function to check if a user can edit a work item - only assignees can edit
function canUserEditWorkItem(
  item: any, 
  currentUser: any, 
  allWorkItems: any[]
): boolean {
  // Admin and Scrum Master can always edit
  if (currentUser?.role === 'ADMIN' || currentUser?.role === 'SCRUM_MASTER') {
    return true;
  }
  
  // Only the assigned user can edit the work item
  return (item.assigneeId === currentUser?.id);
}

export default function ProjectDetails() {
  const [_, params] = useRoute('/projects/:id');
  const [_path, navigate] = useLocation();
  const projectId = params?.id ? parseInt(params.id) : 0;
  
  // Debug logging for production
  console.log('[ProjectDetails] Component loaded, projectId:', projectId);
  console.log('[ProjectDetails] URL params:', params);
  console.log('[ProjectDetails] Current location:', window?.location?.href);
  


  // New project view tab state
  const [projectView, setProjectView] = useState<'overview' | 'board' | 'list' | 'calendar' | 'settings'>('overview');
  
  // Timeline view settings
  const [timeUnit, setTimeUnit] = useState<'Quarter' | 'Month' | 'Week'>('Quarter');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterPriority, setFilterPriority] = useState<string[]>([]);
  const [filterAssignee, setFilterAssignee] = useState<number[]>([]);
  const [filterFeature, setFilterFeature] = useState<number | undefined>(undefined);
  
  // State for expanded items in the hierarchical view
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  
  // State for project settings form
  const [editedProject, setEditedProject] = useState<{
    name: string;
    description: string;
  }>({ name: '', description: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);
  const [showKeyResetDialog, setShowKeyResetDialog] = useState(false);
  const [newProjectKey, setNewProjectKey] = useState("");
  const [isResettingKey, setIsResettingKey] = useState(false);
  const [assignTeamId, setAssignTeamId] = useState<string>("");
  const [isAssigningTeam, setIsAssigningTeam] = useState(false);
  const [showAssignTeamDialog, setShowAssignTeamDialog] = useState(false);
  
  const { 
    modalType, 
    isOpen, 
    openModal, 
    closeModal,
    modalProps 
  } = useModal();
  
  const { toast } = useToast();
  
  // Fetch current user
  const { data: currentUser } = useQuery<User>({
    queryKey: ['/auth/user'],
    queryFn: () => apiGet('/auth/user'),
    retry: false,
  });
  
  // Fetch project details with better error handling
  const { data: project, isLoading: isProjectLoading, error: projectError, isError } = useQuery<Project>({
    queryKey: [`/projects/${projectId}`],
    queryFn: () => apiGet(`/projects/${projectId}`),
    enabled: !!projectId && projectId > 0,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Sync form state when project data loads
  useEffect(() => {
    if (project) {
      setEditedProject({
        name: project.name || '',
        description: project.description || ''
      });
    }
  }, [project]);
  
  // Fetch teams
  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['/teams'],
    queryFn: () => apiGet('/teams'),
  });
  
  // Fetch all projects for sidebar
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/projects'],
    queryFn: () => apiGet('/projects'),
  });
  
  // Fetch work items for this project
  const { data: workItems = [], refetch: refetchWorkItems } = useQuery<WorkItem[]>({
    queryKey: [`/projects/${projectId}/work-items`],
    queryFn: () => apiGet(`/projects/${projectId}/work-items`),
    enabled: !!projectId && projectId > 0,
  });

  // Fetch project team members
  const { data: projectTeamMembers = [], refetch: refetchTeamMembers } = useQuery<User[]>({
    queryKey: [`/projects/${projectId}/team-members`],
    queryFn: async () => {
      if (!projectId) return [];
      const members = await apiGet(`/projects/${projectId}/team-members`);
      return members;
    },
    enabled: !!projectId && projectId > 0
  });

  // Fetch all users for adding to team
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ['/users'],
    queryFn: () => apiGet('/users'),
  });
  
  // Function to handle navigation with null check
  const goToProjects = () => {
    if (navigate) navigate('/projects');
  };
  
  // Early return if no valid project ID
  if (!projectId || projectId <= 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Invalid Project</h2>
          <p className="text-gray-600 mb-4">The project ID is invalid or missing.</p>
          <Button onClick={goToProjects}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  // Check if user is authenticated first
  if (currentUser === null) {
    // Redirect to login if not authenticated
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return null;
  }
  
  // Archive project handler
  const handleArchiveProject = async () => {
    // Don't proceed if project ID is invalid
    if (!projectId) return;
    
    try {
      // Call API to archive project
      const response = await apiRequest(
        'PATCH',
        `/api/projects/${projectId}`, 
        { status: "ARCHIVED" }
      );
      
      if (response.ok) {
        // Show success message
        toast({
          title: "Project archived",
          description: "The project has been archived successfully",
        });
        
        // Redirect to projects page
        goToProjects();
        
        // Invalidate cache
        await queryClient.invalidateQueries({ queryKey: ['/projects'] });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to archive project",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error archiving project:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while archiving the project",
        variant: "destructive",
      });
    }
  };
  
  // Delete project handler
  const handleDeleteProject = async () => {
    // Don't proceed if project ID is invalid
    if (!projectId) return;
    
    // Confirm with user before deleting
    if (project?.name && !window.confirm(`Are you sure you want to delete ${project.name}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      // Call API to delete project
      const response = await apiRequest(
        'DELETE',
        `/api/projects/${projectId}`
      );
      
      if (response.ok) {
        // Show success message
        toast({
          title: "Project deleted",
          description: "The project has been deleted successfully",
        });
        
        // Redirect to projects page
        goToProjects();
        
        // Invalidate cache
        await queryClient.invalidateQueries({ queryKey: ['/projects'] });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to delete project",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while deleting the project",
        variant: "destructive",
      });
    }
  };
  
  // Save project details handler
  const handleSaveProject = async () => {
    if (!projectId || !editedProject.name.trim()) {
      toast({
        title: "Error",
        description: "Project name is required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    
    try {
      // Call API to update project
      const response = await apiRequest(
        'PATCH',
        `/api/projects/${projectId}`, 
        {
          name: editedProject.name.trim(),
          description: editedProject.description.trim()
        }
      );
      
      if (response.ok) {
        // Show success message
        toast({
          title: "Project updated",
          description: "Project details have been saved successfully",
        });
        
        // Invalidate cache to refresh project data
        await queryClient.invalidateQueries({ queryKey: [`/projects/${projectId}`] });
        await queryClient.invalidateQueries({ queryKey: ['/projects'] });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to update project",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating project:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while updating the project",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Add team member handler - Enhanced to sync with project team
  const handleAddTeamMember = async () => {
    if (!selectedUserId) {
      toast({
        title: "Error",
        description: "Please select a user to add",
        variant: "destructive",
      });
      return;
    }

    try {
      // If project has a team, add to that team
      if (project?.teamId) {
        const response = await apiRequest(
          'POST',
          `/teams/${project.teamId}/members`,
          {
            userId: parseInt(selectedUserId),
            role: 'MEMBER'
          }
        );

        if (response.ok) {
          toast({
            title: "Success",
            description: "Team member added successfully to both project and team",
          });
          setSelectedUserId("");
          refetchTeamMembers();
        } else {
          const errorData = await response.json();
          toast({
            title: "Error",
            description: errorData.message || "Failed to add team member",
            variant: "destructive",
          });
        }
      } else {
        // Project has no team assigned, just add as project member
        toast({
          title: "Info",
          description: "This project has no team assigned. Please assign a team first or the member will only be added as a project collaborator.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error adding team member:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  // Assign team to project handler
  const handleAssignTeam = async () => {
    if (!assignTeamId) {
      toast({
        title: "Error",
        description: "Please select a team to assign",
        variant: "destructive",
      });
      return;
    }

    setIsAssigningTeam(true);
    
    try {
      const response = await apiRequest(
        'PATCH',
        `/projects/${projectId}`,
        {
          teamId: parseInt(assignTeamId)
        }
      );

      if (response.ok) {
        toast({
          title: "Team Assigned",
          description: "Team has been successfully assigned to this project",
        });
        setShowAssignTeamDialog(false);
        setAssignTeamId("");
        
        // Invalidate cache to refresh project data
        await queryClient.invalidateQueries({ queryKey: [`/projects/${projectId}`] });
        await queryClient.invalidateQueries({ queryKey: ['/projects'] });
        refetchTeamMembers();
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to assign team",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error assigning team:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while assigning team",
        variant: "destructive",
      });
    } finally {
      setIsAssigningTeam(false);
    }
  };

  // Remove team member handler
  const handleRemoveTeamMember = async (userId: number) => {
    if (!project?.teamId) return;

    setRemovingMemberId(userId);
    
    try {
      const response = await apiRequest(
        'DELETE',
        `/teams/${project.teamId}/members/${userId}`
      );

      if (response.ok) {
        toast({
          title: "Success",
          description: "Team member removed successfully",
        });
        refetchTeamMembers();
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to remove team member",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error removing team member:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setRemovingMemberId(null);
    }
  };

  // Reset project key handler (Admin only)
  const handleResetProjectKey = async () => {
    if (!newProjectKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter a new project key",
        variant: "destructive",
      });
      return;
    }

    // Validate project key format
    if (!/^[A-Z0-9]{2,10}$/.test(newProjectKey.trim())) {
      toast({
        title: "Error",
        description: "Project key must be 2-10 uppercase letters and numbers only",
        variant: "destructive",
      });
      return;
    }

    setIsResettingKey(true);
    
    try {
      const response = await apiRequest(
        'PATCH',
        `/api/projects/${projectId}`,
        {
          key: newProjectKey.trim().toUpperCase()
        }
      );

      if (response.ok) {
        toast({
          title: "Project Key Updated",
          description: `Project key has been changed to ${newProjectKey.trim().toUpperCase()}. All work item IDs will now use this new key.`,
        });
        setShowKeyResetDialog(false);
        setNewProjectKey("");
        
        // Invalidate cache to refresh project data
        await queryClient.invalidateQueries({ queryKey: [`/projects/${projectId}`] });
        await queryClient.invalidateQueries({ queryKey: ['/projects'] });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to update project key",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating project key:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while updating the project key",
        variant: "destructive",
      });
    } finally {
      setIsResettingKey(false);
    }
  };
  
  // Show loading state
  if (isProjectLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project details...</p>
        </div>
      </div>
    );
  }

  // Robust role check
  const isAdminOrScrum =
    currentUser?.role === 'ADMIN' || currentUser?.role === 'SCRUM_MASTER';
  
  // User role for UI display
  const userRole = currentUser?.role;

  // Show error state 
  if (projectError || isError || !project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Project Not Found</h2>
          <p className="text-gray-600 mb-4">
            The project you're looking for doesn't exist or couldn't be loaded.
          </p>
          <div className="space-y-2">
            <Button onClick={() => window.location.reload()} className="mr-2">
              Retry
            </Button>
            <Button variant="outline" onClick={goToProjects}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Projects
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  const features = Array.isArray(workItems) ? workItems.filter(item => item.type === 'FEATURE') : [];
  
  const handleWorkItemsUpdate = () => {
    refetchWorkItems();
  };
  
  // Toggle expansion state of an item
  const toggleItemExpansion = (itemId: number) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };
  
  // Organize work items in a hierarchical structure: Epics > Features > Stories > Tasks/Bugs
  const organizeWorkItemsHierarchically = () => {
    if (!Array.isArray(workItems)) return [];
    
    // Extract all items by type
    const epics = workItems.filter(item => item.type === 'EPIC');
    const features = workItems.filter(item => item.type === 'FEATURE');
    const stories = workItems.filter(item => item.type === 'STORY');
    const tasksAndBugs = workItems.filter(item => item.type === 'TASK' || item.type === 'BUG');
    
    // Debug logging
    console.log('[DEBUG] Work Items Organization:');
    console.log('Epics:', epics.map(e => ({ id: e.id, title: e.title, parentId: e.parentId })));
    console.log('Features:', features.map(f => ({ id: f.id, title: f.title, parentId: f.parentId })));
    console.log('Stories:', stories.map(s => ({ id: s.id, title: s.title, parentId: s.parentId })));
    
    // Create the hierarchy
    const hierarchicalItems = [];
    
    // Process epics
    for (const epic of epics) {
      hierarchicalItems.push({
        ...epic,
        level: 0,
        hasChildren: features.some(f => f.parentId === epic.id)
      });
      
      // If this epic is expanded, add its features
      if (expandedItems[epic.id]) {
        const epicFeatures = features.filter(f => f.parentId === epic.id);
        for (const feature of epicFeatures) {
          hierarchicalItems.push({
            ...feature,
            level: 1,
            hasChildren: stories.some(s => s.parentId === feature.id)
          });
          
          // If this feature is expanded, add its stories
          if (expandedItems[feature.id]) {
            const featureStories = stories.filter(s => s.parentId === feature.id);
            for (const story of featureStories) {
              hierarchicalItems.push({
                ...story,
                level: 2,
                hasChildren: tasksAndBugs.some(tb => tb.parentId === story.id)
              });
              
              // If this story is expanded, add its tasks and bugs
              if (expandedItems[story.id]) {
                const storyTasksAndBugs = tasksAndBugs.filter(tb => tb.parentId === story.id);
                for (const taskOrBug of storyTasksAndBugs) {
                  hierarchicalItems.push({
                    ...taskOrBug,
                    level: 3,
                    hasChildren: false
                  });
                }
              }
            }
          }
        }
      }
    }
    
    // Add orphaned features (those without epics) and always show their children
    const orphanedFeatures = features.filter(f => !f.parentId || !epics.some(e => e.id === f.parentId));
    for (const feature of orphanedFeatures) {
      hierarchicalItems.push({
        ...feature,
        level: 0,
        hasChildren: stories.some(s => s.parentId === feature.id)
      });
      
      // Always show stories under features regardless of expansion state
      const featureStories = stories.filter(s => s.parentId === feature.id);
      console.log(`[DEBUG] Feature "${feature.title}" has ${featureStories.length} stories:`, featureStories.map(s => s.title));
      
      for (const story of featureStories) {
        hierarchicalItems.push({
          ...story,
          level: 1,
          hasChildren: tasksAndBugs.some(tb => tb.parentId === story.id)
        });
        
        // If this story is expanded, add its tasks and bugs
        if (expandedItems[story.id]) {
          const storyTasksAndBugs = tasksAndBugs.filter(tb => tb.parentId === story.id);
          for (const taskOrBug of storyTasksAndBugs) {
            hierarchicalItems.push({
              ...taskOrBug,
              level: 2,
              hasChildren: false
            });
          }
        }
      }
    }
    
    // Add orphaned stories (only if they truly don't belong to any feature)
    const orphanedStories = stories.filter(s => !s.parentId || !features.some(f => f.id === s.parentId));
    for (const story of orphanedStories) {
      hierarchicalItems.push({
        ...story,
        level: 0,
        hasChildren: tasksAndBugs.some(tb => tb.parentId === story.id)
      });
      
      // If this story is expanded, add its tasks and bugs
      if (expandedItems[story.id]) {
        const storyTasksAndBugs = tasksAndBugs.filter(tb => tb.parentId === story.id);
        for (const taskOrBug of storyTasksAndBugs) {
          hierarchicalItems.push({
            ...taskOrBug,
            level: 1,
            hasChildren: false
          });
        }
      }
    }
    
    // Add orphaned tasks and bugs
    const orphanedTasksAndBugs = tasksAndBugs.filter(tb => !tb.parentId || !stories.some(s => s.id === tb.parentId));
    for (const taskOrBug of orphanedTasksAndBugs) {
      hierarchicalItems.push({
        ...taskOrBug,
        level: 0,
        hasChildren: false
      });
    }
    
    console.log('[DEBUG] Final hierarchy:', hierarchicalItems.map(item => ({ 
      title: item.title, 
      type: item.type, 
      level: item.level,
      parentId: item.parentId 
    })));
    
    return hierarchicalItems;
  };
  
  const getFilterTypesOptions = () => {
    return [
      { value: 'STORY', label: 'Stories' },
      { value: 'TASK', label: 'Tasks' },
      { value: 'BUG', label: 'Bugs' },
    ];
  };
  
  // Generic filter handler for string-based filters
  const handleStringFilter = (
    value: string, 
    currentValues: string[], 
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    clearValue: string = "ALL"
  ) => {
    if (value === clearValue) {
      setter([]);
    } else {
      if (currentValues.includes(value)) {
        setter(currentValues.filter(v => v !== value));
      } else {
        setter([...currentValues, value]);
      }
    }
  };
  
  // Generic filter handler for number-based filters
  const handleNumberFilter = (
    value: number, 
    currentValues: number[], 
    setter: React.Dispatch<React.SetStateAction<number[]>>,
    clearValue: number = -1
  ) => {
    if (value === clearValue) {
      setter([]);
    } else {
      if (currentValues.includes(value)) {
        setter(currentValues.filter(v => v !== value));
      } else {
        setter([...currentValues, value]);
      }
    }
  };

  // Handler for type filter
  const handleFilterTypeChange = (value: string) => {
    handleStringFilter(value, filterType, setFilterType);
  };
  
  // Handler for status filter
  const handleFilterStatusChange = (value: string) => {
    handleStringFilter(value, filterStatus, setFilterStatus);
  };
  
  // Handler for priority filter
  const handleFilterPriorityChange = (value: string) => {
    handleStringFilter(value, filterPriority, setFilterPriority);
  };
  
  // Handler for assignee filter
  const handleFilterAssigneeChange = (value: string) => {
    if (value === "all") {
      // Clear the filter to show all assignees
      setFilterAssignee([]);
    } else if (value === "unassigned") {
      // Filter for unassigned items (-1 represents unassigned)
      setFilterAssignee([-1]);
    } else {
      // Filter by specific user ID
      const userId = parseInt(value);
      setFilterAssignee([userId]);
    }
  };
  
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        user={currentUser}
        teams={teams}
        projects={projects}
        onCreateTeam={() => openModal("createTeam")}
        onCreateProject={() => openModal("createProject")}
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
        
        <main className="flex-1 overflow-auto">
          {/* Project navigation */}
          <div className="bg-white border-b border-neutral-200">
            <div className="flex items-center px-6 py-3">
              <Button variant="ghost" className="mr-6 font-medium" onClick={goToProjects}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to projects
              </Button>
              
              <nav className="flex space-x-6 overflow-x-auto">
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); setProjectView('overview'); }}
                  className={`border-b-2 ${
                    projectView === 'overview'
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-neutral-600 hover:text-neutral-900'
                  } font-medium py-3`}
                >
                  Overview
                </a>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); setProjectView('board'); }}
                  className={`border-b-2 ${
                    projectView === 'board'
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-neutral-600 hover:text-neutral-900'
                  } font-medium py-3`}
                >
                  Board
                </a>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); setProjectView('list'); }}
                  className={`border-b-2 ${
                    projectView === 'list'
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-neutral-600 hover:text-neutral-900'
                  } font-medium py-3`}
                >
                  List
                </a>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); setProjectView('calendar'); }}
                  className={`border-b-2 ${
                    projectView === 'calendar'
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-neutral-600 hover:text-neutral-900'
                  } font-medium py-3`}
                >
                  Calendar
                </a>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); setProjectView('settings'); }}
                  className={`border-b-2 ${
                    projectView === 'settings'
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-neutral-600 hover:text-neutral-900'
                  } font-medium py-3`}
                >
                  Settings
                </a>
              </nav>
            </div>
          </div>
          
          {/* Project content */}
          <div className="p-6">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold mb-1">{project?.name || 'Loading project...'}</h1>
                <p className="text-neutral-600">{project?.description || 'No description provided'}</p>
              </div>
              {/* Only show Create Item button on specific tabs */}
              {projectView !== 'overview' && projectView !== 'calendar' && projectView !== 'settings' && (
                <div className="flex space-x-3">
                  <Button onClick={() => openModal("createItem")}>
                    <Plus className="mr-2 h-4 w-4" />
                    <span>Create Item</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Overview Tab Content */}
            {projectView === 'overview' && (
              <div>
                <div className="mb-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
                    <div className="mb-4 sm:mb-0 flex items-center">
                      <div className="mr-4">
                        <h3 className="text-lg font-medium">Timeline View</h3>
                      </div>
                      
                      <div className="flex items-center">
                        <Select 
                          defaultValue={timeUnit}
                          onValueChange={(value) => setTimeUnit(value as 'Quarter' | 'Month' | 'Week')}
                        >
                          <SelectTrigger className="h-8 w-32">
                            <SelectValue placeholder="Select view" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Quarter">Quarter</SelectItem>
                            <SelectItem value="Month">Month</SelectItem>
                            <SelectItem value="Week">Week</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openModal("createItem")}>
                        <Plus className="h-4 w-4 mr-1" /> New
                      </Button>
                    </div>
                  </div>
                  
                  {/* Timeline View */}
                  <div className="bg-white border rounded-md shadow-sm mb-6">
                    <TimelineView 
                      timeUnit={timeUnit}
                      workItems={workItems}
                    />
                  </div>
                  
                  {/* Items with Deadlines section - moved from separate tab */}
                  <div className="bg-white border rounded-md shadow-sm">
                    <div className="p-4 border-b">
                      <h3 className="text-lg font-medium">Items with Deadlines</h3>
                    </div>
                    <DeadlinesView 
                      workItems={Array.isArray(workItems) ? workItems : []}
                      users={Array.isArray(projectTeamMembers) ? projectTeamMembers : []}
                      projects={project ? [project as Project] : []}
                    />
                  </div>
                </div>
                
                {/* Project statistics and info section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left panel: Project summary */}
                  <div className="col-span-2">
                    <div className="bg-white border rounded-md shadow-sm p-4">
                      <h3 className="text-lg font-medium mb-4">Work Items</h3>
                      <div className="space-y-4">
                        {/* Hierarchical list of work items */}
                        <div className="border rounded">
                          <div className="flex items-center justify-between bg-neutral-50 p-3 text-sm font-medium text-neutral-700 border-b">
                            <div className="w-6/12">Title</div>
                            <div className="w-2/12">Type</div>
                            <div className="w-2/12">Status</div>
                            <div className="w-2/12">Assignee</div>
                          </div>
                          <div className="overflow-y-auto max-h-96">
                            {organizeWorkItemsHierarchically().map((item: any) => {
                              // Map level to predefined Tailwind classes
                              const levelClasses = {
                                0: "pl-3",
                                1: "pl-6", 
                                2: "pl-12",
                                3: "pl-20"
                              };
                              const paddingClass = levelClasses[item.level as keyof typeof levelClasses] || "pl-3";
                              
                              const typeClasses = {
                                'EPIC': 'bg-purple-100 text-purple-800',
                                'FEATURE': 'bg-blue-100 text-blue-800',
                                'STORY': 'bg-green-100 text-green-800',
                                'TASK': 'bg-orange-100 text-orange-800',
                                'BUG': 'bg-red-100 text-red-800'
                              };
                              
                              const statusClasses = {
                                'TODO': 'bg-neutral-100 text-neutral-800',
                                'IN_PROGRESS': 'bg-amber-100 text-amber-800',
                                'DONE': 'bg-emerald-100 text-emerald-800'
                              };
                              
                              return (
                                <div key={item.id} className="hover:bg-neutral-50 border-b text-sm">
                                  <div className="flex items-center py-2">
                                    <div className={`flex items-center w-6/12 ${paddingClass}`}>
                                      {item.hasChildren && (
                                        <button 
                                          className="mr-1 focus:outline-none"
                                          onClick={() => toggleItemExpansion(item.id)}
                                        >
                                          {expandedItems[item.id] ? (
                                            <ChevronDown className="h-4 w-4 text-neutral-400" />
                                          ) : (
                                            <ChevronRight className="h-4 w-4 text-neutral-400" />
                                          )}
                                        </button>
                                      )}
                                      {!item.hasChildren && <div className="w-5" />}
                                      <span 
                                        className={`truncate ${
                                          canUserEditWorkItem(item, currentUser, workItems || [])
                                            ? 'cursor-pointer hover:text-primary' 
                                            : 'cursor-default text-neutral-600'
                                        }`}
                                        onClick={() => {
                                          if (canUserEditWorkItem(item, currentUser, workItems || [])) {
                                            openModal("editItem", { workItem: item });
                                          }
                                        }}
                                        title={
                                          canUserEditWorkItem(item, currentUser, workItems || [])
                                            ? 'Click to edit'
                                            : `Created by: ${(() => {
                                                const reporter = projectTeamMembers.find(u => u.id === item.reporterId) || 
                                                                allUsers?.find(u => u.id === item.reporterId);
                                                const email = item.createdByEmail || "";
                                                const name = item.createdByName || "";
                                                const reporterEmail = reporter?.email || "";
                                                const reporterName = reporter?.fullName || reporter?.username || "";
                                                
                                                // Prefer reporter info, then item creator info, with proper fallbacks
                                                if (reporterEmail && reporterEmail !== "unknown@example.com") return reporterEmail;
                                                if (reporterName && reporterName !== "Unknown User") return reporterName;
                                                if (email && email !== "unknown@example.com") return email;
                                                if (name && name !== "Unknown User") return name;
                                                return "Unknown User";
                                              })()} ${item.createdAt ? `on ${(() => { const date = new Date(item.createdAt); const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000)); return istDate.toLocaleString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).replace(/,\s*/, ', '); })()}` : ''}`
                                        }
                                      >
                                        {item.title}
                                      </span>
                                    </div>
                                    <div className="w-2/12">
                                      <Badge className={typeClasses[item.type as keyof typeof typeClasses] || 'bg-gray-100 text-gray-800'}>
                                        {item.type}
                                      </Badge>
                                    </div>
                                    <div className="w-2/12">
                                      <Badge className={statusClasses[item.status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800'}>
                                        {item.status.replace('_', ' ')}
                                      </Badge>
                                    </div>
                                    <div className="w-2/12 flex items-center">
                                      {item.assigneeId ? (
                                        <div className="flex items-center">
                                          <div className="h-6 w-6 rounded-full bg-neutral-200 flex items-center justify-center text-xs mr-2">
                                            {projectTeamMembers.find(u => u.id === item.assigneeId)?.fullName.substring(0, 2) || "??"}
                                          </div>
                                          <span className="text-xs truncate">
                                            {projectTeamMembers.find(u => u.id === item.assigneeId)?.fullName || "Unknown"}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-neutral-500 text-xs">Unassigned</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right panel: Project info */}
                  <div>
                    <div className="bg-white border rounded-md shadow-sm p-4">
                      <h3 className="text-lg font-medium mb-4">Project Information</h3>
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium mb-1">ID</h4>
                          <p className="text-sm">{project?.key || 'N/A'}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-1">Created by</h4>
                          <p className="text-sm">
                            {(() => {
                              const creator = allUsers?.find(user => user.id === project?.createdBy);
                              return creator?.email || creator?.fullName || creator?.username || 'Unknown';
                            })()}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-1">Created at</h4>
                          <p className="text-sm">
                            {project?.createdAt 
                              ? new Date(project.createdAt).toLocaleDateString() 
                              : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-1">Start date</h4>
                          <p className="text-sm">
                            {project?.startDate 
                              ? new Date(project.startDate).toLocaleDateString() 
                              : 'No start date set'}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-1">Target date</h4>
                          <p className="text-sm">
                            {project?.targetDate 
                              ? new Date(project.targetDate).toLocaleDateString() 
                              : 'No target date set'}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-1">Team</h4>
                          <p className="text-sm">
                            {teams && project?.teamId 
                              ? teams.find(t => t.id === project.teamId)?.name 
                              : 'No team assigned'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Board Tab Content */}
            {projectView === 'board' && (
              <div className="bg-white border rounded-md shadow-sm">
                <div className="p-4 border-b flex flex-col md:flex-row gap-4">
                  <Select
                    value={filterFeature ? String(filterFeature) : "all"}
                    onValueChange={(value) => {
                      setFilterFeature(value !== "all" ? parseInt(value) : undefined);
                    }}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Filter by feature" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      {features.map(feature => (
                        <SelectItem key={feature.id} value={String(feature.id)}>
                          {feature.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Assignee Filter Dropdown */}
                  <Select
                    value={filterAssignee.length === 1 ? String(filterAssignee[0]) : "all"}
                    onValueChange={handleFilterAssigneeChange}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Filter by assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Assignees</SelectItem>
                      {projectTeamMembers && Array.isArray(projectTeamMembers) && projectTeamMembers.map(user => (
                        <SelectItem key={user.id} value={String(user.id)}>
                          {user.fullName || user.username}
                        </SelectItem>
                      ))}
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <KanbanBoard 
                  projectId={Number(projectId)}
                  users={projectTeamMembers || []}
                  currentUser={currentUser}
                  workItems={Array.isArray(workItems) 
                    ? workItems.filter(item => {
                        // If feature filter is active, only show items belong to that feature
                        if (filterFeature && item.parentId !== filterFeature) {
                          return false;
                        }
                        
                        // Only show specific types in kanban
                        if (item.type === 'EPIC') {
                          return false;
                        }
                        
                        // If type filters are active, apply them
                        if (filterType.length > 0 && !filterType.includes(item.type)) {
                          return false;
                        }
                        
                        return true;
                      })
                    : []
                  }
                  filter={{
                    assigneeIds: filterAssignee.length > 0 ? filterAssignee : undefined
                  }}
                  onItemEdit={(item) => openModal("editItem", { workItem: item })}
                  onItemDelete={(item) => openModal("deleteItem", { workItem: item })}
                  onStatusChange={async (itemId, status) => {
                    try {
                      const response = await apiRequest(
                        'PATCH',
                        `/work-items/${itemId}`,
                        { status }
                      );
                      
                      if (response.ok) {
                        refetchWorkItems();
                      } else {
                        toast({
                          title: "Error",
                          description: "Failed to update item status",
                          variant: "destructive"
                        });
                      }
                    } catch (error) {
                      console.error("Error updating item status:", error);
                      toast({
                        title: "Error",
                        description: "An unexpected error occurred",
                        variant: "destructive"
                      });
                    }
                  }}
                />
              </div>
            )}

            {/* List Tab Content */}
            {projectView === 'list' && (
              <div className="bg-white border rounded-md shadow-sm">
                <div className="p-4 border-b">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-medium">All Work Items</h3>
                    <div className="flex items-center space-x-4 text-xs text-neutral-600">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                        <span>Can edit/delete</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-neutral-300 rounded-full mr-1"></div>
                        <span>View only</span>
                      </div>
                      <span className="text-xs text-neutral-500">
                        {currentUser?.role === 'ADMIN' || currentUser?.role === 'SCRUM_MASTER' 
                          ? 'Admin/Scrum Master: Can edit all items' 
                          : 'Can only edit items you created'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {/* Type Filter */}
                    <div className="flex items-center">
                      <span className="text-xs font-medium mr-2">Type:</span>
                      <Select 
                        value={filterType.length > 0 ? filterType[0] : "ALL"}
                        onValueChange={handleFilterTypeChange}
                      >
                        <SelectTrigger className="h-8 px-2 text-xs w-28">
                          <SelectValue placeholder="All types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All types</SelectItem>
                          <SelectItem value="EPIC">Epics</SelectItem>
                          <SelectItem value="FEATURE">Features</SelectItem>
                          <SelectItem value="STORY">Stories</SelectItem>
                          <SelectItem value="TASK">Tasks</SelectItem>
                          <SelectItem value="BUG">Bugs</SelectItem>
                        </SelectContent>
                      </Select>
                      {filterType.length > 0 && (
                        <div className="flex flex-wrap gap-1 ml-1">
                          {filterType.map(type => (
                            <Badge 
                              key={type} 
                              variant="outline" 
                              className="text-xs py-0 h-6"
                              onClick={() => handleFilterTypeChange(type)}
                            >
                              {type}
                              <X className="h-3 w-3 ml-1" />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Status Filter */}
                    <div className="flex items-center">
                      <span className="text-xs font-medium mr-2">Status:</span>
                      <Select 
                        value={filterStatus.length > 0 ? filterStatus[0] : "ALL"}
                        onValueChange={handleFilterStatusChange}
                      >
                        <SelectTrigger className="h-8 px-2 text-xs w-28">
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All statuses</SelectItem>
                          <SelectItem value="TODO">To Do</SelectItem>
                          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                          <SelectItem value="DONE">Done</SelectItem>
                        </SelectContent>
                      </Select>
                      {filterStatus.length > 0 && (
                        <div className="flex flex-wrap gap-1 ml-1">
                          {filterStatus.map(status => (
                            <Badge 
                              key={status} 
                              variant="outline" 
                              className="text-xs py-0 h-6"
                              onClick={() => handleFilterStatusChange(status)}
                            >
                              {status.replace('_', ' ')}
                              <X className="h-3 w-3 ml-1" />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Priority Filter */}
                    <div className="flex items-center">
                      <span className="text-xs font-medium mr-2">Priority:</span>
                      <Select 
                        value={filterPriority.length > 0 ? filterPriority[0] : "ALL"}
                        onValueChange={handleFilterPriorityChange}
                      >
                        <SelectTrigger className="h-8 px-2 text-xs w-28">
                          <SelectValue placeholder="All priorities" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All priorities</SelectItem>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="CRITICAL">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                      {filterPriority.length > 0 && (
                        <div className="flex flex-wrap gap-1 ml-1">
                          {filterPriority.map(priority => (
                            <Badge 
                              key={priority} 
                              variant="outline" 
                              className="text-xs py-0 h-6"
                              onClick={() => handleFilterPriorityChange(priority)}
                            >
                              {priority}
                              <X className="h-3 w-3 ml-1" />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Assignee Filter */}
                    <div className="flex items-center">
                      <span className="text-xs font-medium mr-2">Assignee:</span>
                      <Select 
                        value={filterAssignee.length > 0 ? String(filterAssignee[0]) : "ALL"}
                        onValueChange={handleFilterAssigneeChange}
                      >
                        <SelectTrigger className="h-8 px-2 text-xs w-28">
                          <SelectValue placeholder="All assignees" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All assignees</SelectItem>
                          {Array.isArray(projectTeamMembers) && projectTeamMembers.map(user => (
                            <SelectItem key={user.id} value={String(user.id)}>
                              {user.fullName || user.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {filterAssignee.length > 0 && (
                        <div className="flex flex-wrap gap-1 ml-1">
                          {filterAssignee.map(userId => {
                            const user = Array.isArray(projectTeamMembers) ? projectTeamMembers.find(u => u.id === userId) : null;
                            return (
                              <Badge 
                                key={userId} 
                                variant="outline" 
                                className="text-xs py-0 h-6"
                                onClick={() => handleFilterAssigneeChange("all")}
                              >
                                {userId === -1 ? "Unassigned" : (user ? (user.fullName || user.username) : "Unknown User")}
                                <X className="h-3 w-3 ml-1" />
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="text-left bg-neutral-100 text-xs text-neutral-700 border-b border-neutral-200">
                        <th className="font-medium px-2 py-1.5 border-r border-neutral-200">ID</th>
                        <th className="font-medium px-2 py-1.5 border-r border-neutral-200">Title</th>
                        <th className="font-medium px-2 py-1.5 border-r border-neutral-200">Type</th>
                        <th className="font-medium px-2 py-1.5 border-r border-neutral-200">Status</th>
                        <th className="font-medium px-2 py-1.5 border-r border-neutral-200">Priority</th>
                        <th className="font-medium px-2 py-1.5 border-r border-neutral-200">Assignee</th>
                        <th className="font-medium px-2 py-1.5 border-r border-neutral-200">Created by</th>
                        <th className="font-medium px-2 py-1.5 border-r border-neutral-200">Last Updated</th>
                        <th className="font-medium px-2 py-1.5">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(workItems) && workItems
                        .filter(item => {
                          // Filter by type if any type filters are selected
                          if (filterType.length > 0 && !filterType.includes(item.type)) {
                            return false;
                          }
                          
                          // Filter by status if any status filters are selected
                          if (filterStatus.length > 0 && !filterStatus.includes(item.status)) {
                            return false;
                          }
                          
                          // Filter by priority if any priority filters are selected
                          if (filterPriority.length > 0 && (!item.priority || !filterPriority.includes(item.priority))) {
                            return false;
                          }
                          
                          // Filter by assignee if any assignee filters are selected
                          if (filterAssignee.length > 0 && (!item.assigneeId || !filterAssignee.includes(item.assigneeId))) {
                            return false;
                          }
                          
                          return true;
                        })
                        .map(item => (
                          <tr key={item.id} className="border-b border-neutral-200 hover:bg-neutral-50 text-xs">
                            <td className="px-2 py-1.5 border-r border-neutral-200">{item.externalId}</td>
                            <td className="px-2 py-1.5 font-medium border-r border-neutral-200">
                              <span 
                                className={`${
                                  currentUser?.role === 'ADMIN' || 
                                  currentUser?.role === 'SCRUM_MASTER' || 
                                  item.reporterId === currentUser?.id ||
                                  item.assigneeId === currentUser?.id
                                    ? 'cursor-pointer hover:text-primary hover:underline'
                                    : 'cursor-default'
                                }`}
                                onClick={() => {
                                  if (canUserEditWorkItem(item, currentUser, workItems || [])) {
                                    openModal("editItem", { workItem: item });
                                  }
                                }}
                                title={
                                  canUserEditWorkItem(item, currentUser, workItems || [])
                                    ? 'Click to edit'
                                    : `Created by: ${(() => {
                                        const reporter = projectTeamMembers.find(u => u.id === item.reporterId) || 
                                                        allUsers?.find(u => u.id === item.reporterId);
                                        const email = item.createdByEmail || "";
                                        const name = item.createdByName || "";
                                        const reporterEmail = reporter?.email || "";
                                        const reporterName = reporter?.fullName || reporter?.username || "";
                                        
                                        // Prefer reporter info, then item creator info, with proper fallbacks
                                        if (reporterEmail && reporterEmail !== "unknown@example.com") return reporterEmail;
                                        if (reporterName && reporterName !== "Unknown User") return reporterName;
                                        if (email && email !== "unknown@example.com") return email;
                                        if (name && name !== "Unknown User") return name;
                                        return "Unknown User";
                                      })()} ${item.createdAt ? `on ${(() => { const date = new Date(item.createdAt); const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000)); return istDate.toLocaleString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).replace(/,\s*/, ', '); })()}` : ''} - View only`
                                }
                              >
                                {item.title}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 border-r border-neutral-200">
                              <span className={`inline-block px-1.5 py-0.5 rounded-sm text-xs font-medium ${
                                item.type === 'EPIC' ? 'bg-purple-100 text-purple-800' :
                                item.type === 'FEATURE' ? 'bg-blue-100 text-blue-800' :
                                item.type === 'STORY' ? 'bg-green-100 text-green-800' :
                                item.type === 'TASK' ? 'bg-orange-100 text-orange-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {item.type}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 border-r border-neutral-200">
                              <span className={`inline-block px-1.5 py-0.5 rounded-sm text-xs font-medium ${
                                item.status === 'TODO' ? 'bg-neutral-100 text-neutral-800' :
                                item.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800' :
                                'bg-emerald-100 text-emerald-800'
                              }`}>
                                {item.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 border-r border-neutral-200">
                              {item.priority ? (
                                <span className={`inline-block px-1.5 py-0.5 rounded-sm text-xs font-medium ${
                                  item.priority === 'LOW' ? 'bg-neutral-100 text-neutral-800' :
                                  item.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-800' :
                                  item.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {item.priority}
                                </span>
                              ) : (
                                <span className="text-neutral-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-2 py-1.5 border-r border-neutral-200">
                              {item.assigneeId ? (
                                <div className="flex items-center">
                                  <div className="h-4 w-4 rounded-full bg-neutral-200 flex items-center justify-center text-xs mr-1">
                                    {projectTeamMembers.find(u => u.id === item.assigneeId)?.fullName.substring(0, 1) || "?"}
                                  </div>
                                  <span className="text-xs truncate max-w-[100px]">
                                    {projectTeamMembers.find(u => u.id === item.assigneeId)?.fullName || "Unknown"}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-neutral-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-2 py-1.5 border-r border-neutral-200">
                              {(item.reporterId || item.createdByEmail || item.createdByName || item.createdAt) ? (
                                <div className="flex flex-col">
                                  <div className="flex items-center">
                                    <div className="h-4 w-4 rounded-full bg-blue-200 flex items-center justify-center text-xs mr-1">
                                      {(() => {
                                        const email = item.createdByEmail || "";
                                        const name = item.createdByName || "";
                                        const displayText = email !== "unknown@example.com" ? email : (name !== "Unknown User" ? name : "U");
                                        return displayText.substring(0, 1).toUpperCase();
                                      })()}
                                    </div>
                                    <span className="text-xs truncate max-w-[100px]" title={(() => {
                                      const email = item.createdByEmail || "";
                                      const name = item.createdByName || "";
                                      return email !== "unknown@example.com" ? email : (name !== "Unknown User" ? name : "Unknown User");
                                    })()}>
                                      {(() => {
                                        const email = item.createdByEmail || "";
                                        const name = item.createdByName || "";
                                        return email !== "unknown@example.com" ? email : (name !== "Unknown User" ? name : "Unknown User");
                                      })()}
                                    </span>
                                  </div>
                                  {item.createdAt && (
                                    <span className="text-xs text-neutral-400 ml-5">
                                      {(() => {
                                        const date = new Date(item.createdAt);
                                        // Convert to IST (UTC + 5:30)
                                        const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
                                        return istDate.toLocaleString('en-IN', {
                                          month: 'short',
                                          day: 'numeric', 
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          hour12: true
                                        }).replace(/,\s*/, ', ');
                                      })()}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-neutral-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-2 py-1.5 border-r border-neutral-200">
                              {(item.updatedBy || item.updatedByName || item.updatedAt) ? (
                                <div className="flex flex-col">
                                  {(item.updatedBy || item.updatedByName) && (
                                    <div className="flex items-center">
                                      <div className="h-4 w-4 rounded-full bg-green-200 flex items-center justify-center text-xs mr-1">
                                        {(projectTeamMembers.find(u => u.id === item.updatedBy)?.fullName || item.updatedByName || "Unknown").substring(0, 1)}
                                      </div>
                                      <span className="text-xs truncate max-w-[100px]">
                                        {projectTeamMembers.find(u => u.id === item.updatedBy)?.fullName || item.updatedByName || "Unknown"}
                                      </span>
                                    </div>
                                  )}
                                  {item.updatedAt && (
                                    <span className="text-xs text-neutral-400 ml-5">
                                      {(() => {
                                        const date = new Date(item.updatedAt);
                                        // Convert to IST (UTC + 5:30)
                                        const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
                                        return istDate.toLocaleString('en-IN', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric', 
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          hour12: true
                                        }).replace(/,\s*/, ', ');
                                      })()}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-neutral-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="flex space-x-1">
                                {/* Check if user can edit this item */}
                                {canUserEditWorkItem(item, currentUser, workItems || []) ? (
                                  <>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="h-5 w-5 p-0" 
                                      onClick={() => openModal("editItem", { workItem: item })}
                                      title="Edit item"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    {/* Delete button - Only ADMIN and SCRUM_MASTER */}
                                    {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SCRUM_MASTER') && (
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-5 w-5 p-0 text-red-500" 
                                        onClick={() => openModal("deleteItem", { workItem: item })}
                                        title="Delete item (Admin/Scrum Master only)"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-xs text-neutral-400">No access</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      {(!Array.isArray(workItems) || workItems.length === 0) && (
                        <tr>
                          <td colSpan={9} className="px-2 py-4 text-center text-neutral-500 text-xs">
                            No work items found. Create your first work item to get started.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Calendar Tab Content */}
            {projectView === 'calendar' && (
              <div>
                <ProjectCalendar 
                  workItems={Array.isArray(workItems) ? workItems : []}
                  projectId={projectId}
                />
              </div>
            )}

            {/* Settings Tab Content */}
            {projectView === 'settings' && (
              <div className="bg-white border rounded-md shadow-sm">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-6">Project Settings</h3>
                  <div className="space-y-8">
                    {/* Project Details Section */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-md font-medium">Project Details</h4>
                        {!isAdminOrScrum && (
                          <div className="text-sm text-neutral-500 bg-neutral-50 px-3 py-1 rounded-md border">
                            <span className="text-xs">👤</span> Only Admin and Scrum Master can edit project details
                          </div>
                        )}
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="projectName" className="block text-sm font-medium mb-1">
                            Project Name
                          </label>
                          <Input 
                            id="projectName" 
                            value={editedProject.name} 
                            onChange={(e) => setEditedProject(prev => ({ ...prev, name: e.target.value }))}
                            disabled={!isAdminOrScrum}
                            className="max-w-lg"
                            placeholder="Enter project name"
                          />
                        </div>
                        <div>
                          <label htmlFor="projectKey" className="block text-sm font-medium mb-1">
                            Project Key
                          </label>
                          <div className="flex items-center space-x-2">
                            <Input 
                              id="projectKey" 
                              value={project?.key || 'N/A'} 
                              disabled
                              className="max-w-lg bg-gray-50"
                              placeholder="Project key will appear here"
                            />
                            {userRole === 'ADMIN' && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowKeyResetDialog(true)}
                                className="text-red-600 border-red-300 hover:bg-red-50"
                              >
                                Reset Key
                              </Button>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-neutral-500">
                            <span className="inline-flex items-center">
                              🔒 The project key is used in work item IDs and cannot be changed after creation.
                              {userRole === 'ADMIN' && (
                                <span className="text-red-500 ml-1">
                                  • Reset only in emergency situations
                                </span>
                              )}
                            </span>
                          </p>
                        </div>
                        <div>
                          <label htmlFor="projectDescription" className="block text-sm font-medium mb-1">
                            Description
                          </label>
                          <Textarea 
                            id="projectDescription" 
                            value={editedProject.description}
                            onChange={(e) => setEditedProject(prev => ({ ...prev, description: e.target.value }))}
                            disabled={!isAdminOrScrum}
                            className="max-w-lg"
                            rows={3}
                            placeholder="Enter project description"
                          />
                        </div>
                        {/* Save button for admins/scrum masters */}
                        {isAdminOrScrum && (
                          <div className="flex gap-3">
                            <Button 
                              onClick={handleSaveProject} 
                              disabled={isSaving || !editedProject.name.trim()}
                              className="mt-4"
                            >
                              {isSaving ? "Saving..." : "Save Changes"}
                            </Button>
                            {/* Reset button to restore original values */}
                            <Button 
                              variant="outline" 
                              onClick={() => setEditedProject({
                                name: project?.name || '',
                                description: project?.description || ''
                              })}
                              disabled={isSaving}
                              className="mt-4"
                            >
                              Reset
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Team Assignment Section */}
                    <div>
                      <h4 className="text-md font-medium mb-4">Team Assignment</h4>
                      <div className="border rounded-md p-4 max-w-3xl">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Current Team: {project?.teamId ? 
                                teams?.find(team => team.id === project.teamId)?.name || 'Unknown Team' : 
                                'No team assigned'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {project?.teamId ? 
                                'Team members can be assigned to work items and access project resources.' : 
                                'Assign a team to enable team member management and collaboration.'}
                            </p>
                          </div>
                          {isAdminOrScrum && (
                            <Button
                              variant="outline"
                              onClick={() => setShowAssignTeamDialog(true)}
                              className="text-blue-600 hover:text-blue-700 border-blue-300 hover:border-blue-400"
                            >
                              <Users className="h-4 w-4 mr-1" />
                              {project?.teamId ? 'Change Team' : 'Assign Team'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Team Section */}
                    <div>
                      <h4 className="text-md font-medium mb-4">Team Management</h4>
                      {project?.teamId ? (
                        <div className="border rounded-md overflow-hidden max-w-3xl">
                          {/* Current Team Members */}
                          <div className="bg-neutral-50 px-4 py-3 border-b">
                            <h5 className="text-sm font-medium">Current Team Members ({projectTeamMembers?.length || 0})</h5>
                          </div>
                          <div className="p-4">
                            {projectTeamMembers && projectTeamMembers.length > 0 ? (
                              <div className="space-y-2">
                                {projectTeamMembers.map(member => (
                                  <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                                        {member.fullName?.substring(0, 1) || member.username?.substring(0, 1) || "?"}
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-gray-900">{member.fullName || member.username}</p>
                                        <p className="text-xs text-gray-500 capitalize">{member.role?.toLowerCase().replace('_', ' ')}</p>
                                      </div>
                                    </div>
                                    {isAdminOrScrum && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleRemoveTeamMember(member.id)}
                                        disabled={removingMemberId === member.id}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        {removingMemberId === member.id ? (
                                          <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full" />
                                        ) : (
                                          <UserMinus className="h-3 w-3" />
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-neutral-500 text-center py-4">
                                No team members assigned to this project yet.
                              </p>
                            )}
                          </div>

                          {/* Add Team Member */}
                          {isAdminOrScrum && (
                            <div className="border-t bg-neutral-50 px-4 py-3">
                              <div className="flex items-center space-x-3">
                                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                  <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Select a user to add..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {allUsers
                                      ?.filter(user => !projectTeamMembers?.some(member => member.id === user.id))
                                      ?.map(user => (
                                        <SelectItem key={user.id} value={user.id.toString()}>
                                          <div className="flex items-center space-x-2">
                                            <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">
                                              {user.fullName?.substring(0, 1) || user.username?.substring(0, 1) || "?"}
                                            </div>
                                            <span>{user.fullName || user.username}</span>
                                          </div>
                                        </SelectItem>
                                      )) || []}
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  onClick={handleAddTeamMember}
                                  disabled={!selectedUserId}
                                >
                                  <UserPlus className="h-4 w-4 mr-1" />
                                  Add
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="border rounded-md p-6 max-w-3xl text-center">
                          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                          <h5 className="text-lg font-medium text-gray-900 mb-2">No Team Assigned</h5>
                          <p className="text-sm text-gray-500 mb-4">
                            This project doesn't have a team assigned yet. Assign a team to enable member management and collaboration features.
                          </p>
                          {isAdminOrScrum && (
                            <Button
                              variant="outline"
                              onClick={() => setShowAssignTeamDialog(true)}
                              className="text-blue-600 hover:text-blue-700 border-blue-300 hover:border-blue-400"
                            >
                              <Users className="h-4 w-4 mr-1" />
                              Assign Team
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Danger Zone */}
                    <div>
                      <h4 className="text-md font-medium mb-4 text-red-600">Danger Zone</h4>
                      <div className="space-y-4 border border-red-200 rounded-md p-4">
                        <div className="flex items-center justify-between py-4">
                          <div>
                            <h4 className="text-sm font-medium text-red-800">Archive Project</h4>
                            <p className="text-sm text-red-600">Archive this project to hide it from active views.</p>
                          </div>
                          <Button 
                            variant="outline" 
                            className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={handleArchiveProject}
                          >
                            Archive Project
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between py-4">
                          <div>
                            <h4 className="text-sm font-medium text-red-800">Delete Project</h4>
                            <p className="text-sm text-red-600">This action cannot be undone. All data will be permanently deleted.</p>
                          </div>
                          <Button 
                            variant="outline" 
                            className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={handleDeleteProject}
                          >
                            Delete Project
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      
      {/* Modals */}
      {isOpen && modalType === "createItem" && (
        <CreateItemModal 
          isOpen={isOpen} 
          onClose={closeModal}
          onSuccess={handleWorkItemsUpdate}
          projects={projects}
          workItems={workItems}
          currentProject={project}
        />
      )}
      
      {isOpen && modalType === "editItem" && (
        <EditItemModal
          isOpen={isOpen}
          onClose={closeModal}
          onSuccess={handleWorkItemsUpdate}
          workItem={modalProps.workItem}
        />
      )}
      
      {isOpen && modalType === "deleteItem" && (
        <DeleteItemModal
          isOpen={isOpen}
          onClose={closeModal}
          onSuccess={handleWorkItemsUpdate}
          workItem={modalProps.workItem}
        />
      )}

      {/* Project Key Reset Dialog (Admin Only) */}
      <Dialog open={showKeyResetDialog} onOpenChange={setShowKeyResetDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">⚠️ Reset Project Key</DialogTitle>
            <DialogDescription className="space-y-2">
              <p>This is an emergency function that will change the project key.</p>
              <p><strong>Warning:</strong> All future work items will use the new key. Existing work item IDs will not change.</p>
              <p className="text-red-600 font-medium">Only use this if the current key was entered incorrectly!</p>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Current Project Key: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{project?.key}</span>
              </label>
            </div>
            <div>
              <label htmlFor="newProjectKey" className="block text-sm font-medium mb-2">
                New Project Key
              </label>
              <Input
                id="newProjectKey"
                value={newProjectKey}
                onChange={(e) => setNewProjectKey(e.target.value.toUpperCase())}
                placeholder="Enter new project key (e.g., PROJ)"
                className="font-mono"
                maxLength={10}
              />
              <p className="text-xs text-gray-500 mt-1">
                Must be 2-10 uppercase letters and numbers only
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowKeyResetDialog(false);
                setNewProjectKey("");
              }}
              disabled={isResettingKey}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleResetProjectKey}
              disabled={isResettingKey || !newProjectKey.trim()}
            >
              {isResettingKey ? "Resetting..." : "Reset Project Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Assignment Dialog (Admin/Scrum Master Only) */}
      <Dialog open={showAssignTeamDialog} onOpenChange={setShowAssignTeamDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              {project?.teamId ? 'Change Project Team' : 'Assign Team to Project'}
            </DialogTitle>
            <DialogDescription>
              {project?.teamId 
                ? 'Select a different team to assign to this project. This will change which team members have access to the project.'
                : 'Select a team to assign to this project. Team members will be able to access the project and be assigned to work items.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Current Team: <span className="font-semibold">{project?.teamId ? 
                  teams?.find(team => team.id === project.teamId)?.name || 'Unknown Team' : 
                  'No team assigned'}</span>
              </label>
            </div>
            <div>
              <label htmlFor="assignTeamId" className="block text-sm font-medium mb-2">
                Select Team
              </label>
              <Select value={assignTeamId} onValueChange={setAssignTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a team..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No team (remove team assignment)</SelectItem>
                  {teams?.filter(team => team.id !== project?.teamId).map(team => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span>{team.name}</span>
                      </div>
                    </SelectItem>
                  )) || []}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAssignTeamDialog(false);
                setAssignTeamId("");
              }}
              disabled={isAssigningTeam}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignTeam}
              disabled={isAssigningTeam || !assignTeamId}
            >
              {isAssigningTeam ? "Assigning..." : (project?.teamId ? "Change Team" : "Assign Team")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
