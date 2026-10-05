import * as THREE from 'three';
import { AnimationType } from '../types/workout';

export type KinematicPattern =
  | 'prone-floor-lat-pulldown'
  | 'prone-cobra-angel'
  | 'inverted-table-row'
  | 'doorframe-row'
  | 'pullup'
  | 'chinup'
  | 'row'
  | 'bicep-curl'
  | 'face-pull'
  | 'pushup'
  | 'diamond-pushup'
  | 'pike-pushup'
  | 'bench-dip'
  | 'floor-press'
  | 'overhead-press'
  | 'shoulder-tap'
  | 'bear-plank'
  | 'squat'
  | 'goblet-squat'
  | 'wall-sit'
  | 'lunge'
  | 'cossack-squat'
  | 'step-up'
  | 'rdl'
  | 'kettlebell-swing'
  | 'glute-bridge'
  | 'nordic-curl'
  | 'calf-raise'
  | 'farmers-carry'
  | 'waiter-carry'
  | 'rack-march'
  | 'mcgill-curlup'
  | 'mcgill-sidebridge'
  | 'mcgill-birddog'
  | 'deadbug'
  | 'hollow-hold'
  | 'leg-lower'
  | 'russian-twist'
  | 'l-sit'
  | 'plank'
  | 'mobility'
  | 'ebike'
  | 'spinning';

export interface MuscleGroupHighlight {
  chest: boolean;
  back: boolean;
  shoulders: boolean;
  arms: boolean;
  core: boolean;
  glutes: boolean;
  legs: boolean;
}

/**
 * Classifies any exercise from the 100+ exercise library into its exact
 * anatomical 3D movement pattern using exerciseId, exerciseName, and base AnimationType.
 */
export function resolveKinematicPattern(
  type: AnimationType,
  exerciseId?: string,
  exerciseName?: string
): KinematicPattern {
  const id = (exerciseId || '').toLowerCase();
  const name = (exerciseName || '').toLowerCase();

  // 1. Prone Floor Lat Pull-Downs & Towel/Slider Floor Pulls (Lying face-down on stomach!)
  if (
    id === 'alt-pull-bw-1' ||
    id === 'cat-pull-03' ||
    id === 'cat-pull-05' ||
    name.includes('prone floor') ||
    name.includes('floor lat pull') ||
    name.includes('sliding floor pull') ||
    name.includes('towel lat') ||
    name.includes('superman lat')
  ) {
    return 'prone-floor-lat-pulldown';
  }

  // 2. Prone Cobra, Snow Angels, Y-T-W-L, Prone Swimmers, Reverse Hypers (Face-down thoracic/scapular)
  if (
    id === 'alt-pull-bw-2' ||
    id === 'cat-pull-04' ||
    id === 'cat-pull-06' ||
    id === 'cat-pull-07' ||
    id === 'cat-pull-09' ||
    id === 'cat-pull-10' ||
    id === 'cat-hinge-06' ||
    name.includes('prone cobra') ||
    name.includes('snow angel') ||
    name.includes('y-t-w') ||
    name.includes('prone swimmer') ||
    name.includes('reverse snow') ||
    name.includes('reverse hyper') ||
    name.includes('supine elbow press')
  ) {
    return 'prone-cobra-angel';
  }

  // 3. Inverted Bodyweight Row under Table / Bar (Supine hanging body row)
  if (
    id === 'cat-pull-02' ||
    id === 'alt-pull-bw-3' ||
    name.includes('inverted') ||
    name.includes('under-table') ||
    name.includes('australian pull')
  ) {
    return 'inverted-table-row';
  }

  // 4. Doorframe Lean-Back Row / Towel Iso Row
  if (
    id === 'cat-pull-08' ||
    id === 'alt-pull-bw-4' ||
    name.includes('doorframe') ||
    name.includes('towel row')
  ) {
    return 'doorframe-row';
  }

  // 5. Bicep Curls / Hammer Curls / Towel Curls
  if (
    id === 'cat-pull-18' ||
    id === 'cat-pull-19' ||
    name.includes('curl') && !name.includes('mcgill') && !name.includes('nordic') && !name.includes('hamstring') && !name.includes('pelvic')
  ) {
    return 'bicep-curl';
  }

  // 6. High Pull / Face Pull / Rear Delt Raise
  if (
    id === 'cat-pull-14' ||
    id === 'cat-pull-16' ||
    id === 'cat-pull-20' ||
    name.includes('face pull') ||
    name.includes('high pull') ||
    name.includes('rear-delt') ||
    name.includes('rear delt')
  ) {
    return 'face-pull';
  }

  // 7. Supinated Chin-Ups vs Overhand Pull-Ups
  if (name.includes('chin-up') || name.includes('chin up') || name.includes('supinated')) {
    return 'chinup';
  }

  // 8. Pike Push-Ups / Handstand Push-Up Prep
  if (
    id === 'cat-push-04' ||
    id === 'cat-push-07' ||
    id === 'alt-push-bw-3' ||
    id === 'alt-diamond-bw-2' ||
    name.includes('pike push') ||
    name.includes('hindu') ||
    name.includes('dive-bomber')
  ) {
    return 'pike-pushup';
  }

  // 9. Bench / Chair Triceps Dips
  if (
    id === 'cat-push-06' ||
    id === 'alt-diamond-bw-1' ||
    name.includes('bench dip') ||
    name.includes('chair dip') ||
    name.includes('triceps dip')
  ) {
    return 'bench-dip';
  }

  // 10. Supine Floor Press / Pullover / Crush Press
  if (
    id === 'cat-push-11' ||
    id === 'cat-push-12' ||
    id === 'cat-push-15' ||
    id === 'cat-push-18' ||
    id === 'cat-push-19' ||
    id === 'cat-push-20' ||
    name.includes('floor press') ||
    name.includes('skullcrusher') ||
    name.includes('pullover')
  ) {
    return 'floor-press';
  }

  // 11. Standing / Kneeling Overhead Press / Halo / Lateral Raise
  if (
    id === 'cat-push-13' ||
    id === 'cat-push-14' ||
    id === 'cat-push-16' ||
    id === 'cat-push-17' ||
    name.includes('overhead press') ||
    name.includes('military press') ||
    name.includes('z-press') ||
    name.includes('halo') ||
    name.includes('triceps extension')
  ) {
    return 'overhead-press';
  }

  // 12. Bear Plank Hover & Taps
  if (id === 'cat-core-09' || name.includes('bear-plank') || name.includes('bear plank')) {
    return 'bear-plank';
  }

  // 13. Wall Sit Isometric
  if (id === 'cat-leg-05' || id === 'alt-squat-bw-2' || name.includes('wall sit')) {
    return 'wall-sit';
  }

  // 14. Cossack Lateral Squat
  if (id === 'cat-leg-04' || name.includes('cossack')) {
    return 'cossack-squat';
  }

  // 15. Step-Ups
  if (id === 'cat-leg-09' || id === 'cat-leg-20' || name.includes('step-up') || name.includes('step up')) {
    return 'step-up';
  }

  // 16. Goblet Squat / Front Squat / Thruster
  if (
    id === 'cat-leg-11' ||
    id === 'cat-leg-12' ||
    id === 'cat-leg-15' ||
    id === 'cat-leg-18' ||
    id === 'cat-leg-19' ||
    name.includes('goblet') ||
    name.includes('front squat') ||
    name.includes('thruster') ||
    name.includes('sumo squat')
  ) {
    return 'goblet-squat';
  }

  // 17. Kettlebell Swing / Clean / Snatch
  if (
    id === 'cat-hinge-11' ||
    id === 'cat-hinge-12' ||
    id === 'cat-hinge-16' ||
    id === 'cat-hinge-17' ||
    name.includes('swing') ||
    name.includes('clean') ||
    name.includes('snatch')
  ) {
    return 'kettlebell-swing';
  }

  // 18. Nordic Hamstring Curl / Kneeling Hip Thrust
  if (
    id === 'cat-hinge-07' ||
    id === 'cat-hinge-10' ||
    name.includes('nordic') ||
    name.includes('kneeling hip')
  ) {
    return 'nordic-curl';
  }

  // 19. Calf Raises
  if (id === 'cat-leg-08' || name.includes('calf raise')) {
    return 'calf-raise';
  }

  // 20. Waiter Overhead Carry / Rack March
  if (id === 'cat-core-06' || name.includes('waiter') || name.includes('overhead carry')) {
    return 'waiter-carry';
  }
  if (id === 'cat-core-05' || name.includes('rack march') || name.includes('front-rack march')) {
    return 'rack-march';
  }

  // 21. Hollow Hold / Straight-Leg Lowering / Russian Twist / L-Sit
  if (id === 'cat-core-10' || name.includes('hollow-body') || name.includes('hollow body')) {
    return 'hollow-hold';
  }
  if (
    id === 'cat-core-11' ||
    id === 'cat-core-19' ||
    name.includes('leg lowering') ||
    name.includes('leg raise') ||
    name.includes('reverse crunch')
  ) {
    return 'leg-lower';
  }
  if (id === 'cat-core-17' || name.includes('russian twist')) {
    return 'russian-twist';
  }
  if (id === 'cat-core-20' || name.includes('l-sit') || name.includes('l sit')) {
    return 'l-sit';
  }

  // Fallback to base AnimationType
  switch (type) {
    case 'pushup':
      return 'pushup';
    case 'diamond-pushup':
      return 'diamond-pushup';
    case 'pullup':
      return 'pullup';
    case 'row':
      return 'row';
    case 'squat':
      return 'squat';
    case 'lunge':
      return 'lunge';
    case 'rdl':
      return 'rdl';
    case 'glute-bridge':
      return 'glute-bridge';
    case 'farmers-carry':
      return 'farmers-carry';
    case 'mcgill-curlup':
      return 'mcgill-curlup';
    case 'mcgill-sidebridge':
      return 'mcgill-sidebridge';
    case 'mcgill-birddog':
      return 'mcgill-birddog';
    case 'deadbug':
      return 'deadbug';
    case 'shoulder-tap':
      return 'shoulder-tap';
    case 'plank':
      return 'plank';
    case 'mobility':
      return 'mobility';
    case 'spinning':
      return 'spinning';
    case 'ebike':
    default:
      return 'ebike';
  }
}

