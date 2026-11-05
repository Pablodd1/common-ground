import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useNavigate } from "react-router";

type Mode = "login" | "signup";

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const utils = trpc.useUtils();

  const config = trpc.auth.publicConfig.useQuery();
  const allowedDomains = config.data?.allowedDomains ?? [];

  function handleError(error: { message?: string } | null | undefined) {
    toast.error(error?.message || "No pudimos completar la operación. Inténtalo de nuevo.");
  }

  const loginMutation = trpc.auth.login.useMutation({ onError: handleError });
  const signUpMutation = trpc.auth.signUp.useMutation({ onError: handleError });
  const isPending = loginMutation.isPending || signUpMutation.isPending;

  // A freshly issued session cookie must be visible to auth.me; the query
  // cache from the logged-out state would otherwise still answer null.
  useEffect(() => {
    const mutation = mode === "login" ? loginMutation : signUpMutation;
    if (mutation.isSuccess) {
      void utils.auth.me.invalidate();
      navigate("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loginMutation.isSuccess, signUpMutation.isSuccess]);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (mode === "signup") {
      signUpMutation.mutate({ name, email, password });
    } else {
      loginMutation.mutate({ email, password });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Bienvenido a Unitec Familia</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            La comunidad privada de los colaboradores de UNITEC USA Design.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-1 mb-6" role="tablist" aria-label="Tipo de acceso">
            <Button
              type="button"
              variant={mode === "login" ? "default" : "outline"}
              role="tab"
              aria-selected={mode === "login"}
              onClick={() => setMode("login")}
            >
              Iniciar sesión
            </Button>
            <Button
              type="button"
              variant={mode === "signup" ? "default" : "outline"}
              role="tab"
              aria-selected={mode === "signup"}
              onClick={() => setMode("signup")}
            >
              Crear cuenta
            </Button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Tu nombre</Label>
                <Input
                  id="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={80}
                  placeholder="María González"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Correo de la empresa</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="nombre@unitecusadesign.com"
              />
              {allowedDomains.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Solo correos {allowedDomains.map((d) => `@${d}`).join(", ")}.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={10}
                maxLength={128}
              />
              {mode === "signup" && (
                <p className="text-xs text-muted-foreground">
                  Mínimo 10 caracteres. Guárdala: hoy no hay recuperación de contraseña.
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={isPending}>
              {isPending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : mode === "login" ? (
                <LogIn aria-hidden="true" />
              ) : (
                <UserPlus aria-hidden="true" />
              )}
              {mode === "login" ? "Entrar" : "Crear mi cuenta"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
