import { writable, derived, get } from 'svelte/store';

// Auth user interface
export interface AuthUser {
  id: number;
  username: string;
  email: string;
  isVerified: boolean;
  createdAt: Date;
  lastLogin: Date | null;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Initial state
const initialAuthState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null
};

// Auth store
const authState = writable<AuthState>(initialAuthState);

// Derived stores for easy access
export const user = derived(authState, $state => $state.user);
export const isAuthenticated = derived(authState, $state => $state.isAuthenticated);
export const isLoading = derived(authState, $state => $state.isLoading);
export const authError = derived(authState, $state => $state.error);
export const isVerified = derived(authState, $state => $state.user?.isVerified || false);

// API configuration
const API_BASE = 'http://localhost:3001/api';

// Helper function to make authenticated requests
async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Include cookies for authentication
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  // If unauthorized, clear auth state
  if (response.status === 401) {
    authState.update(state => ({
      ...state,
      user: null,
      isAuthenticated: false,
      error: 'Session expired'
    }));
  }

  return response;
}

// Auth API functions
export const authApi = {
  /**
   * Register a new user
   */
  async register(username: string, email: string, password: string): Promise<{ success: boolean; message?: string; errors?: string[] }> {
    try {
      authState.update(state => ({ ...state, isLoading: true, error: null }));

      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Registration successful but user needs email verification
        authState.update(state => ({
          ...state,
          isLoading: false,
          user: data.user,
          isAuthenticated: false, // Not authenticated until verified
          error: null
        }));

        return { success: true, message: data.message };
      } else {
        authState.update(state => ({
          ...state,
          isLoading: false,
          error: data.message || 'Registration failed'
        }));

        return { 
          success: false, 
          message: data.message,
          errors: data.details || []
        };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      authState.update(state => ({
        ...state,
        isLoading: false,
        error: errorMessage
      }));

      return { success: false, message: errorMessage };
    }
  },

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<{ success: boolean; message?: string }> {
    try {
      authState.update(state => ({ ...state, isLoading: true, error: null }));

      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        authState.update(state => ({
          ...state,
          isLoading: false,
          user: data.user,
          isAuthenticated: true,
          error: null
        }));

        return { success: true, message: data.message };
      } else {
        authState.update(state => ({
          ...state,
          isLoading: false,
          error: data.message || 'Login failed'
        }));

        return { success: false, message: data.message };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      authState.update(state => ({
        ...state,
        isLoading: false,
        error: errorMessage
      }));

      return { success: false, message: errorMessage };
    }
  },

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      await authenticatedFetch(`${API_BASE}/auth/logout`, {
        method: 'POST'
      });
    } catch (error) {
      console.warn('Logout request failed:', error);
    } finally {
      // Always clear local auth state
      authState.set(initialAuthState);
    }
  },

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<{ success: boolean; message?: string }> {
    try {
      authState.update(state => ({ ...state, isLoading: true, error: null }));

      const response = await fetch(`${API_BASE}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token })
      });

      const data = await response.json();

      if (response.ok) {
        authState.update(state => ({
          ...state,
          isLoading: false,
          user: data.user,
          isAuthenticated: true, // Now authenticated after verification
          error: null
        }));

        return { success: true, message: data.message };
      } else {
        authState.update(state => ({
          ...state,
          isLoading: false,
          error: data.message || 'Email verification failed'
        }));

        return { success: false, message: data.message };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      authState.update(state => ({
        ...state,
        isLoading: false,
        error: errorMessage
      }));

      return { success: false, message: errorMessage };
    }
  },

  /**
   * Resend verification email
   */
  async resendVerification(email: string): Promise<{ success: boolean; message?: string }> {
    try {
      authState.update(state => ({ ...state, isLoading: true, error: null }));

      const response = await fetch(`${API_BASE}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      authState.update(state => ({ ...state, isLoading: false }));

      return {
        success: response.ok,
        message: data.message
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      authState.update(state => ({
        ...state,
        isLoading: false,
        error: errorMessage
      }));

      return { success: false, message: errorMessage };
    }
  },

  /**
   * Check current authentication status
   */
  async checkAuth(): Promise<void> {
    try {
      const response = await authenticatedFetch(`${API_BASE}/auth/me`);

      if (response.ok) {
        const data = await response.json();
        authState.update(state => ({
          ...state,
          user: data.user,
          isAuthenticated: true,
          error: null
        }));
      } else {
        // Not authenticated or session expired
        authState.set(initialAuthState);
      }

    } catch (error) {
      console.warn('Auth check failed:', error);
      authState.set(initialAuthState);
    }
  },

  /**
   * Migrate localStorage stats to user account
   */
  async migrateStats(localStats: any): Promise<{ success: boolean; message?: string; migrated?: boolean }> {
    try {
      const response = await authenticatedFetch(`${API_BASE}/user/migrate-stats`, {
        method: 'POST',
        body: JSON.stringify(localStats)
      });

      const data = await response.json();

      if (response.ok) {
        return { 
          success: true, 
          message: data.message,
          migrated: data.migrated 
        };
      } else {
        return { 
          success: false, 
          message: data.message || 'Stats migration failed'
        };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      return { success: false, message: errorMessage };
    }
  },

  /**
   * Get user's current stats from database
   */
  async getUserStats(): Promise<{ success: boolean; stats?: any; message?: string }> {
    try {
      const response = await authenticatedFetch(`${API_BASE}/user/stats`);
      const data = await response.json();

      if (response.ok) {
        return { 
          success: true, 
          stats: data.stats 
        };
      } else {
        return { 
          success: false, 
          message: data.message || 'Failed to get user stats'
        };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      return { success: false, message: errorMessage };
    }
  },

  /**
   * Update user stats in database
   */
  async updateUserStats(stats: any): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await authenticatedFetch(`${API_BASE}/user/update-stats`, {
        method: 'POST',
        body: JSON.stringify(stats)
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, message: data.message };
      } else {
        return { 
          success: false, 
          message: data.message || 'Failed to update stats'
        };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      return { success: false, message: errorMessage };
    }
  }
};

/**
 * Initialize auth state on app startup
 */
export function initializeAuth(): void {
  if (typeof window !== 'undefined') {
    // Check authentication status on startup
    authApi.checkAuth();
  }
}

/**
 * Clear any auth error
 */
export function clearAuthError(): void {
  authState.update(state => ({ ...state, error: null }));
}