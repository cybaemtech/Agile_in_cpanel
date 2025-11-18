import { useState } from "react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";;
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Project, User, WorkItem } from "@shared/schema";
import { insertWorkItemSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { apiGet } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import { TagsInput } from "@/components/ui/tags-input";

// Create a schema specifically for the form
const workItemFormSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  description: z.string().optional(),
  tags: z.string().optional(),
  type: z.string(),
  status: z.string(),
  priority: z.string().optional(),
  projectId: z.number(),
  parentId: z.number().optional().nullable(),
  assigneeId: z.number().optional().nullable(),
  reporterId: z.number().optional().nullable(),
  estimate: z.string().optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  // externalId is not needed in the form as it will be generated on the server
  externalId: z.string().optional(),
});

type WorkItemFormValues = z.infer<typeof workItemFormSchema>;

interface CreateItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projects: Project[];
  workItems: WorkItem[];
  currentProject?: Project;
}

export function CreateItemModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  projects,
  workItems,
  currentProject
}: CreateItemModalProps) {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string>("STORY");
  // Track selected project for dynamic assignee list
  const [selectedProjectId, setSelectedProjectId] = useState<number>(currentProject?.id || (projects.length > 0 ? projects[0].id : 0));

  // Fetch current user for role-based type restriction
  const { data: currentUser } = useQuery<User>({
    queryKey: ['/auth/user'],
    queryFn: () => apiGet('/auth/user'),
  });

  // Fetch project team members for assignee dropdown
  const { data: projectTeamMembers = [], isLoading: teamMembersLoading, error: teamMembersError } = useQuery({
    queryKey: [`/projects/${selectedProjectId}/team-members`],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      console.log(' Fetching team members for project:', selectedProjectId);
      const members = await apiGet(`/projects/${selectedProjectId}/team-members`);
      console.log(' Team members fetched:', members);
      return members;
    },
    enabled: !!selectedProjectId && isOpen
  });

  // Only allow item types based on user role
  const isAdminOrScrum = currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SCRUM_MASTER');
  const allowedTypes = isAdminOrScrum
    ? ["EPIC", "FEATURE", "STORY", "TASK", "BUG"]
    : ["STORY", "TASK", "BUG"];
  
  // Set default type based on user permissions
  const defaultType = isAdminOrScrum ? "EPIC" : "STORY";
  
  // Update selected type when user role changes or component mounts
  React.useEffect(() => {
    if (currentUser && !allowedTypes.includes(selectedType)) {
      setSelectedType(defaultType);
    }
  }, [currentUser, allowedTypes, selectedType, defaultType]);
  
  // Only show valid parent options based on selected type and project
  const getValidParents = () => {
    // Filter work items by selected project first
    const projectWorkItems = workItems.filter(item => item.projectId === selectedProjectId);
    
    switch (selectedType) {
      case "FEATURE":
        return projectWorkItems.filter(item => item.type === "EPIC");
      case "STORY":
        return projectWorkItems.filter(item => item.type === "FEATURE");
      case "TASK":
      case "BUG":
        return projectWorkItems.filter(item => item.type === "STORY");
      default:
        return [];
    }
  };

  // Set up the form
  const form = useForm<WorkItemFormValues>({
    resolver: zodResolver(workItemFormSchema),
    defaultValues: {
      title: "",
      description: "",
      tags: "",
      type: defaultType,
      status: "TODO",
      priority: "MEDIUM",
      projectId: selectedProjectId,
      parentId: null,
      assigneeId: null,
      reporterId: projectTeamMembers.length > 0 ? projectTeamMembers[0].id : 1, // Set current user as default reporter
      estimate: "",
      startDate: null,
      endDate: null,
    },
  });
  
  const handleTypeChange = (value: string) => {
    setSelectedType(value);
    form.setValue("type", value);
    
    // Reset parentId when type changes since the valid parents will change
    form.setValue("parentId", null);
  };
  
  // Handle form submission
  const onSubmit = async (data: WorkItemFormValues) => {
    try {
      // Validation: Features must have an Epic parent
      if (data.type === 'FEATURE' && (!data.parentId)) {
        toast({
          title: "Epic Required",
          description: "Features must be created under an Epic. Please select a parent Epic first.",
          variant: "destructive",
        });
        return;
      }
      
      // Prepare data for submission - ensure all required fields are present
      const submitData = {
        title: data.title.trim(),
        description: data.description?.trim() || null,
        tags: data.tags?.trim() || null,
        type: data.type,
        status: data.status,
        priority: data.priority || 'MEDIUM',
        // Ensure proper data types
        projectId: Number(data.projectId),
        // Convert empty strings or "null" strings to null for optional fields
        parentId: data.parentId ? Number(data.parentId) : null,
        assigneeId: data.assigneeId ? Number(data.assigneeId) : null,
        reporterId: data.reporterId ? Number(data.reporterId) : (projectTeamMembers.length > 0 ? projectTeamMembers[0].id : null),
        estimate: data.estimate ? Number(data.estimate) : null,
        // Convert dates properly
        startDate: data.startDate || null,
        endDate: data.endDate || null,
      };
      
      console.log("Creating work item with data:", submitData);
      console.log("Tags value being submitted:", data.tags);
      const response = await apiRequest("POST", "/work-items", submitData);
      
      toast({
        title: "Item created",
        description: "The item has been created successfully.",
      });
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error creating work item:", error);
      
      // Check if it's a validation error with field-specific errors
      if (error?.response?.data?.errors) {
        const apiErrors = error.response.data.errors;
        
        // Set field-specific errors
        apiErrors.forEach((err: { path: string; message: string }) => {
          if (form.getValues()[err.path as keyof WorkItemFormValues] !== undefined) {
            form.setError(err.path as any, { message: err.message });
          }
        });
        
        toast({
          title: "Validation error",
          description: "Please check the form fields and try again.",
          variant: "destructive",
        });
      } else if (error?.response?.data?.message) {
        // Show specific error message from API
        toast({
          title: "Error",
          description: error.response.data.message,
          variant: "destructive",
        });
      } else {
        // Generic error
        toast({
          title: "Error",
          description: "Could not create the item. Please try again.",
          variant: "destructive",
        });
      }
    }
  };
  
  // Get estimate label based on selected type
  const getEstimateLabel = () => {
    return selectedType === "STORY" ? "Story Points" : "Estimated Hours";
  };
  
  // Get valid parent label based on selected type
  const getParentLabel = () => {
    switch (selectedType) {
      case "FEATURE": return "Epic";
      case "STORY": return "Feature";
      case "TASK": 
      case "BUG": return "Story";
      default: return "Parent";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Create New Item</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <div className="mb-4">
              <FormLabel className="block text-sm font-medium text-neutral-700 mb-1">Item Type</FormLabel>
              <div className="flex flex-wrap gap-2">
                {allowedTypes.map(type => (
                  <Button
                    key={type}
                    type="button"
                    variant={selectedType === type ? "default" : "outline"}
                    className="py-2 h-9 min-w-[90px]"
                    onClick={() => handleTypeChange(type)}
                  >
                    {type.charAt(0) + type.slice(1).toLowerCase()}
                  </Button>
                ))}
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Enter description"
                      value={field.value || ""}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Tags field - only show for Stories */}
            {selectedType === "STORY" && (
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <TagsInput
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="Add tags (e.g., WebApp, Integration, Backend API)..."
                      />
                    </FormControl>
                    <FormDescription>
                      Press Enter or comma to add tags. Use tags to categorize work items by component, platform, or functionality.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Combobox
                        options={projects.map(project => ({
                          value: project.id.toString(),
                          label: project.name,
                          searchFields: [
                            project.name || '',
                            project.key || '',
                            project.description || ''
                          ].filter(Boolean)
                        }))}
                        value={selectedProjectId.toString()}
                        onValueChange={(value) => {
                          const id = parseInt(value);
                          setSelectedProjectId(id);
                          field.onChange(id);
                          // Reset dependent fields when project changes
                          form.setValue("parentId", null);
                          form.setValue("assigneeId", null);
                        }}
                        placeholder="Search and select project..."
                        searchPlaceholder="Search projects..."
                        emptyText="No projects found."
                        required={true}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {getParentLabel()}
                      {selectedType === "FEATURE" && <span className="text-red-500"> *</span>}
                    </FormLabel>
                    {selectedType === "FEATURE" && (
                      <FormDescription>
                        Features must be created under an Epic. Please select a parent Epic.
                      </FormDescription>
                    )}
                    <FormControl>
                      {selectedType === "EPIC" || getValidParents().length === 0 ? (
                        <Combobox
                          options={[]}
                          value=""
                          placeholder={`No ${getParentLabel().toLowerCase()}s available`}
                          disabled={true}
                        />
                      ) : (
                        <Combobox
                          options={[
                            { value: "none", label: "None" },
                            ...getValidParents().map(item => ({
                              value: item.id.toString(),
                              label: `${item.title} (${item.externalId})`
                            }))
                          ]}
                          value={field.value?.toString() || "none"}
                          onValueChange={(value) => field.onChange(value && value !== "none" ? parseInt(value) : null)}
                          placeholder={`Search and select ${getParentLabel().toLowerCase()}...`}
                          searchPlaceholder={`Search ${getParentLabel().toLowerCase()}s...`}
                          emptyText={`No ${getParentLabel().toLowerCase()}s found.`}
                          required={selectedType === "FEATURE"}
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignee</FormLabel>
                    <FormControl>
                      <Combobox
                        options={(() => {
                          const assigneeOptions = [
                            { value: "unassigned", label: "Unassigned" },
                            ...projectTeamMembers.map(user => {
                              const option = {
                                value: user.id.toString(),
                                label: (() => {
                                  const name = user.fullName || user.username;
                                  const username = user.fullName ? `@${user.username}` : '';
                                  let roleDisplay = '';
                                  
                                  if (user.role === 'ADMIN') {
                                    roleDisplay = ' 👑 Admin';
                                  } else if (user.role === 'SCRUM_MASTER') {
                                    roleDisplay = ' 🏅 Scrum Master';
                                  }
                                  
                                  return `${name}${username}${roleDisplay}`;
                                })(),
                                searchFields: [
                                  user.fullName || '',
                                  user.username || '',
                                  user.email || '',
                                  user.role || ''
                                ].filter(Boolean)
                              };
                              
                              // Debug logging for the first user to see data structure
                              if (user.id === projectTeamMembers[0]?.id) {
                                console.log('🔍 First user option created:', {
                                  rawUser: user,
                                  option: option
                                });
                              }
                              
                              return option;
                            })
                          ];
                          
                          if (teamMembersError) {
                            console.error('❌ Team members error:', teamMembersError);
                          }
                          
                          if (assigneeOptions.length === 1) {
                            console.warn('⚠️ No team members found for project:', selectedProjectId, {
                              loading: teamMembersLoading,
                              error: teamMembersError,
                              members: projectTeamMembers
                            });
                          }
                          
                          return assigneeOptions;
                        })()}
                        value={field.value?.toString() || "unassigned"}
                        onValueChange={(value) => field.onChange(value && value !== "unassigned" ? parseInt(value) : null)}
                        placeholder={teamMembersLoading ? "Loading team members..." : "Search and select assignee..."}
                        searchPlaceholder="Search team members..."
                        emptyText={teamMembersError ? "Error loading team members" : "No team members found."}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="TODO">To Do</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="DONE">Done</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select
                      value={field.value || "MEDIUM"}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="estimate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{getEstimateLabel()}</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder={selectedType === "STORY" ? "Story points" : "Hours"}
                        value={field.value || ""} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {(selectedType === "EPIC" || selectedType === "FEATURE" || selectedType === "STORY") && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="date"
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="date"
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            <DialogFooter className="mt-6">
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Create Item</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
