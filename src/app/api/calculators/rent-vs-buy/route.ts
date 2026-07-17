import { NextResponse } from "next/server";
import { compareRentVsBuy } from "@/lib/market/finance";

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json(compareRentVsBuy(body));
}
