import { eq } from "drizzle-orm";
import { getDb } from "../api/queries/connection";
import { posts, users } from "./schema";

const samplePeople = [
  {
    unionId: "sample:maya", name: "Maya Chen", jobTitle: "Product designer", department: "Design",
    location: "Portland, OR", bio: "Making complicated things feel simple. Usually planning my next trail walk or trying a new noodle recipe.",
    interests: "Trail walks,Ceramics,Street food", birthday: "1992-11-08", startDate: "2022-11-10", isDemo: true,
  },
  {
    unionId: "sample:theo", name: "Theo Martin", jobTitle: "Customer partner", department: "Customer experience",
    location: "Austin, TX", bio: "Here for thoughtful questions, live music, and the perfect Sunday breakfast.",
    interests: "Live music,Cycling,Baking", birthday: "1989-11-12", startDate: "2021-11-15", isDemo: true,
  },
  {
    unionId: "sample:priya", name: "Priya Shah", jobTitle: "Software engineer", department: "Engineering",
    location: "Toronto, ON", bio: "Curious about systems, science fiction, and how teams do their best work together.",
    interests: "Sci-fi,Bouldering,Chess", birthday: "1995-02-18", startDate: "2023-03-20", isDemo: true,
  },
  {
    unionId: "sample:leo", name: "Leo Santos", jobTitle: "Operations lead", department: "Operations",
    location: "Chicago, IL", bio: "Team walks, bad puns, good coffee. Ask me about photography or your latest win.",
    interests: "Photography,Football,Coffee", birthday: "1987-08-04", startDate: "2020-11-06", isDemo: true,
  },
];

async function seed() {
  const db = getDb();
  console.log("Seeding sample community...");
  const ids = new Map<string, number>();
  for (const person of samplePeople) {
    await db.insert(users).values(person).onDuplicateKeyUpdate({ set: person });
    const saved = await db.query.users.findFirst({ where: eq(users.unionId, person.unionId) });
    if (saved) ids.set(person.unionId, saved.id);
  }
  const existing = await db.select({ id: posts.id }).from(posts).limit(1);
  if (!existing.length) {
    await db.insert(posts).values([
      {
        authorId: ids.get("sample:maya")!, topic: "Outside work",
        body: "Tiny weekend win: I finally finished the ceramic bowl I started last month. It’s a little wonky, but it holds my morning coffee perfectly. What are you making or learning outside work?",
      },
      {
        authorId: ids.get("sample:theo")!, topic: "Motivation",
        body: "A customer told me our quick handoff saved their afternoon. A good reminder that the small, thoughtful things we do for each other travel further than we see.",
      },
      {
        authorId: ids.get("sample:priya")!, topic: "Questions",
        body: "What’s one thing that helps you switch back into focus after a meeting-heavy morning? I’m collecting ideas to try this week.",
      },
    ]);
  }
  console.log("Done.");
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
