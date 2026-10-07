import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      code: "SKP_WORKER_NOT_CONNECTED",
      message: "El worker con SketchUp SDK todavía no está conectado."
    },
    { status: 501 }
  );
}
