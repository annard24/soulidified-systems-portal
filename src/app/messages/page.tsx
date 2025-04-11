"use client";

import AuthGuard from "@/components/auth/auth-guard";
import Navbar from "@/components/layout/navbar";
import { supabase } from "@/lib/supabase/client";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function MessagesPage() {
  return (
    <AuthGuard>
      <MessagesContent />
    </AuthGuard>
  );
}

function MessagesContent() {
  const { user } = useUser();
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    async function fetchMessages() {
      if (!user) return;

      try {
        setIsLoading(true);
        
        // Get projects for the user
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select('*')
          .order('updated_at', { ascending: false });
          
        if (projectsError) {
          console.error('Error fetching projects:', projectsError);
        } else {
          setProjects(projectsData || []);
          
          // If there are projects, get messages for the first project
          if (projectsData && projectsData.length > 0) {
            setSelectedThread(projectsData[0].id);
            await fetchThreadMessages(projectsData[0].id);
          }
        }
        
        // Get all messages grouped by thread/project
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select(`
            id,
            content,
            created_at,
            is_read,
            sender_id,
            project_id,
            projects:project_id (
              id,
              title
            )
          `)
          .order('created_at', { ascending: false });
          
        if (messagesError) {
          console.error('Error fetching messages:', messagesError);
        } else {
          // Group messages by project
          const groupedMessages: Record<string, any[]> = {};
          
          messagesData?.forEach(message => {
            if (!groupedMessages[message.project_id]) {
              groupedMessages[message.project_id] = [];
            }
            groupedMessages[message.project_id].push(message);
          });
          
          // Convert to array of thread summaries
          const threadSummaries = Object.keys(groupedMessages).map(projectId => {
            const messages = groupedMessages[projectId];
            const latestMessage = messages[0];
            const unreadCount = messages.filter(m => !m.is_read).length;
            
            return {
              projectId,
              projectTitle: latestMessage.projects?.title || 'Unknown Project',
              latestMessage: latestMessage.content,
              timestamp: latestMessage.created_at,
              unreadCount
            };
          });
          
          setMessages(threadSummaries);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchMessages();
  }, [user]);
  
  async function fetchThreadMessages(threadId: string) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id (
            id,
            name,
            email
          )
        `)
        .eq('project_id', threadId)
        .order('created_at', { ascending: true });
        
      if (error) {
        console.error('Error fetching thread messages:', error);
        return;
      }
      
      setThreadMessages(data || []);
      
      // Mark messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('project_id', threadId)
        .neq('sender_id', user?.id);
    } catch (error) {
      console.error('Error fetching thread messages:', error);
    }
  }
  
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedThread || !user) return;
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          content: newMessage,
          project_id: selectedThread,
          sender_id: user.id
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error sending message:', error);
        return;
      }
      
      // Add sender info to the new message
      const messageWithSender = {
        ...data,
        sender: {
          id: user.id,
          name: user.fullName || `${user.firstName} ${user.lastName}`,
          email: user.primaryEmailAddress?.emailAddress
        }
      };
      
      // Update thread messages
      setThreadMessages([...threadMessages, messageWithSender]);
      
      // Clear input
      setNewMessage("");
      
      // Update thread list with new latest message
      setMessages(prevMessages => {
        const updatedMessages = [...prevMessages];
        const threadIndex = updatedMessages.findIndex(t => t.projectId === selectedThread);
        
        if (threadIndex !== -1) {
          updatedMessages[threadIndex] = {
            ...updatedMessages[threadIndex],
            latestMessage: newMessage,
            timestamp: new Date().toISOString()
          };
        }
        
        return updatedMessages;
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }
  
  function handleThreadSelect(threadId: string) {
    setSelectedThread(threadId);
    fetchThreadMessages(threadId);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
            <p className="mt-1 text-sm text-gray-500">
              Communicate with your team and clients
            </p>
          </div>
          
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-gray-900"></div>
              <span className="ml-2">Loading messages...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Message Threads */}
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="text-lg font-medium text-gray-900">Conversations</h2>
                
                {messages.length > 0 ? (
                  <div className="mt-6 divide-y divide-gray-200">
                    {messages.map((thread) => (
                      <button
                        key={thread.projectId}
                        onClick={() => handleThreadSelect(thread.projectId)}
                        className={`w-full py-4 text-left ${
                          selectedThread === thread.projectId
                            ? 'bg-indigo-50'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-gray-900">{thread.projectTitle}</h3>
                          <span className="text-xs text-gray-500">
                            {new Date(thread.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500 line-clamp-1">
                          {thread.latestMessage}
                        </p>
                        {thread.unreadCount > 0 && (
                          <span className="mt-2 inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                            {thread.unreadCount} new
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-6 rounded-md bg-gray-50 p-4 text-center">
                    <p className="text-sm text-gray-500">No messages yet.</p>
                  </div>
                )}
              </div>
              
              {/* Message Thread */}
              <div className="lg:col-span-2">
                {selectedThread ? (
                  <div className="flex h-full flex-col rounded-lg bg-white shadow">
                    {/* Thread Header */}
                    <div className="border-b border-gray-200 p-4">
                      <h2 className="text-lg font-medium text-gray-900">
                        {projects.find(p => p.id === selectedThread)?.title || 'Project Conversation'}
                      </h2>
                    </div>
                    
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4">
                      <div className="space-y-4">
                        {threadMessages.length > 0 ? (
                          threadMessages.map((message) => {
                            const isCurrentUser = message.sender_id === user?.id;
                            
                            return (
                              <div
                                key={message.id}
                                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                              >
                                <div
                                  className={`max-w-xs rounded-lg px-4 py-2 ${
                                    isCurrentUser
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-gray-100 text-gray-900'
                                  }`}
                                >
                                  {!isCurrentUser && (
                                    <p className="text-xs font-medium">
                                      {message.sender?.name || 'Unknown User'}
                                    </p>
                                  )}
                                  <p className="text-sm">{message.content}</p>
                                  <p
                                    className={`mt-1 text-right text-xs ${
                                      isCurrentUser ? 'text-indigo-200' : 'text-gray-500'
                                    }`}
                                  >
                                    {new Date(message.created_at).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="flex h-64 items-center justify-center">
                            <p className="text-sm text-gray-500">No messages in this conversation yet.</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Message Input */}
                    <div className="border-t border-gray-200 p-4">
                      <form onSubmit={handleSendMessage} className="flex">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type your message..."
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                        <button
                          type="submit"
                          className="ml-3 inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
                        >
                          Send
                        </button>
                      </form>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-lg bg-white p-6 shadow">
                    <p className="text-gray-500">Select a conversation to view messages</p>
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
