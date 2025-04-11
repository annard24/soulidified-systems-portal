import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthGuard from '@/components/auth/auth-guard';

// Mock useAuth hook from Clerk
vi.mock('@clerk/nextjs', () => ({
  useAuth: vi.fn()
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn()
}));

import { useAuth } from '@clerk/nextjs';
import { redirect } from 'next/navigation';

describe('AuthGuard Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  
  it('should show loading state when auth is not loaded', () => {
    // Mock useAuth to return not loaded state
    (useAuth as jest.Mock).mockReturnValue({
      isLoaded: false,
      isSignedIn: false
    });
    
    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );
    
    expect(screen.getByText('Loading authentication...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
  
  it('should render children when user is signed in', () => {
    // Mock useAuth to return signed in state
    (useAuth as jest.Mock).mockReturnValue({
      isLoaded: true,
      isSignedIn: true
    });
    
    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );
    
    expect(screen.queryByText('Loading authentication...')).not.toBeInTheDocument();
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });
  
  it('should redirect to sign-in when user is not signed in', async () => {
    // Mock useAuth to return not signed in state
    (useAuth as jest.Mock).mockReturnValue({
      isLoaded: true,
      isSignedIn: false
    });
    
    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );
    
    // Wait for useEffect to run
    await waitFor(() => {
      expect(redirect).toHaveBeenCalledWith('/sign-in');
    });
    
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
