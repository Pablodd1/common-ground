export type ManualCategory = "Company" | "Products" | "Buying & logistics" | "Policies" | "Contact";

export interface ManualDocument {
  id: string;
  title: string;
  category: string;
  summary: string;
  url: string | null;
  retrievedAt: string;
  keywords: string;
  content: string;
  body?: string;
  visibility?: "public" | "private";
  kind?: "document" | "contact";
  resourceId?: number;
  isPublished?: boolean;
  phone?: string | null;
  email?: string | null;
  reportsTo?: string | null;
}

const retrievedAt = "2026-11-05";

export const companyManual: ManualDocument[] = [
  {
    id: "company-overview",
    title: "Company overview, mission and vision",
    category: "Company",
    summary: "Who UNITEC USA Design serves, what it does, and the principles behind its work.",
    url: "https://www.unitecusadesign.com/nosotros/",
    retrievedAt,
    keywords: "about nosotros empresa compañia company mision mission vision proposito values valores subsidiary filial building innovation architects arquitectos employees staff collaborators",
    content: `UNITEC USA Design develops, imports and sells materials for construction, remodeling and interior and exterior design. Its portfolio includes practical, durable and visually attractive alternatives in PVC, WPC and complementary lines for homes, businesses and institutional projects.

The homepage describes UNITEC USA Design as the Colombia and Latin America subsidiary of Building Innovation. For more than 20 years it has supported designers, architects, builders, distributors and importers with logistics and construction solutions.

Mission: To provide innovative and sustainable solutions for construction and remodeling, with high-quality products that create value for customers, partners, collaborators and communities.

Vision: To become a leading brand in construction solutions across the Americas, recognized for innovation, reliability, commercial closeness and the ability to adapt to each market.

The company says its products are designed to simplify installation, reduce construction times and meet real customer needs. Its stated principles include innovation, quality, durability, sustainability and commercial support.`,
  },
  {
    id: "company-history",
    title: "Our history and international growth",
    category: "Company",
    summary: "Milestones from the company's beginnings in 2006 to its international expansion.",
    url: "https://www.unitecusadesign.com/nosotros/historia/",
    retrievedAt,
    keywords: "history historia founded fundada when cuando 2006 2016 2019 2020 2024 countries paises expansion growth crecimiento international internacional",
    content: `The company's public timeline presents these milestones:

2006 — The beginnings: technology and operations between Colombia and the United States.
2016 — A new direction: entry into the construction market with aluminum profiles.
2016–2018 — Innovation in PVC: identification of an opportunity for lighter, more versatile and efficient materials.
2019–2020 — Looking beyond: first exports and the beginning of international expansion.
2021–2023 — Growth with partners in Venezuela, El Salvador, Guatemala, Honduras, Ecuador and Peru.
2024 onward — International presence: operations in the United States and expansion into new markets.

The company says it now connects innovation, design and logistics to make construction more efficient. Its history page identifies operations or markets including Doral/Miami in the United States; Medellín in Colombia; Barquisimeto in Venezuela; Quito and Guayaquil in Ecuador; Santo Domingo in the Dominican Republic; San Salvador in El Salvador; Lima in Peru; and Guatemala and Honduras.`,
  },
  {
    id: "materials-performance",
    title: "Materials, quality and sustainability",
    category: "Products",
    summary: "Public product-performance, maintenance, durability and environmental statements.",
    url: "https://www.unitecusadesign.com/nosotros/",
    retrievedAt,
    keywords: "quality calidad durable durabilidad waterproof impermeable recyclable reciclable fire fuego maintenance mantenimiento pintura solvents solventes chemicals quimicos iso 9001 15 25 years años sustainable sostenible pvc wpc",
    content: `UNITEC states that its material lines are designed for daily use, efficient installation, modern finishes and low maintenance.

The public company page lists these product-level statements: fast installation; no maintenance with paints, solvents or chemicals; durability between 15 and 25 years; fire resistance; manufacture with recovered materials and 100% recyclability; and 100% waterproof performance.

The company says it promotes materials that can reduce maintenance, optimize resources and reduce environmental impact compared with traditional alternatives. It also states that its products are manufactured under quality standards and ISO 9001 certification.

These are the company's public statements, not an independent technical assessment. Employees should check the relevant product technical sheet for project-specific specifications, limitations and installation requirements.`,
  },
  {
    id: "product-portfolio",
    title: "Product portfolio and technical resources",
    category: "Products",
    summary: "Interior and exterior product families, catalog resources and technical-sheet guidance.",
    url: "https://www.unitecusadesign.com/colecciones/",
    retrievedAt,
    keywords: "products productos catalog catalogo colecciones collections interior exterior walls paredes laminas sheets floors pisos deck spc wpc pvc upvc ceilings cielo raso lighting iluminacion adhesives pegantes gardens jardines samples muestras technical ficha specifications especificaciones",
    content: `The public collection navigation lists these interior product families: wall panels and wall finishes; PVC marble and synthetic sheets; foam board and PVC board; artificial gardens; WPC panels and angles; SPC floors; SPC baseboards; PVC ceilings; adhesive tapes; lighting; PVC interior strips; and mounting adhesives.

Exterior families include UPVC roofing; exterior wall and façade systems; artificial gardens; exterior WPC panels and angles; deck flooring; and exterior WPC strips.

The website offers a 2026 Spanish catalog and downloadable technical sheets for many product families. The company advises customers to use the technical sheet beside each item when choosing references. Customers can request personal advice, tailored technical sheets, product samples and project quotations through an advisor.

The collections page is the appropriate starting point for current product availability and detailed specifications. Do not assume that every listed reference is in stock; confirm current availability with the commercial team.`,
  },
  {
    id: "container-importing",
    title: "Buying by container and importing",
    category: "Buying & logistics",
    summary: "How container planning, mixed loads, quotations and delivery options work.",
    url: "https://www.unitecusadesign.com/",
    retrievedAt,
    keywords: "import importar importing container contenedor containers contenedores 20 40 feet pies cubic cubicaje volume volumen buy comprar purchase order pedido quote cotizacion shipping envio freight flete mixed mezclar showroom recoger traceability trazabilidad",
    content: `The public homepage describes a container-based purchasing process:

1. Choose one or more catalog references, using each item's technical sheet to support the decision.
2. Review how much container space each product occupies and how much capacity remains.
3. Collect products from the Medellín showroom when the purchase was handled directly with an advisor, or import by sea with traceability under the chosen Incoterm, FOB or CIF.

The platform plans purchases in cubic meters rather than individual units. Customers can mix floors, panels, profiles and finishes in one container. The company says this helps customers understand their real import volume before paying and reduce the unit cost by using available capacity.

The homepage says the quoted container load is what is dispatched and describes no hidden surcharges or later adjustments. Orders remain subject to the commercial terms, product availability and final accepted quotation.

The international-coverage page states that 20-foot containers have 33 m³ capacity and 40-foot High Cube containers have 76 m³ capacity. Product-specific capacities should be checked against the relevant technical or import guide.`,
  },
  {
    id: "incoterms-business",
    title: "FOB, CIF and commercial partnerships",
    category: "Buying & logistics",
    summary: "The difference between FOB and CIF and the company's public partner models.",
    url: "https://www.unitecusadesign.com/nosotros/business-models/",
    retrievedAt,
    keywords: "fob cif incoterm incoterms free on board cost insurance freight flete seguro puerto port business negocio partners aliados distributors distribuidores marketers comercializadores builders constructores architects arquitectos international socios discount descuento margin margen",
    content: `FOB (Free on Board): UNITEC manages the goods until they are loaded aboard the vessel at the port of shipment. The customer controls ocean freight and insurance from that point. The company describes this as suitable for experienced importers.

CIF (Cost, Insurance and Freight): UNITEC manages cost, insurance and freight to the destination port, providing a more integrated shipping service.

Public partnership models include:
• Distributors: exclusive and non-exclusive regional distribution agreements, wholesale pricing, marketing support, territory options and priority product access.
• Commercial partners/marketers: margin protection, point-of-sale material, product training and inventory support.
• Builders and architects: volume and project pricing, specialized technical advice, priority delivery and volume discounts.
• International partners: export documentation, customs assistance, pricing in multiple currencies and global logistics coordination.

Specific prices, territories, discounts, delivery commitments and partnership conditions require direct confirmation with the sales team.`,
  },
  {
    id: "coverage-contact",
    title: "Locations, coverage and commercial contact",
    category: "Contact",
    summary: "Miami and Medellín locations, market coverage and public contact channels.",
    url: "https://www.unitecusadesign.com/contacto/",
    retrievedAt,
    keywords: "contact contacto phone telefono whatsapp email correo address direccion location ubicacion showroom medellin itagui miami doral florida hours horario countries paises coverage cobertura",
    content: `United States office: 6120 NW 74th Ave, Doral, FL 33166, Miami, United States.

Medellín showroom: Carrera 42, Auto. S #75-83, C.C. IDEO Local 274, Itagüí, Medellín, Antioquia, Colombia.

Main commercial line and WhatsApp: +57 314 233 2147.
Corporate email published on the FAQ: lidermercadeo@espaciosimportados.com.co.

The FAQ says the company offers FOB from origin ports in China, CIF to destination ports in Latin America and the Caribbean, and direct dispatch from Miami and Medellín. It directs customers to the commercial and engineering team for container consolidation and volume-based quotations.

The company reports serving the United States, Colombia, Venezuela, Ecuador, the Dominican Republic, El Salvador, Guatemala, Honduras and Peru. For privacy matters concerning Building Innovation AI, the privacy page lists lidermarketingonline@espaciosimportados.com.co and info@unitecusadesign.com, with service Monday to Friday, 8:00 AM–5:00 PM COT.`,
  },
  {
    id: "commercial-terms",
    title: "Website and commercial terms",
    category: "Policies",
    summary: "Public terms on pricing, payment, orders, delivery, returns and warranty.",
    url: "https://www.unitecusadesign.com/terminos/",
    retrievedAt,
    keywords: "terms terminos conditions condiciones prices precios usd payment pago credit credito delivery entrega returns devoluciones refund reembolso warranty garantia damage daños cancellation cancelacion",
    content: `The public website terms state:

• Product descriptions, specifications, colors and availability may contain inaccuracies and may be changed or discontinued without prior notice.
• Prices are in USD and may change without notice. Shipping, taxes and duties are not included unless specifically stated.
• Payment is due at the time of order unless credit terms are approved. Orders may be canceled for non-payment.
• Orders are subject to acceptance and availability. Delivery dates are estimates, not guarantees. Risk of loss transfers to the carrier at shipment. Customers should inspect deliveries and report damage promptly.
• Standard products may be eligible for return within 30 days, subject to condition and restocking fees. Custom orders are non-refundable.
• Products have limited warranties as specified. Warranty claims are limited to repair, replacement or refund.
• Questions about these terms can be sent to lidermercadeo@espaciosimportados.com.co.

This summary does not replace the full legal terms or an accepted commercial quotation.`,
  },
  {
    id: "building-ai-privacy",
    title: "Building Innovation AI privacy policy",
    category: "Policies",
    summary: "Public privacy terms for the separate Building Innovation AI application and associated web services.",
    url: "https://www.unitecusadesign.com/politicas/",
    retrievedAt,
    keywords: "privacy privacidad data datos deletion eliminacion account cuenta building innovation ai app camera camara storage almacenamiento security seguridad tls menores children rights derechos arco habeas",
    content: `This policy concerns Building Innovation AI and its associated official web services. It is not an internal Common Ground employee-community privacy policy.

The public policy says the app may collect contact/profile information, user-authorized camera or gallery images for requested architectural processing, and technical/diagnostic device information. It lists purposes including AI-assisted project calculations, container planning, product recommendations, quotations, customer support, security and optional product updates.

The company says it does not sell, rent or commercially transfer user personal data to data brokers or unrelated for-profit companies. Trusted technology providers may process information under confidentiality and data-protection agreements. Communications are described as using HTTPS/TLS.

Users may request complete deletion of their Building Innovation AI account and associated personal data by emailing lidermarketingonline@espaciosimportados.com.co with the subject “Solicitud de Eliminación de Datos - Building Innovation AI”. The policy states a processing period of 15 to 30 calendar days.

The page also describes rights to know, update, rectify, revoke authorization and request deletion. It states the app is directed to construction professionals and adults, and gives privacy support hours of Monday to Friday, 8:00 AM–5:00 PM COT.`,
  },
];

