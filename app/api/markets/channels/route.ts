import { NextRequest, NextResponse } from "next/server";
import { kv } from "~/lib/kv";
import { Channel } from "~/lib/types";
import { getPopularChannels, searchChannels } from "~/lib/neynar";

function fuzzyMatch(q: string, name: string) {
  return name.toLowerCase().includes(q.toLowerCase());
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search")?.trim();
  
  try {
    const channels: Channel[] = search
      ? await searchChannels(search, 20)
      : await getPopularChannels(20);
    
    return NextResponse.json({ data: channels });
  } catch (error) {
    console.error('Error fetching channels:', error);
    
    return NextResponse.json({ data: [] });
  }
}