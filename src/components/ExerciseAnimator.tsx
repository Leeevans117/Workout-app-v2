import React, { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { AnimationType, CardioMode } from '../types/workout';
import {
  resolveKinematicPattern,
  getActiveMusclesForPattern,
  getCueForPattern,
  solveExercisePose,
  KinematicPattern,
} from '../utils/exerciseKinematics';
import { Activity, Compass, Eye, RotateCcw } from 'lucide-react';

interface ExerciseAnimatorProps {
  type: AnimationType;
  exerciseId?: string;
  exerciseName?: string;
  cardioMode?: CardioMode;
  isActive: boolean;
  timeRemaining?: number;
  phase?: 'prep' | 'active' | 'rest' | 'finished';
}

type CameraPreset = 'orbit' | 'side' | 'front';

/**
 * Reusable Parametric Anatomical Profile & Muscle Bulge Geometry Builders
 * Eliminates stick-figure CylinderGeometry in favor of organic THREE.LatheGeometry
 * with smooth Gaussian/sinusoidal muscle belly contours and natural joint tapers.
 */
interface MuscleBulgeZone {
  centerT: number; // 0 = distal (elbow/knee/wrist/ankle), 1 = proximal (shoulder/hip)
  widthT: number;
  amplitude: number; // radial bulge in meters
}

function createTaperedLatheGeometry(
  length: number,
  radiusDistal: number,
  radiusProximal: number,
  bulgeZones: MuscleBulgeZone[],
  axialSteps = 18,
  radialSegments = 24
): THREE.LatheGeometry {
  const points: THREE.Vector2[] = [];
  const halfLen = length * 0.5;

  for (let i = 0; i <= axialSteps; i++) {
    const t = i / axialSteps; // 0 = bottom (-halfLen), 1 = top (+halfLen)
    const y = -halfLen + t * length;

    // Base conical taper from distal joint (t=0) to proximal joint (t=1)
    let r = THREE.MathUtils.lerp(radiusDistal, radiusProximal, Math.pow(t, 0.88));

    // Add smooth organic parametric muscle belly bulges
    for (const zone of bulgeZones) {
      const normalizedDist = (t - zone.centerT) / Math.max(0.05, zone.widthT);
      if (Math.abs(normalizedDist) < 1.0) {
        const bell = Math.cos(normalizedDist * Math.PI * 0.5);
        r += zone.amplitude * bell * bell;
      }
    }

    // Smoothly round the very ends so segments blend seamlessly into joint sockets
    const endFade = Math.sin(t * Math.PI);
    r *= 0.92 + 0.08 * Math.pow(endFade, 0.35);

    points.push(new THREE.Vector2(Math.max(0.008, r), y));
  }

  const geo = new THREE.LatheGeometry(points, radialSegments);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates a sculpted 3D parametric muscle belly mesh (used for Biceps, Triceps,
 * Quadriceps vastus medialis/lateralis, Gastrocnemius, and Deltoid heads)
 * with an asymmetric organic teardrop contour along its longitudinal axis.
 */
function createParametricMuscleBulgeGeometry(
  length: number,
  maxRadius: number,
  peakT = 0.55,
  radialSegments = 20
): THREE.LatheGeometry {
  const points: THREE.Vector2[] = [];
  const steps = 14;
  const halfLen = length * 0.5;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = -halfLen + t * length;
    // Skewed teardrop profile peaking at `peakT`
    const skew = t < peakT ? t / peakT : (1 - t) / (1 - peakT);
    const profile = Math.sin(Math.max(0, Math.min(1, skew)) * Math.PI * 0.5);
    const r = Math.max(0.002, maxRadius * Math.pow(profile, 1.15));
    points.push(new THREE.Vector2(r, y));
  }

  const geo = new THREE.LatheGeometry(points, radialSegments);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Exact 3D Two-Bone Analytic Inverse Kinematics Solver
 */
function solveTwoBoneIK(
  rootPos: THREE.Vector3,
  targetPos: THREE.Vector3,
  len1: number,
  len2: number,
  poleDir: THREE.Vector3
): THREE.Vector3 {
  const diff = new THREE.Vector3().subVectors(targetPos, rootPos);
  const dist = Math.max(0.001, diff.length());
  const maxReach = (len1 + len2) * 0.995;
  const minReach = Math.abs(len1 - len2) + 0.01;
  const clampedDist = Math.min(maxReach, Math.max(minReach, dist));

  const forward = diff.clone().normalize();
  const proj = forward.clone().multiplyScalar(poleDir.dot(forward));
  const bendAxis = new THREE.Vector3().subVectors(poleDir, proj);
  if (bendAxis.lengthSq() < 1e-5) {
    bendAxis.set(0, 0, 1);
  }
  bendAxis.normalize();

  const cosAngle =
    (len1 * len1 + clampedDist * clampedDist - len2 * len2) / (2 * len1 * clampedDist);
  const clampedCos = Math.max(-1, Math.min(1, cosAngle));
  const sinAngle = Math.sqrt(Math.max(0, 1 - clampedCos * clampedCos));

  return new THREE.Vector3()
    .copy(rootPos)
    .addScaledVector(forward, len1 * clampedCos)
    .addScaledVector(bendAxis, len1 * sinAngle);
}

/**
 * Orients a 3D torso or limb segment so its local +Y axis runs from `start` to `end`
 * AND its local +Z (chest/anterior) axis faces `anteriorHint` (preventing supine/prone inversion!).
 */
function orientSegmentWithAnterior(
  obj: THREE.Object3D,
  start: THREE.Vector3,
  end: THREE.Vector3,
  anteriorHint: THREE.Vector3,
  lerpFactor = 0.5
) {
  obj.position.lerpVectors(start, end, lerpFactor);
  const yAxis = new THREE.Vector3().subVectors(end, start);
  if (yAxis.lengthSq() < 1e-6) {
    yAxis.set(0, 1, 0);
  } else {
    yAxis.normalize();
  }

  // Orthogonalize anteriorHint (+Z) against yAxis
  const proj = yAxis.clone().multiplyScalar(anteriorHint.dot(yAxis));
  const zAxis = new THREE.Vector3().subVectors(anteriorHint, proj);
  if (zAxis.lengthSq() < 1e-5) {
    zAxis.set(0, 0, 1);
  } else {
    zAxis.normalize();
  }

  // Right-handed basis: X (athlete's left) = Y cross Z
  const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize();
  zAxis.crossVectors(xAxis, yAxis).normalize();

  const rotMatrix = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
  obj.quaternion.setFromRotationMatrix(rotMatrix);
}

export const ExerciseAnimator: React.FC<ExerciseAnimatorProps> = ({
  type,
  exerciseId,
  exerciseName,
  cardioMode,
  isActive,
}) => {
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('orbit');
  const [webglFallback, setWebglFallback] = useState(false);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  const baseType: AnimationType =
    type === 'ebike' && cardioMode === 'spinning' ? 'spinning' : type;
  const resolvedPattern: KinematicPattern = resolveKinematicPattern(
    baseType,
    exerciseId,
    exerciseName
  );
  const patternRef = useRef<KinematicPattern>(resolvedPattern);
  patternRef.current = resolvedPattern;

  const cameraPresetRef = useRef<CameraPreset>(cameraPreset);
  cameraPresetRef.current = cameraPreset;

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setBreathPhase((prev) => {
        if (prev === 'Inhale') return 'Hold';
        if (prev === 'Hold') return 'Exhale';
        return 'Inhale';
      });
    }, 2800);
    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglFallback(true);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth || 480, container.clientHeight || 220);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglFallback(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      35,
      (container.clientWidth || 480) / (container.clientHeight || 220),
      0.1,
      50
    );

    // =========================================================================
    // REALISTIC STUDIO LIGHTING FOR HUMAN SKIN & MUSCLE DEFINITION
    // =========================================================================
    const hemiLight = new THREE.HemisphereLight(0xfff7ed, 0x1e293b, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffaf0, 1.9);
    keyLight.position.set(2.6, 4.4, 3.0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.65);
    fillLight.position.set(-3.2, 2.0, 2.2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xfde68a, 0.75);
    rimLight.position.set(0, 3.2, -3.5);
    scene.add(rimLight);

    // Floor Grid & Cushioned Gym Mat
    const floorGroup = new THREE.Group();
    scene.add(floorGroup);

    const gridHelper = new THREE.GridHelper(6, 16, 0x1e293b, 0x0f172a);
    gridHelper.position.y = -0.005;
    floorGroup.add(gridHelper);

    const matGeo = new THREE.BoxGeometry(1.22, 0.022, 2.40);
    const matMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.78,
      metalness: 0.08,
    });
    const exerciseMat = new THREE.Mesh(matGeo, matMat);
    exerciseMat.position.set(0, -0.011, 0);
    exerciseMat.receiveShadow = true;
    floorGroup.add(exerciseMat);

    const borderGeo = new THREE.EdgesGeometry(matGeo);
    const borderMat = new THREE.LineBasicMaterial({ color: 0x1e3a8a });
    const matBorder = new THREE.LineSegments(borderGeo, borderMat);
    matBorder.position.copy(exerciseMat.position);
    floorGroup.add(matBorder);

    // =========================================================================
    // LIFELIKE HUMAN SKIN, HAIR, APPAREL & MUSCLE PBR MATERIALS
    // =========================================================================
    const skinColorHex = 0xd6a184; // Lifelike warm athletic human skin tone
    const skinMat = new THREE.MeshPhysicalMaterial({
      color: skinColorHex,
      roughness: 0.46,
      metalness: 0.02,
      clearcoat: 0.08,
      clearcoatRoughness: 0.45,
      sheen: 0.25,
      sheenRoughness: 0.6,
      sheenColor: new THREE.Color(0xffd8c2),
    });

    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917, // Natural dark espresso hair & eyebrows
      roughness: 0.75,
      metalness: 0.05,
    });

    const lipMat = new THREE.MeshStandardMaterial({
      color: 0xb06d5b,
      roughness: 0.5,
    });

    const scleraMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.2,
    });

    const irisMat = new THREE.MeshStandardMaterial({
      color: 0x292524,
      roughness: 0.15,
    });

    const shortsMat = new THREE.MeshStandardMaterial({
      color: 0x111827, // Matte charcoal compression shorts
      roughness: 0.65,
      metalness: 0.08,
    });

    const shoeUpperMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.45,
      metalness: 0.15,
    });

    const shoeSoleMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.5,
    });

    // Dynamic Muscle Group Materials (Warm skin tone at rest, subtle anatomical highlight on peak contraction)
    const createMuscleMaterial = () =>
      new THREE.MeshPhysicalMaterial({
        color: skinColorHex,
        emissive: new THREE.Color(0x000000),
        emissiveIntensity: 0,
        roughness: 0.44,
        metalness: 0.03,
        clearcoat: 0.1,
        sheen: 0.25,
        sheenColor: new THREE.Color(0xffd8c2),
      });

    const chestMat = createMuscleMaterial();
    const backMat = createMuscleMaterial();
    const shoulderMat = createMuscleMaterial();
    const armMat = createMuscleMaterial();
    const coreMat = createMuscleMaterial();
    const gluteMat = createMuscleMaterial();
    const legMat = createMuscleMaterial();

    const humanGroup = new THREE.Group();
    scene.add(humanGroup);

    // =========================================================================
    // 1. LIFELIKE HUMAN HEAD, FACE, EYES, EARS, HAIR & NECK
    // =========================================================================
    const headGroup = new THREE.Group();
    const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.102, 28, 28), skinMat);
    cranium.scale.set(0.92, 1.12, 1.02);
    cranium.castShadow = true;
    headGroup.add(cranium);

    // Sculpted Jawline & Chin (+Z is forward face)
    const jawMesh = new THREE.Mesh(new THREE.SphereGeometry(0.078, 24, 20), skinMat);
    jawMesh.scale.set(0.94, 0.95, 1.05);
    jawMesh.position.set(0, -0.038, 0.022);
    headGroup.add(jawMesh);

    const chinMesh = new THREE.Mesh(new THREE.SphereGeometry(0.034, 16, 16), skinMat);
    chinMesh.scale.set(1.05, 0.85, 0.95);
    chinMesh.position.set(0, -0.088, 0.068);
    headGroup.add(chinMesh);

    // Brow Ridge & Nose Bridge
    const browMesh = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.018, 0.03), skinMat);
    browMesh.position.set(0, 0.032, 0.086);
    headGroup.add(browMesh);

    const noseMesh = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.052, 12), skinMat);
    noseMesh.rotation.x = Math.PI * 0.38;
    noseMesh.position.set(0, -0.004, 0.104);
    headGroup.add(noseMesh);

    // Eyebrows, Eyes (Sclera + Iris) & Lips
    const browHairGeo = new THREE.BoxGeometry(0.034, 0.007, 0.012);
    const browL = new THREE.Mesh(browHairGeo, hairMat);
    browL.position.set(0.032, 0.036, 0.096);
    browL.rotation.z = -0.06;
    headGroup.add(browL);

    const browR = new THREE.Mesh(browHairGeo, hairMat);
    browR.position.set(-0.032, 0.036, 0.096);
    browR.rotation.z = 0.06;
    headGroup.add(browR);

    const eyeGeo = new THREE.SphereGeometry(0.013, 14, 14);
    const pupilGeo = new THREE.SphereGeometry(0.0065, 12, 12);
    const eyeL = new THREE.Mesh(eyeGeo, scleraMat);
    eyeL.position.set(0.032, 0.014, 0.088);
    headGroup.add(eyeL);
    const pupilL = new THREE.Mesh(pupilGeo, irisMat);
    pupilL.position.set(0.032, 0.014, 0.098);
    headGroup.add(pupilL);

    const eyeR = new THREE.Mesh(eyeGeo, scleraMat);
    eyeR.position.set(-0.032, 0.014, 0.088);
    headGroup.add(eyeR);
    const pupilR = new THREE.Mesh(pupilGeo, irisMat);
    pupilR.position.set(-0.032, 0.014, 0.098);
    headGroup.add(pupilR);

    const lipsMesh = new THREE.Mesh(new THREE.SphereGeometry(0.022, 14, 12), lipMat);
    lipsMesh.scale.set(1.35, 0.42, 0.65);
    lipsMesh.position.set(0, -0.052, 0.086);
    headGroup.add(lipsMesh);

    // Left & Right Ears
    const earGeo = new THREE.SphereGeometry(0.024, 12, 12);
    const earL = new THREE.Mesh(earGeo, skinMat);
    earL.scale.set(0.38, 1.05, 0.68);
    earL.position.set(0.094, 0.0, -0.005);
    headGroup.add(earL);

    const earR = new THREE.Mesh(earGeo, skinMat);
    earR.scale.set(0.38, 1.05, 0.68);
    earR.position.set(-0.094, 0.0, -0.005);
    headGroup.add(earR);

    // Sculpted Athletic Short Haircut
    const hairCrown = new THREE.Mesh(
      new THREE.SphereGeometry(0.106, 24, 20, 0, Math.PI * 2, 0, Math.PI * 0.58),
      hairMat
    );
    hairCrown.scale.set(0.94, 1.14, 1.05);
    hairCrown.position.set(0, 0.008, -0.006);
    hairCrown.rotation.x = -0.22;
    headGroup.add(hairCrown);
    humanGroup.add(headGroup);

    // Neck & Sternocleidomastoid Column (Gradual conical taper from head base to broad shoulders)
    // orientSegmentWithAnterior(neckGroup, thoraxPos, headPos):
    // local -Y (t=0) is at shoulder/thorax base (wider = 0.068), local +Y (t=1) is at skull base (narrower = 0.049)
    const neckGroup = new THREE.Group();
    const neckLatheGeo = createTaperedLatheGeometry(
      0.13,
      0.068, // wider shoulder base (t=0)
      0.049, // narrower cranial base (t=1)
      [{ centerT: 0.35, widthT: 0.45, amplitude: 0.005 }],
      14,
      22
    );
    const neckCyl = new THREE.Mesh(neckLatheGeo, skinMat);
    neckCyl.scale.set(1.04, 1, 0.94);
    neckCyl.castShadow = true;
    neckGroup.add(neckCyl);
    humanGroup.add(neckGroup);

    // =========================================================================
    // 2. ANATOMICAL THORAX (Lathe-Tapered Ribcage, Pectorals, Lats, Traps, Scapulae)
    // =========================================================================
    const thoraxGroup = new THREE.Group();
    // Subtle waist-to-chest Lathe taper (narrower at lower ribs t=0, flaring up to broad chest t=0.72)
    const ribcageLatheGeo = createTaperedLatheGeometry(
      0.30,
      0.132, // lower rib/waist transition (t=0)
      0.168, // upper chest breadth (t=1)
      [{ centerT: 0.68, widthT: 0.42, amplitude: 0.012 }],
      18,
      28
    );
    const ribcageMesh = new THREE.Mesh(ribcageLatheGeo, skinMat);
    ribcageMesh.scale.set(1.18, 1, 0.72);
    ribcageMesh.castShadow = true;
    thoraxGroup.add(ribcageMesh);

    // Upper Trapezius Slope (Conical shoulder-neck bridge)
    const trapsMesh = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 16), backMat);
    trapsMesh.scale.set(1.48, 0.54, 0.74);
    trapsMesh.position.set(0, 0.135, -0.015);
    thoraxGroup.add(trapsMesh);

    // Left & Right Pectoralis Major (+Z anterior chest)
    const pecGeo = new THREE.SphereGeometry(0.098, 22, 18);
    const pecL = new THREE.Mesh(pecGeo, chestMat);
    pecL.scale.set(1.08, 0.76, 0.56);
    pecL.position.set(0.08, 0.048, 0.088);
    thoraxGroup.add(pecL);

    const pecR = new THREE.Mesh(pecGeo, chestMat);
    pecR.scale.set(1.08, 0.76, 0.56);
    pecR.position.set(-0.08, 0.048, 0.088);
    thoraxGroup.add(pecR);

    // Latissimus Dorsi V-Taper & Scapular Rhomboids (-Z posterior back)
    const latGeo = createTaperedLatheGeometry(
      0.28,
      0.118, // narrow waist insertion
      0.182, // wide armpit/terres flare
      [{ centerT: 0.65, widthT: 0.45, amplitude: 0.014 }],
      16,
      24
    );
    const latsMesh = new THREE.Mesh(latGeo, backMat);
    latsMesh.scale.set(1.24, 1, 0.58);
    latsMesh.position.set(0, 0.01, -0.048);
    thoraxGroup.add(latsMesh);

    const scapulaGeo = new THREE.SphereGeometry(0.078, 18, 16);
    const scapulaL = new THREE.Mesh(scapulaGeo, backMat);
    scapulaL.scale.set(0.95, 1.15, 0.42);
    scapulaL.position.set(0.085, 0.055, -0.105);
    thoraxGroup.add(scapulaL);

    const scapulaR = new THREE.Mesh(scapulaGeo, backMat);
    scapulaR.scale.set(0.95, 1.15, 0.42);
    scapulaR.position.set(-0.085, 0.055, -0.105);
    thoraxGroup.add(scapulaR);
    humanGroup.add(thoraxGroup);

    // =========================================================================
    // 3. ABDOMINAL WALL WITH NATURAL WAIST TAPER, RECTUS ABDOMINIS & ERECTORS
    // =========================================================================
    const abdomenGroup = new THREE.Group();
    // Subtle athletic waist taper (concave inward curve at mid-waist t=0.45, flaring to hips & ribs)
    const abdomenLatheGeo = createTaperedLatheGeometry(
      0.22,
      0.144, // lower iliac crest / hip top
      0.138, // upper costal arch
      [{ centerT: 0.45, widthT: 0.45, amplitude: -0.012 }],
      16,
      24
    );
    const abdomenMesh = new THREE.Mesh(abdomenLatheGeo, coreMat);
    abdomenMesh.scale.set(1.12, 1, 0.72);
    abdomenMesh.castShadow = true;
    abdomenGroup.add(abdomenMesh);

    // Sculpted 6-Pack Rectus Abdominis Belly & Lumbar Erectors
    const absPackGeo = new THREE.SphereGeometry(0.038, 14, 12);
    for (let row = 0; row < 3; row++) {
      const yOff = 0.055 - row * 0.052;
      const abL = new THREE.Mesh(absPackGeo, coreMat);
      abL.scale.set(0.95, 0.75, 0.45);
      abL.position.set(0.036, yOff, 0.092);
      abdomenGroup.add(abL);

      const abR = new THREE.Mesh(absPackGeo, coreMat);
      abR.scale.set(0.95, 0.75, 0.45);
      abR.position.set(-0.036, yOff, 0.092);
      abdomenGroup.add(abR);
    }

    const erectorGeo = createParametricMuscleBulgeGeometry(0.20, 0.038, 0.5, 14);
    const erectorL = new THREE.Mesh(erectorGeo, backMat);
    erectorL.position.set(0.042, 0, -0.082);
    abdomenGroup.add(erectorL);

    const erectorR = new THREE.Mesh(erectorGeo, backMat);
    erectorR.position.set(-0.042, 0, -0.082);
    abdomenGroup.add(erectorR);
    humanGroup.add(abdomenGroup);

    // =========================================================================
    // 4. PELVIS, COMPRESSION SHORTS & GLUTEUS MAXIMUS
    // =========================================================================
    const pelvisGroup = new THREE.Group();
    const pelvisLatheGeo = createTaperedLatheGeometry(
      0.16,
      0.152,
      0.142,
      [{ centerT: 0.45, widthT: 0.5, amplitude: 0.008 }],
      14,
      24
    );
    const pelvisMesh = new THREE.Mesh(pelvisLatheGeo, shortsMat);
    pelvisMesh.scale.set(1.18, 1, 0.78);
    pelvisMesh.castShadow = true;
    pelvisGroup.add(pelvisMesh);

    const gluteGeo = new THREE.SphereGeometry(0.102, 20, 18);
    const gluteL = new THREE.Mesh(gluteGeo, gluteMat);
    gluteL.scale.set(0.96, 0.92, 0.82);
    gluteL.position.set(0.082, -0.015, -0.058);
    pelvisGroup.add(gluteL);

    const gluteR = new THREE.Mesh(gluteGeo, gluteMat);
    gluteR.scale.set(0.96, 0.92, 0.82);
    gluteR.position.set(-0.082, -0.015, -0.058);
    pelvisGroup.add(gluteR);
    humanGroup.add(pelvisGroup);

    // =========================================================================
    // 5. ANATOMICALLY TAPERED LIMBS & PARAMETRIC MUSCLE BULGES
    // Proportions:
    // - Upper Arm Length = 0.34m (thicker at shoulder, thinner at elbow + Biceps/Triceps bulges)
    // - Forearm Length   = 0.24m (visual exposed forearm ~40% of upper arm + extended hand/index finger)
    // - Thigh Length     = 0.42m (thicker at hip, thinner at knee + Quadriceps/Hamstring bulges)
    // - Calf Length      = 0.40m (~95% of thigh length, thicker at gastrocnemius, tapering to ankle)
    // =========================================================================
    const UPPER_ARM_LEN = 0.34;
    const FOREARM_LEN = 0.24;
    const THIGH_LEN = 0.42;
    const CALF_LEN = 0.40; // 0.40 / 0.42 = 95.2% of thigh length

    const createJointSphere = (radius: number, mat: THREE.Material) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 18, 18), mat);
      m.castShadow = true;
      humanGroup.add(m);
      return m;
    };

    // Sculpted 3-Head Deltoid Cap (Shoulder top lateral/anterior/posterior bulge)
    const createDeltoidCap = (isLeft: boolean) => {
      const g = new THREE.Group();
      const coreCap = new THREE.Mesh(
        createParametricMuscleBulgeGeometry(0.145, 0.072, 0.62, 20),
        shoulderMat
      );
      coreCap.scale.set(1.05, 1.0, 0.96);
      coreCap.castShadow = true;
      g.add(coreCap);

      // Lateral & Anterior Deltoid Head Bulge
      const lateralHead = new THREE.Mesh(
        createParametricMuscleBulgeGeometry(0.12, 0.054, 0.58, 16),
        shoulderMat
      );
      lateralHead.position.set(isLeft ? 0.022 : -0.022, -0.012, 0.012);
      lateralHead.rotation.z = isLeft ? 0.28 : -0.28;
      g.add(lateralHead);

      humanGroup.add(g);
      return g;
    };

    // Tapered Upper Arm (Thicker at shoulder t=1, thinner at elbow t=0 + Parametric Biceps & Triceps Bulges)
    const createUpperArm = (isLeft: boolean) => {
      const g = new THREE.Group();
      const baseGeo = createTaperedLatheGeometry(
        UPPER_ARM_LEN,
        0.038, // thinner distal elbow end (t=0)
        0.058, // thicker proximal shoulder end (t=1)
        [{ centerT: 0.52, widthT: 0.38, amplitude: 0.008 }],
        18,
        22
      );
      const base = new THREE.Mesh(baseGeo, armMat);
      base.castShadow = true;
      g.add(base);

      // Parametric Biceps Brachii Peak Bulge (+Z anterior belly)
      const bicepGeo = createParametricMuscleBulgeGeometry(
        UPPER_ARM_LEN * 0.74,
        0.044,
        0.48,
        18
      );
      const bicep = new THREE.Mesh(bicepGeo, armMat);
      bicep.scale.set(0.88, 1.0, 1.08);
      bicep.position.set(isLeft ? -0.004 : 0.004, -0.012, 0.024);
      bicep.castShadow = true;
      g.add(bicep);

      // Parametric Triceps Brachii Horseshoe Bulge (-Z posterior/lateral belly)
      const tricepGeo = createParametricMuscleBulgeGeometry(
        UPPER_ARM_LEN * 0.72,
        0.045,
        0.58,
        18
      );
      const tricep = new THREE.Mesh(tricepGeo, armMat);
      tricep.scale.set(0.94, 1.0, 1.02);
      tricep.position.set(isLeft ? 0.006 : -0.006, 0.022, -0.022);
      g.add(tricep);

      humanGroup.add(g);
      return g;
    };

    // Tapered Forearm (~40% visual upper-arm belly + sleek conical wrist taper)
    const createForearm = () => {
      const g = new THREE.Group();
      const baseGeo = createTaperedLatheGeometry(
        FOREARM_LEN,
        0.026, // slender wrist (t=0)
        0.044, // thicker proximal elbow/brachioradialis (t=1)
        [{ centerT: 0.68, widthT: 0.32, amplitude: 0.009 }],
        16,
        20
      );
      const base = new THREE.Mesh(baseGeo, armMat);
      base.castShadow = true;
      g.add(base);

      // Brachioradialis Upper Forearm Bulge (top 40% near elbow)
      const brachioGeo = createParametricMuscleBulgeGeometry(
        UPPER_ARM_LEN * 0.40,
        0.038,
        0.60,
        16
      );
      const brachio = new THREE.Mesh(brachioGeo, armMat);
      brachio.position.set(0, FOREARM_LEN * 0.22, 0.010);
      g.add(brachio);

      humanGroup.add(g);
      return g;
    };

    // Anatomically Proportioned Hand (Wrist Carpal Bridge + Palm + Articulated Index & Finger Rays)
    // Positioned so the wrist seamlessly meets the distal forearm and index finger extends naturally
    const createHand = (isLeft: boolean) => {
      const g = new THREE.Group();
      // Wrist carpal bridge connecting hand target to distal forearm
      const wristBridge = new THREE.Mesh(
        createTaperedLatheGeometry(0.045, 0.025, 0.028, [], 8, 14),
        skinMat
      );
      wristBridge.position.set(0, 0.018, 0);
      g.add(wristBridge);

      // Tapered Metacarpal Palm
      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.072, 0.024), skinMat);
      palm.position.set(0, -0.022, 0);
      palm.castShadow = true;
      g.add(palm);

      // Articulated Index Finger & 4 Finger Rays extending straight from palm to wrist line in neutral pose
      const fingerRadii = [0.0075, 0.008, 0.0075, 0.0068];
      const fingerLengths = [0.068, 0.074, 0.069, 0.056]; // Index, Middle, Ring, Pinky
      const xOffsets = isLeft
        ? [-0.022, -0.007, 0.008, 0.022]
        : [0.022, 0.007, -0.008, -0.022];

      for (let f = 0; f < 4; f++) {
        const fGeo = createTaperedLatheGeometry(
          fingerLengths[f],
          fingerRadii[f] * 0.72,
          fingerRadii[f],
          [],
          8,
          10
        );
        const fingerMesh = new THREE.Mesh(fGeo, skinMat);
        fingerMesh.position.set(
          xOffsets[f],
          -0.056 - fingerLengths[f] * 0.45,
          0.003
        );
        g.add(fingerMesh);
      }

      // Opposable Thumb
      const thumbGeo = createTaperedLatheGeometry(0.052, 0.0075, 0.011, [], 8, 10);
      const thumb = new THREE.Mesh(thumbGeo, skinMat);
      thumb.position.set(isLeft ? -0.038 : 0.038, -0.032, 0.010);
      thumb.rotation.z = isLeft ? 0.48 : -0.48;
      g.add(thumb);

      humanGroup.add(g);
      return g;
    };

    // Tapered Thigh (Thicker at Hip t=1, Thinner at Knee t=0 + Parametric Quadriceps & Hamstring Bulges)
    const createThigh = (isLeft: boolean) => {
      const g = new THREE.Group();
      const baseGeo = createTaperedLatheGeometry(
        THIGH_LEN,
        0.056, // thinner knee end (t=0)
        0.094, // thicker upper hip/groin end (t=1)
        [{ centerT: 0.55, widthT: 0.42, amplitude: 0.011 }],
        20,
        24
      );
      const base = new THREE.Mesh(baseGeo, legMat);
      base.castShadow = true;
      g.add(base);

      // Upper Compression Shorts Leg Cuff (Tapered cone matching upper thigh)
      const shortLegGeo = createTaperedLatheGeometry(0.17, 0.082, 0.096, [], 10, 22);
      const shortLeg = new THREE.Mesh(shortLegGeo, shortsMat);
      shortLeg.position.set(0, 0.125, 0);
      g.add(shortLeg);

      // Parametric Rectus Femoris & Vastus Lateralis Sweep (+Z anterior/lateral thigh)
      const quadOuterGeo = createParametricMuscleBulgeGeometry(
        THIGH_LEN * 0.80,
        0.064,
        0.56,
        18
      );
      const quadOuter = new THREE.Mesh(quadOuterGeo, legMat);
      quadOuter.scale.set(0.96, 1.0, 1.05);
      quadOuter.position.set(isLeft ? 0.012 : -0.012, -0.005, 0.028);
      quadOuter.castShadow = true;
      g.add(quadOuter);

      // Parametric Vastus Medialis Oblique "VMO Teardrop" above inner knee
      const vmoGeo = createParametricMuscleBulgeGeometry(
        THIGH_LEN * 0.48,
        0.048,
        0.38,
        16
      );
      const vmo = new THREE.Mesh(vmoGeo, legMat);
      vmo.position.set(isLeft ? -0.022 : 0.022, -0.075, 0.026);
      g.add(vmo);

      // Parametric Biceps Femoris / Hamstring Belly (-Z posterior thigh)
      const hamstringGeo = createParametricMuscleBulgeGeometry(
        THIGH_LEN * 0.76,
        0.060,
        0.52,
        18
      );
      const hamstring = new THREE.Mesh(hamstringGeo, legMat);
      hamstring.position.set(0, 0.01, -0.026);
      g.add(hamstring);

      humanGroup.add(g);
      return g;
    };

    // Tapered Calf (~95% of Thigh Length = 0.40m, High Gastrocnemius Bulge Tapering to Slender Achilles/Ankle)
    const createCalf = (isLeft: boolean) => {
      const g = new THREE.Group();
      const baseGeo = createTaperedLatheGeometry(
        CALF_LEN,
        0.032, // slender distal ankle (t=0)
        0.056, // proximal tibial plateau below knee (t=1)
        [{ centerT: 0.66, widthT: 0.30, amplitude: 0.012 }],
        18,
        22
      );
      const base = new THREE.Mesh(baseGeo, legMat);
      base.castShadow = true;
      g.add(base);

      // Medial & Lateral Gastrocnemius Diamond Heads (-Z posterior upper calf)
      const gastrocGeo = createParametricMuscleBulgeGeometry(
        CALF_LEN * 0.62,
        0.052,
        0.62,
        18
      );
      const gastroc = new THREE.Mesh(gastrocGeo, legMat);
      gastroc.scale.set(1.04, 1.0, 1.08);
      gastroc.position.set(isLeft ? -0.004 : 0.004, 0.058, -0.022);
      gastroc.castShadow = true;
      g.add(gastroc);

      humanGroup.add(g);
      return g;
    };

    const createShoe = () => {
      const fg = new THREE.Group();
      const upper = new THREE.Mesh(
        new THREE.BoxGeometry(0.088, 0.048, 0.21),
        shoeUpperMat
      );
      upper.position.set(0, -0.008, 0.048);
      upper.castShadow = true;
      fg.add(upper);

      const sole = new THREE.Mesh(
        new THREE.BoxGeometry(0.092, 0.016, 0.22),
        shoeSoleMat
      );
      sole.position.set(0, -0.036, 0.048);
      fg.add(sole);
      humanGroup.add(fg);
      return fg;
    };

    const deltoidL = createDeltoidCap(true);
    const deltoidR = createDeltoidCap(false);
    const upperArmL = createUpperArm(true);
    const upperArmR = createUpperArm(false);
    const elbowJointL = createJointSphere(0.039, skinMat);
    const elbowJointR = createJointSphere(0.039, skinMat);
    const forearmL = createForearm();
    const forearmR = createForearm();
    const handL = createHand(true);
    const handR = createHand(false);

    const hipJointL = createJointSphere(0.072, shortsMat);
    const hipJointR = createJointSphere(0.072, shortsMat);
    const thighL = createThigh(true);
    const thighR = createThigh(false);
    const kneeJointL = createJointSphere(0.052, skinMat);
    const kneeJointR = createJointSphere(0.052, skinMat);
    const calfL = createCalf(true);
    const calfR = createCalf(false);
    const footMeshL = createShoe();
    const footMeshR = createShoe();

    // =========================================================================
    // 6. 3D EXERCISE PROPS (Pull-Up Bar, Low Row Bar, Dumbbells, Kettlebell, Bench, Bike)
    // =========================================================================
    const propMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.3,
      metalness: 0.8,
    });
    const weightMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.35,
      metalness: 0.6,
    });

    // High Pull-Up Rig
    const pullupRigGroup = new THREE.Group();
    const topBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 1.35, 16),
      propMat
    );
    topBar.rotation.z = Math.PI / 2;
    topBar.position.set(0, 2.04, 0);
    pullupRigGroup.add(topBar);

    const postL = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 2.1, 16),
      propMat
    );
    postL.position.set(0.65, 1.02, 0);
    pullupRigGroup.add(postL);

    const postR = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 2.1, 16),
      propMat
    );
    postR.position.set(-0.65, 1.02, 0);
    pullupRigGroup.add(postR);
    scene.add(pullupRigGroup);

    // Low Inverted Row Bar / Table Edge
    const lowRowGroup = new THREE.Group();
    const lowBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 1.15, 16),
      propMat
    );
    lowBar.rotation.z = Math.PI / 2;
    lowBar.position.set(0, 0.72, 0.34);
    lowRowGroup.add(lowBar);
    const lowPostL = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.75, 12),
      propMat
    );
    lowPostL.position.set(0.55, 0.36, 0.34);
    lowRowGroup.add(lowPostL);
    const lowPostR = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.75, 12),
      propMat
    );
    lowPostR.position.set(-0.55, 0.36, 0.34);
    lowRowGroup.add(lowPostR);
    scene.add(lowRowGroup);

    // Step Box / Dip Bench
    const benchGroup = new THREE.Group();
    const benchTop = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.34, 0.38),
      propMat
    );
    benchTop.position.set(0, 0.17, -0.32);
    benchGroup.add(benchTop);
    scene.add(benchGroup);

    // Left & Right Dumbbells
    const createDumbbell = () => {
      const dg = new THREE.Group();
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.014, 0.22, 12),
        propMat
      );
      handle.rotation.z = Math.PI / 2;
      dg.add(handle);
      const plate1 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.065, 0.04, 16),
        weightMat
      );
      plate1.rotation.z = Math.PI / 2;
      plate1.position.x = -0.09;
      dg.add(plate1);
      const plate2 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.065, 0.04, 16),
        weightMat
      );
      plate2.rotation.z = Math.PI / 2;
      plate2.position.x = 0.09;
      dg.add(plate2);
      scene.add(dg);
      return dg;
    };
    const dumbbellL = createDumbbell();
    const dumbbellR = createDumbbell();

    // Center Kettlebell (for Goblet Squat, Swings, Russian Twists)
    const kettlebellCenter = new THREE.Group();
    const kbBody = new THREE.Mesh(new THREE.SphereGeometry(0.085, 18, 18), weightMat);
    kettlebellCenter.add(kbBody);
    const kbHorn = new THREE.Mesh(
      new THREE.TorusGeometry(0.055, 0.014, 10, 20),
      propMat
    );
    kbHorn.position.y = 0.075;
    kettlebellCenter.add(kbHorn);
    scene.add(kettlebellCenter);

    // 3D Cycle / Spin Bike
    const bikeGroup = new THREE.Group();
    const wheelGeo = new THREE.TorusGeometry(0.28, 0.025, 12, 32);
    const wheelRear = new THREE.Mesh(wheelGeo, propMat);
    wheelRear.rotation.y = Math.PI / 2;
    wheelRear.position.set(0, 0.30, -0.52);
    bikeGroup.add(wheelRear);

    const wheelFront = new THREE.Mesh(wheelGeo, weightMat);
    wheelFront.rotation.y = Math.PI / 2;
    wheelFront.position.set(0, 0.30, 0.52);
    bikeGroup.add(wheelFront);

    const saddlePost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.55, 12),
      propMat
    );
    saddlePost.position.set(0, 0.55, -0.22);
    saddlePost.rotation.x = -0.25;
    bikeGroup.add(saddlePost);

    const handlePost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.68, 12),
      propMat
    );
    handlePost.position.set(0, 0.62, 0.38);
    handlePost.rotation.x = -0.2;
    bikeGroup.add(handlePost);

    const handlebar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.46, 12),
      propMat
    );
    handlebar.rotation.z = Math.PI / 2;
    handlebar.position.set(0, 0.92, 0.32);
    bikeGroup.add(handlebar);
    scene.add(bikeGroup);

    // =========================================================================
    // INTERACTIVE 360° DRAG-TO-ROTATE ORBIT SUPPORT
    // =========================================================================
    let isDragging = false;
    let prevX = 0;
    let userYawOffset = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevX = e.clientX;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      prevX = e.clientX;
      userYawOffset += dx * 0.012;
    };
    const onPointerUp = () => {
      isDragging = false;
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // =========================================================================
    // 60 FPS ANATOMICAL ANIMATION LOOP
    // =========================================================================
    let animId = 0;
    const startClock = performance.now();

    const animate = (now: number) => {
      animId = requestAnimationFrame(animate);

      const currentPattern = patternRef.current;
      const cycleDuration =
        currentPattern === 'kettlebell-swing' ||
        currentPattern === 'farmers-carry' ||
        currentPattern === 'waiter-carry' ||
        currentPattern === 'rack-march' ||
        currentPattern === 'ebike' ||
        currentPattern === 'spinning'
          ? 1750
          : currentPattern === 'pullup' || currentPattern === 'chinup'
          ? 3500
          : 3200;

      const elapsed = isActiveRef.current ? now - startClock : 950;
      const rawCycle = (elapsed % cycleDuration) / cycleDuration;
      const p = 0.5 - 0.5 * Math.cos(rawCycle * Math.PI * 2);

      // Muscle Contraction Highlighting (Warm lifelike skin with subtle emerald anatomical glow on active muscles)
      const activeMuscles = getActiveMusclesForPattern(currentPattern);
      const glowStrength = 0.14 + p * 0.28;
      const activeColor = new THREE.Color(0x10b981);
      const inactiveColor = new THREE.Color(0x000000);

      const applyGlow = (mat: THREE.MeshPhysicalMaterial, active: boolean) => {
        mat.emissive.copy(active ? activeColor : inactiveColor);
        mat.emissiveIntensity = active ? glowStrength : 0;
      };
      applyGlow(chestMat, activeMuscles.chest);
      applyGlow(backMat, activeMuscles.back);
      applyGlow(shoulderMat, activeMuscles.shoulders);
      applyGlow(armMat, activeMuscles.arms);
      applyGlow(coreMat, activeMuscles.core);
      applyGlow(gluteMat, activeMuscles.glutes);
      applyGlow(legMat, activeMuscles.legs);

      // Solve Exact 3D Biomechanical Pose for the Current Exercise
      const pose = solveExercisePose(currentPattern, rawCycle, p);

      pullupRigGroup.visible = pose.showPullupBar;
      lowRowGroup.visible = pose.showLowRowBar;
      benchGroup.visible = pose.showBench;
      dumbbellL.visible = pose.showDumbbells;
      dumbbellR.visible = pose.showDumbbells;
      kettlebellCenter.visible = pose.showKettlebellCenter;
      bikeGroup.visible = pose.showBike;

      if (pose.showDumbbells) {
        dumbbellL.position.copy(pose.handLPos);
        dumbbellR.position.copy(pose.handRPos);
      }
      if (pose.showKettlebellCenter) {
        kettlebellCenter.position.copy(pose.kettlebellPos);
      }
      if (pose.showBike) {
        const crankAngle = rawCycle * Math.PI * 2;
        wheelRear.rotation.x = crankAngle * 2;
        wheelFront.rotation.x = crankAngle * 2;
      }

      // Orient Pelvis, Abdomen, Thorax & Neck using torsoUpVec so Prone vs Supine vs Standing is 100% accurate!
      orientSegmentWithAnterior(
        pelvisGroup,
        pose.pelvisPos,
        pose.lumbarPos,
        pose.torsoUpVec,
        0.0
      );
      orientSegmentWithAnterior(
        abdomenGroup,
        pose.pelvisPos,
        pose.thoraxPos,
        pose.torsoUpVec,
        0.48
      );
      orientSegmentWithAnterior(
        thoraxGroup,
        pose.lumbarPos,
        pose.neckPos,
        pose.torsoUpVec,
        0.55
      );
      orientSegmentWithAnterior(
        neckGroup,
        pose.thoraxPos,
        pose.headPos,
        pose.torsoUpVec,
        0.5
      );

      headGroup.position.copy(pose.headPos);
      headGroup.up.copy(pose.headUpVec);
      headGroup.lookAt(pose.headLookTarget);

      // Extract Thorax & Pelvis Local Left-Right X Axis for True Anatomical Shoulder/Hip Sockets
      const thoraxRightAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(
        thoraxGroup.quaternion
      );
      const pelvisRightAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(
        pelvisGroup.quaternion
      );

      const shoulderLPos = new THREE.Vector3()
        .copy(pose.thoraxPos)
        .addScaledVector(thoraxRightAxis, 0.205);
      const shoulderRPos = new THREE.Vector3()
        .copy(pose.thoraxPos)
        .addScaledVector(thoraxRightAxis, -0.205);

      const hipLPos = new THREE.Vector3()
        .copy(pose.pelvisPos)
        .addScaledVector(pelvisRightAxis, 0.11);
      const hipRPos = new THREE.Vector3()
        .copy(pose.pelvisPos)
        .addScaledVector(pelvisRightAxis, -0.11);

      deltoidL.position.copy(shoulderLPos);
      deltoidR.position.copy(shoulderRPos);
      hipJointL.position.copy(hipLPos);
      hipJointR.position.copy(hipRPos);

      // Solve 3D Elbow & Knee Positions via Analytic Two-Bone IK
      const elbowLPos = solveTwoBoneIK(
        shoulderLPos,
        pose.handLPos,
        0.30,
        0.28,
        pose.armPoleL
      );
      const elbowRPos = solveTwoBoneIK(
        shoulderRPos,
        pose.handRPos,
        0.30,
        0.28,
        pose.armPoleR
      );

      elbowJointL.position.copy(elbowLPos);
      elbowJointR.position.copy(elbowRPos);
      handL.position.copy(pose.handLPos);
      handR.position.copy(pose.handRPos);
      handL.quaternion.copy(thoraxGroup.quaternion);
      handR.quaternion.copy(thoraxGroup.quaternion);

      orientSegmentWithAnterior(
        upperArmL,
        elbowLPos,
        shoulderLPos,
        pose.torsoUpVec,
        0.5
      );
      orientSegmentWithAnterior(
        forearmL,
        pose.handLPos,
        elbowLPos,
        pose.torsoUpVec,
        0.5
      );
      orientSegmentWithAnterior(
        upperArmR,
        elbowRPos,
        shoulderRPos,
        pose.torsoUpVec,
        0.5
      );
      orientSegmentWithAnterior(
        forearmR,
        pose.handRPos,
        elbowRPos,
        pose.torsoUpVec,
        0.5
      );

      const kneeLPos = solveTwoBoneIK(
        hipLPos,
        pose.ankleLPos,
        0.42,
        0.40,
        pose.kneePoleL
      );
      const kneeRPos = solveTwoBoneIK(
        hipRPos,
        pose.ankleRPos,
        0.42,
        0.40,
        pose.kneePoleR
      );

      kneeJointL.position.copy(kneeLPos);
      kneeJointR.position.copy(kneeRPos);

      orientSegmentWithAnterior(thighL, kneeLPos, hipLPos, pose.kneePoleL, 0.5);
      orientSegmentWithAnterior(calfL, pose.ankleLPos, kneeLPos, pose.kneePoleL, 0.5);
      orientSegmentWithAnterior(thighR, kneeRPos, hipRPos, pose.kneePoleR, 0.5);
      orientSegmentWithAnterior(calfR, pose.ankleRPos, kneeRPos, pose.kneePoleR, 0.5);

      // Orient Shoes along footForwardVec
      footMeshL.position.copy(pose.ankleLPos);
      footMeshR.position.copy(pose.ankleRPos);
      const footLookL = new THREE.Vector3()
        .copy(pose.ankleLPos)
        .add(pose.footForwardVec);
      const footLookR = new THREE.Vector3()
        .copy(pose.ankleRPos)
        .add(pose.footForwardVec);
      footMeshL.lookAt(footLookL);
      footMeshR.lookAt(footLookR);

      // Camera Choreography
      const isPullup = currentPattern === 'pullup' || currentPattern === 'chinup';
      const camTargetY = isPullup ? 1.32 : pose.isFloorExercise ? 0.26 : 0.78;
      const dist = isPullup ? 3.45 : pose.isFloorExercise ? 2.55 : 3.0;

      const preset = cameraPresetRef.current;
      let baseYaw = Math.PI * 0.32;
      if (preset === 'side') {
        baseYaw = Math.PI * 0.5;
      } else if (preset === 'front') {
        baseYaw = 0.08;
      } else {
        baseYaw = Math.PI * 0.34 + Math.sin(now * 0.00035) * 0.22;
      }

      const finalYaw = baseYaw + userYawOffset;
      const camElevation =
        currentPattern === 'prone-floor-lat-pulldown' ||
        currentPattern === 'prone-cobra-angel'
          ? 1.15 // Elevated 3/4 view so overhead Y-to-W floor sweep is crystal clear
          : pose.isFloorExercise
          ? 0.72
          : 1.05;

      camera.position.set(
        Math.sin(finalYaw) * dist,
        camElevation,
        Math.cos(finalYaw) * dist
      );
      camera.lookAt(0, camTargetY, 0);

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 480;
      const h = container.clientHeight || 220;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.dispose();
    };
  }, []);

  const cueText = getCueForPattern(resolvedPattern);

  return (
    <div className="relative w-full h-[210px] sm:h-[245px] rounded-2xl overflow-hidden bg-gradient-to-b from-[#0E1422] via-[#0A0E18] to-[#06080E] border border-slate-800 shadow-xl flex flex-col items-center justify-center select-none">
      {/* Top Semantic HUD Overlay */}
      <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between gap-2 z-10 pointer-events-auto">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span
            className={`w-2 h-2 rounded-full ${
              isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
            }`}
          />
          <span className="font-semibold text-white">3D Lifelike Human Form</span>
          {isActive && (
            <>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <Activity className="w-3 h-3" />
                <span>{breathPhase}</span>
              </span>
            </>
          )}
        </div>

        {/* Interactive 3D Camera Angle Switcher */}
        <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md p-0.5 rounded-lg border border-white/10">
          <button
            type="button"
            onClick={() => setCameraPreset('orbit')}
            className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-colors whitespace-nowrap ${
              cameraPreset === 'orbit'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            3D View
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset('side')}
            className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-colors whitespace-nowrap ${
              cameraPreset === 'side'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Side
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset('front')}
            className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-colors whitespace-nowrap ${
              cameraPreset === 'front'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Front
          </button>
        </div>
      </div>

      {/* Three.js 3D Viewport Canvas */}
      {webglFallback ? (
        <div className="flex flex-col items-center justify-center text-center px-4 text-xs text-slate-400 space-y-2">
          <Eye className="w-6 h-6 text-emerald-400" />
          <p className="font-semibold text-white">3D Human Form Preview Ready</p>
          <button
            type="button"
            onClick={() => setWebglFallback(false)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reload 3D Model</span>
          </button>
        </div>
      ) : (
        <div
          ref={mountRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          title="Drag horizontally to rotate 360° around the lifelike 3D human model"
        />
      )}

      {/* Bottom Anatomical Form Cue Overlay */}
      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-center z-10 pointer-events-none">
        <div className="px-3.5 py-1 rounded-lg bg-black/65 backdrop-blur-md border border-white/10 text-[11px] text-slate-200 font-medium flex items-center gap-2 max-w-full truncate">
          <Compass className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">{cueText}</span>
        </div>
      </div>
    </div>
  );
};