export function getActiveMusclesForPattern(pattern: KinematicPattern): MuscleGroupHighlight {
  switch (pattern) {
    case 'prone-floor-lat-pulldown':
    case 'prone-cobra-angel':
      return {
        chest: false,
        back: true,
        shoulders: true,
        arms: true,
        core: true,
        glutes: true,
        legs: false,
      };
    case 'inverted-table-row':
    case 'doorframe-row':
    case 'pullup':
    case 'chinup':
    case 'row':
    case 'face-pull':
      return {
        chest: false,
        back: true,
        shoulders: true,
        arms: true,
        core: true,
        glutes: false,
        legs: false,
      };
    case 'bicep-curl':
      return {
        chest: false,
        back: false,
        shoulders: true,
        arms: true,
        core: true,
        glutes: false,
        legs: false,
      };
    case 'pushup':
    case 'diamond-pushup':
    case 'floor-press':
      return {
        chest: true,
        back: false,
        shoulders: true,
        arms: true,
        core: true,
        glutes: false,
        legs: false,
      };
    case 'pike-pushup':
    case 'bench-dip':
    case 'overhead-press':
      return {
        chest: true,
        back: true,
        shoulders: true,
        arms: true,
        core: true,
        glutes: false,
        legs: false,
      };
    case 'shoulder-tap':
    case 'bear-plank':
      return {
        chest: true,
        back: false,
        shoulders: true,
        arms: true,
        core: true,
        glutes: true,
        legs: true,
      };
    case 'squat':
    case 'goblet-squat':
    case 'wall-sit':
    case 'lunge':
    case 'cossack-squat':
    case 'step-up':
    case 'calf-raise':
      return {
        chest: false,
        back: false,
        shoulders: false,
        arms: false,
        core: true,
        glutes: true,
        legs: true,
      };
    case 'rdl':
    case 'kettlebell-swing':
    case 'glute-bridge':
    case 'nordic-curl':
      return {
        chest: false,
        back: true,
        shoulders: false,
        arms: false,
        core: true,
        glutes: true,
        legs: true,
      };
    case 'farmers-carry':
    case 'waiter-carry':
    case 'rack-march':
      return {
        chest: false,
        back: true,
        shoulders: true,
        arms: true,
        core: true,
        glutes: true,
        legs: true,
      };
    case 'mcgill-curlup':
    case 'mcgill-sidebridge':
    case 'deadbug':
    case 'hollow-hold':
    case 'leg-lower':
    case 'russian-twist':
    case 'l-sit':
    case 'plank':
      return {
        chest: false,
        back: false,
        shoulders: false,
        arms: false,
        core: true,
        glutes: true,
        legs: false,
      };
    case 'mcgill-birddog':
    case 'mobility':
      return {
        chest: false,
        back: true,
        shoulders: true,
        arms: false,
        core: true,
        glutes: true,
        legs: false,
      };
    case 'ebike':
    case 'spinning':
    default:
      return {
        chest: false,
        back: false,
        shoulders: false,
        arms: false,
        core: true,
        glutes: true,
        legs: true,
      };
  }
}

export function getCueForPattern(pattern: KinematicPattern): string {
  switch (pattern) {
    case 'prone-floor-lat-pulldown':
      return 'Lie face-down on mat · Hover chest 2" · Sweep arms from overhead Y into W lat squeeze';
    case 'prone-cobra-angel':
      return 'Lie prone on stomach · Tuck chin · Retract scapulae & sweep arms with thumbs up';
    case 'inverted-table-row':
      return 'Hang supine underneath bar · Rigid heel-to-shoulder plank · Pull sternum to bar';
    case 'doorframe-row':
      return 'Feet planted forward · Lean back at 45° · Pull chest forward by squeezing shoulder blades';
    case 'pullup':
      return 'Overhand grip · Depress scapulae from dead hang · Drive elbows to ribs until chin clears bar';
    case 'chinup':
      return 'Underhand supinated grip · Hollow-body core brace · Pull chest to bar & control 3s descent';
    case 'row':
      return '45° hip hinge with flat back · Pull elbows back into hip pockets · Squeeze lats at top';
    case 'bicep-curl':
      return 'Stand tall · Pin elbows to ribs · Curl weights to shoulders with zero lower-back swing';
    case 'face-pull':
      return 'Hinge or stand tall · Pull high & wide with elbows at shoulder height · External rotation';
    case 'pushup':
      return 'Palms & toes locked to mat · 45° elbow arrow · Rigid plank torso lowers to 1" above floor';
    case 'diamond-pushup':
      return 'Hands forming diamond under sternum · Elbows tucked along ribs · Full triceps lockout';
    case 'pike-pushup':
      return 'Inverted V-pike · Lower crown of head forward of hands (tripod) · Press back through shoulders';
    case 'bench-dip':
      return 'Hands on bench edge · Slide back vertically · Lower to 90° elbow bend & press to lockout';
    case 'floor-press':
      return 'Lie supine with knees bent · Lower triceps gently to floor · Press straight up over chest';
    case 'overhead-press':
      return 'Brace core & glutes · Lock ribs down · Press weight vertically overhead with bicep by ear';
    case 'shoulder-tap':
      return 'Wide anti-rotation foot base · Strict push-up then pause shoulder tap · Zero hip sway';
    case 'bear-plank':
      return 'Hands under shoulders · Hover knees 1" off mat with flat tabletop back · Slow shoulder taps';
    case 'squat':
      return 'Feet shoulder-width · Break at hips & knees · Descend to parallel keeping knees over toes';
    case 'goblet-squat':
      return 'Hold bell at sternum · Sit deep between heels with upright chest · Drive through midfoot';
    case 'wall-sit':
      return 'Back flat against wall · Thighs parallel (90° knee angle) · Drive heels into floor';
    case 'lunge':
      return 'Split stance · Vertical front shin · Back knee hovers 1" above mat · Drive through front heel';
    case 'cossack-squat':
      return 'Wide stance · Shift deep into working hip while opposite leg stays straight with toes up';
    case 'step-up':
      return 'Plant working foot flat on box · Lean slightly forward · Drive up without back-foot bounce';
    case 'rdl':
      return '15° soft knee bend · Pure hip hinge backward · Neutral spine as weights shave the shins';
    case 'kettlebell-swing':
      return 'Explosive hip-snap hinge · Hike bell behind knees · Snap glutes to float bell to chest height';
    case 'glute-bridge':
      return 'Drive through heels · Bridge pelvis to straight knee-hip-shoulder line · 2s top glute squeeze';
    case 'nordic-curl':
      return 'Tall kneeling · Lock hips straight · Lower body slowly as one unit using eccentric hamstrings';
    case 'calf-raise':
      return 'Drive onto balls of big & second toes · 2s peak gastrocnemius squeeze · 3s slow lower';
    case 'farmers-carry':
      return 'Heavy weights at sides · Pack shoulders down & back · Crisp 10m heel-to-toe braced walk';
    case 'waiter-carry':
      return 'Bell locked overhead with vertical arm · Ribs locked down · Slow controlled stability march';
    case 'rack-march':
      return 'Bells tucked in front rack · Lift knee to 90° hip height & pause 2s without leaning torso';
    case 'mcgill-curlup':
      return 'Hands under lumbar curve · One knee bent · Hover head & shoulders 1–2" as one rigid block';
    case 'mcgill-sidebridge':
      return 'Elbow under shoulder · Hinge hips forward & up into straight diagonal lateral pillar';
    case 'mcgill-birddog':
      return 'Quadruped brace · Extend opposite fist & heel parallel to floor · Sweep elbow to knee';
    case 'deadbug':
      return 'Lumbar glued to mat · 90/90 tabletop · Extend opposite arm & leg 2" off floor on exhale';
    case 'hollow-hold':
      return 'Posterior pelvic tilt gluing lower back to mat · Lift shoulder blades & extend legs at 45°';
    case 'leg-lower':
      return 'Palms pressed into mat · Curl pelvis slightly up & lower straight legs over 3 slow seconds';
    case 'russian-twist':
      return 'Heels planted at 45° torso lean · Rotate entire shoulder girdle 45° left & right with bell';
    case 'l-sit':
      return 'Depress shoulders hard · Push palms into floor/handles · Lift hips & legs off the mat';
    case 'plank':
      return 'RKC high-tension forearm plank · Pull elbows toward toes · Lock quads, glutes & abs';
    case 'mobility':
      return 'Quadruped Cat-Camel · Gently wave spine between rounded flexion and smooth extension';
    case 'ebike':
    case 'spinning':
    default:
      return 'Smooth 360° pedal circles · Neutral hinged spine · Relaxed shoulders & light grip';
  }
}

