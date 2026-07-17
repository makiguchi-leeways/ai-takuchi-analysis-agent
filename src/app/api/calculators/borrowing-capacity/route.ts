import { NextResponse } from "next/server";
import { calculateBorrowingCapacity } from "@/lib/market/finance";

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json(calculateBorrowingCapacity(body));
}
