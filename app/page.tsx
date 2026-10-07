"use client";

import { useMemo, useState } from "react";

const sample = `Salón de 50 x 9 m.
6 livings negros sobre la pared izquierda.
Pantalla LED de 4,80 x 2,50 m entre el segundo y tercer living.
Barra central, isla gastronómica, 8 mesas para 4 personas,
mesas altas contra el ventanal, cabina de realidad virtual y Kids Club.`;

export default function Home() {
  const [prompt, setPrompt] = useState(sample);
  const [name, setName] = useState("TC Experience");
  const [width, setWidth] = useState(50);
  const [depth, setDepth] = useState(9);

  const scene = useMemo(() => ({
    version: 1,
    project: { name, units: "m" },
    space: { width, depth, height: 3.5 },
    brief: prompt,
    objects: []
  }), [name, width, depth, prompt]);

  return (
    <main>
      <section className="hero">
        <span className="eyebrow">ERREPÉ PRODUCTORA</span>
        <h1>SketchUp AI</h1>
        <p>De una descripción de evento a una escena estructurada lista para generar un archivo SKP.</p>
      </section>

      <section className="grid">
        <div className="card">
          <label>Proyecto</label>
          <input value={name} onChange={e => setName(e.target.value)} />

          <div className="row">
            <div>
              <label>Ancho (m)</label>
              <input type="number" value={width} onChange={e => setWidth(Number(e.target.value))} />
            </div>
            <div>
              <label>Profundidad (m)</label>
              <input type="number" value={depth} onChange={e => setDepth(Number(e.target.value))} />
            </div>
          </div>

          <label>Describí el espacio</label>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={12} />

          <button onClick={() => alert("La escena base está lista. El próximo paso conecta el intérprete y el worker SKP.")}>
            Generar escena
          </button>
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
        <div><b>3</b><span>Worker SKP</span></div>
        <div><b>4</b><span>SketchUp Web</span></div>
      </section>
    </main>
  );
}
