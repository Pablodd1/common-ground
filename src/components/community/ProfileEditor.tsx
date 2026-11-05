import { useEffect, useState } from "react";
import { toast } from "sonner";
import { trpc, type CommunityUser } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PersonAvatar } from "./PersonAvatar";
import { MediaButtons, useMediaUpload } from "./Media";

export function ProfileEditor({ open, onOpenChange, user }: { open: boolean; onOpenChange: (open: boolean) => void; user: CommunityUser }) {
  const [form, setForm] = useState({ name: "", jobTitle: "", department: "", location: "", bio: "", interests: "", birthday: "", startDate: "", shareBirthday: true, shareLocation: true });
  const media = useMediaUpload();
  const utils = trpc.useUtils();
  const update = trpc.community.updateProfile.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.community.me.invalidate(), utils.community.people.invalidate(), utils.auth.me.invalidate()]);
      toast.success("Perfil actualizado");
      onOpenChange(false);
    },
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    if (open) {
      setForm({
        name: user.name ?? "", jobTitle: user.jobTitle ?? "", department: user.department ?? "",
        location: user.location ?? "", bio: user.bio ?? "", interests: user.interestsList.join(", "),
        birthday: user.birthday ?? "", startDate: user.startDate ?? "",
        shareBirthday: user.shareBirthday, shareLocation: user.shareLocation,
      });
      media.setAttachment(null);
    }
  }, [open]); // Restablece el formulario solo cuando se abre el editor.

  const set = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const avatarPerson = { ...user, name: form.name || user.name || "Tú", avatarKey: media.attachment?.key ?? user.avatarKey };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="profile-editor">
      <DialogHeader><p className="meta-label">TU HISTORIA</p><DialogTitle>Que los demás conozcan a la persona detrás del cargo.</DialogTitle><DialogDescription>Comparte solo lo que te haga sentir cómodo. Las fechas ayudan a tus compañeros a celebrar contigo.</DialogDescription></DialogHeader>
      <form onSubmit={(event) => {
        event.preventDefault();
        update.mutate({
          ...form,
          interests: form.interests.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 8),
          avatarKey: media.attachment?.key ?? user.avatarKey,
        });
      }}>
        <div className="avatar-editor"><PersonAvatar person={avatarPerson} size="xl" /><div><strong>Foto de perfil</strong><p>Agrega una foto o tómala con tu cámara.</p><MediaButtons {...media} voice={false} compact /></div></div>
        <div className="form-grid">
          <div className="field full"><Label htmlFor="profile-name">Nombre</Label><Input id="profile-name" required minLength={2} maxLength={80} value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div className="field"><Label htmlFor="profile-title">Cargo o función</Label><Input id="profile-title" maxLength={120} placeholder="Diseño de producto" value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} /></div>
          <div className="field"><Label htmlFor="profile-department">Equipo</Label><Input id="profile-department" maxLength={120} placeholder="Diseño" value={form.department} onChange={(e) => set("department", e.target.value)} /></div>
          <div className="field full"><Label htmlFor="profile-location">Dónde estás</Label><Input id="profile-location" maxLength={120} placeholder="Ciudad, país" value={form.location} onChange={(e) => set("location", e.target.value)} /></div>
          <div className="field full"><Label htmlFor="profile-bio">Cuéntanos un poco de ti</Label><Textarea id="profile-bio" rows={3} maxLength={600} placeholder="¿Qué te motiva, dentro y fuera del trabajo?" value={form.bio} onChange={(e) => set("bio", e.target.value)} /><small>{form.bio.length}/600</small></div>
          <div className="field full"><Label htmlFor="profile-interests">Intereses fuera del trabajo</Label><Input id="profile-interests" placeholder="Jardinería, música en vivo, ciclismo" value={form.interests} onChange={(e) => set("interests", e.target.value)} /><small>Separa hasta 8 intereses con comas.</small></div>
          <div className="field"><Label htmlFor="profile-birthday">Fecha de cumpleaños</Label><Input id="profile-birthday" type="date" value={form.birthday} onChange={(e) => set("birthday", e.target.value)} /></div>
          <div className="field"><Label htmlFor="profile-start">Fecha de ingreso</Label><Input id="profile-start" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} /></div>
        </div>
        <div className="privacy-options">
          <label><input type="checkbox" checked={form.shareBirthday} onChange={(e) => set("shareBirthday", e.target.checked)} /><span><strong>Compartir mi cumpleaños</strong><small>Tus compañeros verán el mes y el día, nunca el año.</small></span></label>
          <label><input type="checkbox" checked={form.shareLocation} onChange={(e) => set("shareLocation", e.target.checked)} /><span><strong>Compartir mi ubicación</strong><small>Desactiva esta opción para ocultarla en el directorio de personas.</small></span></label>
        </div>
        <div className="dialog-actions"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={update.isPending || media.isUploading || form.name.trim().length < 2}>{update.isPending ? "Guardando…" : "Guardar perfil"}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
