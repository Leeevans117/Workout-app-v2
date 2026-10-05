import { WorkoutRoutine } from '../types/workout';

// 1. PURE McGILL BIG 3 (Strictly the 3 core stability exercises — Dr. Stuart McGill Protocol)
export const MCGILL_BIG_3_ROUTINE: WorkoutRoutine = {
  id: 'mcgill-big-3',
  title: 'McGill Big 3',
  subtitle: 'Dr. Stuart McGill Spine Stability Protocol (10s Holds • 6 Reps Per Side)',
  tag: 'Spine Hygiene',
  category: 'mcgill',
  durationMinutes: 12,
  estimatedCalories: 95,
  accentColor: 'purple',
  isMcGillSpecial: true,
  image: '/src/assets/images/mcgill_spine_anatomy_1791025454520.jpg',
  exercises: [
    {
      id: 'mcgill-curl-up',
      name: 'McGill Modified Curl-Up (6-4-2 Pyramid)',
      category: 'mcgill',
      animationType: 'mcgill-curlup',
      defaultSets: 12,
      defaultReps: 1,
      repLabel: '10s Isometric Hold (6-4-2 Pyramid = 12 Total Reps)',
      defaultHoldSeconds: 10,
      defaultRestSeconds: 10,
      prepCountdownSeconds: 0,
      description:
        'Dr. McGill Russian Descending Pyramid (6 reps, 4 reps, 2 reps = 12 total 10-second isometric holds) with 10s micro-rest and a 3s countdown before each rep.',
      formCues: [
        'Hands palms-down under lumbar spine to ensure spine does NOT flatten',
        'One knee bent at 90°, other leg extended flat on floor (switch bent knee halfway at rep 6)',
        'Lift only head and upper shoulders 1 inch as a solid block; hold 10s',
        'Relax back down for 10s micro-rest; listen for the 3-2-1 countdown into the next rep',
        'No chin poking; maintain tongue on roof of mouth',
      ],
      targetedMuscles: ['Rectus Abdominis', 'External Obliques', 'Deep Cervical Flexors'],
      videoReference: {
        youtubeId: 'C89EKtI8a3o',
        title: 'The McGill Big 3: How to Do the McGill Curl-Up Correctly (Spoken Breakdown)',
        channelName: 'Squat University (Dr. Aaron Horschig)',
        durationLabel: '6-4-2 Pyramid • 10s Holds',
        stepByStepBreakdown: [
          'Lie on your back on a firm floor. Bend one knee to 90° with foot flat, and leave the opposite leg completely straight.',
          'Slide both hands palms-down underneath the natural arch of your lower back to support lumbar lordosis.',
          'Brace your abdominal wall 360° and press your tongue to the roof of your mouth behind your front teeth.',
          'Hover your head and upper shoulders just 1–2 inches off the floor as one solid unit. Hold 10 seconds, rest 10 seconds (with a 3s countdown into the next rep) across 6-4-2 reps.',
        ],
        commonMistakes: [
          'Flattening the lower back into your hands (causes lumbar disc flexion)',
          'Crunching high like a traditional sit-up',
          'Jutting the chin forward and straining the neck',
        ],
      },
    },
    {
      id: 'mcgill-side-bridge',
      name: 'McGill Side Plank / Side Bridge (6 Reps Each Side)',
      category: 'mcgill',
      animationType: 'mcgill-sidebridge',
      defaultSets: 12,
      defaultReps: 1,
      repLabel: '6 Reps Left Side + 6 Reps Right Side (10s Hold Each)',
      defaultHoldSeconds: 10,
      defaultRestSeconds: 10,
      prepCountdownSeconds: 0,
      description:
        '6 isometric 10-second holds on your Left Side followed by 6 isometric 10-second holds on your Right Side (12 total reps) with 10s micro-rest & 3s countdown between reps.',
      formCues: [
        'Reps 1–6 on Left Side, then switch to Right Side for Reps 7–12 (6 reps each side)',
        'Prop on elbow directly under shoulder; knees bent at 90° or stacked feet',
        'Bridge hips upward until body forms an unbroken straight diagonal line for 10s',
        'Lower hips for 10s micro-rest; brace on the 3-2-1 countdown before the next rep',
      ],
      targetedMuscles: ['Quadratus Lumborum', 'Internal & External Obliques', 'Gluteus Medius'],
      videoReference: {
        youtubeId: '2_e4I-brfqs',
        title: 'McGill Side Bridge / Side Plank Spoken Coaching Breakdown',
        channelName: 'Squat University (Dr. Aaron Horschig)',
        durationLabel: '6 Reps Each Side • 10s Holds',
        stepByStepBreakdown: [
          'Lie on your side with your supporting elbow placed directly underneath your shoulder and forearm flat.',
          'Place your top hand on your opposite shoulder (or hip) to pack the upper shoulder blade.',
          'Brace your core cylinder and drive your hips forward and upward off the floor in a hinge motion.',
          'Hold a straight line for 10 seconds, then rest 10 seconds. Perform 6 reps on your Left Side and 6 reps on your Right Side.',
        ],
        commonMistakes: [
          'Letting the supporting shoulder shrug up toward the ear',
          'Twisting the pelvis forward or backward during the lift',
          'Letting the bottom hip sag toward the floor',
        ],
      },
    },
    {
      id: 'mcgill-bird-dog',
      name: 'McGill Bird Dog (6 Reps Each Side)',
      category: 'mcgill',
      animationType: 'mcgill-birddog',
      defaultSets: 12,
      defaultReps: 1,
      repLabel: '6 Reps Per Side Alternating (10s Hold Each)',
      defaultHoldSeconds: 10,
      defaultRestSeconds: 10,
      prepCountdownSeconds: 0,
      description:
        '6 isometric 10-second holds per side (12 total reps) strengthening the posterior chain with 10s micro-rest and a 3s countdown before each rep.',
      formCues: [
        'Start in quadruped: hands under shoulders, knees under hips with neutral spine',
        'Clench opposite fist and push opposite heel straight back parallel to floor for 10s',
        'Sweep hand to knee between reps during the 10s micro-rest; 6 reps on each side',
        'Brace on the 3-2-1 countdown at the end of the cooldown before extending',
      ],
      targetedMuscles: [
        'Erector Spinae',
        'Gluteus Maximus',
        'Latissimus Dorsi',
        'Posterior Deltoid',
      ],
      videoReference: {
        youtubeId: 'pS-SfFoc8uk',
        title: 'How to Master the McGill Bird Dog',
        channelName: 'Squat University / Posterior Chain',
        durationLabel: '6 Reps Each Side • 10s Holds',
        stepByStepBreakdown: [
          'Start on all fours with hands directly under shoulders and knees directly under hips.',
          'Find neutral spine and brace your abs before moving any limbs.',
          'Simultaneously reach one arm straight forward (making a tight fist) and push the opposite heel straight back.',
          'Hold parallel to the floor for 10 seconds, then rest 10 seconds with a 3-second countdown into the next rep (6 reps per side).',
        ],
        commonMistakes: [
          'Lifting the back leg above hip level and overarching the lower back',
          'Rotating the pelvis open as the leg extends',
          'Looking up instead of keeping the neck packed and gaze down',
        ],
      },
    },
  ],
};

