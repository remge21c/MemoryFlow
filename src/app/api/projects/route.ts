import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      days: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          dayNumber: true,
          date: true,
          title: true,
        },
      },
      storybook: {
        select: {
          id: true,
          status: true,
          title: true,
        },
      },
    },
  });

  return NextResponse.json({ projects });
}
