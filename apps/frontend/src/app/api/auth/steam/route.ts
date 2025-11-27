import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  // Redirect to the backend Steam OAuth endpoint
  return NextResponse.redirect("http://localhost:3002/auth/steam");
}
