// Pure e-mail policy helpers, kept free of I/O so they can be unit tested.

export function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at <= 0 ? "" : email.slice(at + 1).toLowerCase();
}

/**
 * An e-mail may enter when its domain is explicitly allow-listed, or when it
 * belongs to the configured owner (who may live on a personal domain).
 */
export function isEmailAllowed(
  email: string,
  allowedDomains: string[],
  ownerEmail: string,
): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  if (ownerEmail && normalized === ownerEmail) return true;
  return allowedDomains.includes(emailDomain(normalized));
}