export type ManualSource = Pick<ManualDocument, "id" | "title" | "url" | "category" | "visibility">;

const stopWords = new Set([
  "the", "and", "for", "with", "that", "this", "what", "when", "where", "which", "who", "how", "does", "are", "can", "you", "your", "our", "about", "from", "have", "has", "was", "were", "will", "would", "there", "their", "them", "they", "que", "como", "cual", "cuales", "cuando", "donde", "quien", "quienes", "para", "por", "con", "sin", "una", "uno", "los", "las", "del", "de", "la", "el", "en", "es", "son", "tiene", "tienen", "sobre", "nosotros", "usted", "ustedes",
]);

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9+]+/g, " ").trim();
}

export function retrieveManualSources(question: string, limit = 3, additionalDocuments: ManualDocument[] = []): ManualDocument[] {
  const normalized = normalize(question);
  const tokens = [...new Set(normalized.split(" ").filter((token) => token.length > 2 && !stopWords.has(token)))];
  if (!tokens.length) return [];

  return [...companyManual, ...additionalDocuments]
    .map((document) => {
      const title = normalize(document.title);
      const summary = normalize(document.summary);
      const keywords = normalize(document.keywords);
      const content = normalize(document.content);
      let score = 0;
      const titleTokens = new Set(title.split(" "));
      const summaryTokens = new Set(summary.split(" "));
      const keywordTokens = new Set(keywords.split(" "));
      const contentTokens = new Set(content.split(" "));
      for (const token of tokens) {
        if (titleTokens.has(token)) score += 7;
        if (keywordTokens.has(token)) score += 5;
        if (summaryTokens.has(token)) score += 3;
        if (contentTokens.has(token)) score += 1;
      }
      if (normalized.length > 12 && content.includes(normalized)) score += 12;
      return { document, score };
    })
    .filter(({ score }) => score >= 4)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ document }) => document);
}

export function toManualSource(document: ManualDocument): ManualSource {
  return { id: document.id, title: document.title, url: document.url, category: document.category, visibility: document.visibility ?? "public" };
}
