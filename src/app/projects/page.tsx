"use client";

import AuthGuard from "@/components/auth/auth-guard";
import Navbar from "@/components/layout/navbar";
import { supabase } from "@/lib/supabase/client";
import { Project, Task, TaskStatus } from "@/lib/supabase/types";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

export default function ProjectsPage() {
  return (
    <AuthGuard>
      <ProjectsContent />
    </AuthGuard>
  );
}

function ProjectsContent() {
  const { user } = useUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Record<TaskStatus, Task[]>>({
    to_do: [],
    in_progress: [],
    needs_review: [],
    complete: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      if (!user) return;

      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('updated_at', { ascending: false });
          
        if (error) {
          console.error('Error fetching projects:', error);
          return;
        }
        
        setProjects(data || []);
        
        // Select first project by default if available
        if (data && data.length > 0) {
          setSelectedProject(data[0]);
          await fetchTasks(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchProjects();
  }, [user]);
  
  async function fetchTasks(projectId: string) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching tasks:', error);
        return;
      }
      
      // Group tasks by status
      const groupedTasks: Record<TaskStatus, Task[]> = {
        to_do: [],
        in_progress: [],
        needs_review: [],
        complete: [],
      };
      
      data.forEach((task) => {
        groupedTasks[task.status as TaskStatus].push(task);
      });
      
      setTasks(groupedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  }
  
  async function handleProjectSelect(project: Project) {
    setSelectedProject(project);
    await fetchTasks(project.id);
  }
  
  async function handleDragEnd(result: any) {
    if (!result.destination || !selectedProject) return;
    
    const { source, destination, draggableId } = result;
    
    // If dropped in the same column and same position, do nothing
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }
    
    // Get the task that was dragged
    const sourceStatus = source.droppableId as TaskStatus;
    const destinationStatus = destination.droppableId as TaskStatus;
    const taskIndex = source.index;
    const task = tasks[sourceStatus][taskIndex];
    
    // Create new tasks state
    const newTasks = { ...tasks };
    
    // Remove from source column
    newTasks[sourceStatus].splice(taskIndex, 1);
    
    // Add to destination column
    newTasks[destinationStatus].splice(destination.index, 0, {
      ...task,
      status: destinationStatus,
    });
    
    // Update state optimistically
    setTasks(newTasks);
    
    // Update in database
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: destinationStatus })
        .eq('id', task.id);
        
      if (error) {
        console.error('Error updating task status:', error);
        // Revert to previous state on error
        await fetchTasks(selectedProject.id);
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      // Revert to previous state on error
      await fetchTasks(selectedProject.id);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your projects and tasks
            </p>
          </div>
          
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-gray-900"></div>
              <span className="ml-2">Loading projects...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
              {/* Project List */}
              <div className="lg:col-span-1">
                <div className="rounded-lg bg-white p-6 shadow">
                  <h2 className="text-lg font-medium text-gray-900">Your Projects</h2>
                  {projects.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      {projects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => handleProjectSelect(project)}
                          className={`w-full rounded-md p-3 text-left ${
                            selectedProject?.id === project.id
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <h3 className="font-medium">{project.title}</h3>
                          <div className="mt-1 flex items-center">
                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                              project.status === 'completed' 
                                ? 'bg-green-100 text-green-800' 
                                : project.status === 'review' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : project.status === 'in_progress' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {project.status.replace('_', ' ')}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-gray-500">No projects found.</p>
                  )}
                </div>
              </div>
              
              {/* Kanban Board */}
              <div className="lg:col-span-3">
                {selectedProject ? (
                  <div className="rounded-lg bg-white p-6 shadow">
                    <div className="mb-6 flex items-center justify-between">
                      <h2 className="text-lg font-medium text-gray-900">
                        {selectedProject.title}
                      </h2>
                      <button
                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                      >
                        Add Task
                      </button>
                    </div>
                    
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {/* To Do Column */}
                        <div>
                          <h3 className="mb-3 font-medium text-gray-700">To Do</h3>
                          <Droppable droppableId="to_do">
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className="min-h-[200px] rounded-md bg-gray-50 p-3"
                              >
                                {tasks.to_do.map((task, index) => (
                                  <Draggable
                                    key={task.id}
                                    draggableId={task.id}
                                    index={index}
                                  >
                                    {(provided) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className="mb-2 rounded-md bg-white p-3 shadow"
                                      >
                                        <h4 className="font-medium text-gray-900">{task.title}</h4>
                                        {task.description && (
                                          <p className="mt-1 text-sm text-gray-500">{task.description}</p>
                                        )}
                                        {task.due_date && (
                                          <p className="mt-2 text-xs text-gray-400">
                                            Due: {new Date(task.due_date).toLocaleDateString()}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                        
                        {/* In Progress Column */}
                        <div>
                          <h3 className="mb-3 font-medium text-gray-700">In Progress</h3>
                          <Droppable droppableId="in_progress">
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className="min-h-[200px] rounded-md bg-gray-50 p-3"
                              >
                                {tasks.in_progress.map((task, index) => (
                                  <Draggable
                                    key={task.id}
                                    draggableId={task.id}
                                    index={index}
                                  >
                                    {(provided) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className="mb-2 rounded-md bg-white p-3 shadow"
                                      >
                                        <h4 className="font-medium text-gray-900">{task.title}</h4>
                                        {task.description && (
                                          <p className="mt-1 text-sm text-gray-500">{task.description}</p>
                                        )}
                                        {task.due_date && (
                                          <p className="mt-2 text-xs text-gray-400">
                                            Due: {new Date(task.due_date).toLocaleDateString()}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                        
                        {/* Needs Review Column */}
                        <div>
                          <h3 className="mb-3 font-medium text-gray-700">Needs Review</h3>
                          <Droppable droppableId="needs_review">
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className="min-h-[200px] rounded-md bg-gray-50 p-3"
                              >
                                {tasks.needs_review.map((task, index) => (
                                  <Draggable
                                    key={task.id}
                                    draggableId={task.id}
                                    index={index}
                                  >
                                    {(provided) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className="mb-2 rounded-md bg-white p-3 shadow"
                                      >
                                        <h4 className="font-medium text-gray-900">{task.title}</h4>
                                        {task.description && (
                                          <p className="mt-1 text-sm text-gray-500">{task.description}</p>
                                        )}
                                        {task.due_date && (
                                          <p className="mt-2 text-xs text-gray-400">
                                            Due: {new Date(task.due_date).toLocaleDateString()}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                        
                        {/* Complete Column */}
                        <div>
                          <h3 className="mb-3 font-medium text-gray-700">Complete</h3>
                          <Droppable droppableId="complete">
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className="min-h-[200px] rounded-md bg-gray-50 p-3"
                              >
                                {tasks.complete.map((task, index) => (
                                  <Draggable
                                    key={task.id}
                                    draggableId={task.id}
                                    index={index}
                                  >
                                    {(provided) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className="mb-2 rounded-md bg-white p-3 shadow"
                                      >
                                        <h4 className="font-medium text-gray-900">{task.title}</h4>
                                        {task.description && (
                                          <p className="mt-1 text-sm text-gray-500">{task.description}</p>
                                        )}
                                        {task.due_date && (
                                          <p className="mt-2 text-xs text-gray-400">
                                            Due: {new Date(task.due_date).toLocaleDateString()}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      </div>
                    </DragDropContext>
                  </div>
                ) : (
                  <div className="flex h-64 items-center justify-center rounded-lg bg-white p-6 shadow">
                    <p className="text-gray-500">Select a project to view tasks</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
