import { NextRequest, NextResponse } from "next/server";
import { kv } from "~/lib/kv";
import { Creator } from "~/lib/types";
import { getPopularCreators, searchCreators } from "~/lib/neynar";

function fuzzyMatch(q: string, name: string) {
  return name.toLowerCase().includes(q.toLowerCase());
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search")?.trim();
  
  try {
    const creators: Creator[] = search
      ? await searchCreators(search, 20)
      : await getPopularCreators(20);
    
    return NextResponse.json({ data: creators });
  } catch (error) {
    console.error('Error fetching creators:', error);
    
    return NextResponse.json({ data: [] });
  }
}