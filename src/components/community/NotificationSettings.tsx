// "Avisos" section of the profile editor: @handle, e-mail toggle and the
// Telegram connect flow (one-time code → t.me deep link).
import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NotificationSettings({ handle }: { handle?: string | null }) {
  const utils = trpc.useUtils();
  const settings = trpc.notifications.settings.useQuery();
  const update = trpc.notifications.updateSettings.useMutation({
    onSuccess: async () => {
      toast.success("Preferencias de avisos guardadas");
      await Promise.all([
        utils.notifications.settings.invalidate(),
        utils.community.me.invalidate(),
        utils.community.people.invalidate(),
      ]);
    },
    onError: (error) => toast.error(error.message),
  });
  const link = trpc.notifications.telegramLink.useMutation({
    onError: (error) => toast.error(error.message),
  });

  const [handleDraft, setHandleDraft] = useState(handle ?? "");
  const current = settings.data;

  return (
    <div className="privacy-options notification-settings">
      <span>
        <strong>AVISOS Y MENCIONES</strong>
        <small>Cuando alguien escriba <code>@tu_usuario</code> en una publicación, comentario o mensaje, te llega un aviso aquí{current?.notifyByEmail ? " y por correo" : ""}{current?.telegramLinked ? " y por Telegram" : ""}.</small>
      </span>

      <div className="form-grid" style={{ marginTop: "0.75rem" }}>
        <div className="field">
          <Label htmlFor="mention-handle">Tu @usuario</Label>
          <Input
            id="mention-handle"
            value={handleDraft}
            onChange={(e) => setHandleDraft(e.target.value.toLowerCase())}
            placeholder="maria.gonzalez"
            maxLength={40}
          />
          <small>Letras, números, punto, guion y guion bajo.</small>
        </div>
      </div>

      <label className="settings-row">
        <input
          type="checkbox"
          checked={current?.notifyByEmail ?? true}
          onChange={(e) => update.mutate({ notifyByEmail: e.target.checked })}
        />
        <span><strong>Avisos por correo</strong><small>Se envían a la dirección de tu cuenta.</small></span>
      </label>

      <div className="settings-row telegram-row">
        <span>
          <strong>Avisos por Telegram</strong>
          {current?.telegramLinked ? (
            <small className="ok"><CheckCircle2 /> Conectado: recibirás avisos al instante.</small>
          ) : current?.telegramConfigured ? (
            <small>Conecta tu chat para recibir menciones y tickets al instante.</small>
          ) : (
            <small>El administrador aún no ha configurado Telegram en el servidor.</small>
          )}
        </span>
        {!current?.telegramLinked && current?.telegramConfigured && (
          link.data ? (
            <div className="telegram-connect">
              <Button asChild variant="outline">
                <a href={link.data.url} target="_blank" rel="noreferrer"><Send />Abrir Telegram</a>
              </Button>
              <small>o envía <code>/start {link.data.code}</code> al bot</small>
            </div>
          ) : (
            <Button variant="outline" onClick={() => link.mutate()} disabled={link.isPending}>
              {link.isPending ? "Generando…" : "Conectar"}
            </Button>
          )
        )}
      </div>

      <div className="dialog-actions">
        <Button
          type="button"
          variant="outline"
          disabled={
            update.isPending ||
            !handleDraft ||
            handleDraft === (current?.handle ?? handle) ||
            !/^[a-z0-9._-]{2,40}$/.test(handleDraft)
          }
          onClick={() => update.mutate({ handle: handleDraft })}
        >
          {update.isPending ? "Guardando…" : "Guardar @usuario"}
        </Button>
      </div>
    </div>
  );
}
