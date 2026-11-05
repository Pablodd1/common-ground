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
      toast.success("Profile updated");
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
  }, [open]); // Reset only when the editor opens.

  const set = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const avatarPerson = { ...user, name: form.name || user.name || "You", avatarKey: media.attachment?.key ?? user.avatarKey };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="profile-editor">
      <DialogHeader><p className="meta-label">YOUR STORY</p><DialogTitle>Let people know the person behind the role.</DialogTitle><DialogDescription>Share only what you’re comfortable with. Dates help colleagues celebrate with you.</DialogDescription></DialogHeader>
      <form onSubmit={(event) => {
        event.preventDefault();
        update.mutate({
          ...form,
          interests: form.interests.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 8),
          avatarKey: media.attachment?.key ?? user.avatarKey,
        });
      }}>
        <div className="avatar-editor"><PersonAvatar person={avatarPerson} size="xl" /><div><strong>Profile photo</strong><p>Add a photo or take one with your camera.</p><MediaButtons {...media} voice={false} compact /></div></div>
        <div className="form-grid">
          <div className="field full"><Label htmlFor="profile-name">Name</Label><Input id="profile-name" required minLength={2} maxLength={80} value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div className="field"><Label htmlFor="profile-title">What you do</Label><Input id="profile-title" maxLength={120} placeholder="Product designer" value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} /></div>
          <div className="field"><Label htmlFor="profile-department">Team</Label><Input id="profile-department" maxLength={120} placeholder="Design" value={form.department} onChange={(e) => set("department", e.target.value)} /></div>
          <div className="field full"><Label htmlFor="profile-location">Where you’re based</Label><Input id="profile-location" maxLength={120} placeholder="City, country" value={form.location} onChange={(e) => set("location", e.target.value)} /></div>
          <div className="field full"><Label htmlFor="profile-bio">A little about you</Label><Textarea id="profile-bio" rows={3} maxLength={600} placeholder="What makes you tick, at work or beyond it?" value={form.bio} onChange={(e) => set("bio", e.target.value)} /><small>{form.bio.length}/600</small></div>
          <div className="field full"><Label htmlFor="profile-interests">Outside-work interests</Label><Input id="profile-interests" placeholder="Gardening, live music, cycling" value={form.interests} onChange={(e) => set("interests", e.target.value)} /><small>Separate up to 8 interests with commas.</small></div>
          <div className="field"><Label htmlFor="profile-birthday">Birthday</Label><Input id="profile-birthday" type="date" value={form.birthday} onChange={(e) => set("birthday", e.target.value)} /></div>
          <div className="field"><Label htmlFor="profile-start">Work start date</Label><Input id="profile-start" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} /></div>
        </div>
        <div className="privacy-options">
          <label><input type="checkbox" checked={form.shareBirthday} onChange={(e) => set("shareBirthday", e.target.checked)} /><span><strong>Share my birthday</strong><small>Colleagues see the month and day, never the year.</small></span></label>
          <label><input type="checkbox" checked={form.shareLocation} onChange={(e) => set("shareLocation", e.target.checked)} /><span><strong>Share my location</strong><small>Turn this off to hide it from the people directory.</small></span></label>
        </div>
        <div className="dialog-actions"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={update.isPending || media.isUploading || form.name.trim().length < 2}>{update.isPending ? "Saving…" : "Save profile"}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
