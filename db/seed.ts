import { and, eq } from "drizzle-orm";
import { getDb } from "../server/queries/connection";
import { comments, posts, users } from "./schema";

const samplePeople = [
  {
    unionId: "sample:maya", name: "Maya Chen", jobTitle: "Diseñadora de producto", department: "Diseño",
    location: "Medellín, Colombia", bio: "Me gusta hacer que lo complicado se sienta sencillo. Casi siempre estoy planeando mi próxima caminata o probando una receta nueva.",
    interests: "Caminatas,Cerámica,Comida callejera", birthday: "1992-11-08", startDate: "2022-11-10", isDemo: true,
  },
  {
    unionId: "sample:theo", name: "Theo Martin", jobTitle: "Ejecutivo de servicio al cliente", department: "Experiencia del cliente",
    location: "Bogotá, Colombia", bio: "Me animan las buenas preguntas, la música en vivo y un desayuno delicioso el domingo.",
    interests: "Música en vivo,Ciclismo,Repostería", birthday: "1989-11-12", startDate: "2021-11-15", isDemo: true,
  },
  {
    unionId: "sample:priya", name: "Priya Shah", jobTitle: "Ingeniera de software", department: "Ingeniería",
    location: "Cali, Colombia", bio: "Me dan curiosidad los sistemas, la ciencia ficción y las formas en que los equipos logran trabajar mejor juntos.",
    interests: "Ciencia ficción,Escalada,Ajedrez", birthday: "1995-02-18", startDate: "2023-03-20", isDemo: true,
  },
  {
    unionId: "sample:leo", name: "Leo Santos", jobTitle: "Líder de operaciones", department: "Operaciones",
    location: "Barranquilla, Colombia", bio: "Caminatas con el equipo, chistes malos y buen café. Pregúntame por fotografía o cuéntame tu logro más reciente.",
    interests: "Fotografía,Fútbol,Café", birthday: "1987-08-04", startDate: "2020-11-06", isDemo: true,
  },
  {
    unionId: "test:alex", name: "Alex Morgan", jobTitle: "Gestión del talento humano", department: "Talento humano",
    location: "Manizales, Colombia", bio: "Me gusta abrir espacio para buenas conversaciones. Corro, leo y estoy aprendiendo jardinería con mucho entusiasmo.",
    interests: "Running,Lectura,Jardinería", birthday: "1990-11-06", startDate: "2022-01-10", isDemo: true,
  },
  {
    unionId: "test:jordan", name: "Jordan Lee", jobTitle: "Gerente de mercadeo", department: "Mercadeo",
    location: "Cartagena, Colombia", bio: "Un colega curioso. Aficionado a la fotografía y a las caminatas de fin de semana.",
    interests: "Fotografía,Caminatas,Pódcast", birthday: "1993-04-12", startDate: "2024-02-01", isDemo: true,
  },
];

const samplePosts = [
  {
    unionId: "sample:maya", topic: "Outside work" as const,
    originalBody: "Tiny weekend win: I finally finished the ceramic bowl I started last month. It’s a little wonky, but it holds my morning coffee perfectly. What are you making or learning outside work?",
    body: "Un pequeño logro del fin de semana: por fin terminé el bowl de cerámica que empecé el mes pasado. Quedó un poco torcido, pero es perfecto para mi café de la mañana. ¿Qué están creando o aprendiendo fuera del trabajo?",
  },
  {
    unionId: "sample:theo", topic: "Motivation" as const,
    originalBody: "A customer told me our quick handoff saved their afternoon. A good reminder that the small, thoughtful things we do for each other travel further than we see.",
    body: "Un cliente me dijo que nuestra entrega rápida le salvó la tarde. Fue un buen recordatorio de que los pequeños detalles que tenemos con los demás llegan más lejos de lo que imaginamos.",
  },
  {
    unionId: "sample:priya", topic: "Questions" as const,
    originalBody: "What’s one thing that helps you switch back into focus after a meeting-heavy morning? I’m collecting ideas to try this week.",
    body: "¿Qué les ayuda a recuperar la concentración después de una mañana llena de reuniones? Estoy recogiendo ideas para probar esta semana.",
  },
  {
    unionId: "test:alex", topic: "Outside work" as const,
    originalBody: "Today’s small win: our handoff felt calm and clear. What helped you do good work this week?",
    body: "El pequeño logro de hoy: nuestra entrega se sintió tranquila y clara. ¿Qué les ayudó a hacer bien su trabajo esta semana?",
  },
  {
    unionId: "test:alex", topic: "Celebration" as const,
    originalBody: "Let’s celebrate Leo Santos and their work anniversary today! Drop a note, a photo, or a voice message to make their day. 🎉",
    body: "¡Hoy celebremos a Leo Santos por su aniversario laboral! Deja un mensaje, una foto o una nota de voz para alegrarle el día. 🎉",
  },
  {
    unionId: "test:alex", topic: "Motivation" as const,
    originalBody: "A quick voice note to say hello — looking forward to getting to know everyone!",
    body: "Una nota de voz rápida para saludar: ¡me emociona conocerlos a todos!",
  },
];

async function seed() {
  const db = getDb();
  console.log("Preparando la comunidad de ejemplo…");
  const ids = new Map<string, number>();
  for (const person of samplePeople) {
    await db.insert(users).values(person).onDuplicateKeyUpdate({ set: person });
    const saved = await db.query.users.findFirst({ where: eq(users.unionId, person.unionId) });
    if (saved) ids.set(person.unionId, saved.id);
  }
  const existing = await db.select({ id: posts.id }).from(posts).limit(1);
  if (!existing.length) {
    await db.insert(posts).values(samplePosts.map((post) => ({
      authorId: ids.get(post.unionId)!,
      topic: post.topic,
      body: post.body,
    })));
  } else {
    // Traduce únicamente las publicaciones originales de ejemplo, sin tocar contenido creado por usuarios reales.
    for (const post of samplePosts) {
      await db.update(posts).set({ body: post.body }).where(and(
        eq(posts.authorId, ids.get(post.unionId)!),
        eq(posts.body, post.originalBody),
      ));
    }
  }
  await db.update(comments).set({ body: "Una caminata corta y una prioridad clara me ayudan a recuperar el enfoque." }).where(and(
    eq(comments.authorId, ids.get("test:alex")!),
    eq(comments.body, "A short walk and one clear priority help me reset."),
  ));
  console.log("Listo.");
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
