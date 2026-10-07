import type { Scene } from "./scene";

type Box = { id:string; x:number; y:number; z:number; w:number; d:number; h:number };

function boxGeometry(id:string, w:number, d:number, h:number) {
  const x=w/2, y=d/2, z=h;
  const verts=[
    -x,-y,0,  x,-y,0,  x,y,0,  -x,y,0,
    -x,-y,z,  x,-y,z,  x,y,z,  -x,y,z
  ];
  const tris=[
    0,1,2, 0,2,3,
    4,6,5, 4,7,6,
    0,4,5, 0,5,1,
    1,5,6, 1,6,2,
    2,6,7, 2,7,3,
    3,7,4, 3,4,0
  ];
  return `<geometry id="${id}-geom" name="${id}">
    <mesh>
      <source id="${id}-positions">
        <float_array id="${id}-positions-array" count="${verts.length}">${verts.join(" ")}</float_array>
        <technique_common>
          <accessor source="#${id}-positions-array" count="${verts.length/3}" stride="3">
            <param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/>
          </accessor>
        </technique_common>
      </source>
      <vertices id="${id}-vertices"><input semantic="POSITION" source="#${id}-positions"/></vertices>
      <triangles count="${tris.length/3}">
        <input semantic="VERTEX" source="#${id}-vertices" offset="0"/>
        <p>${tris.join(" ")}</p>
      </triangles>
    </mesh>
  </geometry>`;
}

export function sceneToDae(scene: Scene) {
  const { width, depth, height } = scene.space;
  const boxes: Box[] = [
    { id:"PISO", x:width/2, y:depth/2, z:-0.05, w:width, d:depth, h:0.05 },
    { id:"PARED_1", x:width/2, y:0.05, z:0, w:width, d:0.1, h:height },
    { id:"PARED_2", x:width/2, y:depth-0.05, z:0, w:width, d:0.1, h:height },
    { id:"PARED_3", x:0.05, y:depth/2, z:0, w:0.1, d:depth, h:height },
    { id:"PARED_4", x:width-0.05, y:depth/2, z:0, w:0.1, d:depth, h:height },
    { id:"BARRA_PRUEBA", x:width*0.50, y:depth*0.50, z:0, w:3.0, d:0.8, h:1.1 },
    { id:"LIVING_PRUEBA", x:Math.min(2.2,width*0.20), y:Math.min(1.2,depth*0.25), z:0, w:2.2, d:0.9, h:0.8 },
    { id:"MESA_PRUEBA", x:Math.min(width-2, width*0.75), y:Math.min(depth-1.5, depth*0.65), z:0, w:1.2, d:0.8, h:0.75 }
  ];

  const geometries=boxes.map(b=>boxGeometry(b.id,b.w,b.d,b.h)).join("\n");
  const nodes=boxes.map(b=>`<node id="${b.id}" name="${b.id}" type="NODE">
      <translate>${b.x} ${b.y} ${b.z}</translate>
      <instance_geometry url="#${b.id}-geom"/>
    </node>`).join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">
  <asset>
    <contributor><authoring_tool>ERREPE SketchUp AI</authoring_tool></contributor>
    <unit name="meter" meter="1"/>
    <up_axis>Z_UP</up_axis>
  </asset>
  <library_geometries>${geometries}</library_geometries>
  <library_visual_scenes>
    <visual_scene id="Scene" name="${scene.project.name.replace(/[<>&"]/g,"") || "ERREPE Scene"}">
      ${nodes}
    </visual_scene>
  </library_visual_scenes>
  <scene><instance_visual_scene url="#Scene"/></scene>
</COLLADA>`;
}