// 2. STRENGTH (Exact user training plan exercises)
export const STRENGTH_ROUTINE: WorkoutRoutine = {
  id: 'strength',
  title: 'Strength',
  subtitle: 'Pull-Ups, Push-Ups, Diamond Push-Ups, Squats & Farmer\'s Carries',
  tag: 'Strength',
  category: 'strength',
  durationMinutes: 30,
  estimatedCalories: 315,
  accentColor: 'emerald',
  image: '/src/assets/images/workout_hero_banner_1791025439820.jpg',
  exercises: [
    {
      id: 'pull-ups-15-in-5',
      name: 'Pull-Ups (15 Total in 5 Sets)',
      category: 'strength',
      animationType: 'pullup',
      defaultSets: 5,
      defaultReps: 3,
      repLabel: '3 reps (15 total across 5 sets)',
      defaultHoldSeconds: 25,
      defaultRestSeconds: 60,
      prepCountdownSeconds: 10,
      description: '15 total pull-ups broken into 5 crisp sets of 3 repetitions with full scapular depression and neutral lumbar bracing.',
      formCues: [
        'Start from a dead hang with active shoulders (depress scapulae before bending elbows)',
        'Drive elbows down toward ribs until chin clears the bar cleanly',
        'Keep core and glutes braced to prevent swinging or lower-back arching',
        'Lower under full control for 2 seconds back to dead hang (3 reps × 5 sets = 15 total)'
      ],
      targetedMuscles: ['Latissimus Dorsi', 'Biceps Brachii', 'Lower Trapezius', 'Core Stabilizers'],
      videoReference: {
        youtubeId: 'eGo4IYlbE5g',
        title: 'The Perfect Pull-Up — Do It Right! (Full Spoken Breakdown)',
        channelName: 'Calisthenicmovement (Spoken Coaching)',
        durationLabel: '5 Sets × 3 Reps',
        stepByStepBreakdown: [
          'Grip the bar slightly wider than shoulder-width with an overhand (pronated) grip and hang with arms fully straight.',
          'Initiate the pull by pulling your shoulder blades down and back (scapular depression) before bending your elbows.',
          'Brace your abs and squeeze your glutes in a slight hollow-body position as you drive your elbows down to your hips until your chin clears the bar.',
          'Control the descent for 2 full seconds back to a dead hang. Perform 3 crisp reps per set for 5 sets.'
        ],
        commonMistakes: [
          'Kipping or swinging the knees to generate momentum',
          'Not lowering all the way down to a full dead hang between reps',
          'Rounding the shoulders forward at the top of the bar'
        ]
      }
    },
    {
      id: 'pushups-4x12',
      name: 'Push-Ups',
      category: 'strength',
      animationType: 'pushup',
      defaultSets: 4,
      defaultReps: 12,
      repLabel: '12 reps',
      defaultHoldSeconds: 35,
      defaultRestSeconds: 45,
      prepCountdownSeconds: 10,
      description: '4 sets of 12 strict push-ups maintaining a rigid plank torso and 45° elbow track.',
      formCues: [
        'Place hands slightly wider than shoulder-width and screw palms into floor',
        'Brace abs and glutes so head, torso, and legs move as one solid unit',
        'Lower until chest hovers 1 inch above the floor with elbows at 45°',
        'Press forcefully through palms to full lockout for 12 clean repetitions'
      ],
      targetedMuscles: ['Pectoralis Major', 'Anterior Deltoid', 'Triceps Brachii', 'Anterior Core'],
      videoReference: {
        youtubeId: 'IODxDxX7oi4',
        title: 'The Perfect Push-Up — Do It Right! (Spoken Form & Elbow Guide)',
        channelName: 'Calisthenicmovement (Spoken Coaching)',
        durationLabel: '4 Sets × 12 Reps',
        stepByStepBreakdown: [
          'Set your hands slightly wider than shoulder-width at chest level and spread your fingers for a stable base.',
          'Create external rotation torque ("screw your hands into the floor") so your elbows track at a 45° arrow angle rather than flaring out to 90°.',
          'Lock your quads, glutes, and abs into a rigid plank line and lower your entire body together until your chest is 1 inch off the floor.',
          'Exhale and press back up to full elbow lockout while protracting the shoulder blades slightly at the top.'
        ],
        commonMistakes: [
          'Flaring elbows out to a 90° T-shape (stresses shoulder joints)',
          'Letting the lower back sag or hips pike up',
          'Cutting range of motion short with half-reps'
        ]
      }
    },
    {
      id: 'diamond-pushups-3x8',
      name: 'Diamond Push-Ups',
      category: 'strength',
      animationType: 'diamond-pushup',
      defaultSets: 3,
      defaultReps: 8,
      repLabel: '8 reps',
      defaultHoldSeconds: 30,
      defaultRestSeconds: 60,
      prepCountdownSeconds: 10,
      description: '3 sets of 8 close-grip diamond push-ups for high triceps and inner-pectoral recruitment.',
      formCues: [
        'Form a diamond shape beneath your sternum with index fingers and thumbs',
        'Keep elbows tucked close to your ribcage as you descend',
        'Maintain rigid spinal alignment without hip sag',
        'Drive straight up to full elbow extension for 8 controlled reps'
      ],
      targetedMuscles: ['Triceps Brachii', 'Sternal Pectoralis', 'Anterior Deltoid', 'Core Bracing'],
      videoReference: {
        youtubeId: 'J0DnG1_S92I',
        title: 'How To: Diamond Push-Up (Spoken Technique & Elbow Alignment)',
        channelName: 'ScottHermanFitness (Spoken Coaching)',
        durationLabel: '3 Sets × 8 Reps',
        stepByStepBreakdown: [
          'Assume a high plank and bring your hands close together directly underneath your lower chest (sternum), forming a diamond or triangle with thumbs and index fingers.',
          'Set your feet hip-width apart and brace your core and glutes tightly.',
          'Lower your chest directly toward the back of your hands while keeping your elbows gliding close along your ribs.',
          'Press smoothly through your palms to full triceps lockout for 8 controlled reps.'
        ],
        commonMistakes: [
          'Placing hands too high under the neck/face instead of under the sternum',
          'Allowing elbows to splay wide sideways',
          'Losing core tension and sagging at the waist'
        ]
      }
    },
    {
      id: 'squats-4x15',
      name: 'Squats',
      category: 'strength',
      animationType: 'squat',
      defaultSets: 4,
      defaultReps: 15,
      repLabel: '15 reps',
      defaultHoldSeconds: 45,
      defaultRestSeconds: 60,
      prepCountdownSeconds: 10,
      description: '4 sets of 15 full-range squats reinforcing hip & knee drive with an upright, neutral spine.',
      formCues: [
        'Stand with feet shoulder-width apart and toes turned out 15°',
        'Brace core 360° and sit hips back and down while tracking knees over toes',
        'Descend to parallel or below without lumbar rounding (butt wink)',
        'Drive through midfoot and heels to stand tall and squeeze glutes for 15 reps'
      ],
      targetedMuscles: ['Quadriceps', 'Gluteus Maximus', 'Adductors', 'Hamstrings'],
      videoReference: {
        youtubeId: 'P-yaD24bUE8',
        title: 'Bodyweight Squat Tutorial — Spoken Form & Technique Breakdown',
        channelName: 'Runna Coaching (Spoken Guide)',
        durationLabel: '4 Sets × 15 Reps',
        stepByStepBreakdown: [
          'Stand with feet shoulder-width apart and toes pointed slightly outward (15°–20°). Grip the floor with your tripod foot (heel, base of big toe, base of pinky toe).',
          'Take a diaphragmatic breath and brace your core 360° to lock your ribcage over your pelvis.',
          'Break at the hips and knees simultaneously, sitting down between your heels while actively pushing knees out in line with your toes.',
          'Once thighs reach parallel (or slightly below with a flat spine), drive straight up through midfoot and finish tall.'
        ],
        commonMistakes: [
          'Knees caving inward (valgus collapse) on the way up',
          'Heels lifting off the floor',
          'Rounding the lower back at the bottom of the squat'
        ]
      }
    },
    {
      id: 'farmers-carries-3x10m',
      name: 'Farmer\'s Carries (10m)',
      category: 'strength',
      animationType: 'farmers-carry',
      defaultSets: 3,
      defaultReps: 10,
      repLabel: '10m walk',
      defaultHoldSeconds: 30,
      defaultRestSeconds: 60,
      prepCountdownSeconds: 10,
      description: '3 sets of 10-meter bilateral loaded carries building grip strength, trapezius stability, and axial core stiffness.',
      formCues: [
        'Deadlift the weights up with a flat back; stand tall with proud chest',
        'Pack shoulders down and back (avoid shrugging into ears)',
        'Brace abdominal wall firmly and take short, controlled heel-to-toe steps for 10 meters',
        'Keep gaze forward and prevent any lateral swaying'
      ],
      targetedMuscles: ['Forearm Flexors (Grip)', 'Upper Trapezius', 'Quadratus Lumborum', 'Core Cylinder'],
      videoReference: {
        youtubeId: '1uOs1hP3u4A',
        title: 'How to Do the Farmer\'s Carry for Core & Grip Strength',
        channelName: 'Strength & Conditioning Guide',
        durationLabel: '3 Sets × 10m Walk',
        stepByStepBreakdown: [
          'Stand between two equal dumbbells or kettlebells. Hinge at the hips, brace your core, and deadlift them up to standing.',
          'Crush the handles tightly, pull your shoulder blades slightly back and down, and keep the weights 1 inch away from your thighs.',
          'Brace your abdominal wall as if preparing for a punch and take short, deliberate heel-to-toe steps for 10 meters.',
          'Come to a complete stop before hinging down with a flat spine to set the weights on the floor.'
        ],
        commonMistakes: [
          'Taking overly long strides that cause the torso to wobble side-to-side',
          'Letting the shoulders slump forward or shrug up into the ears',
          'Rounding the lower back when picking up or setting down the weights'
        ]
      }
    }
  ]
};

