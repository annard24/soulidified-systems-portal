import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { POST } from '@/app/api/webhook/ghl/route';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => {
  const mockSelect = vi.fn().mockReturnThis();
  const mockEq = vi.fn().mockReturnThis();
  const mockOr = vi.fn().mockReturnThis();
  const mockOrder = vi.fn().mockReturnThis();
  const mockLimit = vi.fn().mockReturnThis();
  const mockSingle = vi.fn().mockReturnThis();
  const mockInsert = vi.fn().mockReturnThis();
  const mockUpdate = vi.fn().mockReturnThis();
  
  return {
    createClient: () => ({
      from: () => ({
        select: mockSelect,
        eq: mockEq,
        or: mockOr,
        order: mockOrder,
        limit: mockLimit,
        single: mockSingle,
        insert: mockInsert,
        update: mockUpdate
      })
    })
  };
});

describe('GHL Webhook Handler', () => {
  let mockRequest: NextRequest;
  
  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();
  });
  
  it('should validate the webhook payload', async () => {
    // Mock invalid payload
    mockRequest = {
      json: vi.fn().mockResolvedValue({})
    } as unknown as NextRequest;
    
    const response = await POST(mockRequest);
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.error).toBe('Invalid webhook payload');
  });
  
  it('should handle onboarding completed event', async () => {
    // Mock valid onboarding completed payload
    mockRequest = {
      json: vi.fn().mockResolvedValue({
        event: 'onboarding_completed',
        data: {
          subaccount_id: 'sub_123456'
        }
      })
    } as unknown as NextRequest;
    
    // Mock Supabase responses
    const mockClient = {
      data: {
        id: 'client_1',
        name: 'Test Client',
        assigned_pm_id: 'pm_1'
      },
      error: null
    };
    
    const mockNotification = {
      error: null
    };
    
    // Setup mock implementation
    const mockFrom = vi.fn().mockImplementation((table) => {
      if (table === 'clients') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(mockClient)
        };
      } else if (table === 'notifications') {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(mockNotification)
        };
      }
      
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      };
    });
    
    vi.mock('@supabase/supabase-js', () => ({
      createClient: () => ({
        from: mockFrom
      })
    }));
    
    const response = await POST(mockRequest);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.message).toBe('Onboarding completion processed');
  });
  
  it('should handle task status changed event', async () => {
    // Mock valid task status changed payload
    mockRequest = {
      json: vi.fn().mockResolvedValue({
        event: 'task_status_changed',
        data: {
          task_id: 'task_1',
          status: 'completed'
        }
      })
    } as unknown as NextRequest;
    
    // Mock Supabase responses
    const mockTask = {
      data: {
        id: 'task_1',
        title: 'Test Task',
        projects: {
          id: 'project_1',
          client_id: 'client_1'
        }
      },
      error: null
    };
    
    const mockUpdate = {
      error: null
    };
    
    const mockNotification = {
      error: null
    };
    
    // Setup mock implementation
    const mockFrom = vi.fn().mockImplementation((table) => {
      if (table === 'tasks') {
        if (mockFrom.mock.calls.length === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue(mockTask)
          };
        } else {
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue(mockUpdate)
          };
        }
      } else if (table === 'notifications') {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(mockNotification)
        };
      }
      
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      };
    });
    
    vi.mock('@supabase/supabase-js', () => ({
      createClient: () => ({
        from: mockFrom
      })
    }));
    
    const response = await POST(mockRequest);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.message).toBe('Task status update processed');
  });
  
  it('should handle message received event', async () => {
    // Mock valid message received payload
    mockRequest = {
      json: vi.fn().mockResolvedValue({
        event: 'message_received',
        data: {
          from: 'client@example.com',
          message: 'Test message'
        }
      })
    } as unknown as NextRequest;
    
    // Mock Supabase responses
    const mockClient = {
      data: {
        id: 'client_1',
        name: 'Test Client',
        assigned_pm_id: 'pm_1'
      },
      error: null
    };
    
    const mockProject = {
      data: {
        id: 'project_1'
      },
      error: null
    };
    
    const mockMessage = {
      error: null
    };
    
    const mockNotification = {
      error: null
    };
    
    // Setup mock implementation
    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation((table) => {
      callCount++;
      
      if (table === 'clients') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(mockClient)
        };
      } else if (table === 'projects') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(mockProject)
        };
      } else if (table === 'messages') {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(mockMessage)
        };
      } else if (table === 'notifications') {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(mockNotification)
        };
      }
      
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      };
    });
    
    vi.mock('@supabase/supabase-js', () => ({
      createClient: () => ({
        from: mockFrom
      })
    }));
    
    const response = await POST(mockRequest);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.message).toBe('Message processed');
  });
});
