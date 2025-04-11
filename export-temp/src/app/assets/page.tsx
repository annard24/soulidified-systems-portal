"use client";

import AuthGuard from "@/components/auth/auth-guard";
import Navbar from "@/components/layout/navbar";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function AssetsPage() {
  return (
    <AuthGuard>
      <AssetsContent />
    </AuthGuard>
  );
}

function AssetsContent() {
  const { user } = useUser();
  const [files, setFiles] = useState<any[]>([]);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchAssets() {
      if (!user) return;

      try {
        setIsLoading(true);
        
        // Get files
        const { data: filesData, error: filesError } = await supabase
          .from('files')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (filesError) {
          console.error('Error fetching files:', filesError);
        } else {
          setFiles(filesData || []);
        }
        
        // Get credentials
        const { data: credsData, error: credsError } = await supabase
          .from('credentials')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (credsError) {
          console.error('Error fetching credentials:', credsError);
        } else {
          setCredentials(credsData || []);
        }
      } catch (error) {
        console.error('Error fetching assets:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchAssets();
  }, [user]);

  const togglePasswordVisibility = (id: string) => {
    setShowPassword(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleAddCredential = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const serviceName = (form.elements.namedItem('serviceName') as HTMLInputElement).value;
    const username = (form.elements.namedItem('username') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const additionalInfo = (form.elements.namedItem('additionalInfo') as HTMLTextAreaElement).value;
    
    try {
      const { data, error } = await supabase
        .from('credentials')
        .insert({
          service_name: serviceName,
          username,
          password,
          additional_info: additionalInfo,
          project_id: null // Would be set to actual project ID in real implementation
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error adding credential:', error);
        return;
      }
      
      setCredentials([data, ...credentials]);
      form.reset();
    } catch (error) {
      console.error('Error adding credential:', error);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('image')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    } else if (fileType.includes('pdf')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    } else {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Assets & Credentials</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your files and access credentials
            </p>
          </div>
          
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-gray-900"></div>
              <span className="ml-2">Loading assets...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Files Section */}
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="text-lg font-medium text-gray-900">Files</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Access your uploaded files and documents
                </p>
                
                {files.length > 0 ? (
                  <div className="mt-6 divide-y divide-gray-200">
                    {files.map((file) => (
                      <div key={file.id} className="flex items-center py-4">
                        <div className="flex-shrink-0">
                          {getFileIcon(file.file_type)}
                        </div>
                        <div className="ml-4 flex-1">
                          <h3 className="text-sm font-medium text-gray-900">{file.file_name}</h3>
                          <p className="text-xs text-gray-500">
                            Uploaded on {new Date(file.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <a
                            href={file.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-gray-50"
                          >
                            View
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-6 rounded-md bg-gray-50 p-4 text-center">
                    <p className="text-sm text-gray-500">No files uploaded yet.</p>
                    <p className="mt-1 text-sm text-gray-500">
                      Files uploaded during onboarding will appear here.
                    </p>
                  </div>
                )}
              </div>
              
              {/* Credentials Section */}
              <div className="rounded-lg bg-white p-6 shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">Credentials</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Securely store and access your login credentials
                    </p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
                    onClick={() => document.getElementById('add-credential-form')?.classList.toggle('hidden')}
                  >
                    Add New
                  </button>
                </div>
                
                <div id="add-credential-form" className="mt-6 hidden rounded-md border border-gray-200 p-4">
                  <h3 className="text-md font-medium text-gray-900">Add New Credential</h3>
                  <form onSubmit={handleAddCredential} className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="serviceName" className="block text-sm font-medium text-gray-700">
                        Service Name
                      </label>
                      <input
                        type="text"
                        name="serviceName"
                        id="serviceName"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                        Username / Email
                      </label>
                      <input
                        type="text"
                        name="username"
                        id="username"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        Password
                      </label>
                      <input
                        type="password"
                        name="password"
                        id="password"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="additionalInfo" className="block text-sm font-medium text-gray-700">
                        Additional Information
                      </label>
                      <textarea
                        name="additionalInfo"
                        id="additionalInfo"
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="mr-3 inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        onClick={() => document.getElementById('add-credential-form')?.classList.add('hidden')}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                </div>
                
                {credentials.length > 0 ? (
                  <div className="mt-6 divide-y divide-gray-200">
                    {credentials.map((credential) => (
                      <div key={credential.id} className="py-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-gray-900">{credential.service_name}</h3>
                          <span className="text-xs text-gray-500">
                            Added on {new Date(credential.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-medium text-gray-500">Username / Email</p>
                            <p className="mt-1 text-sm text-gray-900">{credential.username}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500">Password</p>
                            <div className="mt-1 flex items-center">
                              <p className="text-sm text-gray-900">
                                {showPassword[credential.id] ? credential.password : '••••••••'}
                              </p>
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(credential.id)}
                                className="ml-2 text-gray-400 hover:text-gray-500"
                              >
                                {showPassword[credential.id] ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                        {credential.additional_info && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-gray-500">Additional Information</p>
                            <p className="mt-1 text-sm text-gray-900">{credential.additional_info}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-6 rounded-md bg-gray-50 p-4 text-center">
                    <p className="text-sm text-gray-500">No credentials stored yet.</p>
                    <p className="mt-1 text-sm text-gray-500">
                      Click "Add New" to store your first credential.
                    </p>
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
