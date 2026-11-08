// @mention helpers for composers and renderers: autocomplete state, dropdown,
// and highlight rendering. Shared by posts, comments and messages.
import { useMemo, useState, type ReactNode } from "react";
import type { Person } from "@/providers/trpc";

const TOKEN_RE = /@([a-z0-9._-]*)$/i;

export type MentionState = {
  /** People matching the token being typed after '@'. Empty when inactive. */
  suggestions: Person[];
  /** The '@token' currently being typed (including the @), or null. */
  token: string | null;
  apply: (handle: string) => string;
};

/**
 * Derives autocomplete state from the current input value and caret position.
 * Returns a pure state object — the composer decides where to render the
 * dropdown and how to store `apply`'s result.
 */
export function useMentionState(
  value: string,
  caret: number,
  people: Person[] | undefined,
): MentionState {
  return useMemo(() => {
    const before = value.slice(0, caret);
    const match = TOKEN_RE.exec(before);
    if (!match) return { suggestions: [], token: null, apply: () => value };
    const token = match[0];
    const query = match[1].toLowerCase();
    const pool = (people ?? []).filter(
      (p) => !p.isDemo && p.handle && !p.handle.includes(" "),
    );
    const suggestions = pool
      .filter((p) => p.handle!.toLowerCase().startsWith(query))
      .slice(0, 5);
    return {
      suggestions,
      token,
      apply: (handle: string) =>
        value.slice(0, caret - token.length) +
        `@${handle} ` +
        value.slice(caret),
    };
  }, [value, caret, people]);
}

export function MentionDropdown({
  state,
  onPick,
}: {
  state: MentionState;
  onPick: (handle: string) => void;
}) {
  const [active, setActive] = useState(0);
  if (!state.token || state.suggestions.length === 0) return null;
  return (
    <ul className="mention-dropdown" role="listbox" aria-label="Personas sugeridas">
      {state.suggestions.map((person, index) => (
        <li key={person.id} role="option" aria-selected={index === active}>
          <button
            type="button"
            onMouseDown={(event) => {
              // Mousedown beats blur: click before the textarea loses focus.
              event.preventDefault();
              onPick(person.handle!);
            }}
            onMouseEnter={() => setActive(index)}
          >
            <strong>@{person.handle}</strong>
            <span>{person.name}{person.jobTitle ? ` · ${person.jobTitle}` : ""}</span>
          </button>
        </li>
      ))}
      <li className="mention-hint">Enter o clic para elegir · Esc para cerrar</li>
    </ul>
  );
}

/** Renders body text with @handle tokens visually highlighted. */
export function renderWithMentions(text: string): ReactNode {
  const parts = text.split(/(@[a-z0-9._-]+)/gi);
  return parts.map((part, index) =>
    /^@[a-z0-9._-]+$/i.test(part) ? (
      <span key={index} className="mention-token">{part}</span>
    ) : (
      part
    ),
  );
}

/** True when the composer text is a /ticket or #ticket command. */
export function detectTicketCommand(text: string): boolean {
  return /^[/#]ticket\s+\S/i.test(text.trim());
}
