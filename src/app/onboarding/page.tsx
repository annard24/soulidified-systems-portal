"use client";

import AuthGuard from "@/components/auth/auth-guard";
import Navbar from "@/components/layout/navbar";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { UploadButton } from "@/components/uploadthing";

export default function OnboardingPage() {
  return (
    <AuthGuard>
      <OnboardingContent />
    </AuthGuard>
  );
}

function OnboardingContent() {
  const { user } = useUser();
  const [client, setClient] = useState<any>(null);
  const [onboardingItems, setOnboardingItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('branding');

  useEffect(() => {
    async function fetchClientData() {
      if (!user) return;

      try {
        setIsLoading(true);
        
        // Get client data
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (clientError && clientError.code !== 'PGRST116') {
          console.error('Error fetching client data:', clientError);
        } else {
          setClient(clientData);
        }
        
        // Get onboarding items
        const { data: itemsData, error: itemsError } = await supabase
          .from('onboarding_items')
          .select(`
            *,
            files:file_id (*)
          `)
          .eq('client_id', user.id);
          
        if (itemsError) {
          console.error('Error fetching onboarding items:', itemsError);
        } else {
          setOnboardingItems(itemsData || []);
        }
      } catch (error) {
        console.error('Error fetching client data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchClientData();
  }, [user]);

  const handleUploadComplete = async (result: any, category: string, type: string) => {
    try {
      // First create a file record
      const { data: fileData, error: fileError } = await supabase
        .from('files')
        .insert({
          file_name: result.name,
          file_url: result.url,
          file_type: result.type,
          uploader_id: user?.id,
          project_id: client?.project_id || null
        })
        .select()
        .single();
        
      if (fileError) {
        console.error('Error creating file record:', fileError);
        return;
      }
      
      // Then create an onboarding item linked to the file
      const { data: itemData, error: itemError } = await supabase
        .from('onboarding_items')
        .insert({
          type,
          category,
          file_id: fileData.id,
          client_id: user?.id
        })
        .select()
        .single();
        
      if (itemError) {
        console.error('Error creating onboarding item:', itemError);
        return;
      }
      
      // Update local state
      setOnboardingItems([...onboardingItems, {
        ...itemData,
        files: fileData
      }]);
      
    } catch (error) {
      console.error('Error handling upload:', error);
    }
  };

  const handleValueSubmit = async (category: string, type: string, value: string) => {
    try {
      // Create an onboarding item with text value
      const { data: itemData, error: itemError } = await supabase
        .from('onboarding_items')
        .insert({
          type,
          category,
          value,
          client_id: user?.id
        })
        .select()
        .single();
        
      if (itemError) {
        console.error('Error creating onboarding item:', itemError);
        return;
      }
      
      // Update local state
      setOnboardingItems([...onboardingItems, itemData]);
      
    } catch (error) {
      console.error('Error handling value submission:', error);
    }
  };

  const getItemsByCategory = (category: string) => {
    return onboardingItems.filter(item => item.category === category);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Client Onboarding</h1>
            <p className="mt-1 text-sm text-gray-500">
              Complete your onboarding process by providing the required information and files
            </p>
          </div>
          
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-gray-900"></div>
              <span className="ml-2">Loading onboarding data...</span>
            </div>
          ) : (
            <div className="rounded-lg bg-white p-6 shadow">
              {client?.subaccount_id && (
                <div className="mb-8 rounded-md bg-blue-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        GHL Subaccount Form
                      </h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>
                          Please complete your GHL subaccount onboarding form to ensure your project is set up correctly.
                        </p>
                        <a
                          href={`https://app.gohighlevel.com/subaccount/${client.subaccount_id}/form`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          Open GHL Form
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('branding')}
                    className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                      activeTab === 'branding'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    Branding
                  </button>
                  <button
                    onClick={() => setActiveTab('access_credentials')}
                    className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                      activeTab === 'access_credentials'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    Access Credentials
                  </button>
                  <button
                    onClick={() => setActiveTab('legal')}
                    className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                      activeTab === 'legal'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    Legal
                  </button>
                  <button
                    onClick={() => setActiveTab('content')}
                    className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                      activeTab === 'content'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    Content
                  </button>
                </nav>
              </div>
              
              {/* Branding Tab */}
              {activeTab === 'branding' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-medium text-gray-900">Branding Information</h2>
                  
                  <div className="rounded-md border border-gray-200 p-4">
                    <h3 className="text-md font-medium text-gray-900">Branding Archetype</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Upload your branding archetype results or take the quiz
                    </p>
                    <div className="mt-3 flex items-center space-x-4">
                      <a
                        href="https://www.brandingarchetypequiz.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                      >
                        Take Quiz
                      </a>
                      <UploadButton
                        endpoint="documentUploader"
                        onClientUploadComplete={(res) => {
                          if (res && res.length > 0) {
                            handleUploadComplete(res[0], 'branding', 'branding_archetype');
                          }
                        }}
                        onUploadError={(error: Error) => {
                          console.error('Upload error:', error);
                        }}
                      />
                    </div>
                    {getItemsByCategory('branding').filter(item => item.type === 'branding_archetype').map((item) => (
                      <div key={item.id} className="mt-3 rounded-md bg-gray-50 p-2 text-sm">
                        {item.value ? (
                          <span>{item.value}</span>
                        ) : item.files ? (
                          <a
                            href={item.files.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-500"
                          >
                            {item.files.file_name}
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  
                  <div className="rounded-md border border-gray-200 p-4">
                    <h3 className="text-md font-medium text-gray-900">Human Design Chart</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Upload your human design chart or get it from the link
                    </p>
                    <div className="mt-3 flex items-center space-x-4">
                      <a
                        href="https://www.mybodygraph.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                      >
                        Get Chart
                      </a>
                      <UploadButton
                        endpoint="imageUploader"
                        onClientUploadComplete={(res) => {
                          if (res && res.length > 0) {
                            handleUploadComplete(res[0], 'branding', 'human_design_chart');
                          }
                        }}
                        onUploadError={(error: Error) => {
                          console.error('Upload error:', error);
                        }}
                      />
                    </div>
                    {getItemsByCategory('branding').filter(item => item.type === 'human_design_chart').map((item) => (
                      <div key={item.id} className="mt-3 rounded-md bg-gray-50 p-2 text-sm">
                        {item.value ? (
                          <span>{item.value}</span>
                        ) : item.files ? (
                          <a
                            href={item.files.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-500"
                          >
                            {item.files.file_name}
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  
                  <div className="rounded-md border border-gray-200 p-4">
                    <h3 className="text-md font-medium text-gray-900">Logo</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Upload your company logo (PNG or SVG preferred)
                    </p>
                    <div className="mt-3">
                      <UploadButton
                        endpoint="imageUploader"
                        onClientUploadComplete={(res) => {
                          if (res && res.length > 0) {
                            handleUploadComplete(res[0], 'branding', 'logo');
                          }
                        }}
                        onUploadError={(error: Error) => {
                          console.error('Upload error:', error);
                        }}
                      />
                    </div>
                    {getItemsByCategory('branding').filter(item => item.type === 'logo').map((item) => (
                      <div key={item.id} className="mt-3">
                        {item.files && (
                          <img
                            src={item.files.file_url}
                            alt="Company Logo"
                            className="max-h-24 rounded-md"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="rounded-md border border-gray-200 p-4">
                    <h3 className="text-md font-medium text-gray-900">Brand Colors</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Enter your brand colors (hex codes preferred)
                    </p>
                    <div className="mt-3">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const form = e.target as HTMLFormElement;
                          const input = form.elements.namedItem('brandColors') as HTMLInputElement;
                          handleValueSubmit('branding', 'brand_colors', input.value);
                          input.value = '';
                        }}
                        className="flex"
                      >
                        <input
                          type="text"
                          name="brandColors"
                          placeholder="e.g., #FF5733, #33FF57, #3357FF"
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                        <button
                          type="submit"
                          className="ml-3 inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                          Save
                        </button>
                      </form>
                    </div>
                    {getItemsByCategory('branding').filter(item => item.type === 'brand_colors').map((item) => (
                      <div key={item.id} className="mt-3 rounded-md bg-gray-50 p-2 text-sm">
                        {item.value}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Access Credentials Tab */}
              {activeTab === 'access_credentials' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-medium text-gray-900">Access Credentials</h2>
                  
                  <div className="rounded-md border border-gray-200 p-4">
                    <h3 className="text-md font-medium text-gray-900">Google Calendar</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Enter your Google Calendar login and office hours
                    </p>
                    <div className="mt-3">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const form = e.target as HTMLFormElement;
                          const input = form.elements.namedItem('googleCalendar') as HTMLInputElement;
                          handleValueSubmit('access_credentials', 'google_calendar', input.value);
                          input.value = '';
                        }}
                        className="flex"
                      >
                        <input
                          type="text"
                          name="googleCalendar"
                          placeholder="Email and office hours"
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                        <button
                          type="submit"
                          className="ml-3 inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                          Save
                        </button>
                      </form>
                    </div>
                    {getItemsByCategory('access_credentials').filter(item => item.type === 'google_calendar').map((item) => (
                      <div key={item.id} className="mt-3 rounded-md bg-gray-50 p-2 text-sm">
                        {item.value}
                      </div>
                    ))}
                  </div>
                  
                  <div className="rounded-md border border-gray-200 p-4">
                    <h3 className="text-md font-medium text-gray-900">Domain Host Login</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Enter your domain host (GoDaddy, Namecheap, etc.) login details
                    </p>
                    <div className="mt-3">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const form = e.target as HTMLFormElement;
                          const input = form.elements.namedItem('domainHost') as HTMLInputElement;
                          handleValueSubmit('access_credentials', 'domain_host', input.value);
                          input.value = '';
                        }}
                        className="flex"
                      >
                        <input
                          type="text"
                          name="domainHost"
                          placeholder="Host, username, and password"
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                        <button
                          type="submit"
                          className="ml-3 inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                          Save
                        </button>
                      </form>
                    </div>
                    {getItemsByCategory('access_credentials').filter(item => item.type === 'domain_host').map((item) => (
                      <div key={item.id} className="mt-3 rounded-md bg-gray-50 p-2 text-sm">
                        {item.value}
                      </div>
                    ))}
                  </div>
                  
                  <div className="rounded-md border border-gray-200 p-4">
                    <h3 className="text-md font-medium text-gray-900">Canva Login</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Enter your Canva login details
                    </p>
                    <div className="mt-3">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const form = e.target as HTMLFormElement;
                          const input = form.elements.namedItem('canvaLogin') as HTMLInputElement;
                          handleValueSubmit('access_credentials', 'canva_login', input.value);
                          input.value = '';
                        }}
                        className="flex"
                      >
                        <input
                          type="text"
                          name="canvaLogin"
                          placeholder="Email and password"
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                        <button
                          type="submit"
                          className="ml-3 inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                          Save
                        </button>
                      </form>
                    </div>
                    {getItemsByCategory('access_credentials').filter(item => item.type === 'canva_login').map((item) => (
                      <div key={item.id} className="mt-3 rounded-md bg-gray-50 p-2 text-sm">
                        {item.value}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Legal Tab */}
              {activeTab === 'legal' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-medium text-gray-900">Legal Documents</h2>
                  
                  <div className="rounded-md border border-gray-200 p-4">
                    <h3 className="text-md font-medium text-gray-900">Privacy Policy</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Upload your privacy policy document
                    </p>
                    <div className="mt-3">
                      <UploadButton
                        endpoint="documentUploader"
                        onClientUploadComplete={(res) => {
                          if (res && res.length > 0) {
                            handleUploadComplete(res[0], 'legal', 'privacy_policy');
                          }
                        }}
                        onUploadError={(error: Error) => {
                          console.error('Upload error:', error);
                        }}
                      />
                    </div>
                    {getItemsByCategory('legal').filter(item => item.type === 'privacy_policy').map((item) => (
                      <div key={item.id} className="mt-3 rounded-md bg-gray-50 p-2 text-sm">
                        {item.files && (
                          <a
                            href={item.files.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-500"
                          >
                            {item.files.file_name}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="rounded-md border border-gray-200 p-4">
                    <h3 className="text-md font-medium text-gray-900">Terms & Conditions</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Upload your terms and conditions document
                    </p>
                    <div className="mt-3">
                      <UploadButton
                        endpoint="documentUploader"
                        onClientUploadComplete={(res) => {
                          if (res && res.length > 0) {
                            handleUploadComplete(res[0], 'legal', 'terms_conditions');
                          }
                        }}
                        onUploadError={(error: Error) => {
                          console.error('Upload error:', error);
                        }}
                      />
                    </div>
                    {getItemsByCategory('legal').filter(item => item.type === 'terms_conditions').map((item) => (
                      <div key={item.id} className="mt-3 rounded-md bg-gray-50 p-2 text-sm">
                        {item.files && (
                          <a
                            href={item.files.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-500"
                          >
                            {item.files.file_name}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="rounded-md border border-gray-200 p-4">
                    <h3 className="text-md font-medium text-gray-900">EIN Certificate</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Upload your EIN certificate
                    </p>
                    <div className="mt-3">
                      <UploadButton
                        endpoint="documentUploader"
                        onClientUploadComplete={(res) => {
                          if (res && res.length > 0) {
                            handleUploadComplete(res[0], 'legal', 'ein_certificate');
                          }
                        }}
                        onUploadError={(error: Error) => {
                          console.error('Upload error:', error);
                        }}
                      />
                    </div>
                    {getItemsByCategory('legal').filter(item => item.type === 'ein_certificate').map((item) => (
                      <div key={item.id} className="mt-3 rounded-md bg-gray-50 p-2 text-sm">
                        {item.files && (
                          <a
                            href={item.files.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-500"
                          >
                            {item.files.file_name}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Content Tab */}
              {activeTab === 'content' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-medium text-gray-900">Content Information</h2>
                  
                  <div className="rounded-md border border-gray-200 p-4">
                    <h3 className="text-md font-medium text-gray-900">Services or Offers</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Enter your list of services or offers
                    </p>
                    <div className="mt-3">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const form = e.target as HTMLFormElement;
                          const input = form.elements.namedItem('services') as HTMLTextAreaElement;
                          handleValueSubmit('content', 'services', input.value);
                          input.value = '';
                        }}
                        className="flex flex-col"
                      >
                        <textarea
                          name="services"
                          rows={4}
                          placeholder="List your services or offers"
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                        <button
                          type="submit"
                          className="mt-3 inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 self-end"
                        >
                          Save
                        </button>
                      </form>
                    </div>
                    {getItemsByCategory('content').filter(item => item.type === 'services').map((item) => (
                      <div key={item.id} className="mt-3 rounded-md bg-gray-50 p-2 text-sm whitespace-pre-line">
                        {item.value}
                      </div>
                    ))}
                  </div>
                  
                  <div className="rounded-md border border-gray-200 p-4">
                    <h3 className="text-md font-medium text-gray-900">FAQ List</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Enter your frequently asked questions and answers
                    </p>
                    <div className="mt-3">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const form = e.target as HTMLFormElement;
                          const input = form.elements.namedItem('faq') as HTMLTextAreaElement;
                          handleValueSubmit('content', 'faq', input.value);
                          input.value = '';
                        }}
                        className="flex flex-col"
                      >
                        <textarea
                          name="faq"
                          rows={4}
                          placeholder="Q: Question 1?\nA: Answer 1\n\nQ: Question 2?\nA: Answer 2"
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                        <button
                          type="submit"
                          className="mt-3 inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 self-end"
                        >
                          Save
                        </button>
                      </form>
                    </div>
                    {getItemsByCategory('content').filter(item => item.type === 'faq').map((item) => (
                      <div key={item.id} className="mt-3 rounded-md bg-gray-50 p-2 text-sm whitespace-pre-line">
                        {item.value}
                      </div>
                    ))}
                  </div>
                  
                  <div className="rounded-md border border-gray-200 p-4">
                    <h3 className="text-md font-medium text-gray-900">Testimonials</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Upload testimonials or provide a link to your reviews
                    </p>
                    <div className="mt-3">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const form = e.target as HTMLFormElement;
                          const input = form.elements.namedItem('testimonials') as HTMLInputElement;
                          handleValueSubmit('content', 'testimonials', input.value);
                          input.value = '';
                        }}
                        className="flex"
                      >
                        <input
                          type="text"
                          name="testimonials"
                          placeholder="Link to Google My Business or other review site"
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                        <button
                          type="submit"
                          className="ml-3 inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                          Save
                        </button>
                      </form>
                    </div>
                    <div className="mt-3">
                      <UploadButton
                        endpoint="documentUploader"
                        onClientUploadComplete={(res) => {
                          if (res && res.length > 0) {
                            handleUploadComplete(res[0], 'content', 'testimonials_file');
                          }
                        }}
                        onUploadError={(error: Error) => {
                          console.error('Upload error:', error);
                        }}
                      />
                    </div>
                    {getItemsByCategory('content').filter(item => item.type === 'testimonials').map((item) => (
                      <div key={item.id} className="mt-3 rounded-md bg-gray-50 p-2 text-sm">
                        <a
                          href={item.value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-500"
                        >
                          {item.value}
                        </a>
                      </div>
                    ))}
                    {getItemsByCategory('content').filter(item => item.type === 'testimonials_file').map((item) => (
                      <div key={item.id} className="mt-3 rounded-md bg-gray-50 p-2 text-sm">
                        {item.files && (
                          <a
                            href={item.files.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-500"
                          >
                            {item.files.file_name}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
