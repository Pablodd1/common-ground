export type ManualCategory = "Empresa" | "Productos" | "Compras y logística" | "Políticas" | "Contacto";

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
  kind?: "document" | "contact" | "course" | "file";
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
    title: "Presentación, misión y visión de la empresa",
    category: "Empresa",
    summary: "A quién sirve UNITEC USA Design, qué hace y cuáles son los principios que orientan su trabajo.",
    url: "https://www.unitecusadesign.com/nosotros/",
    retrievedAt,
    keywords: "about nosotros empresa compañia compañía company mision misión mission vision visión proposito propósito values valores subsidiary filial building innovation architects arquitectos employees staff collaborators colaboradores",
    content: `UNITEC USA Design desarrolla, importa y comercializa materiales para construcción, remodelación y diseño de interiores y exteriores. Su portafolio incluye alternativas prácticas, duraderas y visualmente atractivas en PVC, WPC y líneas complementarias para viviendas, comercios y proyectos institucionales.

La página principal describe a UNITEC USA Design como la filial para Colombia y Latinoamérica de Building Innovation. Durante más de 20 años ha acompañado a diseñadores, arquitectos, constructores, distribuidores e importadores con soluciones logísticas y de construcción.

Misión: ofrecer soluciones innovadoras y sostenibles para la construcción y la remodelación, con productos de alta calidad que generen valor para clientes, aliados, colaboradores y comunidades.

Visión: convertirse en una marca líder en soluciones para la construcción en las Américas, reconocida por su innovación, confiabilidad, cercanía comercial y capacidad de adaptación a cada mercado.

La empresa afirma que sus productos están diseñados para simplificar la instalación, reducir los tiempos de obra y responder a las necesidades reales de los clientes. Entre sus principios declarados están la innovación, la calidad, la durabilidad, la sostenibilidad y el acompañamiento comercial.`,
  },
  {
    id: "company-history",
    title: "Nuestra historia y crecimiento internacional",
    category: "Empresa",
    summary: "Hitos desde los inicios de la empresa en 2006 hasta su expansión internacional.",
    url: "https://www.unitecusadesign.com/nosotros/historia/",
    retrievedAt,
    keywords: "history historia founded fundada when cuando 2006 2016 2019 2020 2024 countries paises países expansion expansión growth crecimiento international internacional",
    content: `La cronología pública de la empresa presenta estos hitos:

2006 — Los inicios: tecnología y operaciones entre Colombia y Estados Unidos.
2016 — Una nueva dirección: entrada al mercado de la construcción con perfiles de aluminio.
2016–2018 — Innovación en PVC: identificación de una oportunidad para materiales más livianos, versátiles y eficientes.
2019–2020 — Mirar más allá: primeras exportaciones e inicio de la expansión internacional.
2021–2023 — Crecimiento con aliados en Venezuela, El Salvador, Guatemala, Honduras, Ecuador y Perú.
Desde 2024 — Presencia internacional: operaciones en Estados Unidos y expansión hacia nuevos mercados.

La empresa afirma que hoy conecta innovación, diseño y logística para hacer la construcción más eficiente. Su página de historia menciona operaciones o mercados como Doral/Miami en Estados Unidos; Medellín en Colombia; Barquisimeto en Venezuela; Quito y Guayaquil en Ecuador; Santo Domingo en República Dominicana; San Salvador en El Salvador; Lima en Perú; y Guatemala y Honduras.`,
  },
  {
    id: "materials-performance",
    title: "Materiales, calidad y sostenibilidad",
    category: "Productos",
    summary: "Declaraciones públicas sobre desempeño, mantenimiento, durabilidad y aspectos ambientales de los productos.",
    url: "https://www.unitecusadesign.com/nosotros/",
    retrievedAt,
    keywords: "quality calidad durable durabilidad waterproof impermeable recyclable reciclable fire fuego maintenance mantenimiento pintura solvents solventes chemicals quimicos químicos iso 9001 15 25 years años sustainable sostenible pvc wpc",
    content: `UNITEC afirma que sus líneas de materiales están diseñadas para el uso diario, una instalación eficiente, acabados modernos y bajo mantenimiento.

La página pública de la empresa incluye estas declaraciones sobre los productos: instalación rápida; ausencia de mantenimiento con pinturas, solventes o químicos; durabilidad entre 15 y 25 años; resistencia al fuego; fabricación con materiales recuperados y reciclabilidad del 100 %; y desempeño 100 % impermeable.

La empresa señala que promueve materiales que pueden reducir el mantenimiento, optimizar recursos y disminuir el impacto ambiental frente a alternativas tradicionales. También afirma que sus productos se fabrican bajo estándares de calidad y certificación ISO 9001.

Estas son declaraciones públicas de la empresa, no una evaluación técnica independiente. Los colaboradores deben consultar la ficha técnica correspondiente para conocer las especificaciones, limitaciones y requisitos de instalación de cada proyecto.`,
  },
  {
    id: "product-portfolio",
    title: "Portafolio de productos y recursos técnicos",
    category: "Productos",
    summary: "Familias de productos para interiores y exteriores, catálogos y orientación sobre fichas técnicas.",
    url: "https://www.unitecusadesign.com/colecciones/",
    retrievedAt,
    keywords: "products productos catalog catalogo catálogo colecciones collections interior exterior walls paredes laminas láminas sheets floors pisos deck spc wpc pvc upvc ceilings cielo raso lighting iluminacion iluminación adhesives pegantes gardens jardines samples muestras technical ficha specifications especificaciones",
    content: `La navegación pública de colecciones incluye estas familias de productos para interiores: paneles y revestimientos de pared; mármol PVC y láminas sintéticas; foam board y láminas de PVC; jardines artificiales; paneles y ángulos WPC; pisos SPC; rodapiés SPC; cielos rasos de PVC; cintas adhesivas; iluminación; listones interiores de PVC; y adhesivos de montaje.

Las familias para exteriores incluyen cubiertas UPVC; sistemas de pared y fachada exterior; jardines artificiales; paneles y ángulos WPC para exterior; pisos deck; y listones exteriores WPC.

El sitio web ofrece un catálogo en español de 2026 y fichas técnicas descargables para muchas familias de productos. La empresa recomienda utilizar la ficha técnica junto a cada referencia al momento de elegir. Los clientes pueden solicitar asesoría personalizada, fichas técnicas específicas, muestras de productos y cotizaciones de proyectos a través de un asesor.

La página de colecciones es el punto de partida para consultar la disponibilidad actual y las especificaciones detalladas. No se debe suponer que todas las referencias listadas tienen existencias; la disponibilidad vigente debe confirmarse con el equipo comercial.`,
  },
  {
    id: "container-importing",
    title: "Compras por contenedor e importaciones",
    category: "Compras y logística",
    summary: "Cómo funcionan la planeación de contenedores, las cargas mixtas, las cotizaciones y las opciones de entrega.",
    url: "https://www.unitecusadesign.com/",
    retrievedAt,
    keywords: "import importar importing container contenedor containers contenedores 20 40 feet pies cubic cubicaje volume volumen buy comprar purchase order pedido quote cotizacion cotización shipping envio envío freight flete mixed mezclar showroom recoger traceability trazabilidad",
    content: `La página principal pública describe este proceso de compra por contenedor:

1. Elegir una o varias referencias del catálogo, utilizando la ficha técnica de cada producto como apoyo para la decisión.
2. Revisar cuánto espacio ocupa cada producto dentro del contenedor y cuánta capacidad queda disponible.
3. Recoger los productos en el showroom de Medellín cuando la compra se gestionó directamente con un asesor, o importar por vía marítima con trazabilidad bajo el Incoterm elegido, FOB o CIF.

La plataforma planifica las compras en metros cúbicos y no en unidades individuales. Los clientes pueden combinar pisos, paneles, perfiles y acabados en un mismo contenedor. Según la empresa, esto ayuda a conocer el volumen real de importación antes de pagar y a reducir el costo unitario aprovechando la capacidad disponible.

La página principal indica que la carga del contenedor cotizada es la que se despacha y describe que no hay recargos ocultos ni ajustes posteriores. Los pedidos siguen sujetos a las condiciones comerciales, la disponibilidad de los productos y la cotización final aceptada.

La página de cobertura internacional señala que los contenedores de 20 pies tienen una capacidad de 33 m³ y los contenedores High Cube de 40 pies, de 76 m³. Las capacidades específicas por producto deben verificarse en la guía técnica o de importación correspondiente.`,
  },
  {
    id: "incoterms-business",
    title: "FOB, CIF y alianzas comerciales",
    category: "Compras y logística",
    summary: "Diferencia entre FOB y CIF y modelos públicos de alianza con la empresa.",
    url: "https://www.unitecusadesign.com/nosotros/business-models/",
    retrievedAt,
    keywords: "fob cif incoterm incoterms free on board cost insurance freight flete seguro puerto port business negocio partners aliados distributors distribuidores marketers comercializadores builders constructores architects arquitectos international socios discount descuento margin margen",
    content: `FOB (Free on Board): UNITEC gestiona la mercancía hasta que queda cargada a bordo del buque en el puerto de embarque. A partir de ese punto, el cliente controla el flete marítimo y el seguro. La empresa lo describe como una opción adecuada para importadores con experiencia.

CIF (Cost, Insurance and Freight): UNITEC gestiona el costo, el seguro y el flete hasta el puerto de destino, lo que ofrece un servicio de transporte más integrado.

Los modelos públicos de alianza incluyen:
• Distribuidores: acuerdos regionales de distribución exclusivos y no exclusivos, precios mayoristas, apoyo de mercadeo, opciones de territorio y acceso prioritario a productos.
• Aliados comerciales/comercializadores: protección de márgenes, material para el punto de venta, formación sobre productos y apoyo de inventario.
• Constructores y arquitectos: precios por volumen y proyecto, asesoría técnica especializada, entrega prioritaria y descuentos por volumen.
• Aliados internacionales: documentación de exportación, apoyo aduanero, precios en varias monedas y coordinación logística global.

Los precios, territorios, descuentos, compromisos de entrega y condiciones específicas de las alianzas requieren confirmación directa con el equipo comercial.`,
  },
  {
    id: "coverage-contact",
    title: "Ubicaciones, cobertura y contacto comercial",
    category: "Contacto",
    summary: "Ubicaciones en Miami y Medellín, cobertura de mercados y canales públicos de contacto.",
    url: "https://www.unitecusadesign.com/contacto/",
    retrievedAt,
    keywords: "contact contacto phone telefono teléfono whatsapp email correo address direccion dirección location ubicacion ubicación showroom medellin medellín itagui itagüí miami doral florida hours horario countries paises países coverage cobertura",
    content: `Oficina en Estados Unidos: 6120 NW 74th Ave, Doral, FL 33166, Miami, Estados Unidos.

Showroom de Medellín: Carrera 42, Auto. S #75-83, C.C. IDEO Local 274, Itagüí, Medellín, Antioquia, Colombia.

Línea comercial principal y WhatsApp: +57 314 233 2147.
Correo corporativo publicado en las preguntas frecuentes: lidermercadeo@espaciosimportados.com.co.

Las preguntas frecuentes indican que la empresa ofrece FOB desde puertos de origen en China, CIF hacia puertos de destino en Latinoamérica y el Caribe, y despacho directo desde Miami y Medellín. Remiten al equipo comercial y de ingeniería para la consolidación de contenedores y las cotizaciones por volumen.

La empresa declara atender Estados Unidos, Colombia, Venezuela, Ecuador, República Dominicana, El Salvador, Guatemala, Honduras y Perú. Para asuntos de privacidad relacionados con Building Innovation AI, la página de privacidad publica lidermarketingonline@espaciosimportados.com.co e info@unitecusadesign.com, con atención de lunes a viernes, de 8:00 a. m. a 5:00 p. m., hora de Colombia.`,
  },
  {
    id: "commercial-terms",
    title: "Términos del sitio web y condiciones comerciales",
    category: "Políticas",
    summary: "Términos públicos sobre precios, pagos, pedidos, entregas, devoluciones y garantías.",
    url: "https://www.unitecusadesign.com/terminos/",
    retrievedAt,
    keywords: "terms terminos términos conditions condiciones prices precios usd payment pago credit credito crédito delivery entrega returns devoluciones refund reembolso warranty garantia garantía damage daños cancellation cancelacion cancelación",
    content: `Los términos públicos del sitio web establecen:

• Las descripciones, especificaciones, colores y la disponibilidad de los productos pueden contener imprecisiones y pueden cambiarse o descontinuarse sin previo aviso.
• Los precios están expresados en USD y pueden cambiar sin previo aviso. Los envíos, impuestos y aranceles no están incluidos, salvo que se indique expresamente.
• El pago se exige al momento del pedido, salvo que se aprueben condiciones de crédito. Los pedidos pueden cancelarse por falta de pago.
• Los pedidos están sujetos a aceptación y disponibilidad. Las fechas de entrega son estimaciones, no garantías. El riesgo de pérdida se transfiere al transportador en el momento del envío. Los clientes deben inspeccionar las entregas y reportar oportunamente cualquier daño.
• Los productos estándar pueden ser elegibles para devolución dentro de los 30 días, sujetos a su estado y a cargos por reposición. Los pedidos personalizados no son reembolsables.
• Los productos tienen las garantías limitadas especificadas. Las reclamaciones de garantía se limitan a reparación, reemplazo o reembolso.
• Las preguntas sobre estos términos pueden enviarse a lidermercadeo@espaciosimportados.com.co.

Este resumen no reemplaza los términos legales completos ni una cotización comercial aceptada.`,
  },
  {
    id: "building-ai-privacy",
    title: "Política de privacidad de Building Innovation AI",
    category: "Políticas",
    summary: "Términos públicos de privacidad para la aplicación independiente Building Innovation AI y sus servicios web asociados.",
    url: "https://www.unitecusadesign.com/politicas/",
    retrievedAt,
    keywords: "privacy privacidad data datos deletion eliminacion eliminación account cuenta building innovation ai app camera camara cámara storage almacenamiento security seguridad tls menores children rights derechos arco habeas",
    content: `Esta política corresponde a Building Innovation AI y sus servicios web oficiales asociados. No es una política interna de privacidad de la comunidad de colaboradores Unitec Familia.

La política pública indica que la aplicación puede recopilar información de contacto y perfil, imágenes de cámara o galería autorizadas por el usuario para el procesamiento arquitectónico solicitado, e información técnica y de diagnóstico del dispositivo. Entre las finalidades menciona cálculos de proyectos asistidos por IA, planeación de contenedores, recomendaciones de productos, cotizaciones, atención al cliente, seguridad y actualizaciones opcionales de productos.

La empresa afirma que no vende, alquila ni transfiere comercialmente los datos personales de los usuarios a intermediarios de datos o empresas lucrativas no relacionadas. Proveedores tecnológicos de confianza pueden procesar información bajo acuerdos de confidencialidad y protección de datos. Las comunicaciones se describen como protegidas mediante HTTPS/TLS.

Los usuarios pueden solicitar la eliminación completa de su cuenta de Building Innovation AI y de los datos personales asociados escribiendo a lidermarketingonline@espaciosimportados.com.co con el asunto “Solicitud de Eliminación de Datos - Building Innovation AI”. La política establece un plazo de procesamiento de 15 a 30 días calendario.

La página también describe los derechos a conocer, actualizar, rectificar, revocar la autorización y solicitar la eliminación. Indica que la aplicación está dirigida a profesionales de la construcción y personas adultas, y ofrece atención de privacidad de lunes a viernes, de 8:00 a. m. a 5:00 p. m., hora de Colombia.`,
  },
];

export type ManualSource = Pick<ManualDocument, "id" | "title" | "url" | "category" | "visibility">;

const stopWords = new Set([
  "the", "and", "for", "with", "that", "this", "what", "when", "where", "which", "who", "how", "does", "are", "can", "you", "your", "our", "about", "from", "have", "has", "was", "were", "will", "would", "there", "their", "them", "they", "que", "como", "cual", "cuales", "cuando", "donde", "quien", "quienes", "para", "por", "con", "sin", "una", "uno", "los", "las", "del", "de", "la", "el", "en", "es", "son", "tiene", "tienen", "tengo", "sobre", "nosotros", "usted", "ustedes",
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
