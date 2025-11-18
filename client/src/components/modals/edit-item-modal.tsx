import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { apiRequest } from "@/lib/queryClient";
import { apiGet } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import { TagsInput } from "@/components/ui/tags-input";

// Create a schema specifically for the form
const workItemFormSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  description: z.string().optional(),
  tags: z.string().optional(),
  status: z.string(),
  priority: z.string().optional(),
  parentId: z.number().optional().nullable(),
  assigneeId: z.number().optional().nullable(),
  estimate: z.string().optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

type WorkItemFormValues = z.infer<typeof workItemFormSchema>;

interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workItem?: WorkItem;
}

export function EditItemModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  workItem
}: EditItemModalProps) {
  const { toast } = useToast();
  
  console.log("EditItemModal - isOpen:", isOpen);
  console.log("EditItemModal - workItem:", workItem);
  
  // Fetch project team members for assignee dropdown
  const { data: projectTeamMembers = [] } = useQuery<User[]>({
    queryKey: [`/projects/${workItem?.projectId}/team-members`],
    queryFn: async () => {
      if (!workItem?.projectId) return [];
      const members = await apiGet(`/projects/${workItem.projectId}/team-members`);
      return members;
    },
    enabled: !!workItem?.projectId && isOpen
  });
  
  // Fetch all work items from the project for parent selection
  const { data: allWorkItems = [] } = useQuery<WorkItem[]>({
    queryKey: [`/projects/${workItem?.projectId}/work-items`],
    queryFn: async () => {
      if (!workItem?.projectId) return [];
      const items = await apiGet(`/projects/${workItem.projectId}/work-items`);
      return items;
    },
    enabled: !!workItem?.projectId && isOpen
  });
  
  // Only show valid parent options based on work item type and project
  const getValidParents = () => {
    if (!workItem || !allWorkItems.length) return [];
    
    // Filter work items by the same project first
    const projectWorkItems = allWorkItems.filter(item => 
      item.projectId === workItem.projectId && item.id !== workItem.id
    );
    
    switch (workItem.type) {
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
  
  // Get valid parent label based on work item type
  const getParentLabel = () => {
    if (!workItem) return "Parent";
    
    switch (workItem.type) {
      case "FEATURE": return "Epic";
      case "STORY": return "Feature";
      case "TASK": 
      case "BUG": return "Story";
      default: return "Parent";
    }
  };
  
  // Set up the form
  const form = useForm<WorkItemFormValues>({
    resolver: zodResolver(workItemFormSchema),
    defaultValues: {
      title: "",
      description: "",
      tags: "",
      status: "TODO",
      priority: "MEDIUM",
      parentId: null,
      assigneeId: null,
      estimate: "",
      startDate: null,
      endDate: null,
    },
  });
  
  // Update form when workItem changes
  useEffect(() => {
    if (workItem) {
      console.log("=== EDIT MODAL: Loading work item ===");
      console.log("Work item data:", workItem);
      console.log("Tags value:", workItem.tags);
      console.log("Tags type:", typeof workItem.tags);
      
      // Format dates for the form
      const startDateFormatted = workItem.startDate 
        ? new Date(workItem.startDate).toISOString().split('T')[0]
        : null;
      
      const endDateFormatted = workItem.endDate
        ? new Date(workItem.endDate).toISOString().split('T')[0]
        : null;
      
      const formData = {
        title: workItem.title,
        description: workItem.description || "",
        tags: workItem.tags || "",
        status: workItem.status,
        priority: workItem.priority || "MEDIUM",
        parentId: workItem.parentId,
        assigneeId: workItem.assigneeId,
        estimate: workItem.estimate?.toString() || "",
        startDate: startDateFormatted,
        endDate: endDateFormatted,
      };
      
      console.log("Form data to be set:", formData);
      console.log("Form tags value:", formData.tags);
      
      form.reset(formData);
    }
  }, [workItem, form.reset]);
  
  // Handle form submission
  const onSubmit = async (data: WorkItemFormValues) => {
    if (!workItem) {
      toast({
        title: "Error",
        description: "No work item provided for editing.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      console.log("=== EDIT ITEM DEBUG START ===");
      console.log("Original work item:", workItem);
      console.log("Form data submitted:", data);
      console.log("Raw tags value:", data.tags);
      console.log("Tags type:", typeof data.tags);
      console.log("Tags length:", data.tags?.length);
      
      // Prepare data for submission
      const submitData = {
        ...data,
        // Convert empty strings or "null" strings to null for optional fields
        tags: data.tags?.trim() || null,
        parentId: data.parentId || null,
        assigneeId: data.assigneeId || null,
        estimate: data.estimate || null,
        // Format dates properly - send as ISO strings for database compatibility
        startDate: data.startDate || null,
        endDate: data.endDate || null,
      };
      
      console.log("Final submitData:", submitData);
      console.log("Processed tags value:", submitData.tags);
      console.log("API endpoint:", `/work-items/${workItem.id}`);
      console.log("=== MAKING API REQUEST ===");
      
      const response = await apiRequest("PATCH", `/work-items/${workItem.id}`, submitData);
      
      console.log("=== API RESPONSE ===");
      console.log("API Response:", response);
      console.log("=== EDIT ITEM DEBUG END ===");
      
      toast({
        title: "Item updated",
        description: "The item has been updated successfully.",
      });
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error updating work item:", error);
      
      // Check if it's a validation error with field-specific errors
      if (error?.response?.data?.errors) {
        const apiErrors = error.response.data.errors;
        console.log("Validation errors:", apiErrors);
        
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
          description: "Could not update the item. Please try again.",
          variant: "destructive",
        });
      }
    }
  };
  
  // Get estimate label based on selected type
  const getEstimateLabel = () => {
    return workItem?.type === "STORY" ? "Story Points" : "Estimated Hours";
  };
  
  if (!workItem) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg font-semibold">Edit {workItem.externalId}: {workItem.title}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
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
            {workItem?.type === "STORY" && (
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
            
            {/* Parent relationship field - show for items that can have parents */}
            {workItem && workItem.type !== "EPIC" && getValidParents().length > 0 && (
              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{getParentLabel()}</FormLabel>
                    <Select
                      value={field.value?.toString() || "none"}
                      onValueChange={(value) => field.onChange(value && value !== "none" ? parseInt(value) : null)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${getParentLabel().toLowerCase()}`} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {getValidParents().map(item => (
                          <SelectItem key={item.id} value={item.id.toString()}>
                            {item.title} ({item.externalId})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <div className="grid grid-cols-2 gap-4">
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
                        options={[
                          { value: "unassigned", label: "Unassigned" },
                          ...projectTeamMembers.map(user => {
                            const name = user.fullName || user.username;
                            const username = user.fullName ? ` (@${user.username})` : '';
                            let roleDisplay = '';
                            
                            if (user.role === 'ADMIN') {
                              roleDisplay = ' [Admin]';
                            } else if (user.role === 'SCRUM_MASTER') {
                              roleDisplay = ' [Scrum Master]';
                            }
                            
                            return {
                              value: user.id.toString(),
                              label: `${name}${username}${roleDisplay}`,
                              searchFields: [
                                user.fullName || '',
                                user.username || '',
                                user.email || '',
                                user.role || ''
                              ].filter(Boolean)
                            };
                          })
                        ]}
                        value={field.value?.toString() || "unassigned"}
                        onValueChange={(value) => field.onChange(value && value !== "unassigned" ? parseInt(value) : null)}
                        placeholder="Search and select assignee..."
                        searchPlaceholder="Search team members..."
                        emptyText="No team members found."
                      />
                    </FormControl>
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
                        placeholder={workItem.type === "STORY" ? "Story points" : "Hours"}
                        value={field.value || ""} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Show date fields for Epics, Features, and Stories */}
            {(workItem.type === "EPIC" || workItem.type === "FEATURE" || workItem.type === "STORY") && (
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
            
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" type="button" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit">Update Item</Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}