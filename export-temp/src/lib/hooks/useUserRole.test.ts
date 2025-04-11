import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUserRole } from '@/lib/hooks/useUserRole';
import { renderHook, waitFor } from '@testing-library/react';

// Mock Clerk hooks
vi.mock('@clerk/nextjs', () => ({
  useAuth: vi.fn().mockReturnValue({
    userId: 'user_123'
  }),
  useUser: vi.fn().mockReturnValue({
    user: {
      id: 'user_123',
      fullName: 'Test User',
      firstName: 'Test',
      lastName: 'User',
      primaryEmailAddress: {
        emailAddress: 'test@example.com'
      }
    }
  })
}));

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn()
  }
}));

describe('useUserRole Hook', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  
  it('should return null role and loading state initially', () => {
    const { result } = renderHook(() => useUserRole());
    
    expect(result.current.role).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });
  
  it('should fetch user role from database if user exists', async () => {
    // Mock Supabase response for existing user
    const mockSingle = vi.fn().mockResolvedValue({
      data: { role: 'admin' },
      error: null
    });
    
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingle
    });
    
    vi.mock('@/lib/supabase/client', () => ({
      supabase: {
        from: mockFrom
      }
    }));
    
    const { result } = renderHook(() => useUserRole());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(mockFrom).toHaveBeenCalledWith('users');
    expect(mockSingle).toHaveBeenCalled();
    expect(result.current.role).toBe('admin');
  });
  
  it('should create new user if user does not exist in database', async () => {
    // Mock Supabase response for non-existing user
    const mockSingleFirst = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST116' }
    });
    
    const mockInsert = vi.fn().mockReturnThis();
    const mockSingleSecond = vi.fn().mockResolvedValue({
      data: { role: 'client' },
      error: null
    });
    
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingleFirst,
      insert: mockInsert
    });
    
    // After insert, return the new user
    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      single: mockSingleSecond
    });
    
    vi.mock('@/lib/supabase/client', () => ({
      supabase: {
        from: mockFrom
      }
    }));
    
    const { result } = renderHook(() => useUserRole());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(mockFrom).toHaveBeenCalledWith('users');
    expect(mockInsert).toHaveBeenCalled();
    expect(result.current.role).toBe('client');
  });
  
  it('should handle errors when fetching user role', async () => {
    // Mock Supabase error response
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Database error' }
    });
    
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingle
    });
    
    vi.mock('@/lib/supabase/client', () => ({
      supabase: {
        from: mockFrom
      }
    }));
    
    // Mock console.error to prevent test output pollution
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const { result } = renderHook(() => useUserRole());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(result.current.role).toBeNull();
    
    consoleErrorSpy.mockRestore();
  });
});
