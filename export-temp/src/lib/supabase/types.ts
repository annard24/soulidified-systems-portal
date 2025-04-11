// Database types for the Client Project Portal

export type UserRole = 'admin' | 'team_member' | 'client';

export type ProjectStatus = 'planning' | 'in_progress' | 'review' | 'completed';

export type TaskStatus = 'to_do' | 'in_progress' | 'needs_review' | 'complete';

export type OnboardingCategory = 'branding' | 'access_credentials' | 'legal' | 'content';

export type NotificationType = 'task_assigned' | 'approval_needed' | 'missing_data' | 'project_completed' | 'message';

export interface User {
  id: string;
  clerk_id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  contact_email?: string;
  contact_phone?: string;
  subaccount_id?: string;
  assigned_pm_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  client_id: string;
  due_date?: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  due_date?: string;
  assignee_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface File {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  uploader_id?: string;
  project_id: string;
  task_id?: string;
  created_at: string;
}

export interface Credential {
  id: string;
  service_name: string;
  username: string;
  password: string;
  additional_info?: string;
  project_id: string;
  created_at: string;
  updated_at: string;
}

export interface OnboardingItem {
  id: string;
  type: string;
  category: OnboardingCategory;
  value?: string;
  file_id?: string;
  client_id: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  content: string;
  project_id: string;
  thread_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  content: string;
  type: NotificationType;
  is_read: boolean;
  related_id?: string;
  created_at: string;
}

// Database response types
export type Tables = {
  users: User;
  clients: Client;
  projects: Project;
  tasks: Task;
  task_comments: TaskComment;
  files: File;
  credentials: Credential;
  onboarding_items: OnboardingItem;
  messages: Message;
  notifications: Notification;
};
