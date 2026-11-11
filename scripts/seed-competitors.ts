import { config } from "dotenv";

// Load environment variables before initializing the database.
config({ path: ".env.local" });

async function seedCompetitors() {
  const databaseUrl =
    process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "Database URL not found. Check DATABASE_URL or DATABASE_URL_POOLED in .env.local."
    );
  }

  const email = process.env.SEED_USER_EMAIL?.trim().toLowerCase();

  if (!email) {
    throw new Error(
      "Set SEED_USER_EMAIL to the email address of your account."
    );
  }

  // Import after loading .env.local.
  const [{ db }, schema, { eq }] = await Promise.all([
    import("../db"),
    import("../db/schema"),
    import("drizzle-orm"),
  ]);

  const [user] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  if (!user) {
    throw new Error(`No account found for ${email}. Register first.`);
  }

  const sampleCompetitors = [
    {
      name: "OpenAI",
      website: "https://openai.com",
      industry: "Technology",
      description:
        "AI research and product company developing advanced AI systems.",
      products: "ChatGPT, API, GPT models",
      pricing: "Free and paid subscriptions; API usage-based pricing",
      strengths:
        "Strong brand recognition, advanced AI models, large developer ecosystem",
      weaknesses: "High infrastructure costs, intense competition",
      marketStrength: 95,
      innovationScore: 96,
    },
    {
      name: "Anthropic",
      website: "https://www.anthropic.com",
      industry: "Technology",
      description:
        "AI company focused on reliable, interpretable, and steerable AI systems.",
      products: "Claude, Claude API",
      pricing: "Free and paid subscriptions; API usage-based pricing",
      strengths: "AI safety focus, strong language models, enterprise adoption",
      weaknesses: "Strong competition, high model development costs",
      marketStrength: 85,
      innovationScore: 94,
    },
    {
      name: "Google",
      website: "https://deepmind.google",
      industry: "Technology",
      description:
        "Technology company investing heavily in AI research and products.",
      products: "Gemini, Google Cloud AI, Vertex AI",
      pricing: "Free and paid products; usage-based cloud pricing",
      strengths: "Global infrastructure, research capabilities, distribution",
      weaknesses: "Complex product ecosystem, intense market competition",
      marketStrength: 98,
      innovationScore: 93,
    },
    {
      name: "Perplexity",
      website: "https://www.perplexity.ai",
      industry: "Technology",
      description: "AI-powered answer engine focused on conversational search.",
      products: "Perplexity Search, Pro",
      pricing: "Free and paid subscriptions",
      strengths:
        "Search-focused experience, citations, user-friendly interface",
      weaknesses:
        "Dependence on external information sources, competition from large platforms",
      marketStrength: 72,
      innovationScore: 86,
    },
    {
      name: "Mistral AI",
      website: "https://mistral.ai",
      industry: "Technology",
      description:
        "AI company developing efficient language models and AI solutions.",
      products: "Le Chat, Mistral models, API",
      pricing: "Free and paid subscriptions; API usage-based pricing",
      strengths: "Efficient models, open-weight offerings, European presence",
      weaknesses:
        "Smaller distribution network, competition from larger AI companies",
      marketStrength: 70,
      innovationScore: 89,
    },
  ];

  const existing = await db
    .select({ name: schema.competitors.name })
    .from(schema.competitors)
    .where(eq(schema.competitors.userId, user.id));

  const existingNames = new Set(
    existing.map((item) => item.name.toLowerCase())
  );

  const newCompetitors = sampleCompetitors.filter(
    (item) => !existingNames.has(item.name.toLowerCase())
  );

  if (newCompetitors.length === 0) {
    console.log("All sample competitors already exist for this account.");
    return;
  }

  await db.insert(schema.competitors).values(
    newCompetitors.map((item) => ({
      ...item,
      userId: user.id,
    }))
  );

  console.log(
    `Successfully inserted ${newCompetitors.length} competitors for ${email}.`
  );
}

seedCompetitors().catch((error) => {
  console.error("Seeding failed:", error);
  process.exitCode = 1;
});
