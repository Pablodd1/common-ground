import { describe, expect, it } from "vitest";
import { emailDomain, isEmailAllowed } from "./email-policy";

describe("emailDomain", () => {
  it("extracts the lowercase domain", () => {
    expect(emailDomain("Maria@UnitecUSA.com")).toBe("unitecusa.com");
  });

  it("returns an empty string without an @", () => {
    expect(emailDomain("not-an-email")).toBe("");
  });
});

describe("isEmailAllowed", () => {
  const domains = ["unitecusadesign.com"];
  const owner = "owner@example.com";

  it("allows an allow-listed domain regardless of case and padding", () => {
    expect(isEmailAllowed("  Maria@UNITECUSAdesign.COM ", domains, owner)).toBe(true);
  });

  it("allows the owner even off-domain", () => {
    expect(isEmailAllowed(owner, domains, owner)).toBe(true);
  });

  it("rejects other domains", () => {
    expect(isEmailAllowed("intruso@evil.com", domains, owner)).toBe(false);
  });

  it("rejects look-alikes and empty input", () => {
    expect(isEmailAllowed("a@fakeunitecusadesign.com", domains, owner)).toBe(false);
    expect(isEmailAllowed("", domains, owner)).toBe(false);
    expect(isEmailAllowed("@unitecusadesign.com", domains, owner)).toBe(false);
  });

  it("never matches when no owner is configured", () => {
    expect(isEmailAllowed("someone@anywhere.com", domains, "")).toBe(false);
  });
});
