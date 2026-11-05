import { and, eq } from "drizzle-orm";
import { getDb } from "../server/queries/connection";
import { comments, posts, users } from "./schema";

const samplePeople = [
  {
    authId: "sample:maya", email: "maya.demo@unitecusadesign.com", name: "Maya Chen", jobTitle: "Diseñadora de producto", department: "Diseño",
    location: "Medellín, Colombia", bio: "Me gusta hacer que lo complicado se sienta sencillo. Casi siempre estoy planeando mi próxima caminata o probando una receta nueva.",
    interests: "Caminatas,Cerámica,Comida callejera", birthday: "1992-11-08", startDate: "2022-11-10", isDemo: true,
  },
  {
    authId: "sample:theo", email: "theo.demo@unitecusadesign.com", name: "Theo Martin", jobTitle: "Ejecutivo de servicio al cliente", department: "Experiencia del cliente",
    location: "Bogotá, Colombia", bio: "Me animan las buenas preguntas, la música en vivo y un desayuno delicioso el domingo.",
    interests: "Música en vivo,Ciclismo,Repostería", birthday: "1989-11-12", startDate: "2021-11-15", isDemo: true,
  },
  {
    authId: "sample:priya", email: "priya.demo@unitecusadesign.com", name: "Priya Shah", jobTitle: "Ingeniera de software", department: "Ingeniería",
    location: "Cali, Colombia", bio: "Me dan curiosidad los sistemas, la ciencia ficción y las formas en que los equipos logran trabajar mejor juntos.",
    interests: "Ciencia ficción,Escalada,Ajedrez", birthday: "1995-02-18", startDate: "2023-03-20", isDemo: true,
  },
  {
    authId: "sample:leo", email: "leo.demo@unitecusadesign.com", name: "Leo Santos", jobTitle: "Líder de operaciones", department: "Operaciones",
    location: "Barranquilla, Colombia", bio: "Caminatas con el equipo, chistes malos y buen café. Pregúntame por fotografía o cuéntame tu logro más reciente.",
    interests: "Fotografía,Fútbol,Café", birthday: "1987-08-04", startDate: "2020-11-06", isDemo: true,
  },
  {
    authId: "test:alex", email: "alex.demo@unitecusadesign.com", name: "Alex Morgan", jobTitle: "Gestión del talento humano", department: "Talento humano",
    location: "Manizales, Colombia", bio: "Me gusta abrir espacio para buenas conversaciones. Corro, leo y estoy aprendiendo jardinería con mucho entusiasmo.",
    interests: "Running,Lectura,Jardinería", birthday: "1990-11-06", startDate: "2022-01-10", isDemo: true,
  },
  {
    authId: "test:jordan", email: "jordan.demo@unitecusadesign.com", name: "Jordan Lee", jobTitle: "Gerente de mercadeo", department: "Mercadeo",
    location: "Cartagena, Colombia", bio: "Un colega curioso. Aficionado a la fotografía y a las caminatas de fin de semana.",
    interests: "Fotografía,Caminatas,Pódcast", birthday: "1993-04-12", startDate: "2024-02-01", isDemo: true,
  },
];

const samplePosts = [
  {
    authId: "sample:maya", topic: "Outside work" as const,
    body: "Un pequeño logro del fin de semana: por fin terminé el bowl de cerámica que empecé el mes pasado. Quedó un poco torcido, pero es perfecto para mi café de la mañana. ¿Qué están creando o aprendiendo fuera del trabajo?",
  },
  {
    authId: "sample:theo", topic: "Motivation" as const,
    body: "Un cliente me dijo que nuestra entrega rápida le salvó la tarde. Fue un buen recordatorio de que los pequeños detalles que tenemos con los demás llegan más lejos de lo que imaginamos.",
  },
  {
    authId: "sample:priya", topic: "Questions" as const,
    body: "¿Qué les ayuda a recuperar la concentración después de una mañana llena de reuniones? Estoy recogiendo ideas para probar esta semana.",
  },
  {
    authId: "test:alex", topic: "Outside work" as const,
    body: "El pequeño logro de hoy: nuestra entrega se sintió tranquila y clara. ¿Qué les ayudó a hacer bien su trabajo esta semana?",
  },
  {
    authId: "test:alex", topic: "Celebration" as const,
    body: "¡Hoy celebremos a Leo Santos por su aniversario laboral! Deja un mensaje, una foto o una nota de voz para alegrarle el día. 🎉",
  },
  {
    authId: "test:alex", topic: "Motivation" as const,
    body: "Una nota de voz rápida para saludar: ¡me emociona conocerlos a todos!",
  },
];

async function seed() {
  const db = getDb();
  console.log("Preparando la comunidad de ejemplo…");
  const ids = new Map<string, number>();
  for (const person of samplePeople) {
    const { authId, email, ...rest } = person;
    await db.insert(users).values({ authId, email, ...rest })
      .onConflictDoUpdate({ target: users.authId, set: { email, ...rest } });
    const saved = await db.query.users.findFirst({ where: eq(users.authId, authId) });
    if (saved) ids.set(authId, saved.id);
  }
  const existing = await db.select({ id: posts.id }).from(posts).limit(1);
  if (!existing.length) {
    await db.insert(posts).values(samplePosts.map((post) => ({
      authorId: ids.get(post.authId)!,
      topic: post.topic,
      body: post.body,
    })));
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
