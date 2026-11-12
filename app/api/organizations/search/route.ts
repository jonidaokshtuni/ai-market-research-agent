import { NextResponse } from "next/server";
import { asc, ilike } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json(
      { error: "Enter at least 2 characters to search." },
      { status: 400 }
    );
  }

  if (query.length > 80) {
    return NextResponse.json(
      { error: "Search query is too long." },
      { status: 400 }
    );
  }

  try {
    const escapedQuery = query.replace(/[\\%_]/g, "\\$&");

    const workspaces = await db
      .select({
        id: organizations.id,
        name: organizations.name,
      })
      .from(organizations)
      .where(ilike(organizations.name, `%${escapedQuery}%`))
      .orderBy(asc(organizations.name))
      .limit(10);

    return NextResponse.json({ workspaces });
  } catch (error) {
    console.error("Workspace search error:", error);

    return NextResponse.json(
      { error: "Failed to search workspaces." },
      { status: 500 }
    );
  }
}
