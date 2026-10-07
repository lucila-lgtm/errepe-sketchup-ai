import { sceneToDae } from "../../../lib/dae";
import type { Scene } from "../../../lib/scene";

export async function POST(req: Request) {
  const scene = await req.json() as Scene;
  const dae = sceneToDae(scene);
  const safe = (scene.project?.name || "errepe-sketchup")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-zA-Z0-9-_]+/g,"-");
  return new Response(dae, {
    status: 200,
    headers: {
      "Content-Type": "model/vnd.collada+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safe}.dae"`
    }
  });
}
