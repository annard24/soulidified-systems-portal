import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RoleGuard from '@/components/auth/role-guard';

// Mock useUserRole hook
vi.mock('@/lib/hooks/useUserRole', () => ({
  useUserRole: vi.fn()
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn()
}));

import { useUserRole } from '@/lib/hooks/useUserRole';
import { redirect } from 'next/navigation';

describe('RoleGuard Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  
  it('should show loading state when isLoading is true', () => {
    // Mock useUserRole to return loading state
    (useUserRole as jest.Mock).mockReturnValue({
      role: null,
      isLoading: true
    });
    
    render(
      <RoleGuard allowedRoles={['admin']}>
        <div>Protected Content</div>
      </RoleGuard>
    );
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
  
  it('should render children when user has allowed role', () => {
    // Mock useUserRole to return admin role
    (useUserRole as jest.Mock).mockReturnValue({
      role: 'admin',
      isLoading: false
    });
    
    render(
      <RoleGuard allowedRoles={['admin', 'team_member']}>
        <div>Protected Content</div>
      </RoleGuard>
    );
    
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });
  
  it('should redirect when user does not have allowed role', () => {
    // Mock useUserRole to return client role
    (useUserRole as jest.Mock).mockReturnValue({
      role: 'client',
      isLoading: false
    });
    
    render(
      <RoleGuard allowedRoles={['admin', 'team_member']}>
        <div>Protected Content</div>
      </RoleGuard>
    );
    
    expect(redirect).toHaveBeenCalledWith('/dashboard');
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
  
  it('should redirect to custom path when specified', () => {
    // Mock useUserRole to return client role
    (useUserRole as jest.Mock).mockReturnValue({
      role: 'client',
      isLoading: false
    });
    
    render(
      <RoleGuard allowedRoles={['admin']} redirectTo="/custom-path">
        <div>Protected Content</div>
      </RoleGuard>
    );
    
    expect(redirect).toHaveBeenCalledWith('/custom-path');
  });
  
  it('should redirect when role is null', () => {
    // Mock useUserRole to return null role
    (useUserRole as jest.Mock).mockReturnValue({
      role: null,
      isLoading: false
    });
    
    render(
      <RoleGuard allowedRoles={['admin']}>
        <div>Protected Content</div>
      </RoleGuard>
    );
    
    expect(redirect).toHaveBeenCalledWith('/dashboard');
  });
});
