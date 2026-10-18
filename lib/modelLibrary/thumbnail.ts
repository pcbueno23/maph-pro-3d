/**
 * Gera a miniatura de um arquivo .stl/.3mf. Pra 3MF, tenta primeiro extrair a
 * miniatura que o próprio fatiador (Bambu Studio/PrusaSlicer) já salva dentro do
 * ZIP em Metadata/ — caminho exato varia por versão, então tenta os nomes
 * conhecidos e cai pro "qualquer PNG dentro de Metadata/" antes de desistir. Se
 * não achar nenhuma (ex.: 3MF baixado do MakerWorld sem plate renderizado) ou se
 * for .stl (nunca tem miniatura embutida), renderiza a geometria de verdade com
 * um THREE.WebGLRenderer único e reaproveitado (não dá pra abrir um <canvas>
 * WebGL por arquivo — o navegador trava com ~900 contextos ao mesmo tempo).
 */
import * as THREE from "three";
import JSZip from "jszip";
import { parseSTL } from "../stlParser";
import { parse3MF } from "../threeMFParser";
import type { ModelFileType } from "./types";

const THUMB_SIZE = 320;

const EMBEDDED_THUMB_CANDIDATES = [
  "Metadata/plate_1.png",
  "Metadata/plate_no_light_1.png",
  "Metadata/top_1.png",
  "Metadata/thumbnail_middle.png",
  "Metadata/thumbnail.png",
];

let sharedRenderer: THREE.WebGLRenderer | null = null;
let sharedScene: THREE.Scene | null = null;
let sharedCamera: THREE.PerspectiveCamera | null = null;

function getSharedRenderer() {
  if (sharedRenderer && sharedScene && sharedCamera) {
    return { renderer: sharedRenderer, scene: sharedScene, camera: sharedCamera };
  }
  const canvas = document.createElement("canvas");
  sharedRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  sharedRenderer.setSize(THUMB_SIZE, THUMB_SIZE, false);
  sharedRenderer.setPixelRatio(1);

  sharedScene = new THREE.Scene();
  sharedScene.add(new THREE.AmbientLight(0xffffff, 0.65));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(1, 1.4, 1.2);
  sharedScene.add(key);
  const fill = new THREE.DirectionalLight(0x8b5cf6, 0.35);
  fill.position.set(-1, -0.5, -1);
  sharedScene.add(fill);

  sharedCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 10000);
  return { renderer: sharedRenderer, scene: sharedScene, camera: sharedCamera };
}

function renderGeometriesToDataUrl(geometries: THREE.BufferGeometry[]): string | null {
  const valid = geometries.filter((g) => g.attributes.position && g.attributes.position.count > 0);
  if (valid.length === 0) return null;

  const { renderer, scene, camera } = getSharedRenderer();

  const bboxAll = new THREE.Box3();
  for (const geo of valid) {
    geo.computeBoundingBox();
    geo.computeVertexNormals();
    if (geo.boundingBox) bboxAll.union(geo.boundingBox);
  }
  if (bboxAll.isEmpty()) return null;

  const center = new THREE.Vector3();
  bboxAll.getCenter(center);
  const size = new THREE.Vector3();
  bboxAll.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);

  const material = new THREE.MeshStandardMaterial({ color: 0x22d3ee, roughness: 0.35, metalness: 0.08 });
  const group = new THREE.Group();
  for (const geo of valid) group.add(new THREE.Mesh(geo, material));
  group.position.sub(center);
  scene.add(group);

  const dist = maxDim * 2.1;
  camera.position.set(dist * 0.6, dist * 0.55, dist * 0.75);
  camera.lookAt(0, 0, 0);
  camera.near = Math.max(maxDim * 0.01, 0.001);
  camera.far = maxDim * 20;
  camera.updateProjectionMatrix();

  renderer.setClearColor(0x0b1220, 1);
  renderer.render(scene, camera);
  const dataUrl = renderer.domElement.toDataURL("image/png");

  scene.remove(group);
  material.dispose();
  return dataUrl;
}

async function extractEmbedded3mfThumbnail(file: File): Promise<string | null> {
  try {
    const buf = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);

    for (const path of EMBEDDED_THUMB_CANDIDATES) {
      const entry = zip.file(path);
      if (entry) return `data:image/png;base64,${await entry.async("base64")}`;
    }

    const anyMetadataPng = Object.keys(zip.files).find(
      (f) => f.toLowerCase().startsWith("metadata/") && /\.(png|jpe?g)$/i.test(f),
    );
    if (anyMetadataPng) {
      const ext = anyMetadataPng.toLowerCase().endsWith(".png") ? "png" : "jpeg";
      return `data:image/${ext};base64,${await zip.file(anyMetadataPng)!.async("base64")}`;
    }
  } catch {
    // zip corrompido/sem Metadata — segue pro render por geometria
  }
  return null;
}

export async function generateThumbnail(file: File, ext: ModelFileType): Promise<string | null> {
  try {
    if (ext === "3mf") {
      const embedded = await extractEmbedded3mfThumbnail(file);
      if (embedded) return embedded;
      const { geometries } = await parse3MF(file);
      return renderGeometriesToDataUrl(geometries);
    }
    const { geometry } = await parseSTL(file);
    return renderGeometriesToDataUrl([geometry]);
  } catch {
    return null;
  }
}
