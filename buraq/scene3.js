import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// explode offsets in car coordinates (metres, x forward, y left, z up) — same values as blender/build_scene.py
const POS = [[-1.75, -0.18, 0.215], [-1.75, 0.18, 0.215], [-1.75, -0.18, 0.38], [-1.75, 0.18, 0.38], [-0.60, -0.18, 0.215], [-0.60, 0.18, 0.215], [0.10, -0.18, 0.215], [0.10, 0.18, 0.215]];
export const EXPLODE = {
  M1_frame: [0, 0, -0.05], M3_drive: [0.35, 0, 0], M4_inverter: [0.25, 0.35, 0.55], M5_pdu: [-0.1, -0.55, 0.55],
  M6_charger: [0.55, -0.45, 0.6], M7_thermal: [0.7, 0, 0.1], M8_vcu: [-0.2, 0.6, 0.55], M9_vacuum: [0, 0.85, 0.35],
  M10_eps: [-0.3, 0.8, 0.6], HV_harness: [0, 0, 2.5], Coolant_hoses: [0, 0, 2.5],
};
POS.forEach(([x, y, z], i) => { EXPLODE[`M2_B${i + 1}`] = [x * 0.25, (y > 0 ? 1 : -1) * 0.25, 0.55 + (z > 0.3 ? 0.3 : 0)]; });

export async function createScene(canvas, { url, pixelRatio = 1, shadows = true, onProgress = null } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 80);
  camera.up.set(0, 0, 1);

  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, -4, 7); key.castShadow = shadows;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 20 });
  key.shadow.bias = -0.0003; key.shadow.normalBias = 0.01;
  const rim = new THREE.DirectionalLight(0xe6eeff, 1.0); rim.position.set(-5, 3, 3);
  scene.add(key, rim, new THREE.HemisphereLight(0xeef2f5, 0x30363a, 0.5));

  const ground = new THREE.Mesh(new THREE.CircleGeometry(8, 72), new THREE.ShadowMaterial({ opacity: 0.25 }));
  ground.receiveShadow = true; scene.add(ground);

  const gltf = await new GLTFLoader().loadAsync(url, (e) => { if (onProgress) onProgress(e.total ? e.loaded / e.total : Math.min(0.95, e.loaded / 8.0e6)); });
  const model = gltf.scene;
  const root = new THREE.Group();
  root.rotation.x = Math.PI / 2;          // glTF is Y-up; bring Blender's Z-up back
  root.add(model); scene.add(root);
  root.updateMatrixWorld(true);

  // merge every group's meshes per material → few draw calls (fast on phones)
  const groups = {};
  for (const g of [...model.children]) {
    if (!g.name) continue;
    const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
    const byMat = new Map();
    g.traverse((o) => {
      if (!o.isMesh) return;
      const geo = o.geometry.clone();
      for (const k of Object.keys(geo.attributes)) if (k !== "position" && k !== "normal") geo.deleteAttribute(k);
      if (!geo.attributes.normal) geo.computeVertexNormals();
      geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      const m = o.material;
      if (!byMat.has(m)) byMat.set(m, []);
      byMat.get(m).push(geo.index ? geo.toNonIndexed() : geo);
    });
    const ng = new THREE.Group();
    ng.name = g.name; ng.position.copy(g.position); ng.quaternion.copy(g.quaternion); ng.scale.copy(g.scale);
    for (const [m, list] of byMat) {
      const geo = mergeGeometries(list, false);
      if (!geo) continue;
      if (m.isMeshStandardMaterial && !m.userData.tuned) {
        m.userData.tuned = true; m.side = THREE.FrontSide;
        if (m.anisotropy) m.anisotropy = 0;
        if (m.metalness > 0.5) { m.color.multiplyScalar(0.85); m.roughness = Math.max(m.roughness, 0.34); m.envMapIntensity = 1.1; }
        else m.envMapIntensity = 0.6;
      }
      const mesh = new THREE.Mesh(geo, m);
      mesh.castShadow = mesh.receiveShadow = shadows;
      ng.add(mesh);
    }
    model.remove(g); model.add(ng);
    ng.userData.home = ng.position.clone();
    groups[g.name] = ng;
  }
  if (groups.M2_open) groups.M2_open.visible = false;

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 0.4; controls.maxDistance = 14;
  controls.maxPolarAngle = Math.PI * 0.495;

  let iso = null;
  function setExplode(t) {
    for (const [n, g] of Object.entries(groups)) {
      const e = EXPLODE[n]; if (!e) continue;
      // car (x,y,z) → glTF local (x, z, -y)
      g.position.set(g.userData.home.x + e[0] * t, g.userData.home.y + e[2] * t, g.userData.home.z - e[1] * t);
      if (!iso && (n === "HV_harness" || n === "Coolant_hoses")) g.visible = t < 0.3;
    }
  }
  function visibleBox() {
    root.updateMatrixWorld(true);
    const b = new THREE.Box3();
    for (const g of Object.values(groups)) if (g.visible) b.expandByObject(g);
    return b;
  }
  function frame(dir = [1.1, -1.4, 0.75], fill = 0.85) {
    const b = visibleBox(), c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
    const r = Math.max(s.x, s.y, s.z) * 0.62;
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const fitH = r / Math.sin(fov / 2), fitW = r / Math.sin(Math.atan(Math.tan(fov / 2) * camera.aspect));
    const d = Math.max(fitH, fitW) * fill;
    const v = new THREE.Vector3(...dir).normalize();
    camera.position.copy(c).addScaledVector(v, d);
    controls.target.copy(c); controls.update();
    ground.position.set(c.x, c.y, iso ? b.min.z - 0.001 : 0);
    key.target.position.copy(c); key.position.copy(c).add(new THREE.Vector3(3, -4, 7));
    scene.add(key.target);
  }
  function isolate(name) {
    iso = name;
    const real = name === "M2_B1" ? "M2_open" : name;
    for (const [n, g] of Object.entries(groups)) g.visible = name ? n === real : n !== "M2_open";
  }
  function setSize(w, h) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  function render() { controls.update(); renderer.render(scene, camera); }
  return { setExplode, isolate, frame, setSize, render, groups };
}
