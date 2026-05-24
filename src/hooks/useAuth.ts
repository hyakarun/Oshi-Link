import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [disputeWarning, setDisputeWarning] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const checkAuth = useCallback(async () => {
    const saved = localStorage.getItem('oshi_session');
    if (saved) {
      setSessionToken(saved);
      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${saved}` },
        });
        if (res.ok) {
          const data = await res.json() as { user?: User; dispute_warning?: boolean };
          if (data.user) {
            setUser(data.user);
            if (data.dispute_warning) {
              setDisputeWarning(true);
            }
            setIsAuthChecking(false);
            return;
          }
        } else {
          const data = await res.json() as { error?: string };
          if (data.error) {
            alert(data.error);
          }
        }
        localStorage.removeItem('oshi_session');
        setSessionToken(null);
      } catch (err: any) {
        alert('auth_me_catch_error: ' + err.message);
      }
    }
    setIsAuthChecking(false);
    router.push('/login');
  }, [router]);

  useEffect(() => {
    if (mounted) {
      checkAuth();
    }
  }, [mounted, checkAuth]);

  const authHeaders = useCallback((): Record<string, string> => {
    const token = sessionToken || (typeof window !== 'undefined' ? localStorage.getItem('oshi_session') : null);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }, [sessionToken]);

  const logout = useCallback(async () => {
    const headers = authHeaders();
    await fetch('/api/auth/me', { method: 'DELETE', headers });
    localStorage.removeItem('oshi_session');
    setUser(null);
    setSessionToken(null);
    router.push('/login');
  }, [authHeaders, router]);

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>, onSuccess?: () => void) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get('name'),
      notifications_enabled: fd.get('notifications_enabled') === 'on',
      email_enabled: fd.get('email_enabled') === 'on',
    };
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await checkAuth();
        if (onSuccess) onSuccess();
      }
    } catch {}
    setLoading(false);
  };

  return {
    user,
    setUser,
    sessionToken,
    isAuthChecking,
    mounted,
    checkAuth,
    authHeaders,
    logout,
    loading,
    handleProfileUpdate,
    disputeWarning,
    setDisputeWarning
  };
}
