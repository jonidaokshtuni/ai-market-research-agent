import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getActiveWorkspace } from "@/lib/organizations/active-workspace";
import { getAnalyticsData } from "@/lib/dashboard/queries";

function parseDate(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
}

export async function GET(request: Request) {
  // Keep request-dependent APIs outside the catch block so Next.js
  // can handle its prerendering control signals.
  const user = await getCurrentUser();
  const { searchParams } = new URL(request.url);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const workspace = await getActiveWorkspace(user.id);

    if (!workspace) {
      return NextResponse.json(
        { error: "No active workspace found." },
        { status: 403 }
      );
    }

    const startValue = searchParams.get("start");
    const endValue = searchParams.get("end");

    const startDate = parseDate(startValue);
    const endDate = parseDate(endValue);

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Valid start and end dates are required (YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    if (startDate > endDate) {
      return NextResponse.json(
        { error: "Start date must be before or equal to end date." },
        { status: 400 }
      );
    }

    const days =
      Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1;

    if (days > 366) {
      return NextResponse.json(
        { error: "Date range cannot exceed 366 days." },
        { status: 400 }
      );
    }

    const analytics = await getAnalyticsData(workspace.id, startDate, endDate);

    return NextResponse.json({
      ...analytics,
      period: {
        start: startValue,
        end: endValue,
        days,
      },
    });
  } catch (error) {
    console.error("Analytics API Error:", error);

    return NextResponse.json(
      { error: "Unable to load analytics." },
      { status: 500 }
    );
  }
}