// 3. ALTERNATIVE ROUTINE: CORE STABILITY & STRENGTH
export const CORE_STABILITY_STRENGTH_ROUTINE: WorkoutRoutine = {
  id: 'core-stability-strength',
  title: 'Core Stability Strength (Alt)',
  subtitle: '360° Core Bracing, Posterior Chain & Anti-Rotation Strength',
  tag: 'Core & Stability',
  category: 'strength',
  durationMinutes: 28,
  estimatedCalories: 285,
  accentColor: 'orange',
  image: '/src/assets/images/workout_hero_banner_1791025439820.jpg',
  exercises: [
    {
      id: 'alt-scap-pullups',
      name: 'Supinated Chin-Ups / Scapular Pulls',
      category: 'strength',
      animationType: 'pullup',
      defaultSets: 5,
      defaultReps: 3,
      repLabel: '3 reps (15 total across 5 sets)',
      defaultHoldSeconds: 25,
      defaultRestSeconds: 60,
      prepCountdownSeconds: 10,
      description: '5 sets of 3 strict supinated chin-ups with hollow-body core bracing, training lat-thoracolumbar fascia tension and anti-extension.',
      formCues: [
        'Grip bar palms facing you shoulder-width apart; lock ribs down with hollow-body core brace',
        'Depress shoulder blades first, then pull chest to bar without arching lower back',
        'Keep legs together and glutes squeezed to eliminate torso swing',
        'Lower with a 3-second eccentric back to dead hang (15 reps total across 5 sets)'
      ],
      targetedMuscles: ['Latissimus Dorsi', 'Thoracolumbar Fascia', 'Anterior Core', 'Lower Trapezius'],
      videoReference: {
        youtubeId: '9M8ylnbriB0',
        title: 'Hollow-Body Chin-Ups & Scapular Pull-Up Mechanics',
        channelName: 'Calisthenics Core',
        durationLabel: '5 Sets × 3 Reps',
        stepByStepBreakdown: [
          'Grip the bar underhand (palms facing you) at shoulder width.',
          'Before bending your arms, pull your ribs down toward your pelvis and point your toes slightly in front of you (hollow body).',
          'Pull smoothly until your chin clears the bar while maintaining zero lower-back arch.',
          'Lower slowly over 3 seconds to full hang.'
        ],
        commonMistakes: [
          'Flaring the ribcage and hyperextending the lumbar spine to reach the bar',
          'Crossing the ankles behind you and relaxing the core'
        ]
      }
    },
    {
      id: 'alt-dead-bugs',
      name: 'Contralateral Dead Bugs',
      category: 'strength',
      animationType: 'deadbug',
      defaultSets: 4,
      defaultReps: 12,
      repLabel: '12 reps (6 per side)',
      defaultHoldSeconds: 40,
      defaultRestSeconds: 45,
      prepCountdownSeconds: 10,
      description: '4 sets of 12 slow-tempo contralateral extensions training deep transverse abdominis and anterior pelvic control while protecting the spine.',
      formCues: [
        'Lie on back with arms vertical and knees bent at 90° directly over hips',
        'Press lower ribs down and brace abdominal cylinder so lumbar spine never arches',
        'Slowly extend opposite arm and leg until hovering 2 inches above floor',
        'Exhale forcefully at full extension, pause 2 seconds, and return smoothly'
      ],
      targetedMuscles: ['Transverse Abdominis', 'Rectus Abdominis', 'Hip Flexors', 'Deep Core Stabilizers'],
      videoReference: {
        youtubeId: 'vgufDyLHcIE',
        title: 'How to Do the Dead Bug Exercise for Deep Core Stability',
        channelName: 'Squat University / Core Rehab',
        durationLabel: '4 Sets × 12 Reps',
        stepByStepBreakdown: [
          'Lie flat on your back with arms extended straight up toward the ceiling and knees bent at 90° directly above your hips.',
          'Draw your lower ribs down and brace your abdominal wall so there is no gap expanding under your lower back.',
          'Slowly reach your right arm overhead while extending your left leg straight out until both hover 2 inches off the floor.',
          'Exhale fully at the bottom for 2 seconds, return to center, and repeat on the opposite side.'
        ],
        commonMistakes: [
          'Letting the lower back arch off the floor as the leg extends',
          'Moving too fast instead of controlling the 2-second bottom hold',
          'Bringing the knees past the hips toward the chest (loses core tension)'
        ]
      }
    },
    {
      id: 'alt-shoulder-tap-pushups',
      name: 'Plank Shoulder-Tap Push-Ups',
      category: 'strength',
      animationType: 'shoulder-tap',
      defaultSets: 3,
      defaultReps: 8,
      repLabel: '8 reps + anti-rotation taps',
      defaultHoldSeconds: 35,
      defaultRestSeconds: 60,
      prepCountdownSeconds: 10,
      description: '3 sets of 8 push-ups paired with pause shoulder taps at the top to build rotary core stability, obliques, and serratus strength.',
      formCues: [
        'Set feet slightly wider than hip-width for a solid anti-rotational base',
        'Perform a strict push-up, then at top lockout tap left hand to right shoulder and right hand to left shoulder',
        'Resist any hip sway or pelvic rotation while supported on one arm',
        'Keep glutes and quads locked tight throughout all 8 reps'
      ],
      targetedMuscles: ['Internal & External Obliques', 'Serratus Anterior', 'Pectoralis Major', 'Triceps Brachii'],
      videoReference: {
        youtubeId: 'VfwCQ14soUo',
        title: 'Push-Up to Anti-Rotation Plank Shoulder Tap',
        channelName: 'Core & Athletic Performance',
        durationLabel: '3 Sets × 8 Reps',
        stepByStepBreakdown: [
          'Start in a strong push-up plank with your feet slightly wider than shoulder-width for rotational leverage.',
          'Perform one full-range strict push-up and press back to the top plank.',
          'Without letting your hips shift or twist, lift your left hand to tap your right shoulder and hold for 1 second, then switch.',
          'Complete 8 full push-up + bilateral tap cycles per set.'
        ],
        commonMistakes: [
          'Rocking the hips wildly side-to-side during the shoulder taps',
          'Rushing the tap instead of pausing briefly on three points of contact'
        ]
      }
    },
    {
      id: 'alt-glute-bridge-march',
      name: 'Glute Bridges with Isometric Hold',
      category: 'strength',
      animationType: 'glute-bridge',
      defaultSets: 4,
      defaultReps: 15,
      repLabel: '15 reps (2s top squeeze)',
      defaultHoldSeconds: 45,
      defaultRestSeconds: 45,
      prepCountdownSeconds: 10,
      description: '4 sets of 15 posterior-chain glute bridges reinforcing hip extension power, pelvic stability, and hamstring co-contraction.',
      formCues: [
        'Lie supine with knees bent and heels planted hip-width apart',
        'Brace abs first so you lift with glutes rather than arching the lower back',
        'Drive through heels until knees, hips, and shoulders form a straight line',
        'Hold and squeeze glutes hard for 2 seconds at the top of each rep'
      ],
      targetedMuscles: ['Gluteus Maximus', 'Gluteus Medius', 'Hamstrings', 'Pelvic Floor & Core'],
      videoReference: {
        youtubeId: 'XLXGydU5DdU',
        title: 'How to Do Glute Bridges Without Lower Back Arching',
        channelName: 'Posterior Chain Mechanics',
        durationLabel: '4 Sets × 15 Reps',
        stepByStepBreakdown: [
          'Lie on your back with knees bent and heels positioned about 6–8 inches from your glutes, feet hip-width apart.',
          'Brace your abs and slightly tuck your pelvis (posterior pelvic tilt) before lifting.',
          'Drive straight down through your heels to lift your hips until your knees, hips, and shoulders form a straight diagonal line.',
          'Squeeze your glutes hard for a 2-second count at the top, then lower under control.'
        ],
        commonMistakes: [
          'Hyperextending the lower back at the top instead of extending through the hips',
          'Pushing through the toes instead of the heels'
        ]
      }
    },
    {
      id: 'alt-rkc-pillar-plank',
      name: 'RKC High-Tension Pillar Plank',
      category: 'strength',
      animationType: 'plank',
      defaultSets: 3,
      defaultReps: 1,
      repLabel: '30s max-tension hold',
      defaultHoldSeconds: 30,
      defaultRestSeconds: 45,
      prepCountdownSeconds: 10,
      description: '3 sets of 30-second high-tension RKC planks generating full-body isometric core stiffness without axial spinal loading.',
      formCues: [
        'Plant elbows beneath shoulders and clench fists tightly',
        'Isometrically pull elbows toward toes while driving toes into floor',
        'Contract quads, glutes, lats, and abs simultaneously at 90% effort',
        'Maintain shallow, controlled diaphragmatic breathing for 30 seconds'
      ],
      targetedMuscles: ['Rectus Abdominis', 'Quadratus Lumborum', 'Latissimus Dorsi', 'Gluteals'],
      videoReference: {
        youtubeId: '9uX34tkHUto',
        title: 'The RKC Plank: Maximum Core Activation in 30 Seconds',
        channelName: 'Strength & Spine Lab',
        durationLabel: '3 Sets × 30s Hold',
        stepByStepBreakdown: [
          'Set up on your forearms with elbows directly beneath your shoulders and clench both fists hard.',
          'Lock your kneecaps by flexing your quads and squeeze your glutes as tightly as possible.',
          'Isometrically pull your elbows backward toward your toes while pulling your toes forward toward your elbows (nothing actually moves, creating massive core tension).',
          'Breathe shallowly behind your abdominal shield for 30 seconds.'
        ],
        commonMistakes: [
          'Passively hanging on ligaments with relaxed glutes and saggy hips',
          'Holding your breath completely instead of taking crisp shallow breaths'
        ]
      }
    }
  ]
};

