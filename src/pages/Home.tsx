import { CommunityApp } from "@/components/community/CommunityApp";
import { useAuth } from "@/hooks/useAuth";
import { LOGIN_PATH } from "@/const";

export default function Home() {
  const { isLoading, isAuthenticated, logout } = useAuth({ redirectOnUnauthenticated: true, redirectPath: LOGIN_PATH });
  if (isLoading || !isAuthenticated) return <div className="app-loading"><div className="loading-mark" /><p>Abriendo Common Ground…</p></div>;
  return <CommunityApp onLogout={logout} />;
}
