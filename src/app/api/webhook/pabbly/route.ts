import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client with environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    // Get the webhook payload from Pabbly
    const payload = await req.json();
    
    // Log the incoming webhook for debugging
    console.log('Received webhook from Pabbly:', JSON.stringify(payload));
    
    // Validate the webhook payload
    if (!payload || !payload.client || !payload.subaccount) {
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      );
    }
    
    // Extract client information from the payload
    const { client, subaccount } = payload;
    
    // Check if client with this subaccount_id already exists
    const { data: existingClient, error: checkError } = await supabase
      .from('clients')
      .select('id')
      .eq('subaccount_id', subaccount.id)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking for existing client:', checkError);
      return NextResponse.json(
        { error: 'Database error when checking for existing client' },
        { status: 500 }
      );
    }
    
    // If client already exists, return success
    if (existingClient) {
      return NextResponse.json({
        success: true,
        message: 'Client already exists',
        clientId: existingClient.id
      });
    }
    
    // Get team members with role 'team_member' for PM assignment
    const { data: teamMembers, error: teamError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'team_member');
      
    if (teamError) {
      console.error('Error fetching team members:', teamError);
      return NextResponse.json(
        { error: 'Database error when fetching team members' },
        { status: 500 }
      );
    }
    
    // Implement round-robin PM assignment if team members exist
    let assignedPmId = null;
    
    if (teamMembers && teamMembers.length > 0) {
      // Get the last assigned PM to implement round-robin
      const { data: lastAssigned, error: lastError } = await supabase
        .from('clients')
        .select('assigned_pm_id')
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (!lastError && lastAssigned && lastAssigned.length > 0) {
        const lastPmId = lastAssigned[0].assigned_pm_id;
        
        if (lastPmId) {
          // Find the index of the last assigned PM
          const lastIndex = teamMembers.findIndex(tm => tm.id === lastPmId);
          
          // Get the next PM in the list (or the first if we're at the end)
          const nextIndex = (lastIndex + 1) % teamMembers.length;
          assignedPmId = teamMembers[nextIndex].id;
        } else {
          // If last client had no PM, assign the first team member
          assignedPmId = teamMembers[0].id;
        }
      } else {
        // If no clients exist yet or there was an error, assign the first team member
        assignedPmId = teamMembers[0].id;
      }
    }
    
    // Create the new client record
    const { data: newClient, error: insertError } = await supabase
      .from('clients')
      .insert({
        name: client.name || 'New Client',
        contact_email: client.email,
        contact_phone: client.phone,
        subaccount_id: subaccount.id,
        assigned_pm_id: assignedPmId
      })
      .select()
      .single();
      
    if (insertError) {
      console.error('Error creating client:', insertError);
      return NextResponse.json(
        { error: 'Database error when creating client' },
        { status: 500 }
      );
    }
    
    // Create a default project for the client
    const { data: newProject, error: projectError } = await supabase
      .from('projects')
      .insert({
        title: 'Initial Setup',
        description: 'Initial project setup for new client',
        client_id: newClient.id,
        status: 'planning'
      })
      .select()
      .single();
      
    if (projectError) {
      console.error('Error creating default project:', projectError);
      // Continue even if project creation fails
    }
    
    // Create a notification for the assigned PM if one was assigned
    if (assignedPmId) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: assignedPmId,
          title: 'New Client Assigned',
          content: `You have been assigned as the Project Manager for ${client.name || 'a new client'}.`,
          type: 'task_assigned',
          related_id: newClient.id
        });
        
      if (notifError) {
        console.error('Error creating notification:', notifError);
        // Continue even if notification creation fails
      }
    }
    
    // Return success response with the new client ID
    return NextResponse.json({
      success: true,
      message: 'Client created successfully',
      clientId: newClient.id,
      projectId: newProject?.id || null
    });
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
