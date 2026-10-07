export type Scene = {
  version: 1;
  project: { name: string; units: "m" };
  space: { width: number; depth: number; height: number };
  brief: string;
  objects: SceneObject[];
};

export type SceneObject = {
  id: string;
  type: string;
  component: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  dimensions?: { width: number; depth: number; height: number };
  material?: string;
};
