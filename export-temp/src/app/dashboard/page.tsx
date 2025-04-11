import AuthGuard from "@/components/auth/auth-guard";
import Navbar from "@/components/layout/navbar";
import { useUserRole } from "@/lib/hooks/useUserRole";
import { supabase } from "@/lib/supabase/client";
import { Project, Task } from "@/lib/supabase/types";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

interface DashboardData {
  projects: Project[];
  nextTask: Task | null;
  notifications: any[];
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}

function DashboardContent() {
  const { user } = useUser();
  const { role } = useUserRole();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    projects: [],
    nextTask: null,
    notifications: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user || !role) return;

      try {
        setIsLoading(true);
        
        // Different queries based on user role
        let projectsQuery;
        
        if (role === 'admin') {
          // Admins see all projects
          projectsQuery = supabase
            .from('projects')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(5);
        } else if (role === 'team_member') {
          // Team members see projects they're assigned to
          projectsQuery = supabase
            .from('projects')
            .select('*')
            .eq('assigned_pm_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(5);
        } else {
          // Clients see only their projects
          projectsQuery = supabase
            .from('projects')
            .select('*')
            .eq('client_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(5);
        }
        
        const { data: projects, error: projectsError } = await projectsQuery;
        
        if (projectsError) {
          console.error('Error fetching projects:', projectsError);
        }
        
        // Get next task due
        const { data: nextTask, error: taskError } = await supabase
          .from('tasks')
          .select('*')
          .in('project_id', projects?.map(p => p.id) || [])
          .eq('status', 'to_do')
          .order('due_date', { ascending: true })
          .limit(1)
          .single();
          
        if (taskError && taskError.code !== 'PGRST116') {
          console.error('Error fetching next task:', taskError);
        }
        
        // Get recent notifications
        const { data: notifications, error: notificationsError } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (notificationsError) {
          console.error('Error fetching notifications:', notificationsError);
        }
        
        setDashboardData({
          projects: projects || [],
          nextTask: nextTask || null,
          notifications: notifications || [],
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchDashboardData();
  }, [user, role]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome, {user?.firstName || 'User'}!
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Here's an overview of your projects and tasks.
            </p>
          </div>
          
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-gray-900"></div>
              <span className="ml-2">Loading dashboard data...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Project Status */}
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="text-lg font-medium text-gray-900">Your Projects</h2>
                {dashboardData.projects.length > 0 ? (
                  <div className="mt-4 space-y-4">
                    {dashboardData.projects.map((project) => (
                      <div key={project.id} className="rounded-md border border-gray-200 p-4">
                        <h3 className="font-medium text-gray-900">{project.title}</h3>
                        <div className="mt-2 flex items-center">
                          <span className="text-sm text-gray-500">Status:</span>
                          <span className={`ml-2 rounded-full px-2 py-1 text-xs font-medium ${
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
                        {project.due_date && (
                          <p className="mt-2 text-sm text-gray-500">
                            Due: {new Date(project.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-gray-500">No projects found.</p>
                )}
              </div>
              
              {/* Next Task Due */}
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="text-lg font-medium text-gray-900">Next Task Due</h2>
                {dashboardData.nextTask ? (
                  <div className="mt-4 rounded-md border border-gray-200 p-4">
                    <h3 className="font-medium text-gray-900">{dashboardData.nextTask.title}</h3>
                    {dashboardData.nextTask.description && (
                      <p className="mt-2 text-sm text-gray-500">{dashboardData.nextTask.description}</p>
                    )}
                    {dashboardData.nextTask.due_date && (
                      <div className="mt-4 flex items-center">
                        <span className="text-sm font-medium text-red-600">
                          Due: {new Date(dashboardData.nextTask.due_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-gray-500">No upcoming tasks.</p>
                )}
              </div>
              
              {/* Notifications Feed */}
              <div className="lg:col-span-2 rounded-lg bg-white p-6 shadow">
                <h2 className="text-lg font-medium text-gray-900">Recent Notifications</h2>
                {dashboardData.notifications.length > 0 ? (
                  <div className="mt-4 space-y-4">
                    {dashboardData.notifications.map((notification) => (
                      <div key={notification.id} className="flex items-start space-x-3 rounded-md border border-gray-200 p-4">
                        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                          notification.type === 'task_assigned' 
                            ? 'bg-blue-100 text-blue-600' 
                            : notification.type === 'approval_needed' 
                            ? 'bg-yellow-100 text-yellow-600' 
                            : notification.type === 'project_completed' 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{notification.title}</h3>
                          <p className="mt-1 text-sm text-gray-500">{notification.content}</p>
                          <p className="mt-2 text-xs text-gray-400">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-gray-500">No recent notifications.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
