import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { POST } from '@/app/api/webhook/pabbly/route';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => {
  const mockSelect = vi.fn().mockReturnThis();
  const mockEq = vi.fn().mockReturnThis();
  const mockOrder = vi.fn().mockReturnThis();
  const mockLimit = vi.fn().mockReturnThis();
  const mockSingle = vi.fn().mockReturnThis();
  const mockInsert = vi.fn().mockReturnThis();
  
  return {
    createClient: () => ({
      from: () => ({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
        limit: mockLimit,
        single: mockSingle,
        insert: mockInsert
      })
    })
  };
});

describe('Pabbly Webhook Handler', () => {
  let mockRequest: NextRequest;
  
  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();
    
    // Create mock request
    mockRequest = {
      json: vi.fn().mockResolvedValue({
        client: {
          name: 'Test Client',
          email: 'client@example.com',
          phone: '123-456-7890'
        },
        subaccount: {
          id: 'sub_123456'
        }
      })
    } as unknown as NextRequest;
  });
  
  it('should validate the webhook payload', async () => {
    // Mock invalid payload
    mockRequest.json = vi.fn().mockResolvedValue({});
    
    const response = await POST(mockRequest);
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.error).toBe('Invalid webhook payload');
  });
  
  it('should check for existing client', async () => {
    // Mock Supabase response for existing client check
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null
    });
    
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingle
    });
    
    vi.mock('@supabase/supabase-js', () => ({
      createClient: () => ({
        from: mockFrom
      })
    }));
    
    await POST(mockRequest);
    
    expect(mockFrom).toHaveBeenCalledWith('clients');
    expect(mockSingle).toHaveBeenCalled();
  });
  
  it('should create a new client if one does not exist', async () => {
    // Mock Supabase responses
    const mockClientCheck = {
      data: null,
      error: null
    };
    
    const mockTeamMembers = {
      data: [{ id: 'team_1' }, { id: 'team_2' }],
      error: null
    };
    
    const mockLastAssigned = {
      data: [{ assigned_pm_id: 'team_1' }],
      error: null
    };
    
    const mockNewClient = {
      data: { id: 'client_1' },
      error: null
    };
    
    const mockNewProject = {
      data: { id: 'project_1' },
      error: null
    };
    
    const mockNotification = {
      error: null
    };
    
    // Setup mock implementation
    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation((table) => {
      callCount++;
      
      if (table === 'clients' && callCount === 1) {
        // First call - check for existing client
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(mockClientCheck)
        };
      } else if (table === 'users') {
        // Second call - get team members
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(mockTeamMembers)
        };
      } else if (table === 'clients' && callCount === 3) {
        // Third call - get last assigned PM
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(mockLastAssigned)
        };
      } else if (table === 'clients' && callCount === 4) {
        // Fourth call - insert new client
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(mockNewClient)
        };
      } else if (table === 'projects') {
        // Fifth call - create default project
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue(mockNewProject)
        };
      } else if (table === 'notifications') {
        // Sixth call - create notification
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
    expect(data.clientId).toBe('client_1');
    expect(data.projectId).toBe('project_1');
  });
});
