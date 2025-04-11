"use client";

import AuthGuard from "@/components/auth/auth-guard";
import RoleGuard from "@/components/auth/role-guard";
import Navbar from "@/components/layout/navbar";
import { supabase } from "@/lib/supabase/client";
import { UserRole } from "@/lib/supabase/types";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function AdminPage() {
  return (
    <AuthGuard>
      <RoleGuard allowedRoles={["admin"]}>
        <AdminContent />
      </RoleGuard>
    </AuthGuard>
  );
}

function AdminContent() {
  const { user } = useUser();
  const [clients, setClients] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedPM, setSelectedPM] = useState<string>("");

  useEffect(() => {
    async function fetchAdminData() {
      if (!user) return;

      try {
        setIsLoading(true);
        
        // Get all clients
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select(`
            *,
            assigned_pm:assigned_pm_id (
              id,
              name,
              email
            ),
            projects:projects (
              id,
              title,
              status
            )
          `)
          .order('name', { ascending: true });
          
        if (clientsError) {
          console.error('Error fetching clients:', clientsError);
        } else {
          setClients(clientsData || []);
        }
        
        // Get team members (users with role 'team_member' or 'admin')
        const { data: teamData, error: teamError } = await supabase
          .from('users')
          .select('*')
          .in('role', ['team_member', 'admin'])
          .order('name', { ascending: true });
          
        if (teamError) {
          console.error('Error fetching team members:', teamError);
        } else {
          setTeamMembers(teamData || []);
        }
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchAdminData();
  }, [user]);

  const handleClientSelect = (client: any) => {
    setSelectedClient(client);
    setSelectedPM(client.assigned_pm_id || "");
  };

  const handleAssignPM = async () => {
    if (!selectedClient || !selectedPM) return;
    
    try {
      const { error } = await supabase
        .from('clients')
        .update({ assigned_pm_id: selectedPM })
        .eq('id', selectedClient.id);
        
      if (error) {
        console.error('Error assigning PM:', error);
        return;
      }
      
      // Update local state
      setClients(prevClients => {
        return prevClients.map(client => {
          if (client.id === selectedClient.id) {
            const assignedPM = teamMembers.find(tm => tm.id === selectedPM);
            return {
              ...client,
              assigned_pm_id: selectedPM,
              assigned_pm: assignedPM
            };
          }
          return client;
        });
      });
      
      // Update selected client
      setSelectedClient({
        ...selectedClient,
        assigned_pm_id: selectedPM,
        assigned_pm: teamMembers.find(tm => tm.id === selectedPM)
      });
    } catch (error) {
      console.error('Error assigning PM:', error);
    }
  };

  const getClientStatusColor = (client: any) => {
    // Check if client has incomplete onboarding
    const hasProjects = client.projects && client.projects.length > 0;
    const hasPM = client.assigned_pm_id;
    
    if (!hasProjects) {
      return 'bg-red-100 text-red-800';
    } else if (!hasPM) {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-green-100 text-green-800';
    }
  };

  const getClientStatus = (client: any) => {
    const hasProjects = client.projects && client.projects.length > 0;
    const hasPM = client.assigned_pm_id;
    
    if (!hasProjects) {
      return 'Missing Projects';
    } else if (!hasPM) {
      return 'Needs PM';
    } else {
      return 'Active';
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage clients, projects, and team assignments
            </p>
          </div>
          
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-gray-900"></div>
              <span className="ml-2">Loading admin data...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Client List */}
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="text-lg font-medium text-gray-900">Clients</h2>
                
                {clients.length > 0 ? (
                  <div className="mt-6 divide-y divide-gray-200">
                    {clients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => handleClientSelect(client)}
                        className={`w-full py-4 text-left ${
                          selectedClient?.id === client.id
                            ? 'bg-indigo-50'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-gray-900">{client.name}</h3>
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${getClientStatusColor(client)}`}>
                            {getClientStatus(client)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                          {client.assigned_pm ? `PM: ${client.assigned_pm.name}` : 'No PM assigned'}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {client.projects?.length || 0} projects
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-6 rounded-md bg-gray-50 p-4 text-center">
                    <p className="text-sm text-gray-500">No clients found.</p>
                  </div>
                )}
              </div>
              
              {/* Client Details */}
              <div className="lg:col-span-2">
                {selectedClient ? (
                  <div className="rounded-lg bg-white p-6 shadow">
                    <div className="mb-6 border-b border-gray-200 pb-6">
                      <h2 className="text-lg font-medium text-gray-900">{selectedClient.name}</h2>
                      <div className="mt-2 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Contact Email</p>
                          <p className="mt-1 text-sm font-medium text-gray-900">
                            {selectedClient.contact_email || 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Contact Phone</p>
                          <p className="mt-1 text-sm font-medium text-gray-900">
                            {selectedClient.contact_phone || 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">GHL Subaccount ID</p>
                          <p className="mt-1 text-sm font-medium text-gray-900">
                            {selectedClient.subaccount_id || 'Not linked'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Created</p>
                          <p className="mt-1 text-sm font-medium text-gray-900">
                            {new Date(selectedClient.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Assign PM */}
                    <div className="mb-6">
                      <h3 className="text-md font-medium text-gray-900">Assign Project Manager</h3>
                      <div className="mt-3 flex items-end space-x-4">
                        <div className="flex-1">
                          <label htmlFor="pm-select" className="block text-sm font-medium text-gray-700">
                            Project Manager
                          </label>
                          <select
                            id="pm-select"
                            value={selectedPM}
                            onChange={(e) => setSelectedPM(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          >
                            <option value="">Select a team member</option>
                            {teamMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name} ({member.role})
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={handleAssignPM}
                          disabled={!selectedPM}
                          className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:bg-gray-300"
                        >
                          Assign
                        </button>
                      </div>
                    </div>
                    
                    {/* Projects */}
                    <div>
                      <h3 className="text-md font-medium text-gray-900">Projects</h3>
                      {selectedClient.projects && selectedClient.projects.length > 0 ? (
                        <div className="mt-3 divide-y divide-gray-200 rounded-md border border-gray-200">
                          {selectedClient.projects.map((project: any) => (
                            <div key={project.id} className="p-4">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium text-gray-900">{project.title}</h4>
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
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 rounded-md bg-gray-50 p-4 text-center">
                          <p className="text-sm text-gray-500">No projects found for this client.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-lg bg-white p-6 shadow">
                    <p className="text-gray-500">Select a client to view details</p>
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
