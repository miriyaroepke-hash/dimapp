import { NextResponse } from "next/server";
import { generateHalykXml } from "@/lib/halyk";

export const dynamic = "force-dynamic";

export async function GET() {
  const xml = await generateHalykXml();
  
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "text/xml",
    },
  });
}
