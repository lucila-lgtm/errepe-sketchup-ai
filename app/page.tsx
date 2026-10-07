"use client";

import { useMemo, useState } from "react";

const sample = `Prueba de escala para SketchUp Web.
El archivo incluye piso, cuatro paredes, una barra, un living y una mesa.
Primero validamos que la importación sea 1:1 y que los objetos lleguen separados.`;

export default function Home() {
  const [prompt, setPrompt] = useState(sample);
  const [name, setName] = useState("Prueba ERREPE SketchUp");
  const [width, setWidth] = useState(10);
  const [depth, setDepth] = useState(6);
  const [busy, setBusy] = useState(false);

  const scene = useMemo(() => ({
    version: 1 as const,
    project: { name, units: "m" as const },
    space: { width, depth, height: 3.5 },
    brief: prompt,
    objects: []
  }), [name, width, depth, prompt]);

  async function exportDae() {
    setBusy(true);
    try {
      const res = await fetch("/api/export-dae", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scene)
      });
      if (!res.ok) throw new Error("No se pudo generar el archivo.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name.replace(/[^a-zA-Z0-9-_]+/g,"-") || "errepe-sketchup"}.dae`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al generar DAE");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <section className="hero">
        <span className="eyebrow">ERREPÉ PRODUCTORA</span>
        <h1>SketchUp AI</h1>
        <p>Generador de escenas para SketchUp Web. Mientras el SDK SKP oficial no esté disponible, usamos DAE como puente 3D editable.</p>
      </section>

      <section className="grid">
        <div className="card">
          <label>Proyecto</label>
          <input value={name} onChange={e => setName(e.target.value)} />

          <div className="row">
            <div>
              <label>Ancho (m)</label>
              <input type="number" min="1" step="0.1" value={width} onChange={e => setWidth(Number(e.target.value))} />
            </div>
            <div>
              <label>Profundidad (m)</label>
              <input type="number" min="1" step="0.1" value={depth} onChange={e => setDepth(Number(e.target.value))} />
            </div>
          </div>

          <label>Descripción</label>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={10} />

          <button onClick={exportDae} disabled={busy || width <= 0 || depth <= 0}>
            {busy ? "Generando…" : "Generar para SketchUp (.DAE)"}
          </button>
          <p style={{fontSize:13,color:"#666",lineHeight:1.5}}>
            Prueba inicial: el DAE contendrá un salón con piso, 4 paredes y 3 objetos de referencia para validar importación, escala y edición.
          </p>
        </div>

        <div className="card dark">
          <div className="panelHeader">
            <strong>Escena maestra</strong>
            <span>JSON v1</span>
          </div>
          <pre>{JSON.stringify(scene, null, 2)}</pre>
        </div>
      </section>

      <section className="status">
        <div><b>1</b><span>Brief</span></div>
        <div><b>2</b><span>Escena</span></div>
        <div><b>3</b><span>DAE</span></div>
        <div><b>4</b><span>SketchUp Web</span></div>
      </section>
    </main>
  );
}
