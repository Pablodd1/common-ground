import { describe, expect, it } from "vitest";
import { isAllowedEmail, parseEmailDomains } from "@contracts/constants";

describe("dominios de correo autorizados", () => {
  const domains = parseEmailDomains(" Unitec.com, @unitecusa.co ,");
  it("normaliza la lista", () => expect(domains).toEqual(["unitec.com", "unitecusa.co"]));
  it("acepta solo dominios exactos", () => {
    expect(isAllowedEmail("Ana@UNITEC.com", domains)).toBe(true);
    expect(isAllowedEmail("ana@unitecusa.co", domains)).toBe(true);
    expect(isAllowedEmail("ana@evilunitec.com", domains)).toBe(false);
    expect(isAllowedEmail("ana@unitec.com.evil.io", domains)).toBe(false);
    expect(isAllowedEmail("ana@mail.unitec.com", domains)).toBe(false);
    expect(isAllowedEmail("sin-arroba", domains)).toBe(false);
    expect(isAllowedEmail("ana@unitec.com", [])).toBe(false);
  });
});
