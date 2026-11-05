import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { MailCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { trpc } from "@/providers/trpc";
import { isAllowedEmail } from "@contracts/constants";

export default function Login() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(params.get("error") === "dominio" ? "Ese correo no pertenece a un dominio autorizado de la empresa. Usa tu correo corporativo." : null);
  const config = trpc.auth.config.useQuery();
  const domains = config.data?.allowedEmailDomains ?? [];

  // Si ya hay una sesión válida (por ejemplo, al volver del enlace), entra directo.
  useEffect(() => {
    if (params.get("error") === "dominio") void supabase.auth.signOut();
    else void supabase.auth.getSession().then(({ data }) => { if (data.session) navigate("/"); });
  }, [navigate, params]);

  async function sendLink(event: React.FormEvent) {
    event.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!isAllowedEmail(clean, domains)) {
      setError(domains.length ? `Usa tu correo de la empresa (${domains.map((domain) => `@${domain}`).join(", ")}).` : "El acceso aún no está configurado. Un administrador debe definir ALLOWED_EMAIL_DOMAINS.");
      return;
    }
    setError(null);
    setStatus("sending");
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { emailRedirectTo: window.location.origin, shouldCreateUser: true },
    });
    if (sendError) {
      setStatus("idle");
      setError(sendError.status === 429 ? "Ya enviamos varios enlaces. Espera unos minutos e inténtalo de nuevo." : `No pudimos enviar el enlace: ${sendError.message}`);
      return;
    }
    setStatus("sent");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Bienvenido a Unitec Familia</CardTitle>
          <CardDescription>Ingresa con tu correo de la empresa. Te enviaremos un enlace de acceso; no necesitas contraseña.</CardDescription>
        </CardHeader>
        <CardContent>
          {!supabaseConfigured && <p className="text-sm text-red-700 mb-3">Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.</p>}
          {status === "sent" ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <MailCheck className="h-10 w-10" />
              <p><strong>Revisa tu correo.</strong> Enviamos un enlace a {email.trim().toLowerCase()}. Ábrelo para entrar (el enlace vence pronto).</p>
              <Button variant="outline" onClick={() => setStatus("idle")}>Usar otro correo</Button>
            </div>
          ) : (
            <form className="flex flex-col gap-3" onSubmit={sendLink}>
              <Label htmlFor="login-email">Correo de la empresa</Label>
              <Input id="login-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder={domains[0] ? `nombre@${domains[0]}` : "nombre@empresa.com"} />
              {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
              <Button className="w-full" size="lg" type="submit" disabled={status === "sending" || !supabaseConfigured}>
                {status === "sending" ? "Enviando…" : "Enviarme el enlace de acceso"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