// 4. CARDIO SESSION (E-Bike vs. Spinning Indoors)
export const CARDIO_ROUTINE: WorkoutRoutine = {
  id: 'cardio-session',
  title: 'Cardio',
  subtitle: 'E-Bike Outdoor or Spinning Indoors',
  tag: 'Cardio & Stamina',
  category: 'cardio',
  durationMinutes: 35,
  estimatedCalories: 340,
  accentColor: 'blue',
  isCardioSpecial: true,
  image: '/src/assets/images/ebike_outdoor_trail_1791025466648.jpg',
  exercises: [
    {
      id: 'cardio-ride',
      name: 'E-Bike / Spinning Workout',
      category: 'cardio',
      animationType: 'ebike',
      cardioChoiceRequired: true,
      defaultSets: 3,
      defaultHoldSeconds: 600, // 10 min intervals
      defaultRestSeconds: 90,
      prepCountdownSeconds: 10,
      description: 'Low-impact cardiovascular conditioning with selectable outdoor E-Bike or indoor Spinning setup.',
      formCues: [
        'Maintain relaxed shoulders and light grip on handlebars',
        'Pedal in smooth 360-degree circles; engage hamstrings on upstroke',
        'Maintain abdominal brace to prevent lower back sway',
        'Target cadence 80 - 100 RPM for optimal efficiency'
      ],
      targetedMuscles: ['Quadriceps', 'Hamstrings', 'Glutes', 'Calves', 'Cardiovascular System'],
      videoReference: {
        youtubeId: 'csNeUKYBW0E',
        title: 'Indoor Cycling & E-Bike Posture, Setup & Cadence Guide',
        channelName: 'Cycling & Spine Ergonomics',
        durationLabel: '3 × 10m Intervals',
        stepByStepBreakdown: [
          'Adjust saddle height so your knee maintains a slight 25°–30° bend at the bottom of the pedal stroke (6 o\'clock position).',
          'Hinge forward from the hips with a neutral spine rather than rounding your upper and lower back.',
          'Keep elbows slightly bent and shoulders relaxed away from your ears to absorb road or bike vibration.',
          'Maintain a smooth 80–95 RPM cadence across 3 intervals of 10 minutes with 90 seconds of easy spinning recovery between intervals.'
        ],
        commonMistakes: [
          'Saddle set too high causing the hips to rock side-to-side on every pedal stroke (irritates the lumbar spine)',
          'Death-gripping the handlebars with locked elbows'
        ]
      }
    }
  ]
};

