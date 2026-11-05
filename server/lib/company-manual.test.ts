import { describe, expect, it } from "vitest";
import { retrieveManualSources, stem, type ManualDocument } from "./company-manual";

const vacaciones: ManualDocument = {
  id: "internal-1", resourceId: 1, title: "Política de vacaciones", category: "Políticas de RR. HH.",
  summary: "Cómo solicitar días libres.", url: null, retrievedAt: "2026-11-05", keywords: "",
  content: "Las solicitudes se envían con 15 días de anticipación.", body: "", visibility: "private",
  kind: "document", isPublished: true, phone: null, email: null, reportsTo: null,
} as ManualDocument;

describe("búsqueda en español", () => {
  it("une singular y plural", () => {
    expect(stem("vacaciones")).toBe(stem("vacacion"));
    expect(stem("productos")).toBe(stem("producto"));
    expect(stem("ciudades")).toBe(stem("ciudad"));
    expect(stem("colores")).toBe(stem("color"));
  });

  it("encuentra el documento aunque la pregunta use singular y sin tildes", () => {
    const found = retrieveManualSources("como pido una vacacion", 3, [vacaciones]);
    expect(found.map((document) => document.id)).toContain("internal-1");
  });

  it("no inventa coincidencias para preguntas sin relación", () => {
    expect(retrieveManualSources("xyzzy plugh frobozz", 3, [vacaciones])).toEqual([]);
  });
});
