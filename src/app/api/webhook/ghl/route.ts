import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client with environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    // Get the webhook payload from GHL
    const payload = await req.json();
    
    // Log the incoming webhook for debugging
    console.log('Received webhook from GHL:', JSON.stringify(payload));
    
    // Validate the webhook payload
    if (!payload || !payload.event || !payload.data) {
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      );
    }
    
    // Handle different event types from GHL
    const { event, data } = payload;
    
    switch (event) {
      case 'onboarding_completed':
        // Handle onboarding completion event
        return handleOnboardingCompleted(data);
        
      case 'task_status_changed':
        // Handle task status change event
        return handleTaskStatusChanged(data);
        
      case 'message_received':
        // Handle new message event
        return handleMessageReceived(data);
        
      default:
        return NextResponse.json(
          { error: 'Unsupported event type' },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('Error processing GHL webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleOnboardingCompleted(data: any) {
  try {
    // Find the client by subaccount_id
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('subaccount_id', data.subaccount_id)
      .single();
      
    if (clientError) {
      console.error('Error finding client:', clientError);
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }
    
    // Update client status or create notification
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: client.assigned_pm_id,
        title: 'Onboarding Completed',
        content: `${client.name} has completed their GHL onboarding form.`,
        type: 'approval_needed',
        related_id: client.id
      });
      
    if (notifError) {
      console.error('Error creating notification:', notifError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Onboarding completion processed'
    });
  } catch (error) {
    console.error('Error handling onboarding completion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleTaskStatusChanged(data: any) {
  try {
    // Find the task by external_id (if you're storing GHL task IDs)
    // or by other matching criteria
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*, projects(*)')
      .eq('id', data.task_id)
      .single();
      
    if (taskError) {
      console.error('Error finding task:', taskError);
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    // Update task status
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ status: mapGhlStatusToInternal(data.status) })
      .eq('id', data.task_id);
      
    if (updateError) {
      console.error('Error updating task:', updateError);
      return NextResponse.json(
        { error: 'Failed to update task' },
        { status: 500 }
      );
    }
    
    // Create notification for relevant users
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: task.projects.client_id, // Notify client
        title: 'Task Status Updated',
        content: `Task "${task.title}" has been updated to ${data.status}.`,
        type: 'task_assigned',
        related_id: task.id
      });
      
    if (notifError) {
      console.error('Error creating notification:', notifError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Task status update processed'
    });
  } catch (error) {
    console.error('Error handling task status change:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleMessageReceived(data: any) {
  try {
    // Find the client by phone number or email
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .or(`contact_phone.eq.${data.from},contact_email.eq.${data.from}`)
      .single();
      
    if (clientError) {
      console.error('Error finding client:', clientError);
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }
    
    // Get the client's active project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (projectError) {
      console.error('Error finding project:', projectError);
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // Create a message in the system
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        sender_id: client.id,
        content: data.message,
        project_id: project.id,
        is_read: false
      });
      
    if (messageError) {
      console.error('Error creating message:', messageError);
      return NextResponse.json(
        { error: 'Failed to create message' },
        { status: 500 }
      );
    }
    
    // Create notification for the PM
    if (client.assigned_pm_id) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: client.assigned_pm_id,
          title: 'New Message',
          content: `New message from ${client.name}: "${data.message.substring(0, 50)}${data.message.length > 50 ? '...' : ''}"`,
          type: 'message',
          related_id: project.id
        });
        
      if (notifError) {
        console.error('Error creating notification:', notifError);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Message processed'
    });
  } catch (error) {
    console.error('Error handling message received:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to map GHL status to internal status
function mapGhlStatusToInternal(ghlStatus: string): string {
  const statusMap: Record<string, string> = {
    'not_started': 'to_do',
    'in_progress': 'in_progress',
    'waiting': 'needs_review',
    'completed': 'complete'
  };
  
  return statusMap[ghlStatus] || 'to_do';
}