export const WORKOUT_ROUTINES: WorkoutRoutine[] = [
  MCGILL_BIG_3_ROUTINE,
  STRENGTH_ROUTINE,
  CORE_STABILITY_STRENGTH_ROUTINE,
  CARDIO_ROUTINE
];

// Weekly Schedule configuration mapping 0 (Sunday) to 6 (Saturday)
export interface DaySchedule {
  dayName: string;
  dayShort: string;
  plannedRoutines: {
    routineId: string;
    routineTitle: string;
    tag: string;
    category: 'mcgill' | 'strength' | 'cardio';
    durationMinutes: number;
    color: string;
  }[];
  isRestDay?: boolean;
}

export const WEEKLY_SCHEDULE: Record<number, DaySchedule> = {
  0: { // Sunday
    dayName: 'Sunday',
    dayShort: 'Sun',
    plannedRoutines: [],
    isRestDay: true
  },
  1: { // Monday
    dayName: 'Monday',
    dayShort: 'Mon',
    plannedRoutines: [
      {
        routineId: 'strength',
        routineTitle: 'Strength',
        tag: 'Resistance',
        category: 'strength',
        durationMinutes: 30,
        color: 'emerald'
      }
    ],
    isRestDay: false
  },
  2: { // Tuesday
    dayName: 'Tuesday',
    dayShort: 'Tue',
    plannedRoutines: [
      {
        routineId: 'cardio-session',
        routineTitle: 'Cardio (E-Bike / Spinning)',
        tag: 'Cardio',
        category: 'cardio',
        durationMinutes: 35,
        color: 'blue'
      }
    ],
    isRestDay: false
  },
  3: { // Wednesday
    dayName: 'Wednesday',
    dayShort: 'Wed',
    plannedRoutines: [
      {
        routineId: 'strength',
        routineTitle: 'Strength',
        tag: 'Resistance',
        category: 'strength',
        durationMinutes: 30,
        color: 'emerald'
      }
    ],
    isRestDay: false
  },
  4: { // Thursday
    dayName: 'Thursday',
    dayShort: 'Thu',
    plannedRoutines: [
      {
        routineId: 'cardio-session',
        routineTitle: 'Cardio (E-Bike / Spinning)',
        tag: 'Cardio',
        category: 'cardio',
        durationMinutes: 35,
        color: 'blue'
      }
    ],
    isRestDay: false
  },
  5: { // Friday
    dayName: 'Friday',
    dayShort: 'Fri',
    plannedRoutines: [
      {
        routineId: 'strength',
        routineTitle: 'Strength',
        tag: 'Resistance',
        category: 'strength',
        durationMinutes: 30,
        color: 'emerald'
      }
    ],
    isRestDay: false
  },
  6: { // Saturday
    dayName: 'Saturday',
    dayShort: 'Sat',
    plannedRoutines: [
      {
        routineId: 'cardio-session',
        routineTitle: 'Cardio (E-Bike / Spinning)',
        tag: 'Cardio',
        category: 'cardio',
        durationMinutes: 35,
        color: 'blue'
      }
    ],
    isRestDay: false
  }
};
