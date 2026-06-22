import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/types';
import { setBootstrapCache, type BootstrapPayload } from '@/lib/bootstrap-cache';

type CheckAuthOptions = {
  /** プロフィール再取得など、ユーザー情報のみ必要なとき */
  userOnly?: boolean;
};

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

  const checkAuth = useCallback(async (options?: CheckAuthOptions) => {
    const saved = localStorage.getItem('oshi_session');
    if (saved) {
      setSessionToken(saved);
      try {
        const userOnly = options?.userOnly === true;
        const url = userOnly ? '/api/auth/me' : '/api/bootstrap';
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${saved}` },
        });
        if (res.ok) {
          const data = await res.json() as {
            user?: User;
            dispute_warning?: boolean;
            groups?: BootstrapPayload['groups'];
            events?: BootstrapPayload['events'];
            news?: BootstrapPayload['news'];
          };
          if (data.user) {
            setUser(data.user);
            if (data.dispute_warning) {
              setDisputeWarning(true);
            }
            if (!userOnly && data.groups && data.events) {
              setBootstrapCache({
                user: data.user,
                dispute_warning: data.dispute_warning,
                groups: data.groups,
                events: data.events,
                news: data.news,
              });
            }
            setIsAuthChecking(false);
            return;
          }
        } else {
          const errData = await res.json().catch(() => ({})) as { error?: string };
          if (errData.error) {
            alert(errData.error);
          }
        }
        localStorage.removeItem('oshi_session');
        setSessionToken(null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        alert('auth_me_catch_error: ' + message);
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
      notification_timing: fd.get('notification_timing') || '10m',
    };
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await checkAuth({ userOnly: true });
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
