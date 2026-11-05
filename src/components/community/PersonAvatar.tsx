import { MediaView } from "./Media";
import type { Person } from "@/providers/trpc";

const tones = ["avatar-blue", "avatar-sage", "avatar-orange", "avatar-ink"];
const sizes = { sm: "person-avatar--sm", md: "person-avatar--md", lg: "person-avatar--lg", xl: "person-avatar--xl" };

export function PersonAvatar({ person, size = "md" }: { person: Pick<Person, "id" | "name" | "avatar" | "avatarKey">; size?: "sm" | "md" | "lg" | "xl" }) {
  const initials = person.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const tone = tones[person.id % tones.length];
  return (
    <span className={`person-avatar ${sizes[size]} ${tone}`} aria-hidden="true">
      {person.avatarKey ? <MediaView mediaKey={person.avatarKey} mediaType="image/jpeg" /> : person.avatar ? <img src={person.avatar} alt="" /> : initials}
    </span>
  );
}
