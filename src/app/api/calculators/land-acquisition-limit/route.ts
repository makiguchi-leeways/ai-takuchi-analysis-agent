import { NextResponse } from "next/server";
import { calculateLandAcquisitionLimit } from "@/lib/market/finance";

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json(calculateLandAcquisitionLimit(body));
}