export interface SolvedPose {
  pelvisPos: THREE.Vector3;
  lumbarPos: THREE.Vector3;
  thoraxPos: THREE.Vector3;
  neckPos: THREE.Vector3;
  headPos: THREE.Vector3;
  headLookTarget: THREE.Vector3;
  headUpVec: THREE.Vector3;
  torsoUpVec: THREE.Vector3; // Facing direction of chest/anterior body (+Z standing, -Y prone, +Y supine, +X side)
  handLPos: THREE.Vector3;
  handRPos: THREE.Vector3;
  ankleLPos: THREE.Vector3;
  ankleRPos: THREE.Vector3;
  armPoleL: THREE.Vector3;
  armPoleR: THREE.Vector3;
  kneePoleL: THREE.Vector3;
  kneePoleR: THREE.Vector3;
  footForwardVec: THREE.Vector3;
  showPullupBar: boolean;
  showLowRowBar: boolean;
  showDumbbells: boolean;
  showKettlebellCenter: boolean;
  kettlebellPos: THREE.Vector3;
  showBike: boolean;
  showBench: boolean;
  isFloorExercise: boolean;
}

export function solveExercisePose(
  pattern: KinematicPattern,
  rawCycle: number,
  p: number
): SolvedPose {
  // Default Standing Pose (+Y up, +Z chest facing forward, +X athlete's left)
  const pose: SolvedPose = {
    pelvisPos: new THREE.Vector3(0, 0.90, 0),
    lumbarPos: new THREE.Vector3(0, 1.08, 0),
    thoraxPos: new THREE.Vector3(0, 1.32, 0),
    neckPos: new THREE.Vector3(0, 1.50, 0),
    headPos: new THREE.Vector3(0, 1.62, 0),
    headLookTarget: new THREE.Vector3(0, 1.62, 2.0),
    headUpVec: new THREE.Vector3(0, 1, 0),
    torsoUpVec: new THREE.Vector3(0, 0, 1), // Chest faces +Z by default
    handLPos: new THREE.Vector3(0.25, 0.82, 0.10),
    handRPos: new THREE.Vector3(-0.25, 0.82, 0.10),
    ankleLPos: new THREE.Vector3(0.16, 0.06, 0),
    ankleRPos: new THREE.Vector3(-0.16, 0.06, 0),
    armPoleL: new THREE.Vector3(0.35, -0.2, -0.8),
    armPoleR: new THREE.Vector3(-0.35, -0.2, -0.8),
    kneePoleL: new THREE.Vector3(0.15, 0.1, 1.0),
    kneePoleR: new THREE.Vector3(-0.15, 0.1, 1.0),
    footForwardVec: new THREE.Vector3(0, 0, 1),
    showPullupBar: false,
    showLowRowBar: false,
    showDumbbells: false,
    showKettlebellCenter: false,
    kettlebellPos: new THREE.Vector3(0, 0.3, 0.25),
    showBike: false,
    showBench: false,
    isFloorExercise: false,
  };

  switch (pattern) {
    // =========================================================================
    // 1. PRONE FLOOR LAT PULL-DOWNS (Lying face-down on mat, Y-to-W lat sweep!)
    // =========================================================================
    case 'prone-floor-lat-pulldown': {
      pose.isFloorExercise = true;
      pose.torsoUpVec.set(0, -1, 0); // Chest faces DOWN (-Y) into the floor mat!
      pose.headUpVec.set(0, 0, 1); // Crown of head points +Z, face looks down at mat (-Y)
      pose.footForwardVec.set(0, -1, 0); // Toes point down into the mat

      // Slight thoracic extension: chest hovers 2 inches off the mat
      const chestHover = 0.025 + p * 0.035;
      pose.pelvisPos.set(0, 0.10, -0.14);
      pose.lumbarPos.set(0, 0.11 + chestHover * 0.3, 0.08);
      pose.thoraxPos.set(0, 0.14 + chestHover, 0.34);
      pose.neckPos.set(0, 0.17 + chestHover * 1.15, 0.50);
      pose.headPos.set(0, 0.19 + chestHover * 1.2, 0.62);
      pose.headLookTarget.set(0, -1.2, 0.64); // Eyes looking straight down at the floor mat

      // Feet & legs anchored long behind on the mat with glutes squeezed
      pose.ankleLPos.set(0.15, 0.06, -0.92);
      pose.ankleRPos.set(-0.15, 0.06, -0.92);
      pose.kneePoleL.set(0.12, -0.8, 0.0); // Kneecaps face down toward mat
      pose.kneePoleR.set(-0.12, -0.8, 0.0);

      // Arms sweep parallel to floor from Overhead "Y" (z = +0.90) to Tight "W" at ribs (z = +0.28)
      // At p=0: Arms extended overhead in Y; At p=1: Elbows driven down into back pockets in W
      const handZ = THREE.MathUtils.lerp(0.90, 0.34, p);
      const handX = THREE.MathUtils.lerp(0.26, 0.34, p);
      const handY = THREE.MathUtils.lerp(0.15, 0.21, p);
      pose.handLPos.set(handX, handY, handZ);
      pose.handRPos.set(-handX, handY, handZ);

      // Elbows bend outward and backward toward the hips in the horizontal plane!
      pose.armPoleL.set(0.85, 0.18, -0.65);
      pose.armPoleR.set(-0.85, 0.18, -0.65);
      break;
    }

    // =========================================================================
    // 2. PRONE COBRA / REVERSE SNOW ANGELS / Y-T-W-L (Face-down thoracic sweep)
    // =========================================================================
    case 'prone-cobra-angel': {
      pose.isFloorExercise = true;
      pose.torsoUpVec.set(0, -1, 0); // Prone (chest down)
      pose.headUpVec.set(0, 0, 1);
      pose.footForwardVec.set(0, -1, 0);

      const ext = 0.03 + p * 0.055;
      pose.pelvisPos.set(0, 0.10, -0.14);
      pose.lumbarPos.set(0, 0.12 + ext * 0.4, 0.08);
      pose.thoraxPos.set(0, 0.15 + ext, 0.34);
      pose.neckPos.set(0, 0.19 + ext * 1.2, 0.50);
      pose.headPos.set(0, 0.22 + ext * 1.3, 0.62);
      pose.headLookTarget.set(0, -1.0, 0.68);

      pose.ankleLPos.set(0.15, 0.06, -0.92);
      pose.ankleRPos.set(-0.15, 0.06, -0.92);
      pose.kneePoleL.set(0.12, -0.8, 0);
      pose.kneePoleR.set(-0.12, -0.8, 0);

      // Wide sweeping snow-angel arc from overhead (+0.85) out to T and back to hips (-0.05)
      const sweepAngle = THREE.MathUtils.lerp(0.25, 2.65, p); // radians from +Z toward -Z
      const reachR = 0.52;
      const hx = 0.20 + Math.sin(sweepAngle) * reachR;
      const hz = 0.34 + Math.cos(sweepAngle) * reachR;
      pose.handLPos.set(hx, 0.22 + p * 0.06, hz);
      pose.handRPos.set(-hx, 0.22 + p * 0.06, hz);
      pose.armPoleL.set(0.7, 0.25, -0.3);
      pose.armPoleR.set(-0.7, 0.25, -0.3);
      break;
    }

    // =========================================================================
    // 3. INVERTED UNDER-TABLE / BAR BODYWEIGHT ROW (Supine body row)
    // =========================================================================
    case 'inverted-table-row': {
      pose.isFloorExercise = true;
      pose.showLowRowBar = true;
      pose.torsoUpVec.set(0, 1, 0); // Supine (chest facing UP toward the bar!)
      pose.headUpVec.set(0, 0, 1);
      pose.footForwardVec.set(0, 1, 0);

      // Heels planted on floor at z = -0.86; hands gripping low bar at y = 0.72, z = 0.34
      pose.ankleLPos.set(0.15, 0.06, -0.86);
      pose.ankleRPos.set(-0.15, 0.06, -0.86);
      pose.handLPos.set(0.26, 0.72, 0.34);
      pose.handRPos.set(-0.26, 0.72, 0.34);

      // Rigid plank body pulls upward from hanging (angle 0.22) to chest touching bar (angle 0.48)
      const angle = THREE.MathUtils.lerp(0.22, 0.47, p);
      const setPoint = (target: THREE.Vector3, dist: number) => {
        target.set(0, 0.06 + Math.sin(angle) * dist, -0.86 + Math.cos(angle) * dist);
      };
      setPoint(pose.pelvisPos, 0.76);
      setPoint(pose.lumbarPos, 0.94);
      setPoint(pose.thoraxPos, 1.20);
      setPoint(pose.neckPos, 1.38);
      setPoint(pose.headPos, 1.50);
      pose.headLookTarget.set(0, 2.0, 0.34);

      pose.armPoleL.set(0.45, -0.6, 0.0);
      pose.armPoleR.set(-0.45, -0.6, 0.0);
      pose.kneePoleL.set(0.12, 0.6, -0.2);
      pose.kneePoleR.set(-0.12, 0.6, -0.2);
      break;
    }

    // =========================================================================
    // 4. DOORFRAME / TOWEL LEAN-BACK ROW
    // =========================================================================
    case 'doorframe-row': {
      pose.ankleLPos.set(0.16, 0.06, 0.22);
      pose.ankleRPos.set(-0.16, 0.06, 0.22);

      // Lean back at an angle (p=0 leaned back, p=1 pulled upright toward anchor)
      const leanAngle = THREE.MathUtils.lerp(-0.46, -0.10, p);
      const setStand = (target: THREE.Vector3, h: number) => {
        target.set(0, 0.06 + Math.cos(leanAngle) * h, 0.22 + Math.sin(leanAngle) * h);
      };
      setStand(pose.pelvisPos, 0.82);
      setStand(pose.lumbarPos, 1.00);
      setStand(pose.thoraxPos, 1.24);
      setStand(pose.neckPos, 1.42);
      setStand(pose.headPos, 1.54);
      pose.headLookTarget.set(0, 1.50, 1.5);

      // Hands anchored at fixed doorframe point in front
      pose.handLPos.set(0.18, 1.18, 0.42);
      pose.handRPos.set(-0.18, 1.18, 0.42);
      pose.armPoleL.set(0.45, -0.2, -0.8);
      pose.armPoleR.set(-0.45, -0.2, -0.8);
      break;
    }

    // =========================================================================
    // 5. PULL-UPS & CHIN-UPS
    // =========================================================================
    case 'pullup':
    case 'chinup': {
      pose.showPullupBar = true;
      const isChinup = pattern === 'chinup';
      const gripSpread = isChinup ? 0.18 : 0.28;
      pose.handLPos.set(gripSpread, 2.04, 0);
      pose.handRPos.set(-gripSpread, 2.04, 0);

      const lift = p * 0.48;
      pose.thoraxPos.set(0, 1.44 + lift, -0.03);
      pose.lumbarPos.set(0, 1.20 + lift, -0.02);
      pose.pelvisPos.set(0, 1.02 + lift, 0.01);
      pose.neckPos.set(0, 1.60 + lift, -0.02);
      pose.headPos.set(0, 1.72 + lift, -0.01);
      pose.headLookTarget.set(0, 2.1, 1.0);

      // Slight hollow-body leg position
      pose.ankleLPos.set(0.11, 0.24 + lift, 0.12);
      pose.ankleRPos.set(-0.11, 0.24 + lift, 0.12);

      // Chin-ups pull elbows forward/in; Pull-ups drive elbows out/down in scapular plane
      pose.armPoleL.set(isChinup ? 0.25 : 0.65, -0.4, isChinup ? 0.65 : 0.25);
      pose.armPoleR.set(isChinup ? -0.25 : -0.65, -0.4, isChinup ? 0.65 : 0.25);
      pose.kneePoleL.set(0.1, 0.1, 1.0);
      pose.kneePoleR.set(-0.1, 0.1, 1.0);
      break;
    }

    // =========================================================================
    // 6. BENT-OVER DUMBBELL / KETTLEBELL ROW
    // =========================================================================
    case 'row': {
      pose.showDumbbells = true;
      pose.ankleLPos.set(0.18, 0.06, 0);
      pose.ankleRPos.set(-0.18, 0.06, 0);

      const hingeAngle = 0.88; // ~50° torso incline
      const hipY = 0.76;
      const hipZ = -0.22;
      pose.pelvisPos.set(0, hipY, hipZ);
      pose.lumbarPos.set(0, hipY + Math.cos(hingeAngle) * 0.18, hipZ + Math.sin(hingeAngle) * 0.18);
      pose.thoraxPos.set(0, hipY + Math.cos(hingeAngle) * 0.42, hipZ + Math.sin(hingeAngle) * 0.42);
      pose.neckPos.set(0, hipY + Math.cos(hingeAngle) * 0.58, hipZ + Math.sin(hingeAngle) * 0.58);
      pose.headPos.set(0, hipY + Math.cos(hingeAngle) * 0.70, hipZ + Math.sin(hingeAngle) * 0.70);
      pose.headLookTarget.set(0, 0.35, 1.15);
      pose.torsoUpVec.set(0, -Math.sin(hingeAngle), Math.cos(hingeAngle));

      pose.handLPos.set(
        0.22,
        THREE.MathUtils.lerp(0.48, 0.82, p),
        THREE.MathUtils.lerp(0.22, -0.02, p)
      );
      pose.handRPos.set(
        -0.22,
        THREE.MathUtils.lerp(0.48, 0.82, p),
        THREE.MathUtils.lerp(0.22, -0.02, p)
      );
      pose.armPoleL.set(0.28, 0.65, -0.85);
      pose.armPoleR.set(-0.28, 0.65, -0.85);
      break;
    }

    // =========================================================================
    // 7. STANDING BICEP CURL / HAMMER CURL
    // =========================================================================
    case 'bicep-curl': {
      pose.showDumbbells = true;
      pose.ankleLPos.set(0.16, 0.06, 0);
      pose.ankleRPos.set(-0.16, 0.06, 0);

      // Curl arc around pinned elbows
      const curlAngle = THREE.MathUtils.lerp(0.15, 2.35, p);
      const elbowY = 1.02;
      const elbowZ = 0.04;
      const forearmLen = 0.27;
      const hy = elbowY - Math.cos(curlAngle) * forearmLen;
      const hz = elbowZ + Math.sin(curlAngle) * forearmLen;

      pose.handLPos.set(0.23, hy, hz);
      pose.handRPos.set(-0.23, hy, hz);
      pose.armPoleL.set(0.22, -0.3, -0.8);
      pose.armPoleR.set(-0.22, -0.3, -0.8);
      break;
    }

    // =========================================================================
    // 8. HIGH PULL / FACE PULL / REAR DELT RAISE
    // =========================================================================
    case 'face-pull': {
      pose.showDumbbells = true;
      pose.ankleLPos.set(0.18, 0.06, 0);
      pose.ankleRPos.set(-0.18, 0.06, 0);

      const hinge = 0.45;
      const hipY = 0.82;
      const hipZ = -0.12;
      pose.pelvisPos.set(0, hipY, hipZ);
      pose.lumbarPos.set(0, hipY + Math.cos(hinge) * 0.18, hipZ + Math.sin(hinge) * 0.18);
      pose.thoraxPos.set(0, hipY + Math.cos(hinge) * 0.42, hipZ + Math.sin(hinge) * 0.42);
      pose.neckPos.set(0, hipY + Math.cos(hinge) * 0.58, hipZ + Math.sin(hinge) * 0.58);
      pose.headPos.set(0, hipY + Math.cos(hinge) * 0.70, hipZ + Math.sin(hinge) * 0.70);
      pose.headLookTarget.set(0, 1.1, 1.5);
      pose.torsoUpVec.set(0, -Math.sin(hinge), Math.cos(hinge));

      pose.handLPos.set(
        THREE.MathUtils.lerp(0.16, 0.34, p),
        THREE.MathUtils.lerp(0.68, 1.28, p),
        THREE.MathUtils.lerp(0.28, 0.08, p)
      );
      pose.handRPos.set(
        THREE.MathUtils.lerp(-0.16, -0.34, p),
        THREE.MathUtils.lerp(0.68, 1.28, p),
        THREE.MathUtils.lerp(0.28, 0.08, p)
      );
      pose.armPoleL.set(0.85, 0.5, -0.4);
      pose.armPoleR.set(-0.85, 0.5, -0.4);
      break;
    }

    // =========================================================================
    // 9. PUSH-UPS & DIAMOND PUSH-UPS
    // =========================================================================
    case 'pushup':
    case 'diamond-pushup': {
      pose.isFloorExercise = true;
      pose.torsoUpVec.set(0, -1, 0); // Chest faces DOWN toward floor mat
      pose.headUpVec.set(0, 0, 1);
      pose.footForwardVec.set(0, -1, 0);

      const isDiamond = pattern === 'diamond-pushup';
      const handSpread = isDiamond ? 0.065 : 0.27;
      pose.handLPos.set(handSpread, 0.04, 0.50);
      pose.handRPos.set(-handSpread, 0.04, 0.50);
      pose.ankleLPos.set(0.12, 0.06, -0.86);
      pose.ankleRPos.set(-0.12, 0.06, -0.86);

      const angle = THREE.MathUtils.lerp(0.38, 0.11, p);
      const setPlankPoint = (target: THREE.Vector3, distFromAnkle: number) => {
        target.set(
          0,
          0.06 + Math.sin(angle) * distFromAnkle,
          -0.86 + Math.cos(angle) * distFromAnkle
        );
      };
      setPlankPoint(pose.pelvisPos, 0.78);
      setPlankPoint(pose.lumbarPos, 0.96);
      setPlankPoint(pose.thoraxPos, 1.22);
      setPlankPoint(pose.neckPos, 1.40);
      setPlankPoint(pose.headPos, 1.52);
      pose.headLookTarget.set(0, -0.5, 0.85);

      pose.armPoleL.set(isDiamond ? 0.12 : 0.45, 0.15, -0.85);
      pose.armPoleR.set(isDiamond ? -0.12 : -0.45, 0.15, -0.85);
      pose.kneePoleL.set(0.05, -0.5, 0.2);
      pose.kneePoleR.set(-0.05, -0.5, 0.2);
      break;
    }

    // =========================================================================
    // 10. PIKE PUSH-UPS (Inverted V-shape shoulder press)
    // =========================================================================
    case 'pike-pushup': {
      pose.isFloorExercise = true;
      pose.torsoUpVec.set(0, -0.7, -0.7).normalize();
      pose.headUpVec.set(0, 0, 1);
      pose.footForwardVec.set(0, -0.5, 0.86).normalize();

      pose.handLPos.set(0.25, 0.04, 0.36);
      pose.handRPos.set(-0.25, 0.04, 0.36);
      pose.ankleLPos.set(0.14, 0.06, -0.58);
      pose.ankleRPos.set(-0.14, 0.06, -0.58);

      const drop = p * 0.22;
      pose.pelvisPos.set(0, 0.78 - drop * 0.35, -0.18 + drop * 0.2);
      pose.lumbarPos.set(0, 0.64 - drop * 0.55, -0.02 + drop * 0.3);
      pose.thoraxPos.set(0, 0.46 - drop * 0.85, 0.18 + drop * 0.45);
      pose.neckPos.set(0, 0.34 - drop * 0.95, 0.30 + drop * 0.5);
      pose.headPos.set(0, 0.25 - drop, 0.38 + drop * 0.55);
      pose.headLookTarget.set(0, 0.0, -0.4);

      pose.armPoleL.set(0.35, 0.1, -0.8);
      pose.armPoleR.set(-0.35, 0.1, -0.8);
      pose.kneePoleL.set(0.1, -0.2, 0.8);
      pose.kneePoleR.set(-0.1, -0.2, 0.8);
      break;
    }

    // =========================================================================
    // 11. BENCH / CHAIR TRICEPS DIPS
    // =========================================================================
    case 'bench-dip': {
      pose.showBench = true;
      pose.handLPos.set(0.22, 0.44, -0.24);
      pose.handRPos.set(-0.22, 0.44, -0.24);
      pose.ankleLPos.set(0.14, 0.06, 0.54);
      pose.ankleRPos.set(-0.14, 0.06, 0.54);

      const dip = p * 0.22;
      pose.pelvisPos.set(0, 0.42 - dip, -0.02);
      pose.lumbarPos.set(0, 0.58 - dip, -0.04);
      pose.thoraxPos.set(0, 0.80 - dip, -0.06);
      pose.neckPos.set(0, 0.96 - dip, -0.05);
      pose.headPos.set(0, 1.08 - dip, -0.04);
      pose.headLookTarget.set(0, 1.0, 1.8);

      pose.armPoleL.set(0.18, 0.1, -0.9);
      pose.armPoleR.set(-0.18, 0.1, -0.9);
      pose.kneePoleL.set(0.12, 0.6, 0.2);
      pose.kneePoleR.set(-0.12, 0.6, 0.2);
      break;
    }

    // =========================================================================
    // 12. SUPINE FLOOR PRESS / SKULLCRUSHER / PULLOVER
    // =========================================================================
    case 'floor-press': {
      pose.isFloorExercise = true;
      pose.showDumbbells = true;
      pose.torsoUpVec.set(0, 1, 0); // Supine (chest faces UP +Y!)
      pose.headUpVec.set(0, 0, 1);
      pose.footForwardVec.set(0, 1, 0);

      pose.pelvisPos.set(0, 0.10, -0.10);
      pose.lumbarPos.set(0, 0.10, 0.10);
      pose.thoraxPos.set(0, 0.12, 0.34);
      pose.neckPos.set(0, 0.12, 0.50);
      pose.headPos.set(0, 0.13, 0.62);
      pose.headLookTarget.set(0, 2.0, 0.62);

      // Knees bent with feet planted flat on mat
      pose.ankleLPos.set(0.16, 0.06, -0.54);
      pose.ankleRPos.set(-0.16, 0.06, -0.54);
      pose.kneePoleL.set(0.16, 0.85, -0.25);
      pose.kneePoleR.set(-0.16, 0.85, -0.25);

      // Press dumbbells from triceps on floor (y=0.28) to full lockout over sternum (y=0.62)
      const pressY = THREE.MathUtils.lerp(0.28, 0.62, p);
      const spreadX = THREE.MathUtils.lerp(0.28, 0.16, p);
      pose.handLPos.set(spreadX, pressY, 0.34);
      pose.handRPos.set(-spreadX, pressY, 0.34);
      pose.armPoleL.set(0.55, -0.35, 0.20);
      pose.armPoleR.set(-0.55, -0.35, 0.20);
      break;
    }

    // =========================================================================
    // 13. STANDING OVERHEAD KETTLEBELL / DUMBBELL PRESS
    // =========================================================================
    case 'overhead-press': {
      pose.showDumbbells = true;
      pose.ankleLPos.set(0.16, 0.06, 0);
      pose.ankleRPos.set(-0.16, 0.06, 0);

      const pressY = THREE.MathUtils.lerp(1.36, 1.92, p);
      const handX = THREE.MathUtils.lerp(0.22, 0.18, p);
      const handZ = THREE.MathUtils.lerp(0.14, 0.02, p);
      pose.handLPos.set(handX, pressY, handZ);
      pose.handRPos.set(-handX, pressY, handZ);
      pose.armPoleL.set(0.55, -0.4, 0.4);
      pose.armPoleR.set(-0.55, -0.4, 0.4);
      break;
    }

    // =========================================================================
    // 14. PUSH-UP TO SHOULDER TAP & BEAR PLANK HOVER
    // =========================================================================
    case 'shoulder-tap':
    case 'bear-plank': {
      pose.isFloorExercise = true;
      pose.torsoUpVec.set(0, -1, 0); // Prone (chest down)
      pose.headUpVec.set(0, 0, 1);
      pose.footForwardVec.set(0, -1, 0);

      const isBear = pattern === 'bear-plank';
      const isPushPhase = !isBear && rawCycle < 0.5;
      const pushP = isPushPhase ? 0.5 - 0.5 * Math.cos(rawCycle * 2 * Math.PI * 2) : 0;
      const tapP = isBear
        ? p
        : !isPushPhase
        ? 0.5 - 0.5 * Math.cos((rawCycle - 0.5) * 2 * Math.PI * 2)
        : 0;

      pose.ankleLPos.set(0.22, 0.06, isBear ? -0.58 : -0.86);
      pose.ankleRPos.set(-0.22, 0.06, isBear ? -0.58 : -0.86);

      if (isBear) {
        // Quadruped tabletop with knees hovering 1.5" off floor
        pose.pelvisPos.set(0, 0.42, -0.22);
        pose.lumbarPos.set(0, 0.42, 0.0);
        pose.thoraxPos.set(0, 0.43, 0.24);
        pose.neckPos.set(0, 0.44, 0.40);
        pose.headPos.set(0, 0.45, 0.52);
        pose.kneePoleL.set(0.18, -0.7, 0.25);
        pose.kneePoleR.set(-0.18, -0.7, 0.25);
      } else {
        const angle = THREE.MathUtils.lerp(0.38, 0.12, pushP);
        const setPlankPoint = (target: THREE.Vector3, distFromAnkle: number) => {
          target.set(
            0,
            0.06 + Math.sin(angle) * distFromAnkle,
            -0.86 + Math.cos(angle) * distFromAnkle
          );
        };
        setPlankPoint(pose.pelvisPos, 0.78);
        setPlankPoint(pose.lumbarPos, 0.96);
        setPlankPoint(pose.thoraxPos, 1.22);
        setPlankPoint(pose.neckPos, 1.40);
        setPlankPoint(pose.headPos, 1.52);
        pose.kneePoleL.set(0.1, -0.5, 0.2);
        pose.kneePoleR.set(-0.1, -0.5, 0.2);
      }
      pose.headLookTarget.set(0, -0.5, 0.85);

      pose.handLPos.set(0.24, 0.04, isBear ? 0.28 : 0.50);
      pose.handRPos.set(
        THREE.MathUtils.lerp(-0.24, 0.16, tapP),
        THREE.MathUtils.lerp(0.04, pose.thoraxPos.y - 0.04, tapP),
        THREE.MathUtils.lerp(isBear ? 0.28 : 0.50, pose.thoraxPos.z + 0.02, tapP)
      );
      pose.armPoleL.set(0.42, 0.15, -0.85);
      pose.armPoleR.set(-0.42, 0.15, -0.85);
      break;
    }

    // =========================================================================
    // 15. SQUAT / GOBLET SQUAT / WALL SIT / CALF RAISE
    // =========================================================================
    case 'squat':
    case 'goblet-squat':
    case 'wall-sit': {
      const isGoblet = pattern === 'goblet-squat';
      const isWallSit = pattern === 'wall-sit';
      pose.showKettlebellCenter = isGoblet;

      pose.ankleLPos.set(0.20, 0.06, 0);
      pose.ankleRPos.set(-0.20, 0.06, 0);

      const depth = isWallSit ? 0.92 + p * 0.06 : p;
      const hipY = THREE.MathUtils.lerp(0.84, 0.46, depth);
      const hipZ = THREE.MathUtils.lerp(-0.02, -0.22, depth);
      const shoulderZ = isWallSit ? -0.20 : THREE.MathUtils.lerp(0.0, 0.06, depth);
      const torsoDrop = isWallSit ? 0 : THREE.MathUtils.lerp(0, 0.05, depth);

      pose.pelvisPos.set(0, hipY, hipZ);
      pose.lumbarPos.set(0, hipY + 0.18 - torsoDrop * 0.4, (hipZ + shoulderZ) * 0.5);
      pose.thoraxPos.set(0, hipY + 0.42 - torsoDrop, shoulderZ);
      pose.neckPos.set(0, hipY + 0.58 - torsoDrop, shoulderZ + 0.02);
      pose.headPos.set(0, hipY + 0.70 - torsoDrop, shoulderZ + 0.04);
      pose.headLookTarget.set(0, pose.headPos.y, 2.0);

      if (isGoblet) {
        pose.handLPos.set(0.08, pose.thoraxPos.y - 0.02, pose.thoraxPos.z + 0.18);
        pose.handRPos.set(-0.08, pose.thoraxPos.y - 0.02, pose.thoraxPos.z + 0.18);
        pose.kettlebellPos.set(0, pose.thoraxPos.y - 0.05, pose.thoraxPos.z + 0.19);
      } else {
        pose.handLPos.set(
          THREE.MathUtils.lerp(0.24, 0.07, depth),
          THREE.MathUtils.lerp(0.82, pose.thoraxPos.y - 0.02, depth),
          THREE.MathUtils.lerp(0.08, 0.34, depth)
        );
        pose.handRPos.set(
          THREE.MathUtils.lerp(-0.24, -0.07, depth),
          THREE.MathUtils.lerp(0.82, pose.thoraxPos.y - 0.02, depth),
          THREE.MathUtils.lerp(0.08, 0.34, depth)
        );
      }

      pose.armPoleL.set(0.35, -0.5, -0.3);
      pose.armPoleR.set(-0.35, -0.5, -0.3);
      pose.kneePoleL.set(0.35, 0.1, 1.0);
      pose.kneePoleR.set(-0.35, 0.1, 1.0);
      break;
    }

    case 'calf-raise': {
      const lift = p * 0.085;
      pose.ankleLPos.set(0.15, 0.06 + lift, 0);
      pose.ankleRPos.set(-0.15, 0.06 + lift, 0);
      pose.pelvisPos.y += lift;
      pose.lumbarPos.y += lift;
      pose.thoraxPos.y += lift;
      pose.neckPos.y += lift;
      pose.headPos.y += lift;
      pose.handLPos.set(0.24, 0.82 + lift, 0.05);
      pose.handRPos.set(-0.24, 0.82 + lift, 0.05);
      break;
    }

    // =========================================================================
    // 16. LUNGE / COSSACK SQUAT / STEP-UP
    // =========================================================================
    case 'lunge':
    case 'step-up': {
      const isStep = pattern === 'step-up';
      pose.showBench = isStep;
      pose.showDumbbells = !isStep;

      if (isStep) {
        const lift = p * 0.34;
        pose.ankleLPos.set(0.14, 0.36, -0.16); // Left foot planted on step box
        pose.ankleRPos.set(-0.14, 0.06 + lift * 0.95, 0.22 - p * 0.34);
        pose.pelvisPos.set(0, 0.84 + lift, 0.05 - p * 0.18);
        pose.lumbarPos.set(0, 1.02 + lift, 0.06 - p * 0.18);
        pose.thoraxPos.set(0, 1.26 + lift, 0.08 - p * 0.18);
        pose.neckPos.set(0, 1.42 + lift, 0.09 - p * 0.18);
        pose.headPos.set(0, 1.54 + lift, 0.10 - p * 0.18);
        pose.handLPos.set(0.24, 0.78 + lift, 0.06 - p * 0.18);
        pose.handRPos.set(-0.24, 0.78 + lift, 0.06 - p * 0.18);
      } else {
        pose.ankleLPos.set(0.15, 0.06, 0.38);
        pose.ankleRPos.set(-0.15, 0.06, -0.44);
        const drop = p * 0.30;
        pose.pelvisPos.set(0, 0.80 - drop, -0.02);
        pose.lumbarPos.set(0, 0.98 - drop, -0.01);
        pose.thoraxPos.set(0, 1.22 - drop, 0.01);
        pose.neckPos.set(0, 1.38 - drop, 0.02);
        pose.headPos.set(0, 1.50 - drop, 0.03);
        pose.handLPos.set(0.25, 0.74 - drop, 0.02);
        pose.handRPos.set(-0.25, 0.74 - drop, 0.02);
      }
      pose.headLookTarget.set(0, pose.headPos.y, 2.0);
      pose.kneePoleL.set(0.12, 0.1, 1.0);
      pose.kneePoleR.set(-0.12, -0.3, 1.0);
      break;
    }

    case 'cossack-squat': {
      // Wide lateral stance shifting deep into Left hip
      pose.ankleLPos.set(0.44, 0.06, 0);
      pose.ankleRPos.set(-0.44, 0.06, 0);
      const shiftX = p * 0.26;
      const dropY = p * 0.34;
      pose.pelvisPos.set(shiftX, 0.82 - dropY, -0.12 * p);
      pose.lumbarPos.set(shiftX, 1.00 - dropY, -0.06 * p);
      pose.thoraxPos.set(shiftX, 1.24 - dropY, 0.02);
      pose.neckPos.set(shiftX, 1.40 - dropY, 0.04);
      pose.headPos.set(shiftX, 1.52 - dropY, 0.06);
      pose.handLPos.set(shiftX + 0.08, 1.15 - dropY, 0.25);
      pose.handRPos.set(shiftX - 0.08, 1.15 - dropY, 0.25);
      pose.kneePoleL.set(0.5, 0.1, 1.0);
      pose.kneePoleR.set(-0.2, 0.3, 1.0);
      break;
    }

    // =========================================================================
    // 17. RDL / KETTLEBELL SWING / NORDIC HAMSTRING CURL
    // =========================================================================
    case 'rdl':
    case 'kettlebell-swing': {
      const isSwing = pattern === 'kettlebell-swing';
      pose.showDumbbells = !isSwing;
      pose.showKettlebellCenter = isSwing;

      pose.ankleLPos.set(0.18, 0.06, 0);
      pose.ankleRPos.set(-0.18, 0.06, 0);

      // For swing: p=0 is top lockout (bell floating at chest), p=1 is bottom hinge hike
      const hingeP = isSwing ? 1 - p : p;
      const hipZ = THREE.MathUtils.lerp(-0.02, -0.28, hingeP);
      const hipY = THREE.MathUtils.lerp(0.83, 0.74, hingeP);
      const hingeAngle = THREE.MathUtils.lerp(0.06, 1.12, hingeP);

      pose.pelvisPos.set(0, hipY, hipZ);
      pose.lumbarPos.set(0, hipY + Math.cos(hingeAngle) * 0.18, hipZ + Math.sin(hingeAngle) * 0.18);
      pose.thoraxPos.set(0, hipY + Math.cos(hingeAngle) * 0.42, hipZ + Math.sin(hingeAngle) * 0.42);
      pose.neckPos.set(0, hipY + Math.cos(hingeAngle) * 0.58, hipZ + Math.sin(hingeAngle) * 0.58);
      pose.headPos.set(0, hipY + Math.cos(hingeAngle) * 0.70, hipZ + Math.sin(hingeAngle) * 0.70);
      pose.headLookTarget.set(0, pose.headPos.y - Math.sin(hingeAngle) * 0.8, 1.5);
      pose.torsoUpVec.set(0, -Math.sin(hingeAngle), Math.cos(hingeAngle));

      if (isSwing) {
        const swingY = THREE.MathUtils.lerp(0.32, 1.24, p);
        const swingZ = THREE.MathUtils.lerp(-0.18, 0.48, p);
        pose.handLPos.set(0.07, swingY, swingZ);
        pose.handRPos.set(-0.07, swingY, swingZ);
        pose.kettlebellPos.set(0, swingY - 0.04, swingZ + 0.04);
      } else {
        pose.handLPos.set(0.20, THREE.MathUtils.lerp(0.76, 0.34, hingeP), 0.08);
        pose.handRPos.set(-0.20, THREE.MathUtils.lerp(0.76, 0.34, hingeP), 0.08);
      }
      break;
    }

    case 'nordic-curl': {
      pose.isFloorExercise = true;
      // Tall kneeling with ankles anchored at z = -0.68, knees at z = -0.28, leaning forward
      pose.ankleLPos.set(0.15, 0.08, -0.68);
      pose.ankleRPos.set(-0.15, 0.08, -0.68);
      const lean = THREE.MathUtils.lerp(0.08, 0.92, p); // radians forward from vertical
      pose.torsoUpVec.set(0, -Math.sin(lean), Math.cos(lean));
      const setKneel = (target: THREE.Vector3, distFromKnee: number) => {
        target.set(
          0,
          0.06 + Math.cos(lean) * distFromKnee,
          -0.28 + Math.sin(lean) * distFromKnee
        );
      };
      setKneel(pose.pelvisPos, 0.42);
      setKneel(pose.lumbarPos, 0.60);
      setKneel(pose.thoraxPos, 0.84);
      setKneel(pose.neckPos, 1.00);
      setKneel(pose.headPos, 1.12);
      pose.headLookTarget.set(0, pose.headPos.y - Math.sin(lean) * 0.5, 1.5);
      pose.handLPos.set(0.18, pose.thoraxPos.y - 0.05, pose.thoraxPos.z + 0.16);
      pose.handRPos.set(-0.18, pose.thoraxPos.y - 0.05, pose.thoraxPos.z + 0.16);
      pose.kneePoleL.set(0.15, -0.8, 0.4);
      pose.kneePoleR.set(-0.15, -0.8, 0.4);
      break;
    }

    // =========================================================================
    // 18. FARMER'S CARRY / WAITER OVERHEAD CARRY / FRONT-RACK MARCH
    // =========================================================================
    case 'farmers-carry':
    case 'waiter-carry':
    case 'rack-march': {
      pose.showDumbbells = true;
      const stride = Math.sin(rawCycle * Math.PI * 2);
      const liftL = Math.max(0, Math.cos(rawCycle * Math.PI * 2)) * (pattern === 'rack-march' ? 0.26 : 0.09);
      const liftR = Math.max(0, -Math.cos(rawCycle * Math.PI * 2)) * (pattern === 'rack-march' ? 0.26 : 0.09);

      pose.ankleLPos.set(0.15, 0.06 + liftL, pattern === 'rack-march' ? 0.06 : stride * 0.24);
      pose.ankleRPos.set(-0.15, 0.06 + liftR, pattern === 'rack-march' ? 0.06 : -stride * 0.24);

      const bob = Math.abs(stride) * 0.015;
      pose.pelvisPos.set(0, 0.85 - bob, 0);
      pose.lumbarPos.set(0, 1.03 - bob, 0);
      pose.thoraxPos.set(0, 1.27 - bob, 0);
      pose.neckPos.set(0, 1.44 - bob, 0);
      pose.headPos.set(0, 1.56 - bob, 0);
      pose.headLookTarget.set(0, 1.56, 2.0);

      if (pattern === 'waiter-carry') {
        pose.handLPos.set(0.18, 1.92 - bob, 0.02); // Left arm locked overhead
        pose.handRPos.set(-0.25, 0.78 - bob, 0.02);
        pose.armPoleL.set(0.4, -0.2, 0.3);
      } else if (pattern === 'rack-march') {
        pose.handLPos.set(0.14, 1.26 - bob, 0.16);
        pose.handRPos.set(-0.14, 1.26 - bob, 0.16);
      } else {
        pose.handLPos.set(0.26, 0.78 - bob, 0.02);
        pose.handRPos.set(-0.26, 0.78 - bob, 0.02);
      }
      break;
    }

    // =========================================================================
    // 19. McGILL CURL-UP (Supine on back, hands under lumbar, 1 knee bent)
    // =========================================================================
    case 'mcgill-curlup': {
      pose.isFloorExercise = true;
      pose.torsoUpVec.set(0, 1, 0); // Supine (Chest faces UP +Y!)
      pose.headUpVec.set(0, 0, 1);
      pose.footForwardVec.set(0, 1, 0);

      const curlLift = p * 0.10;
      pose.pelvisPos.set(0, 0.10, -0.10);
      pose.lumbarPos.set(0, 0.11, 0.10);
      pose.thoraxPos.set(0, 0.13 + curlLift * 0.65, 0.34);
      pose.neckPos.set(0, 0.15 + curlLift * 0.9, 0.50);
      pose.headPos.set(0, 0.17 + curlLift, 0.62);
      pose.headLookTarget.set(0, 2.0, 0.45);

      pose.handLPos.set(0.12, 0.05, 0.10);
      pose.handRPos.set(-0.12, 0.05, 0.10);
      pose.armPoleL.set(0.45, 0.05, 0.22);
      pose.armPoleR.set(-0.45, 0.05, 0.22);

      pose.ankleRPos.set(-0.15, 0.06, -0.52);
      pose.ankleLPos.set(0.15, 0.07, -0.88);
      pose.kneePoleR.set(-0.15, 0.85, -0.30);
      pose.kneePoleL.set(0.15, 0.25, -0.45);
      break;
    }

    // =========================================================================
    // 20. McGILL SIDE BRIDGE / COPENHAGEN SIDE PLANK (Side-lying)
    // =========================================================================
    case 'mcgill-sidebridge': {
      pose.isFloorExercise = true;
      pose.torsoUpVec.set(1, 0, 0); // Chest faces sideways (+X)!
      pose.headUpVec.set(1, 0, 0);
      pose.footForwardVec.set(1, 0, 0);

      const hipBridgeY = THREE.MathUtils.lerp(0.13, 0.30, p);
      pose.ankleLPos.set(0.02, 0.12, -0.82);
      pose.ankleRPos.set(-0.02, 0.05, -0.82);
      pose.pelvisPos.set(0, hipBridgeY, -0.12);
      pose.lumbarPos.set(0, THREE.MathUtils.lerp(hipBridgeY, 0.36, 0.42), 0.08);
      pose.thoraxPos.set(0, 0.36, 0.34);
      pose.neckPos.set(0, 0.40, 0.50);
      pose.headPos.set(0, 0.43, 0.62);
      pose.headLookTarget.set(2.0, 0.43, 0.62);

      pose.handRPos.set(0.22, 0.04, 0.36);
      pose.handLPos.set(0.06, hipBridgeY + 0.15, -0.05);
      pose.armPoleR.set(-0.12, -0.4, 0.36);
      pose.armPoleL.set(0.25, 0.5, 0.15);
      pose.kneePoleL.set(0.8, 0.1, 0);
      pose.kneePoleR.set(0.8, 0.1, 0);
      break;
    }

    // =========================================================================
    // 21. McGILL BIRD DOG (Quadruped opposite arm & heel extension)
    // =========================================================================
    case 'mcgill-birddog': {
      pose.isFloorExercise = true;
      pose.torsoUpVec.set(0, -1, 0); // Chest faces DOWN toward mat
      pose.headUpVec.set(0, 0, 1);
      pose.footForwardVec.set(0, -1, 0);

      pose.pelvisPos.set(0, 0.46, -0.24);
      pose.lumbarPos.set(0, 0.46, -0.02);
      pose.thoraxPos.set(0, 0.46, 0.24);
      pose.neckPos.set(0, 0.48, 0.40);
      pose.headPos.set(0, 0.49, 0.53);
      pose.headLookTarget.set(0, -0.5, 0.72);

      pose.handLPos.set(0.18, 0.04, 0.30);
      pose.armPoleL.set(0.22, 0.2, 0.05);

      pose.handRPos.set(
        -0.16,
        THREE.MathUtils.lerp(0.22, 0.48, p),
        THREE.MathUtils.lerp(-0.04, 0.82, p)
      );
      pose.armPoleR.set(-0.22, 0.2, 0.1);

      pose.ankleRPos.set(-0.16, 0.06, -0.64);
      pose.kneePoleR.set(-0.16, -0.6, 0.25);

      pose.ankleLPos.set(
        0.16,
        THREE.MathUtils.lerp(0.18, 0.46, p),
        THREE.MathUtils.lerp(-0.06, -1.02, p)
      );
      pose.kneePoleL.set(0.16, -0.4, 0.2);
      break;
    }

    // =========================================================================
    // 22. DEAD BUG / HOLLOW HOLD / SUPINE LEG LOWERING / GLUTE BRIDGE
    // =========================================================================
    case 'deadbug':
    case 'hollow-hold':
    case 'leg-lower': {
      pose.isFloorExercise = true;
      pose.torsoUpVec.set(0, 1, 0); // Supine (Chest faces UP +Y!)
      pose.headUpVec.set(0, 0, 1);
      pose.footForwardVec.set(0, 1, 0);

      const isHollow = pattern === 'hollow-hold';
      const isLegLower = pattern === 'leg-lower';

      pose.pelvisPos.set(0, 0.10, -0.10);
      pose.lumbarPos.set(0, 0.10, 0.10);
      pose.thoraxPos.set(0, isHollow ? 0.18 : 0.11, 0.34);
      pose.neckPos.set(0, isHollow ? 0.24 : 0.12, 0.50);
      pose.headPos.set(0, isHollow ? 0.28 : 0.13, 0.62);
      pose.headLookTarget.set(0, 2.0, 0.45);

      if (isHollow) {
        pose.handLPos.set(0.18, 0.36 + p * 0.04, 0.82);
        pose.handRPos.set(-0.18, 0.36 + p * 0.04, 0.82);
        pose.ankleLPos.set(0.12, 0.32 + p * 0.05, -0.82);
        pose.ankleRPos.set(-0.12, 0.32 + p * 0.05, -0.82);
        pose.kneePoleL.set(0.12, 0.6, -0.3);
        pose.kneePoleR.set(-0.12, 0.6, -0.3);
      } else if (isLegLower) {
        pose.handLPos.set(0.28, 0.04, -0.05);
        pose.handRPos.set(-0.28, 0.04, -0.05);
        const legAngle = THREE.MathUtils.lerp(1.35, 0.25, p); // vertical down to 15° above mat
        const ay = 0.10 + Math.sin(legAngle) * 0.76;
        const az = -0.10 - Math.cos(legAngle) * 0.76;
        pose.ankleLPos.set(0.13, ay, az);
        pose.ankleRPos.set(-0.13, ay, az);
        pose.kneePoleL.set(0.13, 0.8, 0.2);
        pose.kneePoleR.set(-0.13, 0.8, 0.2);
      } else {
        pose.handRPos.set(
          -0.18,
          THREE.MathUtils.lerp(0.64, 0.16, p),
          THREE.MathUtils.lerp(0.34, 0.88, p)
        );
        pose.handLPos.set(0.18, 0.64, 0.34);
        pose.ankleLPos.set(
          0.15,
          THREE.MathUtils.lerp(0.48, 0.14, p),
          THREE.MathUtils.lerp(-0.48, -0.88, p)
        );
        pose.ankleRPos.set(-0.15, 0.48, -0.48);
        pose.kneePoleL.set(0.15, 0.8, 0.2);
        pose.kneePoleR.set(-0.15, 0.8, 0.2);
      }
      pose.armPoleR.set(-0.22, 0.4, 0.1);
      pose.armPoleL.set(0.22, 0.4, 0.1);
      break;
    }

    case 'glute-bridge': {
      pose.isFloorExercise = true;
      pose.torsoUpVec.set(0, 1, 0); // Supine (Chest faces UP +Y!)
      pose.headUpVec.set(0, 0, 1);
      pose.footForwardVec.set(0, 1, 0);

      const bridgeHipY = THREE.MathUtils.lerp(0.10, 0.36, p);
      pose.pelvisPos.set(0, bridgeHipY, -0.08);
      pose.lumbarPos.set(0, THREE.MathUtils.lerp(bridgeHipY, 0.12, 0.45), 0.14);
      pose.thoraxPos.set(0, 0.12, 0.36);
      pose.neckPos.set(0, 0.12, 0.52);
      pose.headPos.set(0, 0.13, 0.64);
      pose.headLookTarget.set(0, 2.0, 0.64);

      pose.handLPos.set(0.32, 0.04, -0.02);
      pose.handRPos.set(-0.32, 0.04, -0.02);
      pose.ankleLPos.set(0.16, 0.06, -0.52);
      pose.ankleRPos.set(-0.16, 0.06, -0.52);
      pose.kneePoleL.set(0.16, 0.85, -0.25);
      pose.kneePoleR.set(-0.16, 0.85, -0.25);
      break;
    }

    // =========================================================================
    // 23. RUSSIAN TWIST & L-SIT HOLD
    // =========================================================================
    case 'russian-twist': {
      pose.isFloorExercise = true;
      pose.showKettlebellCenter = true;
      const rot = Math.sin(rawCycle * Math.PI * 2) * 0.55;
      pose.torsoUpVec.set(Math.sin(rot), 0.55, Math.cos(rot)).normalize();

      pose.pelvisPos.set(0, 0.10, -0.18);
      pose.lumbarPos.set(0, 0.24, -0.30);
      pose.thoraxPos.set(0, 0.44, -0.44);
      pose.neckPos.set(0, 0.58, -0.52);
      pose.headPos.set(0, 0.69, -0.58);
      pose.headLookTarget.set(Math.sin(rot) * 0.8, 0.65, 1.0);

      pose.ankleLPos.set(0.14, 0.08, 0.46);
      pose.ankleRPos.set(-0.14, 0.08, 0.46);
      pose.kneePoleL.set(0.14, 0.65, 0.1);
      pose.kneePoleR.set(-0.14, 0.65, 0.1);

      const bellX = Math.sin(rot) * 0.24;
      pose.handLPos.set(bellX + 0.06, 0.38, -0.18);
      pose.handRPos.set(bellX - 0.06, 0.38, -0.18);
      pose.kettlebellPos.set(bellX, 0.35, -0.16);
      break;
    }

    case 'l-sit': {
      pose.isFloorExercise = true;
      const lift = 0.12 + p * 0.04;
      pose.handLPos.set(0.24, 0.04, 0);
      pose.handRPos.set(-0.24, 0.04, 0);
      pose.pelvisPos.set(0, 0.12 + lift, -0.04);
      pose.lumbarPos.set(0, 0.30 + lift, -0.04);
      pose.thoraxPos.set(0, 0.54 + lift, -0.02);
      pose.neckPos.set(0, 0.70 + lift, 0);
      pose.headPos.set(0, 0.82 + lift, 0.02);
      pose.ankleLPos.set(0.12, 0.14 + lift, 0.72);
      pose.ankleRPos.set(-0.12, 0.14 + lift, 0.72);
      pose.kneePoleL.set(0.12, 0.6, 0.3);
      pose.kneePoleR.set(-0.12, 0.6, 0.3);
      break;
    }

    // =========================================================================
    // 24. RKC FOREARM PLANK & CAT-CAMEL MOBILITY
    // =========================================================================
    case 'plank': {
      pose.isFloorExercise = true;
      pose.torsoUpVec.set(0, -1, 0); // Prone (chest down)
      pose.headUpVec.set(0, 0, 1);
      pose.footForwardVec.set(0, -1, 0);

      pose.ankleLPos.set(0.13, 0.06, -0.86);
      pose.ankleRPos.set(-0.13, 0.06, -0.86);
      const breathLift = p * 0.015;
      pose.pelvisPos.set(0, 0.24 + breathLift, -0.10);
      pose.lumbarPos.set(0, 0.26 + breathLift, 0.10);
      pose.thoraxPos.set(0, 0.29 + breathLift, 0.34);
      pose.neckPos.set(0, 0.31 + breathLift, 0.50);
      pose.headPos.set(0, 0.32 + breathLift, 0.62);
      pose.headLookTarget.set(0, -0.5, 0.75);

      pose.handLPos.set(0.16, 0.04, 0.62);
      pose.handRPos.set(-0.16, 0.04, 0.62);
      pose.armPoleL.set(0.22, -0.3, 0.34);
      pose.armPoleR.set(-0.22, -0.3, 0.34);
      pose.kneePoleL.set(0.1, -0.5, 0.2);
      pose.kneePoleR.set(-0.1, -0.5, 0.2);
      break;
    }

    case 'mobility': {
      pose.isFloorExercise = true;
      pose.torsoUpVec.set(0, -1, 0); // Quadruped prone
      pose.headUpVec.set(0, 0, 1);
      pose.footForwardVec.set(0, -1, 0);

      const spineArc = (p - 0.5) * 0.14;
      pose.pelvisPos.set(0, 0.45, -0.24);
      pose.lumbarPos.set(0, 0.46 + spineArc, 0.0);
      pose.thoraxPos.set(0, 0.46 + spineArc * 0.7, 0.24);
      pose.neckPos.set(0, 0.46 - spineArc * 0.4, 0.40);
      pose.headPos.set(0, 0.45 - spineArc * 0.9, 0.52);
      pose.headLookTarget.set(0, -0.2 - spineArc * 1.2, 0.85);

      pose.handLPos.set(0.18, 0.04, 0.28);
      pose.handRPos.set(-0.18, 0.04, 0.28);
      pose.ankleLPos.set(0.16, 0.06, -0.62);
      pose.ankleRPos.set(-0.16, 0.06, -0.62);
      pose.kneePoleL.set(0.16, -0.6, 0.25);
      pose.kneePoleR.set(-0.16, -0.6, 0.25);
      break;
    }

    // =========================================================================
    // 25. E-BIKE & INDOOR SPINNING
    // =========================================================================
    case 'ebike':
    case 'spinning':
    default: {
      pose.showBike = true;
      pose.torsoUpVec.set(0, -0.45, 0.89).normalize();

      const crankAngle = rawCycle * Math.PI * 2;
      pose.pelvisPos.set(0, 0.82, -0.22);
      pose.lumbarPos.set(0, 0.96, -0.10);
      pose.thoraxPos.set(0, 1.12, 0.06);
      pose.neckPos.set(0, 1.24, 0.16);
      pose.headPos.set(0, 1.35, 0.22);
      pose.headLookTarget.set(0, 1.25, 1.8);

      pose.handLPos.set(0.21, 0.92, 0.32);
      pose.handRPos.set(-0.21, 0.92, 0.32);
      pose.armPoleL.set(0.3, -0.2, -0.2);
      pose.armPoleR.set(-0.3, -0.2, -0.2);

      const crankR = 0.14;
      pose.ankleLPos.set(
        0.14,
        0.34 + Math.sin(crankAngle) * crankR,
        0.02 + Math.cos(crankAngle) * crankR
      );
      pose.ankleRPos.set(
        -0.14,
        0.34 + Math.sin(crankAngle + Math.PI) * crankR,
        0.02 + Math.cos(crankAngle + Math.PI) * crankR
      );
      pose.kneePoleL.set(0.14, 0.5, 0.8);
      pose.kneePoleR.set(-0.14, 0.5, 0.8);
      break;
    }
  }

  return pose;
}

