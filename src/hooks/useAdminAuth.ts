import { useCallback, useEffect, useState } from 'react';
import { adminLogin, listBonus } from '../api/admin';

type AuthState = {
  authed: boolean | null;
  loginBusy: boolean;
  loginError: string | null;
};

export function useAdminAuth(): AuthState & {
  login: (password: string) => Promise<void>;
  setAuthed: (v: boolean) => void;
} {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const probe = useCallback(async (): Promise<boolean> => {
    try {
      await listBonus();
      return true;
    } catch (err) {
      if ((err as { status?: number }).status === 401) return false;
      throw err;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void probe().then((ok) => {
      if (!cancelled) setAuthed(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [probe]);

  const login = useCallback(async (password: string): Promise<void> => {
    setLoginBusy(true);
    setLoginError(null);
    try {
      await adminLogin(password);
      setAuthed(true);
    } catch (err) {
      setLoginError((err as Error).message || 'Login failed');
    } finally {
      setLoginBusy(false);
    }
  }, []);

  return { authed, loginBusy, loginError, login, setAuthed };
}
