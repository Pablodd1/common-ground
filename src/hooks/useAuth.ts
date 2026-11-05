import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import type { Session } from "@supabase/supabase-js";
import { trpc, queryClient } from "@/providers/trpc";
import { supabase } from "@/lib/supabase";
import { LOGIN_PATH } from "@/const";

type UseAuthOptions = { redirectOnUnauthenticated?: boolean; redirectPath?: string };

/** Sesión de Supabase Auth + perfil de la app. */
export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = LOGIN_PATH } = options ?? {};
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setSessionLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setSessionLoading(false);
      // Un token nuevo puede cambiar el usuario: limpia los datos en caché.
      if (!next) queryClient.clear();
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  const me = trpc.auth.me.useQuery(undefined, { enabled: Boolean(session), staleTime: 5 * 60 * 1000, retry: false });
  const domainRejected = me.error?.data?.code === "FORBIDDEN";

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate(redirectPath);
  }, [navigate, redirectPath]);

  const isLoading = sessionLoading || (Boolean(session) && me.isLoading);
  const user = session ? me.data ?? null : null;

  useEffect(() => {
    if (redirectOnUnauthenticated && !isLoading && !user && window.location.pathname !== redirectPath) {
      navigate(domainRejected ? `${redirectPath}?error=dominio` : redirectPath);
    }
  }, [redirectOnUnauthenticated, isLoading, user, navigate, redirectPath, domainRejected]);

  return useMemo(() => ({
    user,
    session,
    isAuthenticated: Boolean(user),
    isLoading,
    domainRejected,
    error: me.error,
    logout,
    refresh: me.refetch,
  }), [user, session, isLoading, domainRejected, me.error, logout, me.refetch]);
}
