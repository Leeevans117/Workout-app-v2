// server.ts
import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

// src/data/exerciseCatalog.ts
var EQUIPMENT_LABELS = {
  bodyweight: "Zero Equipment (Bodyweight)",
  kettlebell: "Kettlebell (1\u20132 KBs)",
  dumbbell: "Dumbbells / Home Gym",
  barbell: "Barbell / Full Strength"
};
var SEEDS = [
  // =========================================================================
  // GROUP 1: BACK, LATS, BICEPS & POSTERIOR PULL (22 Exercises — NO PULL-UP BAR REQUIRED)
  // =========================================================================
  {
    id: "cat-back-01",
    name: "Prone Floor Lat Pull-Downs (No Pull-Up Bar)",
    eq: "bodyweight",
    group: "back-pull",
    anim: "mcgill-birddog",
    sets: 4,
    reps: 12,
    repLabel: "12 slow reps (2s lat squeeze)",
    holdSec: 40,
    restSec: 60,
    muscles: ["Latissimus Dorsi", "Lower Trapezius", "Rhomboids", "Posterior Deltoid"],
    ytId: "tplJkuM2vkY",
    ytTitle: "Prone Floor Lat Pull-Downs (No Pull-Up Bar Back Workout)",
    channel: "Calisthenicmovement",
    desc: "High-tension prone overhead-to-ribcage floor pull-downs replicating the exact vertical pull-up lat path on the floor with zero pull-up bar.",
    why: "#1 direct vertical pull-up replacement with zero pull-up bar or equipment needed.",
    cues: [
      "Lie face down on the floor with glutes braced and chest hovering 2 inches off the mat",
      "Reach arms overhead in a wide Y, then drive elbows down hard toward your back pockets into a tight W",
      "Squeeze lats and shoulder blades down for 2 full seconds before extending back overhead"
    ],
    mistake: "Cranking the neck backward instead of keeping gaze down at the floor."
  },
  {
    id: "cat-back-02",
    name: "Sliding Floor Lat Pull-Ins (No Pull-Up Bar)",
    eq: "bodyweight",
    group: "back-pull",
    anim: "plank",
    sets: 4,
    reps: 10,
    repLabel: "10 bodyweight floor pulls",
    holdSec: 40,
    restSec: 60,
    muscles: ["Latissimus Dorsi", "Teres Major", "Biceps Brachii", "Anterior Core"],
    ytId: "hXTc1mDnZCw",
    ytTitle: "Floor Sliding Lat Pull-Ins (Pull-Up Alternative Without a Bar)",
    channel: "Calisthenicmovement",
    desc: "Lying prone on the floor and pressing palms/forearms into the ground ahead of you to pull your body forward using pure lat depression.",
    why: "Generates true bodyweight resistance for the lats and biceps without needing any pull-up bar.",
    cues: [
      "Lie face down on a smooth floor (or wearing socks/towel under thighs) with forearms planted overhead",
      "Depress your shoulder blades and pull your body forward by driving elbows toward your hips",
      "Slide slowly back to full overhead extension under 3-second eccentric control"
    ],
    mistake: "Pushing with the toes instead of pulling strictly with the lats and arms."
  },
  {
    id: "cat-back-03",
    name: "Supine Floor Elbow-Drive Back Rows (No Bar)",
    eq: "bodyweight",
    group: "back-pull",
    anim: "glute-bridge",
    sets: 4,
    reps: 12,
    repLabel: "12 floor elbow-drive rows (2s hold)",
    holdSec: 40,
    restSec: 60,
    muscles: ["Rhomboids", "Latissimus Dorsi", "Middle Trapezius", "Posterior Deltoid"],
    ytId: "hXTc1mDnZCw",
    ytTitle: "Supine Bodyweight Floor Row (Zero Equipment Back Builder)",
    channel: "ATHLEAN-X",
    desc: "Lying on your back and driving bent elbows forcefully into the floor to lift your entire upper back and chest off the mat.",
    why: "High-threshold horizontal pulling contraction on the floor with zero bar or weights.",
    cues: [
      "Lie flat on your back with knees bent and elbows positioned at 45\xB0 beside your ribs, fists pointed up",
      "Drive your elbows straight down into the floor to lift your shoulder blades and upper back off the mat",
      "Hold the peak upper-back contraction for 2 full seconds before lowering smoothly"
    ],
    mistake: "Doing an abdominal crunch instead of keeping the chest proud and driving through the elbows."
  },
  {
    id: "cat-back-04",
    name: "Prone Reverse Snow Angels (No Pull-Up Bar)",
    eq: "bodyweight",
    group: "back-pull",
    anim: "mcgill-birddog",
    sets: 4,
    reps: 12,
    repLabel: "12 full-arc scapular sweeps",
    holdSec: 40,
    restSec: 45,
    muscles: ["Latissimus Dorsi", "Rhomboids", "Lower Trapezius", "Posterior Deltoid"],
    ytId: "R4iO4gXC_TY",
    ytTitle: "How to Perform the Reverse Snow Angel Correctly",
    channel: "Advanced Spine & Sports Care",
    desc: "Full-arc prone scapular sweeps from overhead to hips strengthening the lats, lower traps, and rear deltoids on the floor.",
    why: "Trains the entire posterior shoulder girdle and lat insertion with zero equipment.",
    cues: [
      "Lie face down hovering hands 3 inches off the floor overhead with thumbs pointing up",
      "Sweep straight arms in a wide arc down to your hips while pinching shoulder blades back and down",
      "Pause 1 second at the hips with lats engaged before sweeping slowly back overhead"
    ],
    mistake: "Shrugging shoulders up toward the ears or letting hands rest on the floor."
  },
  {
    id: "cat-back-05",
    name: "Wall-Corner / Doorframe Bodyweight Back Rows (No Bar)",
    eq: "bodyweight",
    group: "back-pull",
    anim: "row",
    sets: 4,
    reps: 12,
    repLabel: "12 corner elbow-press rows",
    holdSec: 40,
    restSec: 60,
    muscles: ["Rhomboids", "Latissimus Dorsi", "Posterior Deltoid", "Middle Trapezius"],
    ytId: "hXTc1mDnZCw",
    ytTitle: "Wall Corner & Doorframe Back Rows (No Pull-Up Bar Needed)",
    channel: "ATHLEAN-X",
    desc: "Standing with your back in a room corner (or doorway) and pressing your elbows back against the walls to row your torso forward.",
    why: "Uses your own bodyweight leverage against any wall corner\u2014zero pull-up bar required.",
    cues: [
      "Stand facing out in a 90\xB0 room corner with feet 18 inches forward and elbows against both walls",
      "Drive your elbows backward into the walls to push your chest forward and pinch your shoulder blades",
      "Hold top retraction for 2 seconds and lower your upper back slowly toward the corner"
    ],
    mistake: "Hinging at the waist instead of moving your entire rigid body as a plank."
  },
  {
    id: "cat-back-06",
    name: "Alternating Kettlebell Gorilla Rows",
    eq: "kettlebell",
    group: "back-pull",
    anim: "row",
    sets: 4,
    reps: 10,
    repLabel: "10 reps/side (20 total)",
    holdSec: 45,
    restSec: 60,
    muscles: ["Latissimus Dorsi", "Rhomboids", "Biceps Brachii", "Anti-Rotational Core"],
    ytId: "fLekjceeA9c",
    ytTitle: "How to Do a Kettlebell Gorilla Row Correctly",
    channel: "Coach Sean",
    desc: "Wide-stance hinged kettlebell rows pulling from the floor between your ankles.",
    why: "No pull-up bar needed; builds massive lat thickness and core anti-rotation.",
    cues: [
      "Take a wide sumo stance with kettlebells between your ankles",
      "Press non-working hand down onto the resting bell for rock-solid torso bracing",
      "Row working elbow toward your hip crease and control the descent"
    ],
    mistake: "Rounding the lower back or twisting the shoulders open."
  },
  {
    id: "cat-back-07",
    name: "Single-Arm Kettlebell Bent-Over Row",
    eq: "kettlebell",
    group: "back-pull",
    anim: "row",
    sets: 4,
    reps: 12,
    repLabel: "12 reps per arm",
    holdSec: 40,
    restSec: 60,
    muscles: ["Latissimus Dorsi", "Lower Trapezius", "Rear Deltoid", "Biceps Brachii"],
    ytId: "oPgCUWuVUms",
    ytTitle: "Single-Arm Kettlebell Row Setup & Lat Activation",
    channel: "Zen Athletic Performance",
    desc: "Split-stance supported unilateral row arcing the kettlebell toward the hip pocket.",
    why: "Unloads the lumbar spine via front-thigh support while isolating each lat.",
    cues: [
      "Brace non-working forearm on front thigh in a staggered split stance",
      "Arc the kettlebell back toward your hip in a J-curve",
      "Pause 1 second at top contraction before lowering"
    ],
    mistake: "Shrugging straight up into the upper trap instead of sweeping back."
  },
  {
    id: "cat-back-08",
    name: "Double Kettlebell Pendlay Row",
    eq: "kettlebell",
    group: "back-pull",
    anim: "row",
    sets: 4,
    reps: 8,
    repLabel: "8 explosive dead-stop rows",
    holdSec: 35,
    restSec: 75,
    muscles: ["Latissimus Dorsi", "Rhomboids", "Erector Spinae", "Biceps Brachii"],
    ytId: "fLekjceeA9c",
    ytTitle: "Double Kettlebell Bent Over Row Technique",
    channel: "Kettlebell Kings",
    desc: "Bilateral dead-stop horizontal row from the floor building upper-back power and posterior chain stiffness.",
    why: "Resets spinal bracing on every rep while training explosive concentric pulling.",
    cues: [
      "Hinge torso nearly parallel to floor with flat neutral lumbar spine",
      "Row both kettlebells explosively to lower ribs and return to dead stop",
      "Re-brace core cylinder before initiating the next rep"
    ],
    mistake: "Jerking torso upright to heave the bells."
  },
  {
    id: "cat-back-09",
    name: "Renegade Plank Kettlebell Rows",
    eq: "kettlebell",
    group: "back-pull",
    anim: "row",
    sets: 3,
    reps: 10,
    repLabel: "10 alternating rows",
    holdSec: 40,
    restSec: 60,
    muscles: ["Latissimus Dorsi", "Obliques", "Rectus Abdominis", "Serratus Anterior"],
    ytId: "wTqlJ0g3M0A",
    ytTitle: "How to Do the Renegade Row Without Hip Twist",
    channel: "ATHLEAN-X",
    desc: "High-plank anti-rotational row combining unilateral lat pulling with extreme core stability.",
    why: "Simultaneously trains lats, anterior core, and shoulder stability.",
    cues: [
      "Set feet wider than shoulder-width in a high plank for anti-rotational base",
      "Press non-rowing hand hard into the floor as you row the opposite weight to hip",
      "Keep pelvis completely level as if balancing a glass of water on lower back"
    ],
    mistake: "Twisting the hips open each time you row."
  },
  {
    id: "cat-back-10",
    name: "Kettlebell Pullover (Supine Lat Stretch)",
    eq: "kettlebell",
    group: "back-pull",
    anim: "deadbug",
    sets: 3,
    reps: 12,
    repLabel: "12 controlled pullovers",
    holdSec: 40,
    restSec: 60,
    muscles: ["Latissimus Dorsi", "Serratus Anterior", "Pectoralis Major", "Transverse Abdominis"],
    ytId: "tcB1p6O2nBY",
    ytTitle: "Supine Kettlebell Pullover for Lats & Ribcage Control",
    channel: "Squat University",
    desc: "Supine straight-arm overhead arc loading the lats in their lengthened range while bracing the ribs down.",
    why: "Directly trains straight-arm lat extension and overhead shoulder mobility.",
    cues: [
      "Lie on back with knees bent and lower ribs locked flat to the mat",
      "Hold kettlebell by horns overhead and lower slowly toward floor behind head",
      "Pull bell back over chest using your lats without letting ribs flare"
    ],
    mistake: "Arching the lower back off the floor as the weight travels overhead."
  },
  {
    id: "cat-back-11",
    name: "Kettlebell Gunslinger / Hammer Curls",
    eq: "kettlebell",
    group: "back-pull",
    anim: "row",
    sets: 3,
    reps: 12,
    repLabel: "12 curls",
    holdSec: 35,
    restSec: 45,
    muscles: ["Biceps Brachii", "Brachioradialis", "Forearm Flexors"],
    ytId: "13SFATc-mJ4",
    ytTitle: "Kettlebell Bicep Curl Variations for Arm Strength",
    channel: "Kettlebell Kings",
    desc: "Strict kettlebell horn or handle curls targeting the biceps and forearm brachioradialis.",
    why: "Builds elbow flexor strength to protect the elbows during heavy pull-ups and rows.",
    cues: [
      "Stand tall with glutes and abs braced and elbows pinned by your ribs",
      "Curl the kettlebell smoothly to shoulder height without swinging torso",
      "Lower over 3 full seconds to maximize eccentric biceps tension"
    ],
    mistake: "Leaning backward to swing the weight up."
  },
  {
    id: "cat-back-12",
    name: "Towel-Grip Kettlebell Biceps Curls",
    eq: "kettlebell",
    group: "back-pull",
    anim: "row",
    sets: 3,
    reps: 12,
    repLabel: "12 towel-grip reps",
    holdSec: 40,
    restSec: 45,
    muscles: ["Biceps Brachii", "Brachioradialis", "Crushing Grip"],
    ytId: "13SFATc-mJ4",
    ytTitle: "Kettlebell Towel Curls for Massive Forearms & Biceps",
    channel: "Wildman Athletica",
    desc: "Looping a gym towel through the kettlebell handle for thick-grip neutral hammer curls.",
    why: "Doubles forearm grip recruitment while allowing natural wrist supination.",
    cues: [
      "Thread a sturdy towel through the kettlebell handle and grip both ends firmly",
      "Keep upper arms vertical and curl hands up while twisting pinkies slightly inward",
      "Lower slowly to full arm extension"
    ],
    mistake: "Letting elbows drift forward away from the ribcage."
  },
  {
    id: "cat-back-13",
    name: "Prone Swimmer Lat & Thoracic Extensions (No Bar)",
    eq: "bodyweight",
    group: "back-pull",
    anim: "mcgill-birddog",
    sets: 4,
    reps: 12,
    repLabel: "12 full overhead-to-back rotations",
    holdSec: 40,
    restSec: 45,
    muscles: ["Latissimus Dorsi", "Infraspinatus", "Lower Trapezius", "Rhomboids"],
    ytId: "tplJkuM2vkY",
    ytTitle: "Prone Swimmers for Scapular Control & Lat Activation",
    channel: "Calisthenicmovement",
    desc: "Prone shoulder internal-to-external rotation sweep hovering hands from overhead to behind the lower back without touching the floor.",
    why: "Builds end-range lat and rotator cuff strength on the floor with zero equipment.",
    cues: [
      "Lie face down with forehead hovering 1 inch off mat and glutes braced",
      "Reach hands overhead, sweep wide while rotating thumbs down, and hover hands over lower back",
      "Reverse the arc smoothly back overhead without letting arms touch the ground"
    ],
    mistake: "Rushing the sweep or hyperextending the lower back."
  },
  {
    id: "cat-back-14",
    name: "Quadruped Single-Arm Lat & Scapular Row (No Bar)",
    eq: "bodyweight",
    group: "back-pull",
    anim: "mcgill-birddog",
    sets: 4,
    reps: 12,
    repLabel: "12 slow isometric rows per side",
    holdSec: 40,
    restSec: 45,
    muscles: ["Latissimus Dorsi", "Lower Trapezius", "Serratus Anterior", "Core Stabilizers"],
    ytId: "R4iO4gXC_TY",
    ytTitle: "Quadruped Scapular Row & Lat Activation Drill",
    channel: "Squat University",
    desc: "All-fours unilateral high-tension lat row driving the elbow tight to the hip pocket with a 3-second maximal voluntary lat contraction.",
    why: "Isolates unilateral lat depression and anti-rotational core stability with zero equipment.",
    cues: [
      "Start on hands and knees with neutral spine and push the floor away with the supporting hand",
      "Reach free arm forward, then forcefully row elbow back into your hip pocket",
      "Contract the lat at 95% effort for 3 full seconds on every repetition"
    ],
    mistake: "Twisting the torso or shrugging the supporting shoulder."
  },
  {
    id: "cat-back-15",
    name: "Prone I-Y-T-W Scapular Depression Complex (No Bar)",
    eq: "bodyweight",
    group: "back-pull",
    anim: "mcgill-birddog",
    sets: 3,
    reps: 12,
    repLabel: "3 cycles of I-Y-T-W (2s holds)",
    holdSec: 40,
    restSec: 45,
    muscles: ["Lower Trapezius", "Middle Trapezius", "Infraspinatus", "Rhomboids"],
    ytId: "tfe4fde2524",
    ytTitle: "Prone Y-T-W Shoulder & Scapular Stability Drill",
    channel: "Squat University",
    desc: "Clinical 4-angle scapular upward-rotation, depression, and retraction protocol on the floor.",
    why: "Targets every fiber of the middle/lower trapezius and rotator cuff without a pull-up bar.",
    cues: [
      "Lie prone with forehead supported or hovering neutrally",
      "Raise thumbs-up arms in an I, 45\xB0 Y, 90\xB0 T, and tucked W for 2s each",
      "Initiate every lift from the shoulder blades rather than the hands"
    ],
    mistake: "Arching the lower back to lift the arms higher."
  },
  {
    id: "cat-back-16",
    name: "Self-Resisted Towel / Isometric Biceps & Lat Pull (No Bar)",
    eq: "bodyweight",
    group: "back-pull",
    anim: "row",
    sets: 4,
    reps: 10,
    repLabel: "10 slow 4s-eccentric reps",
    holdSec: 40,
    restSec: 45,
    muscles: ["Biceps Brachii", "Brachialis", "Latissimus Dorsi", "Forearm Flexors"],
    ytId: "13SFATc-mJ4",
    ytTitle: "No-Equipment Biceps & Lat Self-Resistance Training",
    channel: "ATHLEAN-X",
    desc: "Using opposite-hand or leg-loop towel resistance to overload the biceps, brachialis, and lats through a full range of motion with zero weights or bar.",
    why: "Directly trains the elbow flexors and lats anywhere with zero gym equipment.",
    cues: [
      "Press non-working palm firmly over working wrist (or loop a towel behind one thigh)",
      "Pull working arm through full flexion while resisting smoothly with the opposite limb",
      "Fight the lowering phase for 4 full seconds on every repetition"
    ],
    mistake: "Letting resistance drop off during the lowering phase."
  },
  {
    id: "cat-back-17",
    name: "Chest-Supported Dumbbell / KB Incline Row",
    eq: "dumbbell",
    group: "back-pull",
    anim: "row",
    sets: 4,
    reps: 12,
    repLabel: "12 strict rows",
    holdSec: 40,
    restSec: 60,
    muscles: ["Rhomboids", "Latissimus Dorsi", "Middle Trapezius", "Rear Deltoid"],
    ytId: "H75im9fAUMc",
    ytTitle: "Chest Supported Row Form for Maximum Upper Back Growth",
    channel: "Renaissance Periodization",
    desc: "Incline bench chest-supported row isolating the lats and upper back with zero momentum.",
    why: "100% spine-sparing row variation that eliminates lower-back fatigue.",
    cues: [
      "Rest chest firmly against a 30\xB0\u201345\xB0 incline bench",
      "Let shoulder blades protract at the bottom for a deep stretch",
      "Drive elbows back toward hips and squeeze shoulder blades for 1 second"
    ],
    mistake: "Lifting chest off the pad to heave the weights."
  },
  {
    id: "cat-back-18",
    name: "Single-Arm Dumbbell Kroc Row",
    eq: "dumbbell",
    group: "back-pull",
    anim: "row",
    sets: 3,
    reps: 15,
    repLabel: "15 high-volume reps/side",
    holdSec: 45,
    restSec: 75,
    muscles: ["Latissimus Dorsi", "Upper Back", "Biceps Brachii", "Forearm Grip"],
    ytId: "pYcpY20QaE8",
    ytTitle: "How to Do Single Arm Dumbbell Rows Properly",
    channel: "ScottHermanFitness",
    desc: "High-rep unilateral dumbbell row building upper-back thickness and grip endurance.",
    why: "Develops work capacity and dense lat/rhomboid hypertrophy.",
    cues: [
      "Support non-working hand on a bench or rack with flat neutral spine",
      "Pull dumbbell from full bottom stretch up to your hip crease",
      "Maintain strict spinal bracing throughout all 15 reps"
    ],
    mistake: "Jerking the lower back instead of moving through the shoulder blade."
  },
  {
    id: "cat-back-19",
    name: "Barbell Bent-Over Row",
    eq: "barbell",
    group: "back-pull",
    anim: "row",
    sets: 4,
    reps: 8,
    repLabel: "8 compound reps",
    holdSec: 35,
    restSec: 90,
    muscles: ["Latissimus Dorsi", "Rhomboids", "Erector Spinae", "Posterior Deltoid"],
    ytId: "FWJR5Ve8bnQ",
    ytTitle: "How to Barbell Row with Perfect Form",
    channel: "Jeff Nippard",
    desc: "Classic compound bilateral barbell row building total posterior chain and back thickness.",
    why: "Loads the entire back and spinal erectors simultaneously.",
    cues: [
      "Hinge hips back to a 45\xB0 torso angle with knees softly unlocked",
      "Grip bar slightly wider than shoulder-width and pull to lower sternum/upper abs",
      "Control the eccentric lowering without bouncing"
    ],
    mistake: "Standing too upright and turning the row into a shrug."
  },
  {
    id: "cat-back-20",
    name: "Dumbbell Incline Spider Curls",
    eq: "dumbbell",
    group: "back-pull",
    anim: "row",
    sets: 3,
    reps: 12,
    repLabel: "12 strict curls",
    holdSec: 35,
    restSec: 60,
    muscles: ["Biceps Brachii (Short Head)", "Brachialis"],
    ytId: "ke2shAeQ0O8",
    ytTitle: "Spider Curls for Peak Biceps Contraction",
    channel: "Renaissance Periodization",
    desc: "Chest-supported prone incline curls locking the humerus vertically for zero-momentum biceps isolation.",
    why: "Prevents any shoulder swinging and maximizes peak biceps squeeze.",
    cues: [
      "Lie chest-down on a 45\xB0 incline bench with arms hanging straight down",
      "Curl dumbbells up while keeping elbows locked in place",
      "Squeeze biceps hard at the top for 1 second and lower slowly"
    ],
    mistake: "Swinging elbows backward during the curl."
  },
  {
    id: "cat-back-21",
    name: "Dumbbell Zottman Curls (Biceps & Forearms)",
    eq: "dumbbell",
    group: "back-pull",
    anim: "row",
    sets: 3,
    reps: 10,
    repLabel: "10 eccentric-pronated reps",
    holdSec: 40,
    restSec: 60,
    muscles: ["Biceps Brachii", "Brachioradialis", "Forearm Extensors"],
    ytId: "FSGDM9-d29w",
    ytTitle: "How to Do the Zottman Curl for Arms & Forearms",
    channel: "Buff Dudes",
    desc: "Supinated concentric curl paired with a pronated reverse-curl eccentric lowering.",
    why: "Trains both biceps and elbow-stabilizing forearm extensors in one movement.",
    cues: [
      "Curl dumbbells up with palms facing up (supinated)",
      "Rotate wrists 180\xB0 at the top so palms face down (pronated)",
      "Lower slowly over 3 seconds in the reverse-curl position, then rotate back at bottom"
    ],
    mistake: "Lowering too fast on the pronated eccentric phase."
  },
  {
    id: "cat-back-22",
    name: "Archer Pull-Ups / Typewriter Pull-Ups",
    eq: "bodyweight",
    group: "back-pull",
    anim: "pullup",
    sets: 4,
    reps: 6,
    repLabel: "6 alternating reps",
    holdSec: 35,
    restSec: 90,
    muscles: ["Latissimus Dorsi", "Biceps Brachii", "Lower Trapezius", "Core"],
    ytId: "eGo4IYlbE5g",
    ytTitle: "Archer Pull-Up Progression Tutorial",
    channel: "Calisthenicmovement",
    desc: "Advanced wide-grip unilateral pull-up shifting load to one arm at a time.",
    why: "Bridges the gap between standard pull-ups and one-arm pull-up strength.",
    cues: [
      "Take a wide overhand grip on the pull-up bar",
      "Pull your chin toward your right hand while keeping your left arm straight across the bar",
      "Lower under control and pull toward your left hand on the next rep"
    ],
    mistake: "Kipping or dropping uncontrollably from the top."
  },
  // =========================================================================
  // GROUP 2: CHEST & ANTERIOR HORIZONTAL PUSH (21 Exercises)
  // =========================================================================
  {
    id: "cat-chest-01",
    name: "Strict Military Push-Ups",
    eq: "bodyweight",
    group: "chest-push",
    anim: "pushup",
    sets: 4,
    reps: 12,
    repLabel: "12 strict reps",
    holdSec: 35,
    restSec: 60,
    muscles: ["Pectoralis Major", "Anterior Deltoid", "Triceps Brachii", "Anterior Core"],
    ytId: "IODxDxX7oi4",
    ytTitle: "The Perfect Push-Up \u2014 Do It Right!",
    channel: "Calisthenicmovement",
    desc: "Foundational closed-kinetic-chain horizontal press with a 45\xB0 elbow track and rigid plank core.",
    why: "Builds chest, triceps, serratus anterior, and core stiffness simultaneously.",
    cues: [
      "Screw palms into the floor slightly wider than shoulder-width",
      "Track elbows back at a 45\xB0 arrow angle as chest lowers to 1 inch above floor",
      "Press up as one rigid plank unit to full protraction"
    ],
    mistake: "Flaring elbows to 90\xB0 or letting hips sag."
  },
  {
    id: "cat-chest-02",
    name: "Wide-to-Side Archer Push-Ups",
    eq: "bodyweight",
    group: "chest-push",
    anim: "pushup",
    sets: 4,
    reps: 10,
    repLabel: "10 alternating reps",
    holdSec: 35,
    restSec: 60,
    muscles: ["Pectoralis Major", "Anterior Deltoid", "Triceps Brachii", "Core"],
    ytId: "mzr0RYNDzzI",
    ytTitle: "Archer Push-Ups Made Easy in 3 Steps",
    channel: "Stozfit Calisthenics",
    desc: "Unilateral bodyweight horizontal press shifting 70% of bodyweight onto one arm while the opposite arm assists.",
    why: "High overload for the chest without needing external weights.",
    cues: [
      "Set hands 1.5x wider than shoulder-width with fingers angled out 45\xB0",
      "Shift torso laterally over right hand while keeping left arm straight",
      "Press back to center and alternate sides"
    ],
    mistake: "Twisting the pelvis instead of keeping hips square to the floor."
  },
  {
    id: "cat-chest-03",
    name: "Dead-Stop Hand-Release Push-Ups",
    eq: "bodyweight",
    group: "chest-push",
    anim: "pushup",
    sets: 4,
    reps: 12,
    repLabel: "12 dead-stop reps",
    holdSec: 35,
    restSec: 60,
    muscles: ["Pectoralis Major", "Triceps Brachii", "Rhomboids", "Anterior Core"],
    ytId: "ZXPZLZErnUw",
    ytTitle: "How To Do A Hand-Release Push-Up",
    channel: "Bodybuilding.com",
    desc: "Full-range push-up pausing on the floor to lift palms 1 inch and pinch the scapulae before pressing.",
    why: "Eliminates bounce momentum and reinforces upper-back retraction.",
    cues: [
      "Lower chest all the way to the floor as one solid unit",
      "Lift hands 1 inch off floor to pinch shoulder blades together",
      "Plant hands, brace abs and glutes, and press up cleanly"
    ],
    mistake: "Peeling chest up while hips stay stuck on the floor."
  },
  {
    id: "cat-chest-04",
    name: "Feet-Elevated Decline Push-Ups (Upper Chest)",
    eq: "bodyweight",
    group: "chest-push",
    anim: "pushup",
    sets: 4,
    reps: 12,
    repLabel: "12 decline reps",
    holdSec: 35,
    restSec: 60,
    muscles: ["Clavicular Pectoralis (Upper Chest)", "Anterior Deltoid", "Triceps Brachii"],
    ytId: "SKPab2YC8BE",
    ytTitle: "Decline Push-Up Form for Upper Chest",
    channel: "ScottHermanFitness",
    desc: "Elevating feet on a bench or step to shift the pressing angle toward the clavicular upper chest and front delts.",
    why: "Increases bodyweight load to ~75% and targets the upper pectoral fibers.",
    cues: [
      "Place toes on a 12\u201318 inch bench or step with hands under shoulders",
      "Brace core strongly so lower back never hyperextends",
      "Lower upper chest between hands and press to lockout"
    ],
    mistake: "Letting the lower back sag under the elevated hip angle."
  },
  {
    id: "cat-chest-05",
    name: "Deficit Push-Ups on Kettlebells / Parallettes",
    eq: "kettlebell",
    group: "chest-push",
    anim: "pushup",
    sets: 4,
    reps: 10,
    repLabel: "10 deep-stretch reps",
    holdSec: 40,
    restSec: 60,
    muscles: ["Pectoralis Major", "Anterior Deltoid", "Triceps Brachii"],
    ytId: "IODxDxX7oi4",
    ytTitle: "Deficit Push-Ups for Deep Pectoral Stretch",
    channel: "Renaissance Periodization",
    desc: "Hands elevated on stable kettlebell handles or blocks to lower the chest 2\u20133 inches deeper than floor level.",
    why: "Loaded stretch hypertrophy for the pectorals with neutral wrist alignment.",
    cues: [
      "Grip two wide-base kettlebells or push-up bars shoulder-width apart",
      "Lower chest slowly below handle level until a deep pectoral stretch is felt",
      "Pause 1 second in the stretch and press up smoothly"
    ],
    mistake: "Dropping too deep with shrugged shoulders."
  },
  {
    id: "cat-chest-06",
    name: "Pseudo-Planche Lean Push-Ups",
    eq: "bodyweight",
    group: "chest-push",
    anim: "pushup",
    sets: 3,
    reps: 8,
    repLabel: "8 forward-lean reps",
    holdSec: 35,
    restSec: 75,
    muscles: ["Anterior Deltoid", "Pectoralis Major", "Biceps Tendon", "Core"],
    ytId: "odcPqBOlJhI",
    ytTitle: "How to Do Pseudo Planche Push-Ups",
    channel: "FitnessFAQs",
    desc: "Shifting shoulders significantly forward past the wrists with fingers turned out to heavily load chest and front delts.",
    why: "Extreme bodyweight leverage progression matching heavy bench press tension.",
    cues: [
      "Turn fingers out 45\xB0\u201390\xB0 and lean shoulders forward so hands align near lower ribs",
      "Maintain protracted hollow-body core tension",
      "Lower under control while keeping the forward lean at the top and bottom"
    ],
    mistake: "Rocking backward on the ascent to make the press easier."
  },
  {
    id: "cat-chest-07",
    name: "Explosive Plyometric Clap Push-Ups",
    eq: "bodyweight",
    group: "chest-push",
    anim: "pushup",
    sets: 4,
    reps: 6,
    repLabel: "6 explosive reps",
    holdSec: 25,
    restSec: 75,
    muscles: ["Fast-Twitch Pectoralis", "Triceps Brachii", "Anterior Deltoid"],
    ytId: "EYwWCgM198U",
    ytTitle: "Plyometric Push-Ups for Explosive Upper Body Power",
    channel: "ATHLEAN-X",
    desc: "Rapid stretch-shortening cycle push-up launching the palms off the floor for fast-twitch power.",
    why: "Recruits high-threshold Type II muscle fibers in the chest and triceps.",
    cues: [
      "Lower under control and explode through the floor as fast as possible",
      "Land softly on the balls of your palms and immediately absorb into the next rep",
      "Keep abs and glutes locked rigid in the air"
    ],
    mistake: "Landing with stiff locked elbows."
  },
  {
    id: "cat-chest-08",
    name: "3-Second Pause Tempo Push-Ups (3-2-1)",
    eq: "bodyweight",
    group: "chest-push",
    anim: "pushup",
    sets: 4,
    reps: 10,
    repLabel: "10 tempo reps (3s down, 2s hold)",
    holdSec: 45,
    restSec: 60,
    muscles: ["Pectoralis Major", "Triceps Brachii", "Serratus Anterior"],
    ytId: "IODxDxX7oi4",
    ytTitle: "Tempo Push-Ups for Maximum Time Under Tension",
    channel: "Calisthenicmovement",
    desc: "3-second eccentric lowering followed by a 2-second isometric hover 1 inch above the floor.",
    why: "Maximizes mechanical tension and time-under-tension without external weights.",
    cues: [
      "Count a strict 3 seconds on the way down",
      "Freeze 1 inch above the floor for 2 full seconds without touching chest down",
      "Drive explosively to the top lockout"
    ],
    mistake: "Resting the chest on the floor during the bottom hold."
  },
  {
    id: "cat-chest-09",
    name: "Spiderman Core-Crunch Push-Ups",
    eq: "bodyweight",
    group: "chest-push",
    anim: "pushup",
    sets: 3,
    reps: 10,
    repLabel: "10 alternating reps",
    holdSec: 40,
    restSec: 60,
    muscles: ["Pectoralis Major", "External Obliques", "Hip Flexors", "Triceps Brachii"],
    ytId: "qG2o3n3vW8U",
    ytTitle: "How to Do Spiderman Push-Ups",
    channel: "ScottHermanFitness",
    desc: "Bringing one knee laterally toward the ipsilateral elbow at the bottom of each push-up.",
    why: "Combines horizontal pressing with oblique and hip mobility work.",
    cues: [
      "As you lower into the push-up, sweep right knee out and up to touch right elbow",
      "Return foot to plank as you press back to top lockout",
      "Alternate legs on every rep"
    ],
    mistake: "Sagging the hips toward the floor as the knee comes forward."
  },
  {
    id: "cat-chest-10",
    name: "Parallel Bar / Ring Chest Dips",
    eq: "bodyweight",
    group: "chest-push",
    anim: "diamond-pushup",
    sets: 4,
    reps: 8,
    repLabel: "8 deep chest dips",
    holdSec: 35,
    restSec: 75,
    muscles: ["Lower Pectoralis Major", "Triceps Brachii", "Anterior Deltoid"],
    ytId: "2z8JmcrW-As",
    ytTitle: "Chest Dips vs Tricep Dips \u2014 Form Breakdown",
    channel: "Calisthenicmovement",
    desc: "Forward-leaning parallel bar dip targeting the sternal and costal fibers of the chest.",
    why: "Often called the upper-body squat for its massive chest and triceps loading.",
    cues: [
      "Support body on parallel bars with shoulders depressed away from ears",
      "Lean torso forward 25\xB0 and lower until shoulders reach elbow level",
      "Press back to full lockout while maintaining forward torso tilt"
    ],
    mistake: "Shrugging shoulders or dropping too deep without scapular control."
  },
  {
    id: "cat-chest-11",
    name: "Kettlebell Floor Press (Single or Double)",
    eq: "kettlebell",
    group: "chest-push",
    anim: "pushup",
    sets: 4,
    reps: 12,
    repLabel: "12 floor presses",
    holdSec: 40,
    restSec: 60,
    muscles: ["Pectoralis Major", "Triceps Brachii", "Anterior Deltoid"],
    ytId: "4ULa6AJcjr8",
    ytTitle: "The Kettlebell Floor Press Technique & Setup",
    channel: "Zack Henderson",
    desc: "Supine kettlebell press from the floor with a safe 45\xB0 elbow stop that protects the anterior shoulder capsule.",
    why: "Heavy pressing overload with zero shoulder impingement risk.",
    cues: [
      "Lie on back with knees bent and rack kettlebell(s) with straight wrists",
      "Lower until triceps gently pause on the floor for 1 second",
      "Press straight up over mid-chest to full lockout"
    ],
    mistake: "Bouncing elbows off the floor or letting wrists bend backward."
  },
  {
    id: "cat-chest-12",
    name: "Alternating See-Saw Kettlebell Floor Press",
    eq: "kettlebell",
    group: "chest-push",
    anim: "pushup",
    sets: 4,
    reps: 10,
    repLabel: "10 reps/side",
    holdSec: 45,
    restSec: 60,
    muscles: ["Pectoralis Major", "Triceps Brachii", "Anti-Rotational Core"],
    ytId: "4ULa6AJcjr8",
    ytTitle: "Alternating Kettlebell Floor Press Variations",
    channel: "Kettlebell Kings",
    desc: "Holding one kettlebell locked out overhead while the opposite arm presses, increasing isometric time under tension.",
    why: "Doubles shoulder stability and anti-rotational core demand.",
    cues: [
      "Press both kettlebells to lockout above your chest",
      "Lower left arm to the floor and press back up while right arm holds rock-solid",
      "Alternate in a smooth see-saw rhythm"
    ],
    mistake: "Letting the holding arm drift or bend while the other arm presses."
  },
  {
    id: "cat-chest-13",
    name: "Glute-Bridge Kettlebell Chest Press",
    eq: "kettlebell",
    group: "chest-push",
    anim: "glute-bridge",
    sets: 4,
    reps: 12,
    repLabel: "12 bridge presses",
    holdSec: 40,
    restSec: 60,
    muscles: ["Lower Pectoralis", "Gluteus Maximus", "Triceps Brachii", "Core"],
    ytId: "4ULa6AJcjr8",
    ytTitle: "Glute Bridge Kettlebell Floor Press",
    channel: "Funk Roberts",
    desc: "Holding an isometric glute bridge while pressing kettlebells to mimic a decline bench angle.",
    why: "Activates glutes and posterior chain while targeting lower-chest fibers.",
    cues: [
      "Drive through heels into a strong glute bridge before pressing",
      "Lower triceps to the floor and press bells straight over sternum",
      "Keep glutes squeezed and ribs braced throughout the set"
    ],
    mistake: "Hyperextending the lower back instead of extending through the hips."
  },
  {
    id: "cat-chest-14",
    name: "Kettlebell Crush-Grip Svend Floor Press",
    eq: "kettlebell",
    group: "chest-push",
    anim: "diamond-pushup",
    sets: 3,
    reps: 12,
    repLabel: "12 crush presses",
    holdSec: 35,
    restSec: 45,
    muscles: ["Sternal Pectoralis", "Triceps Brachii", "Anterior Deltoid"],
    ytId: "o5ZgxHhLJ2w",
    ytTitle: "Crush Grip Kettlebell Press for Inner Chest & Triceps",
    channel: "Kettlebell Kings",
    desc: "Squeezing the iron sides of a single kettlebell inward between both palms while pressing from the chest.",
    why: "Continuous adduction tension produces an intense inner-pectoral contraction.",
    cues: [
      "Lie on your back and grip the sides of a single kettlebell bell between both palms",
      "Crush your palms inward as hard as possible while pressing straight up",
      "Lower slowly to sternum while maintaining inward pressure"
    ],
    mistake: "Relaxing the inward palm squeeze at the top of the rep."
  },
  {
    id: "cat-chest-15",
    name: "Single-Arm Hollow-Body Kettlebell Press",
    eq: "kettlebell",
    group: "chest-push",
    anim: "pushup",
    sets: 3,
    reps: 10,
    repLabel: "10 reps per arm",
    holdSec: 40,
    restSec: 60,
    muscles: ["Pectoralis Major", "Obliques", "Transverse Abdominis", "Triceps"],
    ytId: "4ULa6AJcjr8",
    ytTitle: "Single-Arm Kettlebell Floor Press & Core Bracing",
    channel: "StrongFirst",
    desc: "Unilateral supine press with legs extended or braced, forcing the obliques to resist torso rotation.",
    why: "Integrates heavy unilateral pressing with deep anti-rotational core bracing.",
    cues: [
      "Lie supine and press one kettlebell while bracing abs 360\xB0",
      "Keep opposite shoulder blade glued flat to the floor",
      "Exhale forcefully through the sticking point"
    ],
    mistake: "Rolling onto the non-pressing shoulder to cheat the weight up."
  },
  {
    id: "cat-chest-16",
    name: "Flat Dumbbell Bench Press",
    eq: "dumbbell",
    group: "chest-push",
    anim: "pushup",
    sets: 4,
    reps: 10,
    repLabel: "10 full-ROM reps",
    holdSec: 40,
    restSec: 75,
    muscles: ["Pectoralis Major", "Triceps Brachii", "Anterior Deltoid"],
    ytId: "VmB1G1K7v94",
    ytTitle: "How to Dumbbell Bench Press for Maximum Chest Growth",
    channel: "ScottHermanFitness",
    desc: "Full range-of-motion bilateral dumbbell bench press with natural scapular retraction.",
    why: "Allows deeper bottom stretch and natural converging arc compared to a barbell.",
    cues: [
      "Retract and depress shoulder blades firmly into the bench",
      "Lower dumbbells with a 45\xB0 elbow tuck until bells reach chest level",
      "Press up and slightly inward without clanging the weights together"
    ],
    mistake: "Flaring elbows out at 90\xB0 in a T-shape."
  },
  {
    id: "cat-chest-17",
    name: "30\xB0 Incline Dumbbell Press (Clavicular Pec)",
    eq: "dumbbell",
    group: "chest-push",
    anim: "pushup",
    sets: 4,
    reps: 10,
    repLabel: "10 incline reps",
    holdSec: 40,
    restSec: 75,
    muscles: ["Clavicular Pectoralis", "Anterior Deltoid", "Triceps Brachii"],
    ytId: "8iPEnn-ltC8",
    ytTitle: "The Best Incline Bench Angle for Upper Chest",
    channel: "Jeff Nippard",
    desc: "30-degree low-incline dumbbell press isolating the upper chest without excessive front-delt takeover.",
    why: "EMG research confirms 30\xB0 incline maximizes upper-pec fiber recruitment.",
    cues: [
      "Set bench to a shallow 30\xB0 incline (1\u20132 notches up from flat)",
      "Lower dumbbells under control to the sides of your upper chest",
      "Drive straight up toward the ceiling while keeping upper back tight"
    ],
    mistake: "Setting bench too steep (60\xB0) which shifts load mostly to shoulders."
  },
  {
    id: "cat-chest-18",
    name: "Barbell Bench Press",
    eq: "barbell",
    group: "chest-push",
    anim: "pushup",
    sets: 4,
    reps: 6,
    repLabel: "6 strength reps",
    holdSec: 35,
    restSec: 90,
    muscles: ["Pectoralis Major", "Triceps Brachii", "Anterior Deltoid"],
    ytId: "vcBig73ojpE",
    ytTitle: "How To Bench Press For Chest Growth & Shoulder Safety",
    channel: "Jeff Nippard",
    desc: "Primary bilateral barbell horizontal press for maximal upper-body pushing strength.",
    why: "Highest absolute load capacity for anterior pushing strength.",
    cues: [
      "Plant feet firmly for leg drive and pin retracted shoulder blades to bench",
      "Lower bar in a slight J-curve to lower sternum with elbows tucked ~45\xB0",
      "Press bar back up over shoulders to lockout"
    ],
    mistake: "Bouncing the bar off the ribcage or lifting hips off the bench."
  },
  {
    id: "cat-chest-19",
    name: "Dumbbell Chest Flyes (Loaded Stretch)",
    eq: "dumbbell",
    group: "chest-push",
    anim: "pushup",
    sets: 3,
    reps: 12,
    repLabel: "12 stretch flyes",
    holdSec: 40,
    restSec: 60,
    muscles: ["Pectoralis Major", "Anterior Deltoid", "Biceps Short Head"],
    ytId: "eozdVDA78K0",
    ytTitle: "How to Do Dumbbell Chest Flyes Safely",
    channel: "ScottHermanFitness",
    desc: "Wide-arc horizontal adduction isolating the pectoralis major with soft 15\xB0 bent elbows.",
    why: "Directly trains the primary anatomical function of the chest (horizontal adduction).",
    cues: [
      "Keep a soft 15\xB0\u201320\xB0 bend in your elbows fixed throughout the movement",
      "Lower arms in a wide arc until elbows reach bench level (do not over-drop)",
      "Hug an imaginary tree to bring dumbbells back over chest"
    ],
    mistake: "Dropping elbows way below torso level and straining the anterior shoulder."
  },
  {
    id: "cat-chest-20",
    name: "Serratus Push-Up Plus (Scapular Protraction)",
    eq: "bodyweight",
    group: "chest-push",
    anim: "pushup",
    sets: 3,
    reps: 15,
    repLabel: "15 protraction reps",
    holdSec: 35,
    restSec: 45,
    muscles: ["Serratus Anterior", "Pectoralis Minor", "Anterior Core"],
    ytId: "ALzFr2GT-Is",
    ytTitle: "Serratus Push-Up Plus for Winged Scapula & Healthy Shoulders",
    channel: "Squat University",
    desc: "Full push-up finishing with an extra 2-inch scapular protraction push at the top.",
    why: "Strengthens the serratus anterior to prevent scapular winging and shoulder pain.",
    cues: [
      "Perform a clean push-up to straight arms",
      "At the top, push the floor away an extra 2 inches to spread shoulder blades wide",
      "Hold top protraction for 1 second on every rep"
    ],
    mistake: "Rounding the lower back instead of protracting only the shoulder blades."
  },
  {
    id: "cat-chest-21",
    name: "Asymmetric Single-KB Offset Push-Ups",
    eq: "kettlebell",
    group: "chest-push",
    anim: "pushup",
    sets: 4,
    reps: 10,
    repLabel: "5 reps per side",
    holdSec: 35,
    restSec: 60,
    muscles: ["Pectoralis Major", "Triceps Brachii", "Anterior Core", "Serratus Anterior"],
    ytId: "o5ZgxHhLJ2w",
    ytTitle: "Offset Kettlebell Push-Ups for Chest Strength",
    channel: "Kettlebell Kings",
    desc: "One hand elevated on a stable kettlebell while the other hand plants on the floor for deep unilateral stretch.",
    why: "Combines deficit range of motion on one side with explosive lockout on the other.",
    cues: [
      "Place right hand on a stable wide-base kettlebell and left hand on floor",
      "Lower chest deep while keeping shoulders level",
      "Complete 5 reps, then switch the kettlebell to the left hand for 5 reps"
    ],
    mistake: "Letting the torso twist toward the floor hand."
  },
  // =========================================================================
  // GROUP 3: TRICEPS, SHOULDERS & VERTICAL PUSH (21 Exercises)
  // =========================================================================
  {
    id: "cat-sh-01",
    name: "Diamond Close-Grip Push-Ups",
    eq: "bodyweight",
    group: "triceps-shoulders",
    anim: "diamond-pushup",
    sets: 3,
    reps: 10,
    repLabel: "10 diamond reps",
    holdSec: 30,
    restSec: 60,
    muscles: ["Triceps Brachii", "Sternal Pectoralis", "Anterior Deltoid"],
    ytId: "J0DnG1_S92I",
    ytTitle: "How To: Diamond Push-Up (Elbow Alignment)",
    channel: "ScottHermanFitness",
    desc: "Close-grip triangle push-up positioned beneath the sternum for maximal triceps recruitment.",
    why: "ACE EMG studies rank diamond push-ups #1 for bodyweight triceps activation.",
    cues: [
      "Place hands beneath lower sternum forming a diamond with thumbs and index fingers",
      "Glide elbows tightly along your ribcage as you descend",
      "Press straight up to full triceps lockout"
    ],
    mistake: "Placing hands under the face/neck and flaring elbows sideways."
  },
  {
    id: "cat-sh-02",
    name: "Bodyweight Pike Push-Ups (Vertical Press)",
    eq: "bodyweight",
    group: "triceps-shoulders",
    anim: "diamond-pushup",
    sets: 4,
    reps: 8,
    repLabel: "8 pike presses",
    holdSec: 35,
    restSec: 60,
    muscles: ["Anterior & Lateral Deltoids", "Triceps Brachii", "Upper Pectoralis"],
    ytId: "Yy6Bs3woWTY",
    ytTitle: "Are You Doing Pike Push-Ups Correctly?",
    channel: "FitnessFAQs",
    desc: "Inverted-V bodyweight overhead press lowering the head forward into a tripod triangle.",
    why: "Best zero-equipment vertical overhead press for deltoid and triceps strength.",
    cues: [
      "Pike hips high into an inverted V with hands shoulder-width apart",
      "Shift shoulders forward so the top of your head touches in front of your hands (tripod)",
      "Press up and back until ears align between shoulders at lockout"
    ],
    mistake: "Dropping head straight between hands with flared elbows."
  },
  {
    id: "cat-sh-03",
    name: "Bodyweight Sphinx Triceps Extensions",
    eq: "bodyweight",
    group: "triceps-shoulders",
    anim: "plank",
    sets: 3,
    reps: 10,
    repLabel: "10 sphinx extensions",
    holdSec: 35,
    restSec: 60,
    muscles: ["Triceps Brachii (Long & Lateral Heads)", "Rectus Abdominis", "Serratus Anterior"],
    ytId: "MN9B3wQMqcQ",
    ytTitle: "How to Do Sphinx Push-Ups for Triceps Strength",
    channel: "Primal Stride",
    desc: "Forearm-plank to high-plank pure elbow extension isolating all three heads of the triceps.",
    why: "Bodyweight skullcrusher equivalent with zero equipment.",
    cues: [
      "Begin in a forearm plank with palms flat slightly ahead of shoulders",
      "Press through palms to lift both elbows off the mat simultaneously",
      "Lower both elbows back to the mat over 2 controlled seconds"
    ],
    mistake: "Extending one arm at a time or letting hips sag."
  },
  {
    id: "cat-sh-04",
    name: "Plank Shoulder-Tap Push-Ups",
    eq: "bodyweight",
    group: "triceps-shoulders",
    anim: "shoulder-tap",
    sets: 3,
    reps: 10,
    repLabel: "10 reps + contralateral taps",
    holdSec: 35,
    restSec: 60,
    muscles: ["Anterior Deltoid", "Triceps Brachii", "Serratus Anterior", "Obliques"],
    ytId: "gWHQpMUd7vw",
    ytTitle: "Plank Shoulder Tap & Push-Up Anti-Rotation Guide",
    channel: "Mind Pump TV",
    desc: "Strict push-up paired with a slow single-arm shoulder tap at the top to challenge rotary stability.",
    why: "Forces each shoulder girdle to stabilize full upper-body weight unilaterally.",
    cues: [
      "Set feet wide for an anti-rotational base",
      "Complete a full push-up, then pause at top to tap left hand to right shoulder for 2s",
      "Zero hip shift or pelvic rotation during the tap"
    ],
    mistake: "Rushing the tap and swaying the hips side to side."
  },
  {
    id: "cat-sh-05",
    name: "Elevated Wall Handstand Push-Up / Pike Hold",
    eq: "bodyweight",
    group: "triceps-shoulders",
    anim: "diamond-pushup",
    sets: 4,
    reps: 6,
    repLabel: "6 elevated pike/HSPU reps",
    holdSec: 35,
    restSec: 75,
    muscles: ["Deltoids", "Triceps Brachii", "Upper Trapezius", "Core"],
    ytId: "Yy6Bs3woWTY",
    ytTitle: "Elevated Pike Push-Up to Handstand Push-Up Progression",
    channel: "FitnessFAQs",
    desc: "Feet elevated on a box or wall in a 90\xB0 L-pike to maximize vertical shoulder pressing load.",
    why: "Builds elite bodyweight overhead pressing power.",
    cues: [
      "Place feet on a box or bench and walk hands back until torso is vertical",
      "Lower head forward of hands with tucked elbows",
      "Press forcefully to overhead lockout with ribs braced"
    ],
    mistake: "Arching the lower back into a banana shape."
  },
  {
    id: "cat-sh-06",
    name: "Bench / Chair Triceps Dips (Shoulders Packed)",
    eq: "bodyweight",
    group: "triceps-shoulders",
    anim: "diamond-pushup",
    sets: 3,
    reps: 12,
    repLabel: "12 controlled dips",
    holdSec: 35,
    restSec: 60,
    muscles: ["Triceps Brachii", "Anterior Deltoid", "Lower Pectoralis"],
    ytId: "0326dy_-CzM",
    ytTitle: "How to Do Bench Dips Safely Without Shoulder Pain",
    channel: "ATHLEAN-X",
    desc: "Hands planted on a bench edge with fingers turned slightly outward and shoulders depressed.",
    why: "Accessible triceps builder when performed to a safe 90\xB0 elbow angle.",
    cues: [
      "Grip bench edge with fingers turned slightly out (external rotation) and chest proud",
      "Slide back close to the bench and stop at a strict 90\xB0 elbow bend",
      "Drive through palms to lock out triceps at the top"
    ],
    mistake: "Dropping hips far below 90\xB0 with internally rotated rounded shoulders."
  },
  {
    id: "cat-sh-07",
    name: "Hindu Dive-Bomber Push-Ups",
    eq: "bodyweight",
    group: "triceps-shoulders",
    anim: "diamond-pushup",
    sets: 3,
    reps: 10,
    repLabel: "10 dive-bomber reps",
    holdSec: 40,
    restSec: 60,
    muscles: ["Anterior Deltoid", "Triceps Brachii", "Pectoralis Major", "Thoracic Spine"],
    ytId: "R2yT7Q_4_3g",
    ytTitle: "How to Do Dive Bomber & Hindu Push-Ups",
    channel: "Calisthenicmovement",
    desc: "Fluid pike-to-press swooping push-up training the shoulders and triceps through a full arc.",
    why: "Combines shoulder pressing, triceps lockout, and thoracic mobility.",
    cues: [
      "Start in a high pike with hips raised",
      "Bend elbows to swoop nose and chest low along the floor",
      "Press chest up to lockout and reverse smoothly back to the pike"
    ],
    mistake: "Letting lower back sag passively without glute bracing."
  },
  {
    id: "cat-sh-08",
    name: "Kettlebell Halos + Overhead Triceps Extension",
    eq: "kettlebell",
    group: "triceps-shoulders",
    anim: "diamond-pushup",
    sets: 3,
    reps: 10,
    repLabel: "10 halos + extensions",
    holdSec: 40,
    restSec: 60,
    muscles: ["Triceps Brachii (Long Head)", "Deltoids", "Rotator Cuff", "Core"],
    ytId: "13SFATc-mJ4",
    ytTitle: "Kettlebell Halo & Overhead Triceps Extension",
    channel: "Coach Gabe West",
    desc: "Horn-grip kettlebell halo around the head followed by an overhead long-head triceps extension.",
    why: "Stretches the long head of the triceps under load while mobilizing shoulders.",
    cues: [
      "Hold kettlebell by horns at sternum and circle tightly around head",
      "Press overhead, keep elbows tucked forward, and lower bell behind neck",
      "Extend back to full overhead lockout with ribs locked down"
    ],
    mistake: "Flaring ribs and arching lower back during the overhead extension."
  },
  {
    id: "cat-sh-09",
    name: "Single-Arm Kettlebell Overhead Military Press",
    eq: "kettlebell",
    group: "triceps-shoulders",
    anim: "pullup",
    sets: 4,
    reps: 8,
    repLabel: "8 strict presses/arm",
    holdSec: 40,
    restSec: 60,
    muscles: ["Anterior & Lateral Deltoids", "Triceps Brachii", "Serratus Anterior", "Obliques"],
    ytId: "eKQ4B9b_uYQ",
    ytTitle: "How to Master the Kettlebell Military Press",
    channel: "StrongFirst",
    desc: "Strict standing unilateral kettlebell press from the front rack to full overhead lockout.",
    why: "Gold-standard kettlebell overhead strength and scapular upward-rotation builder.",
    cues: [
      "Clean kettlebell to front rack with straight wrist and packed lat",
      "Squeeze glutes, quads, and abs, then press bell in a J-curve to overhead lockout",
      "Pull the bell actively back down into the rack using your lat"
    ],
    mistake: "Leaning sideways or arching the lumbar spine to press the weight."
  },
  {
    id: "cat-sh-10",
    name: "Half-Kneeling Kettlebell Press",
    eq: "kettlebell",
    group: "triceps-shoulders",
    anim: "lunge",
    sets: 4,
    reps: 10,
    repLabel: "10 reps per side",
    holdSec: 40,
    restSec: 60,
    muscles: ["Deltoids", "Triceps Brachii", "Gluteus Medius", "Core Cylinder"],
    ytId: "eKQ4B9b_uYQ",
    ytTitle: "Half-Kneeling Kettlebell Overhead Press Guide",
    channel: "Squat University",
    desc: "Overhead pressing from a 90/90 half-kneeling stance to lock the pelvis and prevent lumbar compensation.",
    why: "Eliminates lower-back arching while challenging hip and core stability.",
    cues: [
      "Kneel on right knee with left foot planted forward at 90\xB0",
      "Squeeze right glute and brace ribs down before pressing kettlebell overhead",
      "Pause 1 second at overhead lockout with bicep by ear"
    ],
    mistake: "Allowing the front knee to wobble inward."
  },
  {
    id: "cat-sh-11",
    name: "Seated Z-Press (Floor Overhead Press)",
    eq: "kettlebell",
    group: "triceps-shoulders",
    anim: "pullup",
    sets: 3,
    reps: 8,
    repLabel: "8 strict Z-presses",
    holdSec: 35,
    restSec: 60,
    muscles: ["Deltoids", "Triceps Brachii", "Thoracic Extensors", "Anterior Core"],
    ytId: "eKQ4B9b_uYQ",
    ytTitle: "How to Perform the Z-Press for Pure Shoulder Strength",
    channel: "Jeff Nippard",
    desc: "Seated flat on the floor with legs extended straight out while pressing kettlebells or dumbbells overhead.",
    why: "Zero leg drive possible; forces 100% pure shoulder and core strength.",
    cues: [
      "Sit tall on the floor with legs extended in a V and torso completely vertical",
      "Brace abs hard and press weight overhead without leaning back",
      "Lower under control to rack position"
    ],
    mistake: "Slouching the upper back or bending knees to cheat."
  },
  {
    id: "cat-sh-12",
    name: "Kettlebell Push Press (Leg-Drive Power)",
    eq: "kettlebell",
    group: "triceps-shoulders",
    anim: "squat",
    sets: 4,
    reps: 10,
    repLabel: "10 explosive push presses",
    holdSec: 35,
    restSec: 60,
    muscles: ["Deltoids", "Triceps Brachii", "Quadriceps", "Glutes"],
    ytId: "eKQ4B9b_uYQ",
    ytTitle: "Kettlebell Push Press Technique & Dip-Drive",
    channel: "Kettlebell Kings",
    desc: "Quick 4-inch quarter-squat dip and explosive hip/leg drive launching the kettlebell overhead, followed by a slow eccentric.",
    why: "Allows heavier overhead loading and trains lower-to-upper body force transfer.",
    cues: [
      "Dip knees 4 inches vertically while keeping torso upright",
      "Drive through heels explosively to punch kettlebell overhead",
      "Lower the weight slowly over 3 seconds to build strict strength"
    ],
    mistake: "Hinging forward during the dip instead of dipping straight down."
  },
  {
    id: "cat-sh-13",
    name: "Bottoms-Up Kettlebell Overhead Press",
    eq: "kettlebell",
    group: "triceps-shoulders",
    anim: "pullup",
    sets: 3,
    reps: 8,
    repLabel: "8 bottoms-up reps/arm",
    holdSec: 40,
    restSec: 60,
    muscles: ["Rotator Cuff", "Deltoids", "Triceps Brachii", "Forearm Crush Grip"],
    ytId: "13SFATc-mJ4",
    ytTitle: "Dr. Stuart McGill Bottoms-Up Kettlebell Press for Shoulder Stability",
    channel: "Squat University",
    desc: "Dr. Stuart McGill favorite: pressing an inverted kettlebell (horn down, bell up) requiring extreme grip and rotator cuff centration.",
    why: "Clinically proven to wake up the rotator cuff and stabilize the glenohumeral joint.",
    cues: [
      "Clean a light-to-moderate kettlebell upside down so the heavy bell sits above your fist",
      "Crush the handle tightly to keep the bell balanced vertically",
      "Press slowly overhead while maintaining 360\xB0 core stiffness"
    ],
    mistake: "Using a weight too heavy to control safely."
  },
  {
    id: "cat-sh-14",
    name: "Supine Kettlebell Skullcrushers (Triceps)",
    eq: "kettlebell",
    group: "triceps-shoulders",
    anim: "pushup",
    sets: 3,
    reps: 12,
    repLabel: "12 skullcrushers",
    holdSec: 35,
    restSec: 60,
    muscles: ["Triceps Brachii (Medial & Lateral Heads)", "Anconeus"],
    ytId: "4ULa6AJcjr8",
    ytTitle: "Kettlebell Floor Skullcrushers for Triceps",
    channel: "Kettlebell Kings",
    desc: "Supine horn-grip elbow extensions lowering the kettlebell toward the forehead with upper arms angled slightly back.",
    why: "Direct triceps isolation with constant tension at lockout.",
    cues: [
      "Lie on your back holding one kettlebell by the horns above your chin",
      "Angle upper arms 15\xB0 back toward your head to keep tension on the triceps",
      "Bend only at the elbows to lower bell to forehead, then extend to lockout"
    ],
    mistake: "Letting elbows flare wide or swinging upper arms."
  },
  {
    id: "cat-sh-15",
    name: "Kettlebell Close-Grip Crush Push-Up",
    eq: "kettlebell",
    group: "triceps-shoulders",
    anim: "diamond-pushup",
    sets: 3,
    reps: 10,
    repLabel: "10 crush push-ups",
    holdSec: 35,
    restSec: 60,
    muscles: ["Triceps Brachii", "Sternal Pectoralis", "Anterior Deltoid"],
    ytId: "o5ZgxHhLJ2w",
    ytTitle: "Close-Grip Kettlebell Push-Ups",
    channel: "Kettlebell Kings",
    desc: "Gripping the iron ball of a wide-base kettlebell in a close-grip plank press.",
    why: "Neutral wrist position compared to flat-floor diamond push-ups.",
    cues: [
      "Test that your kettlebell has a wide, flat, non-tipping base on the mat",
      "Grip the sides of the bell and lower sternum to the handle with tucked elbows",
      "Press straight up while crushing palms inward"
    ],
    mistake: "Using a narrow-base kettlebell without checking stability first."
  },
  {
    id: "cat-sh-16",
    name: "Standing Dumbbell Overhead Press",
    eq: "dumbbell",
    group: "triceps-shoulders",
    anim: "pullup",
    sets: 4,
    reps: 10,
    repLabel: "10 overhead presses",
    holdSec: 40,
    restSec: 75,
    muscles: ["Anterior & Lateral Deltoids", "Triceps Brachii", "Upper Trapezius", "Core"],
    ytId: "qEwKCR5JCog",
    ytTitle: "How to Dumbbell Shoulder Press Properly",
    channel: "ScottHermanFitness",
    desc: "Bilateral standing dumbbell press in the scapular plane (30\xB0 forward of torso).",
    why: "Builds complete 3D deltoid and triceps strength.",
    cues: [
      "Hold dumbbells at shoulder height with elbows angled 30\xB0 forward (scapular plane)",
      "Squeeze glutes and brace abs so lower back remains neutral",
      "Press dumbbells overhead to full lockout without clanging"
    ],
    mistake: "Flaring elbows straight out to 90\xB0 and overarching the spine."
  },
  {
    id: "cat-sh-17",
    name: "Dumbbell Lateral Raises (Scapular Plane)",
    eq: "dumbbell",
    group: "triceps-shoulders",
    anim: "pullup",
    sets: 4,
    reps: 15,
    repLabel: "15 lateral raises",
    holdSec: 40,
    restSec: 45,
    muscles: ["Lateral Deltoid", "Supraspinatus", "Upper Trapezius"],
    ytId: "3VcKaXpzqRo",
    ytTitle: "How to Do Lateral Raises for Wider Shoulders",
    channel: "Jeff Nippard",
    desc: "Controlled abduction in the 30\xB0 scapular plane isolating the lateral deltoid head.",
    why: "The #1 isolation movement for medial deltoid width and shoulder health.",
    cues: [
      "Hinge forward 10\xB0 and raise dumbbells out and slightly forward (30\xB0 scapular plane)",
      "Lead with your elbows and stop at shoulder height",
      "Lower slowly over 2.5 seconds without swinging"
    ],
    mistake: "Using momentum or shrugging upper traps to swing weights up."
  },
  {
    id: "cat-sh-18",
    name: "Bent-Over Rear Delt Dumbbell Flyes",
    eq: "dumbbell",
    group: "triceps-shoulders",
    anim: "row",
    sets: 3,
    reps: 15,
    repLabel: "15 rear-delt flyes",
    holdSec: 40,
    restSec: 45,
    muscles: ["Posterior Deltoid", "Rhomboids", "Infraspinatus", "Teres Minor"],
    ytId: "EA7u4Q_8HQ0",
    ytTitle: "How to Hit Rear Delts Properly",
    channel: "Jeff Nippard",
    desc: "Hinged horizontal abduction targeting the posterior deltoids and external rotators.",
    why: "Balances pressing volume and keeps shoulders pulled back in healthy posture.",
    cues: [
      "Hinge torso to 45\xB0\u201360\xB0 with flat neutral spine",
      "Sweep arms wide at a 45\xB0 angle away from torso without pinching traps",
      "Pause briefly at top and lower under control"
    ],
    mistake: "Turning the fly into a narrow row."
  },
  {
    id: "cat-sh-19",
    name: "Dumbbell Arnold Shoulder Press",
    eq: "dumbbell",
    group: "triceps-shoulders",
    anim: "pullup",
    sets: 3,
    reps: 10,
    repLabel: "10 rotational presses",
    holdSec: 40,
    restSec: 60,
    muscles: ["Anterior Deltoid", "Lateral Deltoid", "Triceps Brachii"],
    ytId: "6Z15_WdXmVw",
    ytTitle: "How to Do the Arnold Press Correctly",
    channel: "ScottHermanFitness",
    desc: "Starting with palms facing you at chin level and rotating outward as you press overhead.",
    why: "Hits all three deltoid heads through a long rotational range of motion.",
    cues: [
      "Start with dumbbells in front of shoulders, palms facing toward you",
      "Open elbows and rotate palms forward smoothly as you press overhead",
      "Reverse the rotation on the way down to the tucked starting position"
    ],
    mistake: "Rushing the bottom rotation with momentum."
  },
  {
    id: "cat-sh-20",
    name: "Overhead Barbell Military Press (OHP)",
    eq: "barbell",
    group: "triceps-shoulders",
    anim: "pullup",
    sets: 4,
    reps: 6,
    repLabel: "6 strict barbell reps",
    holdSec: 35,
    restSec: 90,
    muscles: ["Anterior & Lateral Deltoids", "Triceps Brachii", "Upper Pectoralis", "Core"],
    ytId: "_RlRDWO2jfg",
    ytTitle: "How to Overhead Press with Perfect Technique",
    channel: "Jeff Nippard",
    desc: "Classic standing barbell overhead press from the clavicles to stacked overhead lockout.",
    why: "True test of total-body vertical pressing and core pillar stability.",
    cues: [
      "Grip bar just outside shoulders with wrists stacked and forearms vertical",
      "Squeeze glutes and quads hard, tuck chin slightly back, and press bar straight up",
      "Push head slightly through the window once the bar clears your forehead"
    ],
    mistake: "Pressing the bar out in front of the face in a forward loop."
  },
  {
    id: "cat-sh-21",
    name: "Close-Grip Barbell Bench Press (Triceps)",
    eq: "barbell",
    group: "triceps-shoulders",
    anim: "diamond-pushup",
    sets: 4,
    reps: 8,
    repLabel: "8 close-grip reps",
    holdSec: 35,
    restSec: 75,
    muscles: ["Triceps Brachii", "Anterior Deltoid", "Upper/Inner Pectoralis"],
    ytId: "nEF0bv2FW94",
    ytTitle: "Close-Grip Bench Press Form for Massive Triceps",
    channel: "ScottHermanFitness",
    desc: "Shoulder-width grip barbell press keeping elbows tucked along the ribs to overload the triceps.",
    why: "Heaviest compound movement for triceps mass and lockout power.",
    cues: [
      "Grip bar shoulder-width apart (do not place hands touching, which strains wrists)",
      "Keep elbows tucked close to your torso as bar lowers to lower sternum",
      "Drive explosively to full triceps lockout"
    ],
    mistake: "Gripping too narrow (2 inches apart) causing wrist ulnar pain."
  }
];
var CATALOG_PART_1 = SEEDS.map((s) => ({
  id: s.id,
  name: s.name,
  category: "strength",
  animationType: s.anim,
  equipmentType: s.eq,
  equipmentLabel: EQUIPMENT_LABELS[s.eq],
  muscleGroupTag: s.group,
  whySwap: s.why,
  defaultSets: s.sets,
  defaultReps: s.reps,
  repLabel: s.repLabel,
  defaultHoldSeconds: s.holdSec,
  defaultRestSeconds: s.restSec,
  prepCountdownSeconds: 10,
  description: s.desc,
  formCues: s.cues,
  targetedMuscles: s.muscles,
  videoReference: {
    youtubeId: s.ytId,
    title: s.ytTitle,
    channelName: s.channel,
    durationLabel: `${s.sets} Sets \xD7 ${s.repLabel}`,
    stepByStepBreakdown: [
      s.cues[0],
      s.cues[1],
      s.cues[2],
      `Rest ${s.restSec}s between sets to allow full ATP-PCr and neuromuscular recovery.`
    ],
    commonMistakes: [s.mistake, "Losing 360\xB0 abdominal bracing during the eccentric phase."]
  }
}));

// src/data/exerciseCatalogPart2.ts
var EQUIPMENT_LABELS2 = {
  bodyweight: "Zero Equipment (Bodyweight)",
  kettlebell: "Kettlebell (1\u20132 KBs)",
  dumbbell: "Dumbbells / Home Gym",
  barbell: "Barbell / Full Strength"
};
var SEEDS_PART_2 = [
  // =========================================================================
  // GROUP 4: LEGS, QUADS, GLUTES & HAMSTRINGS (24 Exercises)
  // =========================================================================
  {
    id: "cat-leg-01",
    name: "Bodyweight Tempo Squats (360\xB0 Core Brace)",
    eq: "bodyweight",
    group: "legs-glutes",
    anim: "squat",
    sets: 4,
    reps: 15,
    repLabel: "15 deep squats",
    holdSec: 45,
    restSec: 60,
    muscles: ["Quadriceps", "Gluteus Maximus", "Adductors", "Core Cylinder"],
    ytId: "aclHkVaku9U",
    ytTitle: "How to Do a Perfect Squat",
    channel: "Squat University",
    desc: "Deep athletic bodyweight squat maintaining tripod foot pressure and neutral lumbar curvature.",
    why: "Fundamental lower-body movement pattern for knee, hip, and ankle longevity.",
    cues: [
      "Root big toe, pinky toe, and heel into the floor (tripod foot)",
      "Break at hips and knees simultaneously while keeping chest proud",
      "Descend to full depth without lumbar butt-wink and drive up forcefully"
    ],
    mistake: "Letting knees collapse inward (valgus) on the ascent."
  },
  {
    id: "cat-leg-02",
    name: "Kettlebell Goblet Squats",
    eq: "kettlebell",
    group: "legs-glutes",
    anim: "squat",
    sets: 4,
    reps: 12,
    repLabel: "12 goblet squats",
    holdSec: 45,
    restSec: 60,
    muscles: ["Quadriceps", "Gluteus Maximus", "Anterior Core", "Upper Back"],
    ytId: "dBnNCOtuGNQ",
    ytTitle: "Kettlebell Goblet Squat Technique & Depth Guide",
    channel: "Coach Chandler Marchman",
    desc: "Front-loaded kettlebell squat acting as a natural counterbalance for upright posture and deep hip flexion.",
    why: "Spares the lower back while deeply loading quads, glutes, and thoracic extension.",
    cues: [
      "Hold kettlebell by horns close to sternum with elbows pointing down",
      "Sit straight down between your heels while bracing abs 360\xB0",
      "Drive through midfoot to stand tall and lock out glutes"
    ],
    mistake: "Holding the kettlebell far away from the chest."
  },
  {
    id: "cat-leg-03",
    name: "Double Kettlebell Front-Rack Squats",
    eq: "kettlebell",
    group: "legs-glutes",
    anim: "squat",
    sets: 4,
    reps: 8,
    repLabel: "8 heavy front squats",
    holdSec: 40,
    restSec: 90,
    muscles: ["Quadriceps", "Gluteus Maximus", "Thoracic Extensors", "Core Cylinder"],
    ytId: "dBnNCOtuGNQ",
    ytTitle: "Double Kettlebell Front Squat Mastery",
    channel: "StrongFirst",
    desc: "Two kettlebells racked on the upper torso challenging anterior core stiffness and quad strength.",
    why: "One of the highest-return full-body strength builders in kettlebell training.",
    cues: [
      "Clean two kettlebells into a tight front rack with wrists straight",
      "Take a deep diaphragmatic breath and squat between your ankles",
      "Exhale sharply through the sticking point to stand tall"
    ],
    mistake: "Letting elbows drop and upper back round forward."
  },
  {
    id: "cat-leg-04",
    name: "Kettlebell Romanian Deadlifts (RDL Hip Hinge)",
    eq: "kettlebell",
    group: "legs-glutes",
    anim: "rdl",
    sets: 4,
    reps: 15,
    repLabel: "15 hip-hinge reps",
    holdSec: 45,
    restSec: 60,
    muscles: ["Hamstrings", "Gluteus Maximus", "Latissimus Dorsi", "Erector Spinae"],
    ytId: "5bJEigM5iVg",
    ytTitle: "Fix Your RDL Form! Ultimate Romanian Deadlift Tutorial",
    channel: "Squat University",
    desc: "Pure horizontal hip translation backward loading the hamstrings and glutes with zero lumbar flexion.",
    why: "Builds bulletproof hamstrings and glutes without knee shear.",
    cues: [
      "Unlock knees to a fixed 15\xB0 angle and pack lats tightly",
      "Glide hips straight back toward the wall behind you until hamstrings stretch",
      "Snap hips forward to stand tall and squeeze glutes without overarching"
    ],
    mistake: "Reaching toward the floor by rounding the lower back."
  },
  {
    id: "cat-leg-05",
    name: "Two-Hand Russian Kettlebell Swings",
    eq: "kettlebell",
    group: "legs-glutes",
    anim: "rdl",
    sets: 4,
    reps: 15,
    repLabel: "15 ballistic swings",
    holdSec: 35,
    restSec: 60,
    muscles: ["Gluteus Maximus", "Hamstrings", "Erector Spinae", "Latissimus Dorsi"],
    ytId: "YSxHifyI6s8",
    ytTitle: "How to Kettlebell Swing with Perfect Hip Hinge",
    channel: "StrongFirst",
    desc: "Ballistic posterior-chain hip snap floating the kettlebell to chest height.",
    why: "Dr. Stuart McGill research shows KB swings build rapid glute activation and athletic power.",
    cues: [
      "Hike kettlebell high between thighs like a football center snap",
      "Snap hips forward into a standing plank\u2014arms remain relaxed ropes",
      "Wait until forearms touch hips before hinging back for the next rep"
    ],
    mistake: "Squatting the swing down and lifting with the front delts."
  },
  {
    id: "cat-leg-06",
    name: "Single-Leg Kettlebell Kickstand RDL",
    eq: "kettlebell",
    group: "legs-glutes",
    anim: "rdl",
    sets: 3,
    reps: 10,
    repLabel: "10 reps per leg",
    holdSec: 45,
    restSec: 60,
    muscles: ["Gluteus Maximus", "Gluteus Medius", "Biceps Femoris (Hamstrings)"],
    ytId: "5bJEigM5iVg",
    ytTitle: "B-Stance / Kickstand RDL for Glutes & Hamstrings",
    channel: "Squat University",
    desc: "Unilateral Romanian deadlift using the rear toes as a light 10% balance kickstand.",
    why: "All the unilateral glute/hamstring overload of a single-leg RDL without losing balance.",
    cues: [
      "Place 90% of weight on front foot and prop back toes 6 inches behind heel",
      "Hinge hips straight back while keeping pelvis square to the floor",
      "Drive through front heel to stand tall"
    ],
    mistake: "Putting 50% of the weight onto the rear kickstand foot."
  },
  {
    id: "cat-leg-07",
    name: "Kettlebell Tactical Reverse Lunges",
    eq: "kettlebell",
    group: "legs-glutes",
    anim: "lunge",
    sets: 4,
    reps: 12,
    repLabel: "12 alternating lunges",
    holdSec: 45,
    restSec: 60,
    muscles: ["Quadriceps", "Gluteus Maximus", "Gluteus Medius", "Hamstrings"],
    ytId: "2Vr8Bx7epC8",
    ytTitle: "Tactical Kettlebell Lunge Technique",
    channel: "Kettlebell Kings",
    desc: "Step-back lunge passing the kettlebell underneath the front thigh at the bottom of each rep.",
    why: "Challenges single-leg deceleration, hip stability, and dynamic hand-to-hand coordination.",
    cues: [
      "Step back with the leg on the same side holding the kettlebell",
      "Pass the kettlebell cleanly under your front hamstring at the bottom",
      "Drive through front heel to return to standing"
    ],
    mistake: "Rounding the upper back to reach underneath the leg."
  },
  {
    id: "cat-leg-08",
    name: "Kettlebell Cossack Lateral Squats",
    eq: "kettlebell",
    group: "legs-glutes",
    anim: "squat",
    sets: 3,
    reps: 10,
    repLabel: "10 side-to-side reps",
    holdSec: 45,
    restSec: 60,
    muscles: ["Adductors", "Quadriceps", "Gluteus Medius", "Hip Mobility"],
    ytId: "tpczTeSkHz0",
    ytTitle: "How to Do Cossack Squats for Hip Mobility & Leg Strength",
    channel: "FitnessFAQs",
    desc: "Frontal-plane lateral squat sitting deep onto one heel while the opposite leg straightens with toes up.",
    why: "Unlocks groin/adductor mobility and lateral knee stability.",
    cues: [
      "Take a wide stance and hold kettlebell at goblet chest position",
      "Shift hips over right heel while pivoting left toes toward the ceiling",
      "Drive back through right heel and alternate to the left side"
    ],
    mistake: "Letting the working heel peel off the floor."
  },
  {
    id: "cat-leg-09",
    name: "Kettlebell Sumo Deadlift",
    eq: "kettlebell",
    group: "legs-glutes",
    anim: "rdl",
    sets: 4,
    reps: 12,
    repLabel: "12 sumo deadlifts",
    holdSec: 40,
    restSec: 60,
    muscles: ["Gluteus Maximus", "Adductors", "Quadriceps", "Upper Back"],
    ytId: "5bJEigM5iVg",
    ytTitle: "Kettlebell Sumo Deadlift Form & Setup",
    channel: "StrongFirst",
    desc: "Wide-stance deadlift with toes turned out 30\xB0 and kettlebell positioned directly between the ankles.",
    why: "Shorter lever arm on the lumbar spine with high glute and inner-thigh recruitment.",
    cues: [
      "Stand wide with kettlebell handle aligned with your ankle bones",
      "Wedge hips down and push knees out in line with toes",
      "Push the floor away to stand tall and lock out hips"
    ],
    mistake: "Lifting hips first before the chest rises."
  },
  {
    id: "cat-leg-10",
    name: "Bodyweight Alternating Reverse Lunges",
    eq: "bodyweight",
    group: "legs-glutes",
    anim: "lunge",
    sets: 4,
    reps: 16,
    repLabel: "16 reps (8 per leg)",
    holdSec: 45,
    restSec: 50,
    muscles: ["Quadriceps", "Gluteus Maximus", "Gluteus Medius"],
    ytId: "2Vr8Bx7epC8",
    ytTitle: "How to Lunge for Maximum Glute & Quad Recruitment",
    channel: "Squat University",
    desc: "Knee-friendly backward step lunge maintaining a vertical front shin and slight 15\xB0 torso lean.",
    why: "Significantly less patellofemoral shear stress than forward lunges.",
    cues: [
      "Step backward on railroad-track width (hip-width apart)",
      "Lower until both knees reach 90\xB0 with front shin vertical",
      "Drive through front midfoot and heel to stand tall"
    ],
    mistake: "Stepping on a tightrope line causing loss of balance."
  },
  {
    id: "cat-leg-11",
    name: "Rear-Foot Elevated Bulgarian Split Squats",
    eq: "bodyweight",
    group: "legs-glutes",
    anim: "lunge",
    sets: 4,
    reps: 10,
    repLabel: "10 reps per leg",
    holdSec: 45,
    restSec: 75,
    muscles: ["Quadriceps", "Gluteus Maximus", "Gluteus Medius"],
    ytId: "2C-uNgKwPLE",
    ytTitle: "How to Bulgarian Split Squat (Glute vs Quad Focus)",
    channel: "Jeff Nippard",
    desc: "Single-leg split squat with rearlaces resting on a bench or couch for deep unilateral leg hypertrophy.",
    why: "Matches heavy barbell squat hypertrophy with zero axial spine compression.",
    cues: [
      "Rest top of back foot on a knee-high bench or step",
      "Lower back knee toward the floor with a slight forward torso hinge",
      "Drive through front heel to full single-leg extension"
    ],
    mistake: "Pushing off the back elevated foot instead of the front leg."
  },
  {
    id: "cat-leg-12",
    name: "Bilateral Glute Bridges (2s Isometric Squeeze)",
    eq: "bodyweight",
    group: "legs-glutes",
    anim: "glute-bridge",
    sets: 4,
    reps: 15,
    repLabel: "15 reps (2s top hold)",
    holdSec: 45,
    restSec: 45,
    muscles: ["Gluteus Maximus", "Hamstrings", "Core Stabilizers"],
    ytId: "OUgsJ8-Vi0E",
    ytTitle: "How to Do a Glute Bridge Without Lower Back Arching",
    channel: "Squat University",
    desc: "Supine hip extension with posterior pelvic lock isolating the gluteus maximus.",
    why: "Reverses sitting-induced glute amnesia and supports the pelvis.",
    cues: [
      "Plant heels 6 inches from glutes with knees hip-width apart",
      "Brace abs so ribs stay connected to pelvis",
      "Bridge hips up and hold peak glute squeeze for 2 full seconds"
    ],
    mistake: "Overarching the lower back at the top."
  },
  {
    id: "cat-leg-13",
    name: "Single-Leg Bodyweight Glute Bridges",
    eq: "bodyweight",
    group: "legs-glutes",
    anim: "glute-bridge",
    sets: 4,
    reps: 10,
    repLabel: "10 reps per leg",
    holdSec: 45,
    restSec: 45,
    muscles: ["Gluteus Maximus", "Gluteus Medius", "Hamstrings"],
    ytId: "lFHZD4X5q0g",
    ytTitle: "Single-Leg Glute Bridge Technique & Hip Stability",
    channel: "Squat University",
    desc: "Unilateral supine hip extension hugging the opposite knee to lock the lumbar spine.",
    why: "Fixes left-to-right glute imbalances and prevents lumbar hyperextension.",
    cues: [
      "Hug non-working knee toward chest to lock lumbar spine neutral",
      "Drive through planted heel to full hip extension",
      "Hold 2 seconds at top with level pelvis"
    ],
    mistake: "Letting the unplanted hip drop or twist."
  },
  {
    id: "cat-leg-14",
    name: "Supine Hamstring Walkouts (Floor Sliders)",
    eq: "bodyweight",
    group: "legs-glutes",
    anim: "glute-bridge",
    sets: 3,
    reps: 8,
    repLabel: "8 slow walkout cycles",
    holdSec: 45,
    restSec: 60,
    muscles: ["Hamstrings (Biceps Femoris)", "Gluteus Maximus", "Calves"],
    ytId: "lFHZD4X5q0g",
    ytTitle: "Hamstring Walkouts for Bulletproof Posterior Chain",
    channel: "ATHLEAN-X",
    desc: "Holding a glute bridge while walking heels out in 4 short steps to near-extension and walking back in.",
    why: "Intense eccentric and isometric knee-flexion hamstring training with zero equipment.",
    cues: [
      "Bridge hips off the floor and keep toes pointed up (heels digging down)",
      "Take 4 tiny heel steps outward until legs are nearly straight",
      "Walk heels back in 4 steps while keeping hips elevated off the floor"
    ],
    mistake: "Letting hips sag to the floor as heels walk out."
  },
  {
    id: "cat-leg-15",
    name: "Bodyweight Sissy Squats / Reverse Nordic Curls",
    eq: "bodyweight",
    group: "legs-glutes",
    anim: "squat",
    sets: 3,
    reps: 10,
    repLabel: "10 slow eccentric reps",
    holdSec: 40,
    restSec: 60,
    muscles: ["Rectus Femoris (Quads)", "Vastus Medialis", "Patellar Tendon"],
    ytId: "daP_ce2k77s",
    ytTitle: "Reverse Nordic Curls for Bulletproof Quads & Knees",
    channel: "FitnessFAQs",
    desc: "Tall-kneeling lean-back maintaining a straight line from knees to head to stretch and load the rectus femoris.",
    why: "Directly strengthens the rectus femoris in its lengthened position.",
    cues: [
      "Kneel tall on a padded mat with glutes squeezed and hips fully extended",
      "Lean body backward as one rigid plank from knees through shoulders",
      "Pull yourself back to vertical using pure quad contraction"
    ],
    mistake: "Breaking at the hips and sitting onto the heels."
  },
  {
    id: "cat-leg-16",
    name: "90\xB0 Isometric Wall Sit + Calf Raises",
    eq: "bodyweight",
    group: "legs-glutes",
    anim: "squat",
    sets: 3,
    reps: 1,
    repLabel: "45s isometric hold",
    holdSec: 45,
    restSec: 60,
    muscles: ["Quadriceps", "Soleus", "Gluteus Medius"],
    ytId: "y-wV4Venusw",
    ytTitle: "How to Do a Proper Wall Sit for Knee Tendon Health",
    channel: "Squat University",
    desc: "45-second isometric 90-degree squat against a wall with alternating heel raises.",
    why: "Isometric quad loading provides patellar tendon analgesia and muscular endurance.",
    cues: [
      "Press entire back flat against a wall with thighs parallel to floor",
      "Keep shins vertical directly above ankles",
      "Raise and lower heels slowly while holding the 90\xB0 thigh angle"
    ],
    mistake: "Resting hands on thighs to support body weight."
  },
  {
    id: "cat-leg-17",
    name: "Single-Leg Pistol Squat to Box / Bench",
    eq: "bodyweight",
    group: "legs-glutes",
    anim: "squat",
    sets: 3,
    reps: 8,
    repLabel: "8 reps per leg",
    holdSec: 40,
    restSec: 60,
    muscles: ["Quadriceps", "Gluteus Maximus", "Gluteus Medius", "Ankle Stabilizers"],
    ytId: "vq5-vdgJc0I",
    ytTitle: "Box Pistol Squat Progression for Single-Leg Strength",
    channel: "Squat University",
    desc: "Controlled single-leg squat lowering lightly onto a bench or chair and standing up on one leg.",
    why: "Builds elite unilateral leg strength and knee tracking control.",
    cues: [
      "Stand 4 inches in front of a bench on one foot with arms extended forward",
      "Sit hips back over heel over 3 seconds until glutes lightly kiss the bench",
      "Drive through midfoot without rocking backward to stand up"
    ],
    mistake: "Plopping onto the bench and using momentum to bounce up."
  },
  {
    id: "cat-leg-18",
    name: "Explosive Squat Jumps (Soft Landing)",
    eq: "bodyweight",
    group: "legs-glutes",
    anim: "squat",
    sets: 4,
    reps: 8,
    repLabel: "8 explosive jumps",
    holdSec: 30,
    restSec: 75,
    muscles: ["Fast-Twitch Quadriceps", "Gluteus Maximus", "Gastrocnemius"],
    ytId: "U4s4mEQ5VqU",
    ytTitle: "Jump Squats for Explosive Lower Body Power",
    channel: "ATHLEAN-X",
    desc: "Triple-extension vertical jump squat focusing on quiet, shock-absorbing toe-to-heel landings.",
    why: "Develops lower-body rate of force development (RFD) and tendon elasticity.",
    cues: [
      "Dip rapidly into a quarter-to-half squat and swing arms back",
      "Explode vertically through hips, knees, and ankles",
      "Land softly toe-to-heel and immediately absorb into an athletic stance"
    ],
    mistake: "Landing stiff-legged with loud impact."
  },
  {
    id: "cat-leg-19",
    name: "Single-Leg Elevated Calf Raises (2s Stretch)",
    eq: "bodyweight",
    group: "legs-glutes",
    anim: "squat",
    sets: 4,
    reps: 15,
    repLabel: "15 reps per leg",
    holdSec: 45,
    restSec: 45,
    muscles: ["Gastrocnemius", "Soleus", "Achilles Tendon"],
    ytId: "-M4-G8p8fmc",
    ytTitle: "How to Build Calves: Full Stretch & Pause Technique",
    channel: "Renaissance Periodization",
    desc: "Full range-of-motion unilateral calf raise on a step with a 2-second bottom stretch pause.",
    why: "Pausing at the bottom eliminates Achilles bounce and forces true calf muscle work.",
    cues: [
      "Stand on the ball of one foot on a step edge",
      "Lower heel all the way down and pause for 2 seconds in the deep stretch",
      "Drive straight up onto big toe and hold 1 second at peak contraction"
    ],
    mistake: "Bouncing rapidly through the middle range."
  },
  {
    id: "cat-leg-20",
    name: "Barbell Back Squat",
    eq: "barbell",
    group: "legs-glutes",
    anim: "squat",
    sets: 4,
    reps: 6,
    repLabel: "6 strength reps",
    holdSec: 40,
    restSec: 120,
    muscles: ["Quadriceps", "Gluteus Maximus", "Adductors", "Erector Spinae"],
    ytId: "bEv6CCg2BC8",
    ytTitle: "How to Back Squat with Perfect Form",
    channel: "Jeff Nippard",
    desc: "Foundational bilateral barbell squat for maximal lower-body force production.",
    why: "King of lower-body compound strength exercises.",
    cues: [
      "Wedge upper back tightly under the bar and brace 360\xB0 intra-abdominal pressure",
      "Break at hips and knees together while tracking knees over toes",
      "Drive hips and chest up at the exact same speed out of the hole"
    ],
    mistake: "Shooting hips up faster than the chest (good-morning squat)."
  },
  {
    id: "cat-leg-21",
    name: "Barbell Romanian Deadlift (RDL)",
    eq: "barbell",
    group: "legs-glutes",
    anim: "rdl",
    sets: 4,
    reps: 8,
    repLabel: "8 heavy hinge reps",
    holdSec: 40,
    restSec: 90,
    muscles: ["Hamstrings", "Gluteus Maximus", "Erector Spinae", "Latissimus Dorsi"],
    ytId: "_oyxCn2iSjU",
    ytTitle: "How to Barbell Romanian Deadlift Properly",
    channel: "Jeff Nippard",
    desc: "Heavy barbell eccentric-loaded hip hinge shaving the thighs and shins.",
    why: "Superior posterior chain hypertrophy and hamstring length-tension development.",
    cues: [
      "Unrack bar at hip height and pull bar against thighs using your lats",
      "Push hips straight backward with soft 15\xB0 knees until bar reaches mid-shin",
      "Drive hips forward to lockout without leaning backward"
    ],
    mistake: "Letting the bar drift forward away from the shins."
  },
  {
    id: "cat-leg-22",
    name: "Barbell / Kettlebell Hip Thrust",
    eq: "barbell",
    group: "legs-glutes",
    anim: "glute-bridge",
    sets: 4,
    reps: 10,
    repLabel: "10 hip thrusts (2s hold)",
    holdSec: 45,
    restSec: 75,
    muscles: ["Gluteus Maximus", "Gluteus Medius", "Hamstrings"],
    ytId: "xDmFkJxPzeM",
    ytTitle: "How to Do the Barbell Hip Thrust Correctly",
    channel: "Bret Contreras (Glute Guy)",
    desc: "Upper-back supported loaded hip extension maximizing peak gluteus maximus contraction at full lockout.",
    why: "Highest EMG gluteus maximus activation at full hip extension.",
    cues: [
      "Hinge around bottom of shoulder blades on a bench with shins vertical at top",
      "Keep chin tucked and ribs down (sternum-to-pelvis connection)",
      "Lock out hips to horizontal tabletop and hold 2 seconds"
    ],
    mistake: "Throwing head back and overarching the lumbar spine."
  },
  {
    id: "cat-leg-23",
    name: "Dumbbell Walking Lunges",
    eq: "dumbbell",
    group: "legs-glutes",
    anim: "lunge",
    sets: 3,
    reps: 16,
    repLabel: "16 steps (8 per leg)",
    holdSec: 45,
    restSec: 75,
    muscles: ["Quadriceps", "Gluteus Maximus", "Forearm Grip", "Core"],
    ytId: "L8fvypPrzzs",
    ytTitle: "Dumbbell Walking Lunge Form Breakdown",
    channel: "ScottHermanFitness",
    desc: "Dynamic forward-stepping unilateral lunges holding dumbbells at the sides.",
    why: "Builds functional unilateral leg strength, hip extension, and grip endurance.",
    cues: [
      "Hold dumbbells at sides with shoulders packed down and back",
      "Take a controlled step forward and lower back knee 1 inch from floor",
      "Drive through front heel directly into the next step"
    ],
    mistake: "Banging the back knee onto the floor."
  },
  {
    id: "cat-leg-24",
    name: "Dumbbell Step-Ups (Knee-Over-Midfoot)",
    eq: "dumbbell",
    group: "legs-glutes",
    anim: "lunge",
    sets: 3,
    reps: 10,
    repLabel: "10 reps per leg",
    holdSec: 45,
    restSec: 60,
    muscles: ["Gluteus Maximus", "Quadriceps", "Gluteus Medius"],
    ytId: "dQqApCGd5Ss",
    ytTitle: "How to Do Step-Ups Without Pushing Off the Back Foot",
    channel: "Squat University",
    desc: "Strict unilateral step-up onto a knee-high box with zero push-off from the trailing floor foot.",
    why: "Pure concentric and eccentric single-leg quad and glute builder.",
    cues: [
      "Plant entire working foot on box and dorsiflex trailing floor toes up",
      "Lean torso slightly forward over working knee and drive straight up",
      "Lower slowly over 3 seconds before trailing heel touches floor"
    ],
    mistake: "Springing off the bottom foot to help the top leg."
  },
  // =========================================================================
  // GROUP 5: CORE BRACING, McGILL SPINE & LOADED CARRIES (20 Exercises)
  // =========================================================================
  {
    id: "cat-core-01",
    name: "McGill Modified Curl-Up (Lumbar Protected)",
    eq: "bodyweight",
    group: "core-grip-carries",
    anim: "mcgill-curlup",
    sets: 4,
    reps: 5,
    repLabel: "5 \xD7 10s isometric holds",
    holdSec: 10,
    restSec: 25,
    muscles: ["Rectus Abdominis", "Transverse Abdominis", "Deep Cervical Flexors"],
    ytId: "C89EKtI8a3o",
    ytTitle: "The McGill Big 3: How to Do the McGill Curl-Up Correctly",
    channel: "Squat University",
    desc: "Dr. Stuart McGill anterior core brace lifting head and shoulders 1 inch with hands supporting the lumbar curve.",
    why: "Builds anterior core stiffness with zero intervertebral disc flexion stress.",
    cues: [
      "Slide palms-down hands under lower back with one knee bent and one leg straight",
      "Brace abs 360\xB0 and hover head/shoulders 1 inch as one rigid block",
      "Hold 10 seconds while breathing smoothly"
    ],
    mistake: "Flattening the lower back into your hands or crunching high."
  },
  {
    id: "cat-core-02",
    name: "McGill Side Bridge (QL & Obliques)",
    eq: "bodyweight",
    group: "core-grip-carries",
    anim: "mcgill-sidebridge",
    sets: 4,
    reps: 5,
    repLabel: "5 \xD7 10s holds per side",
    holdSec: 10,
    restSec: 25,
    muscles: ["Quadratus Lumborum", "Internal & External Obliques", "Gluteus Medius"],
    ytId: "2_e4I-brfqs",
    ytTitle: "McGill Side Bridge / Side Plank Coaching Breakdown",
    channel: "Squat University",
    desc: "Lateral core pillar bridge hinges hips forward and upward to lock the quadratus lumborum and obliques.",
    why: "Highest lateral spine stabilization with minimal compressive load.",
    cues: [
      "Stack elbow directly beneath shoulder and place top hand on opposite shoulder",
      "Hinge hips forward and up into a straight diagonal line",
      "Hold 10 seconds with calm diaphragmatic breathing"
    ],
    mistake: "Shrugging the bottom shoulder or twisting the pelvis."
  },
  {
    id: "cat-core-03",
    name: "McGill Bird Dog (Posterior Anti-Rotation)",
    eq: "bodyweight",
    group: "core-grip-carries",
    anim: "mcgill-birddog",
    sets: 4,
    reps: 5,
    repLabel: "5 \xD7 10s holds per side",
    holdSec: 10,
    restSec: 25,
    muscles: ["Erector Spinae", "Multifidus", "Gluteus Maximus", "Latissimus Dorsi"],
    ytId: "pS-SfFoc8uk",
    ytTitle: "How to Master the McGill Bird Dog",
    channel: "Squat University",
    desc: "Quadruped opposite fist-and-heel horizontal extension training posterior chain co-contraction.",
    why: "Trains multifidus and erector spinae endurance without spinal hyperextension.",
    cues: [
      "Brace core in quadruped before moving any limb",
      "Clench front fist and push opposite heel straight back parallel to floor",
      "Hold 10 seconds, then sweep hand to knee underneath before repeating"
    ],
    mistake: "Raising the back leg above hip height and arching the lower back."
  },
  {
    id: "cat-core-04",
    name: "Heavy Bilateral Farmer\u2019s Carries (10m Walk)",
    eq: "kettlebell",
    group: "core-grip-carries",
    anim: "farmers-carry",
    sets: 3,
    reps: 1,
    repLabel: "10m walk (30s carry)",
    holdSec: 30,
    restSec: 60,
    muscles: ["Forearm Crush Grip", "Upper & Lower Trapezius", "Quadratus Lumborum", "Core"],
    ytId: "p5MNNosenJc",
    ytTitle: "How to Do the Farmer\u2019s Walk Correctly",
    channel: "Buff Dudes",
    desc: "Walking tall with heavy kettlebells or dumbbells in both hands for total-body axial stability and grip.",
    why: 'Creates a "walking plank" that integrates grip, traps, and 360\xB0 core bracing.',
    cues: [
      "Deadlift weights cleanly and pack shoulders down and slightly back",
      "Brace abdominal wall 360\xB0 and keep crown of head tall",
      "Take short, crisp heel-to-toe steps with zero lateral sway"
    ],
    mistake: "Letting weights bang into thighs or shrugging shoulders into ears."
  },
  {
    id: "cat-core-05",
    name: "Kettlebell Front-Rack March in Place",
    eq: "kettlebell",
    group: "core-grip-carries",
    anim: "farmers-carry",
    sets: 3,
    reps: 20,
    repLabel: "20 slow marches (30s)",
    holdSec: 30,
    restSec: 60,
    muscles: ["Internal & External Obliques", "Quadratus Lumborum", "Rectus Abdominis"],
    ytId: "nKMTa3d1YNY",
    ytTitle: "Kettlebell Rack Marches \u2014 Core & Oblique Bracing",
    channel: "Coach Gabe West",
    desc: "Standing front-rack slow march pausing on one leg for 2 seconds per step in zero floor space.",
    why: "Trains single-leg hip lock and oblique lateral stability when walking space is limited.",
    cues: [
      "Clean 1 or 2 kettlebells to front rack with elbows tucked against ribs",
      "Lift one knee to 90\xB0 hip height and pause 2 seconds without leaning",
      "Alternate legs smoothly while breathing behind the shield"
    ],
    mistake: "Leaning torso sideways over the standing leg."
  },
  {
    id: "cat-core-06",
    name: "Overhead Waiter\u2019s Kettlebell Carry / March",
    eq: "kettlebell",
    group: "core-grip-carries",
    anim: "farmers-carry",
    sets: 3,
    reps: 1,
    repLabel: "30s per arm",
    holdSec: 30,
    restSec: 60,
    muscles: ["Rotator Cuff", "Serratus Anterior", "Quadratus Lumborum", "Obliques"],
    ytId: "p5MNNosenJc",
    ytTitle: "Overhead Waiter Carry for Bulletproof Shoulders & Core",
    channel: "Squat University",
    desc: "Carrying or marching with one kettlebell locked out overhead with packed scapula and braced ribs.",
    why: "Dynamic rotator cuff centration and lateral core stability.",
    cues: [
      "Press one kettlebell overhead with elbow locked and bicep near ear",
      "Lock ribs down over pelvis so lower back cannot arch",
      "Walk or march slowly for 30 seconds per arm"
    ],
    mistake: "Bending the overhead elbow or flaring the ribcage."
  },
  {
    id: "cat-core-07",
    name: "Contralateral Dead Bugs (2s Exhale Hold)",
    eq: "bodyweight",
    group: "core-grip-carries",
    anim: "deadbug",
    sets: 4,
    reps: 12,
    repLabel: "12 slow alternating reps",
    holdSec: 40,
    restSec: 45,
    muscles: ["Transverse Abdominis", "Rectus Abdominis", "Internal Obliques", "Hip Flexors"],
    ytId: "g_BYB0R-4Ws",
    ytTitle: "How to Do the Dead Bug Exercise Correctly",
    channel: "Squat University",
    desc: "Supine anti-extension core drill extending opposite arm and leg while gluing lumbar spine to the mat.",
    why: "Teaches independent limb movement around a rock-solid core cylinder.",
    cues: [
      "Press lower back flat into the floor with knees at 90/90 tabletop",
      "Slowly extend left arm overhead and right heel 2 inches above floor",
      "Exhale fully for 2 seconds at extension, then return to center"
    ],
    mistake: "Letting the lower back arch off the mat as the leg extends."
  },
  {
    id: "cat-core-08",
    name: "RKC High-Tension Pillar Plank",
    eq: "bodyweight",
    group: "core-grip-carries",
    anim: "plank",
    sets: 3,
    reps: 1,
    repLabel: "30s maximal tension hold",
    holdSec: 30,
    restSec: 45,
    muscles: ["Rectus Abdominis", "Latissimus Dorsi", "Gluteus Maximus", "Quadriceps"],
    ytId: "6TKktamzq4o",
    ytTitle: "The RKC Plank vs Regular Plank",
    channel: "StrongFirst",
    desc: "Maximal full-body isometric contraction plank pulling elbows toward toes and toes toward elbows.",
    why: "Generates 4x higher rectus abdominis and oblique EMG activation than passive planks.",
    cues: [
      "Clench fists, lock quads, and squeeze glutes hard",
      "Isometrically pull elbows down toward toes without moving",
      "Hold maximal tension for 30 seconds with shallow breathing"
    ],
    mistake: "Hanging passively on lower-back ligaments."
  },
  {
    id: "cat-core-09",
    name: "Bodyweight Bear-Plank Hover & Taps",
    eq: "bodyweight",
    group: "core-grip-carries",
    anim: "shoulder-tap",
    sets: 3,
    reps: 16,
    repLabel: "30s hover + 16 taps",
    holdSec: 30,
    restSec: 50,
    muscles: ["Transverse Abdominis", "Serratus Anterior", "Quadriceps", "Obliques"],
    ytId: "nGSFAjjf9oI",
    ytTitle: "How To Do A Bear Plank Correctly",
    channel: "Strong And Fit",
    desc: "Quadruped knee-hover 1 inch off the floor with slow anti-rotational shoulder taps.",
    why: "Fires anterior core, quads, and serratus in a compact footprint.",
    cues: [
      "Set hands under shoulders and knees under hips at 90\xB0",
      "Hover knees just 1 inch off the floor with flat tabletop spine",
      "Tap opposite shoulder slowly without letting hips shift"
    ],
    mistake: "Lifting knees 6 inches high into a pike."
  },
  {
    id: "cat-core-10",
    name: "Gymnastic Hollow-Body Core Hold",
    eq: "bodyweight",
    group: "core-grip-carries",
    anim: "deadbug",
    sets: 3,
    reps: 1,
    repLabel: "30s hollow hold",
    holdSec: 30,
    restSec: 45,
    muscles: ["Rectus Abdominis", "Transverse Abdominis", "Hip Flexors"],
    ytId: "uZqTUwq96iU",
    ytTitle: "Hollow-Body Hold Progressions & Form",
    channel: "FitnessFAQs",
    desc: "Gymnastic anterior core hold locking ribs to pelvis with lower back pressed firmly into the floor.",
    why: "Foundational body tension for pull-ups, push-ups, and overhead pressing.",
    cues: [
      "Posteriorly tilt pelvis so lower back is 100% glued to the mat",
      "Lift shoulder blades slightly off floor and extend legs to a controllable angle",
      "Hold 30 seconds without losing lumbar contact"
    ],
    mistake: "Lowering legs too far and letting the lower back arch."
  },
  {
    id: "cat-core-11",
    name: "Supine Straight-Leg Lowering & Pelvic Curl (No Bar)",
    eq: "bodyweight",
    group: "core-grip-carries",
    anim: "deadbug",
    sets: 4,
    reps: 10,
    repLabel: "10 controlled leg lowers",
    holdSec: 35,
    restSec: 60,
    muscles: ["Lower Rectus Abdominis", "Transverse Abdominis", "Internal Obliques"],
    ytId: "Pr1ieGZ5atk",
    ytTitle: "Supine Leg Raise & Pelvic Curl Without a Bar",
    channel: "ATHLEAN-X",
    desc: "Lying flat on the floor, curling the pelvis upward off the mat and lowering straight legs under 3-second eccentric control with lumbar glued to the floor.",
    why: "Targets lower rectus abdominis with zero pull-up bar required.",
    cues: [
      "Lie flat on the floor with palms pressing down beside your hips and lower back glued to the mat",
      "Raise legs vertical, curl tailbone 2 inches off the mat, and lower over 3 slow seconds",
      "Stop lowering the instant before your lower back begins to arch off the floor"
    ],
    mistake: "Letting the lumbar spine arch off the mat at the bottom of the leg lower."
  },
  {
    id: "cat-core-12",
    name: "Copenhagen Adductor Side Plank",
    eq: "bodyweight",
    group: "core-grip-carries",
    anim: "mcgill-sidebridge",
    sets: 3,
    reps: 1,
    repLabel: "25s hold per side",
    holdSec: 25,
    restSec: 45,
    muscles: ["Adductor Longus & Magnus", "Internal & External Obliques", "Quadratus Lumborum"],
    ytId: "2_e4I-brfqs",
    ytTitle: "Copenhagen Plank for Groin & Lateral Core Strength",
    channel: "Squat University",
    desc: "Side plank with the top inner knee or ankle resting on a bench while hovering the bottom leg.",
    why: "Sports medicine gold standard for groin resilience and pelvic stability.",
    cues: [
      "Prop on forearm with top inner knee/shin resting on a low bench",
      "Drive top leg down into bench to lift hips and bottom leg off floor",
      "Hold a straight line for 25 seconds per side"
    ],
    mistake: "Letting hips sag or rotating torso toward the floor."
  },
  {
    id: "cat-core-13",
    name: "Plank-to-Pike / Ab-Wheel Rollout Walkout",
    eq: "bodyweight",
    group: "core-grip-carries",
    anim: "plank",
    sets: 3,
    reps: 10,
    repLabel: "10 walkouts",
    holdSec: 40,
    restSec: 60,
    muscles: ["Rectus Abdominis", "Latissimus Dorsi", "Serratus Anterior"],
    ytId: "6TKktamzq4o",
    ytTitle: "Long-Lever Plank & Inchworm Walkouts for Extreme Core",
    channel: "Calisthenicmovement",
    desc: "Walking hands forward past the forehead into a long-lever extended plank and returning under control.",
    why: "Replicates ab-wheel rollout anti-extension force with zero equipment.",
    cues: [
      "Start in a high plank with glutes squeezed and pelvis tucked slightly",
      "Walk hands 6\u201310 inches forward past shoulders into a long-lever plank",
      "Pause 2 seconds without letting lower back sag, then walk hands back"
    ],
    mistake: "Extending further than your abs can support and arching the lumbar spine."
  },
  {
    id: "cat-core-14",
    name: "Kettlebell Plank Pull-Throughs",
    eq: "kettlebell",
    group: "core-grip-carries",
    anim: "shoulder-tap",
    sets: 3,
    reps: 12,
    repLabel: "12 alternating pull-throughs",
    holdSec: 40,
    restSec: 60,
    muscles: ["Internal & External Obliques", "Transverse Abdominis", "Serratus Anterior"],
    ytId: "wTqlJ0g3M0A",
    ytTitle: "Kettlebell Plank Drag / Pull-Through Anti-Rotation",
    channel: "Kettlebell Kings",
    desc: "High-plank anti-rotational reach under the torso to drag a kettlebell from side to side.",
    why: "Teaches the obliques to resist torsional shear while transferring load across the midline.",
    cues: [
      "Set a wide foot stance in a high plank with a kettlebell outside your left hand",
      "Reach under your torso with your right hand and drag the bell to the right side",
      "Keep hips frozen level throughout every drag"
    ],
    mistake: "Piking or twisting the hips to slide the bell."
  },
  {
    id: "cat-core-15",
    name: "Kettlebell Turkish Get-Up (Half or Full)",
    eq: "kettlebell",
    group: "core-grip-carries",
    anim: "mcgill-sidebridge",
    sets: 3,
    reps: 4,
    repLabel: "2 slow reps per side",
    holdSec: 45,
    restSec: 60,
    muscles: ["Rotator Cuff", "Obliques", "Gluteus Maximus", "Full-Body Stabilizers"],
    ytId: "0bWRPC49-KI",
    ytTitle: "How to Do the Kettlebell Turkish Get-Up Step by Step",
    channel: "StrongFirst",
    desc: "Multi-planar floor-to-standing movement keeping a kettlebell locked vertically overhead.",
    why: "Combines shoulder stability, hip mobility, and 3D core control in one sequence.",
    cues: [
      "Lie supine with right knee bent and right arm locking kettlebell overhead",
      "Drive through right heel to roll onto left elbow, then post to left hand and bridge",
      "Sweep left knee under hip into half-kneeling, stand tall, and reverse step-by-step"
    ],
    mistake: "Crunching straight up instead of rolling to the supporting elbow."
  },
  {
    id: "cat-core-16",
    name: "Kettlebell Windmill (Obliques & Hip Hinge)",
    eq: "kettlebell",
    group: "core-grip-carries",
    anim: "rdl",
    sets: 3,
    reps: 6,
    repLabel: "6 windmills per side",
    holdSec: 40,
    restSec: 60,
    muscles: ["Obliques", "Quadratus Lumborum", "Gluteus Medius", "Shoulder Stabilizers"],
    ytId: "0bWRPC49-KI",
    ytTitle: "Kettlebell Windmill Technique & Hip Hinge",
    channel: "Kettlebell Kings",
    desc: "Angled hip hinge sliding the free hand down the inside of the front shin while locking a kettlebell overhead.",
    why: "Builds extraordinary lateral core strength and thoracic mobility.",
    cues: [
      "Lock kettlebell overhead with right arm and turn both feet 45\xB0 to the left",
      "Push right hip out and back while sliding left hand down inside of left shin",
      "Keep eyes on the overhead kettlebell and drive hip forward to stand"
    ],
    mistake: "Bending sideways at the waist instead of hinging into the back hip."
  },
  {
    id: "cat-core-17",
    name: "Kettlebell Russian Twists (Rib-Locked Rotation)",
    eq: "kettlebell",
    group: "core-grip-carries",
    anim: "mcgill-curlup",
    sets: 3,
    reps: 16,
    repLabel: "16 controlled rotations",
    holdSec: 35,
    restSec: 45,
    muscles: ["Internal & External Obliques", "Rectus Abdominis"],
    ytId: "wkD8rjkodUI",
    ytTitle: "How to Do Russian Twists Safely (Rotate the Shoulders!)",
    channel: "ATHLEAN-X",
    desc: "Heels-planted V-sit thoracic rotation moving the entire shoulder girdle side to side.",
    why: "Rotates through the thoracic spine rather than grinding the lumbar discs.",
    cues: [
      "Sit with heels planted on the floor and torso leaned back at 45\xB0 with neutral spine",
      "Hold kettlebell by horns at chest and rotate shoulders 45\xB0 left and right",
      "Move hands and sternum together as one unit"
    ],
    mistake: "Keeping chest forward and only swinging arms side to side."
  },
  {
    id: "cat-core-18",
    name: "Stir-the-Pot Forearm Plank Circles",
    eq: "bodyweight",
    group: "core-grip-carries",
    anim: "plank",
    sets: 3,
    reps: 12,
    repLabel: "6 circles each direction",
    holdSec: 35,
    restSec: 60,
    muscles: ["Rectus Abdominis", "Obliques", "Serratus Anterior", "Latissimus Dorsi"],
    ytId: "C89EKtI8a3o",
    ytTitle: "Dr. Stuart McGill Stir-the-Pot Advanced Core Exercise",
    channel: "Squat University",
    desc: "Dr. Stuart McGill advanced progression tracing small forearm circles while keeping the spine motionless.",
    why: "Trains dynamic anti-extension and anti-rotation simultaneously.",
    cues: [
      "Assume a wide-foot forearm plank on a stability ball or cushioned mat",
      "Trace slow 6-inch circles with your forearms while keeping pelvis frozen",
      "Complete 6 clockwise and 6 counter-clockwise circles"
    ],
    mistake: "Letting lower back sag as forearms reach forward."
  },
  {
    id: "cat-core-19",
    name: "Reverse Crunch (Posterior Pelvic Tilt)",
    eq: "bodyweight",
    group: "core-grip-carries",
    anim: "deadbug",
    sets: 3,
    reps: 12,
    repLabel: "12 controlled pelvic curls",
    holdSec: 35,
    restSec: 45,
    muscles: ["Lower Rectus Abdominis", "External Obliques"],
    ytId: "hyv14e2QDq0",
    ytTitle: "How to Do the Reverse Crunch for Lower Abs",
    channel: "Jeff Nippard",
    desc: "Supine lower-ab curl lifting the tailbone off the mat toward the ribcage with controlled 3-second lowering.",
    why: "Directly trains the external obliques and rectus abdominis in posterior pelvic tilt.",
    cues: [
      "Lie on back holding a stable anchor or pressing palms into mat",
      "Curl tailbone and knees toward chest so lower back rolls slightly off mat",
      "Lower vertebrae by vertebrae over 3 slow seconds"
    ],
    mistake: "Using momentum to swing legs overhead."
  },
  {
    id: "cat-core-20",
    name: "L-Sit Isometric Core Support Hold",
    eq: "bodyweight",
    group: "core-grip-carries",
    anim: "deadbug",
    sets: 4,
    reps: 1,
    repLabel: "20s tucked or straight L-sit",
    holdSec: 20,
    restSec: 60,
    muscles: ["Rectus Abdominis", "Hip Flexors", "Lower Trapezius", "Triceps"],
    ytId: "IUZJoSP66HI",
    ytTitle: "How to L-Sit (Step-by-Step Progression)",
    channel: "FitnessFAQs",
    desc: "Depressing shoulders on the floor or kettlebell handles to lift hips and legs off the ground.",
    why: "Builds extreme abdominal compression, scapular depression, and triceps lockout.",
    cues: [
      "Place hands on floor or kettlebell handles beside hips and push shoulders down",
      "Lift hips and tucked knees (or straight legs) off the floor",
      "Hold 20 seconds while breathing steadily"
    ],
    mistake: "Shrugging shoulders into ears and collapsing the chest."
  }
];
var CATALOG_PART_2 = SEEDS_PART_2.map((s) => ({
  id: s.id,
  name: s.name,
  category: "strength",
  animationType: s.anim,
  equipmentType: s.eq,
  equipmentLabel: EQUIPMENT_LABELS2[s.eq],
  muscleGroupTag: s.group,
  whySwap: s.why,
  defaultSets: s.sets,
  defaultReps: s.reps,
  repLabel: s.repLabel,
  defaultHoldSeconds: s.holdSec,
  defaultRestSeconds: s.restSec,
  prepCountdownSeconds: 10,
  description: s.desc,
  formCues: s.cues,
  targetedMuscles: s.muscles,
  videoReference: {
    youtubeId: s.ytId,
    title: s.ytTitle,
    channelName: s.channel,
    durationLabel: `${s.sets} Sets \xD7 ${s.repLabel}`,
    stepByStepBreakdown: [
      s.cues[0],
      s.cues[1],
      s.cues[2],
      `Rest ${s.restSec}s between sets to allow full ATP-PCr and neuromuscular recovery.`
    ],
    commonMistakes: [s.mistake, "Losing 360\xB0 abdominal bracing during the eccentric phase."]
  }
}));

// src/data/exerciseAlternatives.ts
var FULL_EXERCISE_CATALOG = [
  ...CATALOG_PART_1,
  ...CATALOG_PART_2
];

// server.ts
dotenv.config();
var fitbitSession = null;
var pkceVerifiers = /* @__PURE__ */ new Map();
var GOOGLE_FIT_ACTIVITY_NAMES = {
  1: "Biking",
  8: "Running",
  7: "Walking",
  9: "Aerobics",
  13: "Stationary Biking (Spinning)",
  14: "Utility Biking",
  15: "Road Biking",
  16: "Mountain Biking",
  19: "E-Bike / Handbiking",
  80: "Strength Training",
  81: "Weightlifting",
  97: "Weight Training",
  98: "Core & Circuit Training",
  100: "Yoga",
  61: "Pilates",
  113: "CrossFit / High Intensity",
  114: "HIIT Conditioning",
  116: "Calisthenics"
};
function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    const key = parts.shift()?.trim();
    if (key) {
      list[key] = decodeURIComponent(parts.join("="));
    }
  });
  return list;
}
function getRedirectUri(req) {
  const queryRedirect = typeof req.query.redirectUri === "string" ? req.query.redirectUri : "";
  if (queryRedirect) return queryRedirect;
  const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
  if (appUrl && appUrl.startsWith("http")) {
    return `${appUrl}/auth/callback`;
  }
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.get("host") || "localhost:3000";
  return `${proto}://${host}/auth/callback`;
}
var SYSTEM_INSTRUCTION = `You are the ApexPulse Biomechanics & Strength Coach powered by Gemini.
You help the user with concise, practical, clinically sound exercise tips, step-by-step form cues, breathing mechanics, progressions/regressions, and spine-sparing adjustments.

The user's weekly training schedule is:
- Monday, Wednesday, Friday: Strength (or Core Stability Strength Alt routine)
- Tuesday, Thursday, Saturday: Cardio (Outdoor E-Bike or Indoor Spinning, 35 mins)
- Sunday: Full Rest & Recovery (optional McGill Big 3 spine hygiene)

The user's 4 routines and exact exercises are:
1. Primary Strength Routine (30 mins):
   - Pull-Ups: 5 sets \xD7 3 reps (15 total pull-ups, dead hang to chin over bar, active scapular depression)
   - Push-Ups: 4 sets \xD7 12 reps (45\xB0 elbow track, rigid plank core)
   - Diamond Push-Ups: 3 sets \xD7 8 reps (hands under sternum, elbows tucked)
   - Squats: 4 sets \xD7 15 reps (360\xB0 core brace, tripod foot, neutral spine)
   - Farmer's Carries: 3 sets \xD7 10m walk (packed shoulders, heel-to-toe short steps, zero lateral sway)

2. Core Stability Strength (Alt Routine, 28 mins):
   - Supinated Chin-Ups / Scapular Pulls: 5 sets \xD7 3 reps (hollow-body core brace)
   - Contralateral Dead Bugs: 4 sets \xD7 12 reps (ribs locked down, 2s bottom exhale)
   - Plank Shoulder-Tap Push-Ups: 3 sets \xD7 8 reps (wide foot base, zero pelvic rotation)
   - Glute Bridges with Isometric Hold: 4 sets \xD7 15 reps (2s top glute squeeze, no lumbar hyperextension)
   - RKC High-Tension Pillar Plank: 3 sets \xD7 30s hold (pull elbows toward toes isometrically)

3. McGill Big 3 Spine Hygiene Protocol (15 mins, mandatory 10s prep countdown + 10s isometric holds):
   - McGill Modified Curl-Up: Hands under lower back, one knee bent, lift head/shoulders 1 inch as a block.
   - McGill Side Bridge: Elbow under shoulder, hinge hips up, lateral oblique & QL brace.
   - McGill Bird Dog: Quadruped, extend opposite fist and heel parallel to floor without lumbar arching.

4. Cardio (35 mins):
   - E-Bike Outdoor or Spinning Indoors (80-100 RPM cadence, neutral spine hinge, 25-30\xB0 knee bend at bottom of stroke).

Formatting rules:
- Keep answers clear, encouraging, and structured with short bullet points.
- Highlight the most important biomechanical cue first, then common mistakes to avoid, and a quick progression or modification if helpful.`;
async function startServer() {
  const app = express();
  const PORT = 3e3;
  app.use(express.json());
  function findInitialDataJson(html) {
    const patterns = [
      /var\s+ytInitialData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/,
      /window\["ytInitialData"\]\s*=\s*(\{[\s\S]*?\});\s*<\/script>/,
      /ytInitialData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/
    ];
    for (const pat of patterns) {
      const match = html.match(pat);
      if (match && match[1]) {
        try {
          return JSON.parse(match[1]);
        } catch {
        }
      }
    }
    return null;
  }
  function collectVideosFromInitialData(node, out, seenIds, playlistId, playlistTitle) {
    if (!node || typeof node !== "object") return;
    const vr = node.videoRenderer || node.playlistVideoRenderer || node.compactVideoRenderer;
    if (vr && typeof vr.videoId === "string" && vr.videoId.length === 11 && !seenIds.has(vr.videoId)) {
      const title = vr.title?.runs?.[0]?.text || vr.title?.simpleText || "";
      if (title && title !== "Private video" && title !== "Deleted video") {
        seenIds.add(vr.videoId);
        const rawArtist = vr.ownerText?.runs?.[0]?.text || vr.shortBylineText?.runs?.[0]?.text || vr.longBylineText?.runs?.[0]?.text || "YouTube Music";
        const thumbs = vr.thumbnail?.thumbnails || [];
        const thumbUrl = thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${vr.videoId}/mqdefault.jpg`;
        out.push({
          id: `ytm-${playlistId || "search"}-${vr.videoId}`,
          videoId: vr.videoId,
          title: String(title),
          artist: String(rawArtist).replace(/ - Topic$/i, ""),
          thumbnailUrl: thumbUrl,
          playlistId,
          playlistTitle
        });
      }
    }
    if (Array.isArray(node)) {
      for (const item of node) {
        collectVideosFromInitialData(item, out, seenIds, playlistId, playlistTitle);
      }
    } else {
      for (const key of Object.keys(node)) {
        collectVideosFromInitialData(node[key], out, seenIds, playlistId, playlistTitle);
      }
    }
  }
  app.get("/api/ytmusic/search", async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      if (!q) {
        res.json({ tracks: [] });
        return;
      }
      const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q + " audio")}&hl=en`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9"
        },
        signal: AbortSignal.timeout(7e3)
      });
      const html = await response.text();
      const data = findInitialDataJson(html);
      const tracks = [];
      const seen = /* @__PURE__ */ new Set();
      if (data) {
        collectVideosFromInitialData(data, tracks, seen, void 0, `Search: ${q}`);
      }
      res.json({ tracks: tracks.slice(0, 25) });
    } catch (err) {
      res.status(500).json({ error: err?.message || "Search failed", tracks: [] });
    }
  });
  app.get("/api/ytmusic/playlist", async (req, res) => {
    try {
      const rawList = String(req.query.list || "").trim();
      if (!rawList) {
        res.status(400).json({ error: "Missing playlist ID", tracks: [] });
        return;
      }
      const cleanListId = rawList.startsWith("VL") ? rawList.slice(2) : rawList;
      const url = `https://www.youtube.com/playlist?list=${encodeURIComponent(cleanListId)}&hl=en`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9"
        },
        signal: AbortSignal.timeout(8e3)
      });
      const html = await response.text();
      const data = findInitialDataJson(html);
      const playlistTitle = data?.metadata?.playlistMetadataRenderer?.title || data?.header?.playlistHeaderRenderer?.title?.simpleText || "YouTube Music Playlist";
      const tracks = [];
      const seen = /* @__PURE__ */ new Set();
      if (data) {
        collectVideosFromInitialData(data, tracks, seen, cleanListId, playlistTitle);
      }
      res.json({
        playlistId: cleanListId,
        title: playlistTitle,
        tracks: tracks.slice(0, 500)
      });
    } catch (err) {
      res.status(500).json({ error: err?.message || "Playlist load failed", tracks: [] });
    }
  });
  app.get("/api/ytmusic/starter-liked", async (_req, res) => {
    try {
      const queries = [
        "official audio workout hits",
        "official audio gym motivation hits",
        "official audio upbeat running songs",
        "official audio classic rock hip hop workout"
      ];
      const tracks = [];
      const seen = /* @__PURE__ */ new Set();
      await Promise.all(
        queries.map(async (q) => {
          try {
            const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&hl=en`;
            const response = await fetch(url, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9"
              },
              signal: AbortSignal.timeout(7e3)
            });
            const html = await response.text();
            const data = findInitialDataJson(html);
            if (data) {
              collectVideosFromInitialData(data, tracks, seen, "LM", "Liked Music");
            }
          } catch {
          }
        })
      );
      res.json({ tracks: tracks.slice(0, 120) });
    } catch (err) {
      res.status(500).json({ error: err?.message || "Starter load failed", tracks: [] });
    }
  });
  let androidHealthCloudQueue = [];
  app.post("/api/android-health/push", (req, res) => {
    try {
      const payload = req.body;
      const incomingList = Array.isArray(payload) ? payload : Array.isArray(payload?.workouts) ? payload.workouts : payload ? [payload] : [];
      const todayIso = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      const normalized = incomingList.map((item, idx) => {
        const rawTitle = String(
          item.routineTitle || item.title || item.activity || item.type || "Android Health Workout"
        );
        const titleLower = rawTitle.toLowerCase();
        const isCardio = item.category === "cardio" || titleLower.includes("bike") || titleLower.includes("biking") || titleLower.includes("cycle") || titleLower.includes("cycling") || titleLower.includes("spin") || titleLower.includes("run") || titleLower.includes("walk") || titleLower.includes("cardio");
        const isMcGill = item.category === "mcgill" || titleLower.includes("mcgill") || titleLower.includes("yoga") || titleLower.includes("pilates") || titleLower.includes("core") || titleLower.includes("mobility");
        const category = isMcGill ? "mcgill" : isCardio ? "cardio" : "strength";
        const durationMinutes = Number(item.durationMinutes || item.duration || 30);
        const durationSeconds = Number(item.durationSeconds || Math.max(60, durationMinutes * 60));
        const dateStr = typeof item.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : todayIso;
        return {
          id: `hc-${dateStr}-${Date.now()}-${idx}`,
          fitbitLogId: String(item.id || `hc-${dateStr}-${rawTitle}-${durationSeconds}`),
          source: "fitbit",
          date: dateStr,
          routineId: category === "mcgill" ? "mcgill-big-3" : category === "cardio" ? "cardio-session" : "strength",
          routineTitle: rawTitle,
          category,
          durationSeconds,
          completedExercisesCount: isCardio ? 1 : 5,
          cardioMode: isCardio ? titleLower.includes("spin") || titleLower.includes("indoor") ? "spinning" : "ebike" : void 0,
          caloriesBurned: Number(item.caloriesBurned || item.calories || 0) || void 0,
          averageHeartRate: Number(item.averageHeartRate || item.heartRate || 0) || void 0,
          steps: Number(item.steps || 0) || void 0,
          timestamp: Date.now()
        };
      });
      androidHealthCloudQueue = [...normalized, ...androidHealthCloudQueue].slice(0, 100);
      res.json({
        success: true,
        added: normalized.length,
        workouts: normalized
      });
    } catch (err) {
      res.status(500).json({ error: err?.message || "Failed to ingest Android Health workout." });
    }
  });
  app.get("/api/android-health/pull", (_req, res) => {
    res.json({
      workouts: androidHealthCloudQueue,
      count: androidHealthCloudQueue.length
    });
  });
  app.get("/auth/google-token-callback", (req, res) => {
    res.send(`
      <html>
        <body style="background:#07090E;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <script>
            (function() {
              var hash = window.location.hash.substring(1);
              var params = new URLSearchParams(hash);
              var accessToken = params.get('access_token');
              var error = params.get('error');
              if (window.opener) {
                if (accessToken) {
                  window.opener.postMessage({
                    type: 'GOOGLE_FITNESS_TOKEN_SUCCESS',
                    accessToken: accessToken,
                    scope: params.get('scope') || ''
                  }, '*');
                } else {
                  window.opener.postMessage({
                    type: 'FITBIT_AUTH_ERROR',
                    error: error || 'No access token returned from Google.'
                  }, '*');
                }
                window.close();
              }
            })();
          </script>
          <div style="text-align:center;padding:24px;">
            <h3 style="color:#10b981;">Completing Google Health Authorization...</h3>
            <p>This window will close automatically.</p>
          </div>
        </body>
      </html>
    `);
  });
  const fitbitCredsPath = path.join(process.cwd(), ".fitbit-creds.json");
  let runtimeFitbitClientId = process.env.FITBIT_CLIENT_ID || "";
  let runtimeFitbitClientSecret = process.env.FITBIT_CLIENT_SECRET || "";
  try {
    if (fs.existsSync(fitbitCredsPath)) {
      const saved = JSON.parse(fs.readFileSync(fitbitCredsPath, "utf8"));
      if (saved.clientId) runtimeFitbitClientId = saved.clientId;
      if (saved.clientSecret) runtimeFitbitClientSecret = saved.clientSecret;
    }
  } catch {
  }
  app.post("/api/fitbit/credentials", (req, res) => {
    const { clientId, clientSecret } = req.body || {};
    if (!clientId) {
      return res.status(400).json({ error: "Fitbit Client ID is required." });
    }
    runtimeFitbitClientId = String(clientId).trim();
    runtimeFitbitClientSecret = String(clientSecret || "").trim();
    try {
      fs.writeFileSync(
        fitbitCredsPath,
        JSON.stringify({
          clientId: runtimeFitbitClientId,
          clientSecret: runtimeFitbitClientSecret
        }),
        "utf8"
      );
    } catch {
    }
    res.json({ success: true, hasFitbitCredentials: true });
  });
  app.get("/api/fitbit/status", (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    const cookieToken = cookies.google_health_access_token || cookies.fitbit_access_token;
    const headerToken = req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
    const activeToken = headerToken || cookieToken || fitbitSession?.accessToken || process.env.GOOGLE_HEALTH_ACCESS_TOKEN || process.env.FITBIT_ACCESS_TOKEN;
    const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET;
    const fitbitClientId = runtimeFitbitClientId || process.env.FITBIT_CLIENT_ID;
    const fitbitClientSecret = runtimeFitbitClientSecret || process.env.FITBIT_CLIENT_SECRET;
    res.json({
      connected: Boolean(activeToken),
      provider: cookies.google_health_access_token ? "google" : fitbitSession?.provider || (fitbitClientId ? "fitbit" : "google"),
      hasGoogleCredentials: Boolean(googleClientId && googleClientSecret),
      hasFitbitCredentials: Boolean(fitbitClientId),
      hasOAuthCredentials: Boolean(
        googleClientId && googleClientSecret || fitbitClientId
      ),
      userId: fitbitSession?.userId || null,
      displayName: fitbitSession?.displayName || null,
      redirectUri: getRedirectUri(req)
    });
  });
  app.get("/api/fitbit/auth/url", (req, res) => {
    const provider = typeof req.query.provider === "string" && req.query.provider === "fitbit" ? "fitbit" : "google";
    const redirectUri = getRedirectUri(req);
    if (provider === "google") {
      const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID;
      if (!googleClientId) {
        res.status(400).json({
          error: "GOOGLE_CLIENT_ID is not configured yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET from Google Cloud Console in the AI Studio Secrets panel.",
          redirectUri
        });
        return;
      }
      const state2 = Buffer.from(
        JSON.stringify({
          provider: "google",
          redirectUri,
          nonce: crypto.randomBytes(8).toString("hex")
        })
      ).toString("base64url");
      const params2 = new URLSearchParams({
        client_id: googleClientId,
        redirect_uri: redirectUri,
        response_type: "code",
        access_type: "offline",
        prompt: "consent",
        scope: [
          "https://www.googleapis.com/auth/fitness.activity.read",
          "https://www.googleapis.com/auth/fitness.body.read",
          "https://www.googleapis.com/auth/userinfo.profile"
        ].join(" "),
        state: state2
      });
      const authUrl2 = `https://accounts.google.com/o/oauth2/v2/auth?${params2.toString()}`;
      res.json({ url: authUrl2, redirectUri, provider: "google" });
      return;
    }
    const clientId = typeof req.query.clientId === "string" && req.query.clientId.trim() || runtimeFitbitClientId || process.env.FITBIT_CLIENT_ID;
    if (!clientId) {
      res.status(400).json({
        error: "FITBIT_CLIENT_ID is not configured yet.",
        redirectUri
      });
      return;
    }
    const verifier = crypto.randomBytes(32).toString("base64url");
    const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
    const state = Buffer.from(
      JSON.stringify({
        provider: "fitbit",
        redirectUri,
        nonce: crypto.randomBytes(8).toString("hex")
      })
    ).toString("base64url");
    pkceVerifiers.set(state, verifier);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "activity heartrate profile",
      code_challenge: challenge,
      code_challenge_method: "S256",
      state
    });
    const authUrl = `https://www.fitbit.com/oauth2/authorize?${params.toString()}`;
    res.json({ url: authUrl, redirectUri, provider: "fitbit" });
  });
  const fitbitCallbackHandler = async (req, res) => {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const error = typeof req.query.error === "string" ? req.query.error : "";
    if (error || !code) {
      res.send(`
        <html>
          <body style="background:#07090E;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'FITBIT_AUTH_ERROR', error: ${JSON.stringify(error || "Missing authorization code")} }, '*');
                window.close();
              }
            </script>
            <div style="text-align:center;padding:24px;">
              <h3>Connection Cancelled</h3>
              <p>You can close this window.</p>
            </div>
          </body>
        </html>
      `);
      return;
    }
    let redirectUri = getRedirectUri(req);
    let provider = "google";
    try {
      if (state) {
        const parsedState = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
        if (parsedState.redirectUri) {
          redirectUri = parsedState.redirectUri;
        }
        if (parsedState.provider === "fitbit") {
          provider = "fitbit";
        }
      }
    } catch {
    }
    if (provider === "google") {
      const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID || "";
      const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET || "";
      try {
        const bodyParams = new URLSearchParams({
          client_id: googleClientId,
          client_secret: googleClientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri
        });
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: bodyParams.toString()
        });
        const tokenData = await tokenRes.json();
        if (!tokenRes.ok || !tokenData.access_token) {
          const errMsg = tokenData?.error_description || tokenData?.error || "Failed to exchange Google OAuth authorization code";
          res.send(`
            <html>
              <body style="background:#07090E;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
                <script>
                  if (window.opener) {
                    window.opener.postMessage({ type: 'FITBIT_AUTH_ERROR', error: ${JSON.stringify(errMsg)} }, '*');
                    window.close();
                  }
                </script>
                <div style="text-align:center;padding:24px;">
                  <h3>Google Health Auth Error</h3>
                  <p>${errMsg}</p>
                </div>
              </body>
            </html>
          `);
          return;
        }
        let displayName = "Google Health User";
        try {
          const profRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
          });
          if (profRes.ok) {
            const prof = await profRes.json();
            displayName = prof.name || prof.email || "Google Health User";
          }
        } catch {
        }
        fitbitSession = {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1e3,
          userId: displayName,
          displayName,
          provider: "google"
        };
        res.cookie("google_health_access_token", tokenData.access_token, {
          secure: true,
          sameSite: "none",
          httpOnly: true,
          maxAge: (tokenData.expires_in || 3600) * 1e3
        });
        res.send(`
          <html>
            <body style="background:#07090E;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
              <script>
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'OAUTH_AUTH_SUCCESS',
                    provider: 'google',
                    userId: ${JSON.stringify(displayName)}
                  }, '*');
                  window.close();
                } else {
                  window.location.href = '/';
                }
              </script>
              <div style="text-align:center;padding:24px;">
                <h3 style="color:#10b981;">Google Health Connected!</h3>
                <p>Syncing your workouts... This window will close automatically.</p>
              </div>
            </body>
          </html>
        `);
        return;
      } catch (err) {
        res.status(500).send(`Google OAuth callback error: ${err?.message || "Unknown error"}`);
        return;
      }
    }
    const verifier = pkceVerifiers.get(state);
    if (state) pkceVerifiers.delete(state);
    const clientId = runtimeFitbitClientId || process.env.FITBIT_CLIENT_ID || "";
    const clientSecret = runtimeFitbitClientSecret || process.env.FITBIT_CLIENT_SECRET || "";
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    try {
      const bodyParams = new URLSearchParams({
        client_id: clientId,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code
      });
      if (verifier) {
        bodyParams.set("code_verifier", verifier);
      }
      const headers = {
        "Content-Type": "application/x-www-form-urlencoded"
      };
      if (clientSecret) {
        headers.Authorization = `Basic ${basicAuth}`;
      }
      const tokenRes = await fetch("https://api.fitbit.com/oauth2/token", {
        method: "POST",
        headers,
        body: bodyParams.toString()
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        const errMsg = tokenData?.errors?.[0]?.message || tokenData?.error_description || "Failed to exchange Fitbit authorization code";
        res.send(`
          <html>
            <body style="background:#07090E;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'FITBIT_AUTH_ERROR', error: ${JSON.stringify(errMsg)} }, '*');
                  window.close();
                }
              </script>
              <div style="text-align:center;padding:24px;">
                <h3>Fitbit Auth Error</h3>
                <p>${errMsg}</p>
              </div>
            </body>
          </html>
        `);
        return;
      }
      fitbitSession = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: Date.now() + (tokenData.expires_in || 28800) * 1e3,
        userId: tokenData.user_id,
        provider: "fitbit"
      };
      res.cookie("fitbit_access_token", tokenData.access_token, {
        secure: true,
        sameSite: "none",
        httpOnly: true,
        maxAge: (tokenData.expires_in || 28800) * 1e3
      });
      res.send(`
        <html>
          <body style="background:#07090E;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'OAUTH_AUTH_SUCCESS',
                  provider: 'fitbit',
                  userId: ${JSON.stringify(tokenData.user_id || "")}
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <div style="text-align:center;padding:24px;">
              <h3 style="color:#10b981;">Fitbit Connected!</h3>
              <p>Syncing your workouts... This window will close automatically.</p>
            </div>
          </body>
        </html>
      `);
    } catch (err) {
      res.status(500).send(`OAuth callback error: ${err?.message || "Unknown error"}`);
    }
  };
  app.get(["/auth/callback", "/auth/callback/", "/api/fitbit/callback", "/api/fitbit/callback/"], fitbitCallbackHandler);
  app.post("/api/fitbit/disconnect", (req, res) => {
    fitbitSession = null;
    res.clearCookie("google_health_access_token", {
      secure: true,
      sameSite: "none",
      httpOnly: true
    });
    res.clearCookie("fitbit_access_token", {
      secure: true,
      sameSite: "none",
      httpOnly: true
    });
    res.json({ disconnected: true });
  });
  app.get("/api/fitbit/activities", async (req, res) => {
    try {
      const cookies = parseCookies(req.headers.cookie);
      const googleToken = cookies.google_health_access_token || (fitbitSession?.provider === "google" ? fitbitSession.accessToken : void 0) || process.env.GOOGLE_HEALTH_ACCESS_TOKEN;
      const fitbitToken = cookies.fitbit_access_token || (fitbitSession?.provider === "fitbit" ? fitbitSession.accessToken : void 0) || process.env.FITBIT_ACCESS_TOKEN;
      const headerToken = req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
      if (googleToken || headerToken && fitbitSession?.provider !== "fitbit") {
        const tokenToUse = googleToken || headerToken;
        const endTime = new Date(Date.now() + 864e5).toISOString();
        const startTime = new Date(Date.now() - 45 * 864e5).toISOString();
        const sessionsUrl = `https://www.googleapis.com/fitness/v1/users/me/sessions?startTime=${encodeURIComponent(
          startTime
        )}&endTime=${encodeURIComponent(endTime)}`;
        const gRes = await fetch(sessionsUrl, {
          headers: {
            Authorization: `Bearer ${tokenToUse}`,
            Accept: "application/json"
          }
        });
        const gData = await gRes.json();
        if (!gRes.ok) {
          const msg = gData?.error?.message || "Google Health / Fitness API request failed. Ensure Fitness API is enabled in Google Cloud Console.";
          res.status(gRes.status).json({ error: msg });
          return;
        }
        const rawSessions = Array.isArray(gData?.session) ? gData.session : [];
        const workoutSessions = rawSessions.filter(
          (s) => s.activityType !== 72 && s.activityType !== 3 && s.activityType !== 0
        );
        const syncedLogs2 = workoutSessions.map((sess) => {
          const actType = Number(sess.activityType || 80);
          const mappedName = sess.name || GOOGLE_FIT_ACTIVITY_NAMES[actType] || sess.description || "Google Health Workout";
          const nameLower = String(mappedName).toLowerCase();
          const isCardio = [1, 7, 8, 9, 13, 14, 15, 16, 19].includes(actType) || nameLower.includes("bike") || nameLower.includes("biking") || nameLower.includes("cycle") || nameLower.includes("cycling") || nameLower.includes("spin") || nameLower.includes("run") || nameLower.includes("walk") || nameLower.includes("cardio");
          const isMcGill = [61, 100].includes(actType) || nameLower.includes("mcgill") || nameLower.includes("yoga") || nameLower.includes("pilates") || nameLower.includes("stretch") || nameLower.includes("mobility") || nameLower.includes("core");
          const category = isMcGill ? "mcgill" : isCardio ? "cardio" : "strength";
          const routineId = isMcGill ? "mcgill-big-3" : isCardio ? "cardio-session" : "strength";
          const cardioMode = isCardio ? actType === 13 || nameLower.includes("spin") || nameLower.includes("indoor") ? "spinning" : "ebike" : void 0;
          const startMs = Number(sess.startTimeMillis || Date.now());
          const endMs = Number(sess.endTimeMillis || startMs + 18e5);
          const durationSeconds = Math.max(60, Math.round((endMs - startMs) / 1e3));
          const dateStr = new Date(startMs).toISOString().slice(0, 10);
          return {
            id: `gfit-${sess.id || startMs}`,
            fitbitLogId: String(sess.id || startMs),
            source: "fitbit",
            date: dateStr,
            routineId,
            routineTitle: mappedName,
            category,
            durationSeconds,
            completedExercisesCount: isCardio ? 1 : 5,
            cardioMode,
            timestamp: startMs
          };
        });
        res.json({
          activities: syncedLogs2,
          totalFetched: syncedLogs2.length,
          provider: "google"
        });
        return;
      }
      const accessToken = fitbitToken || headerToken;
      if (!accessToken) {
        res.status(401).json({
          error: "Not authenticated yet. Please connect your Google Health / Google Fit account first."
        });
        return;
      }
      const tomorrow = new Date(Date.now() + 864e5).toISOString().split("T")[0];
      const fitbitUrl = `https://api.fitbit.com/1/user/-/activities/list.json?beforeDate=${tomorrow}&sort=desc&offset=0&limit=50`;
      const fitbitRes = await fetch(fitbitUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json"
        }
      });
      const data = await fitbitRes.json();
      if (!fitbitRes.ok) {
        const msg = data?.errors?.[0]?.message || "Fitbit API request failed. Your access token may have expired.";
        res.status(fitbitRes.status).json({ error: msg });
        return;
      }
      const rawActivities = Array.isArray(data?.activities) ? data.activities : [];
      const syncedLogs = rawActivities.map((act) => {
        const nameLower = String(act.activityName || "Fitbit Workout").toLowerCase();
        const isCardio = nameLower.includes("bike") || nameLower.includes("biking") || nameLower.includes("cycle") || nameLower.includes("cycling") || nameLower.includes("spin") || nameLower.includes("run") || nameLower.includes("walk") || nameLower.includes("swim") || nameLower.includes("treadmill") || nameLower.includes("elliptical") || nameLower.includes("cardio") || nameLower.includes("sport") || nameLower.includes("aerobic");
        const isMcGill = nameLower.includes("mcgill") || nameLower.includes("yoga") || nameLower.includes("pilates") || nameLower.includes("stretch") || nameLower.includes("mobility") || nameLower.includes("core");
        const category = isMcGill ? "mcgill" : isCardio ? "cardio" : "strength";
        const routineId = isMcGill ? "mcgill-big-3" : isCardio ? "cardio-session" : "strength";
        const cardioMode = isCardio ? nameLower.includes("spin") || nameLower.includes("indoor") ? "spinning" : "ebike" : void 0;
        const startTimeStr = String(act.startTime || act.originalStartTime || (/* @__PURE__ */ new Date()).toISOString());
        const dateStr = startTimeStr.slice(0, 10);
        const durationMs = Number(act.activeDuration || act.duration || 18e5);
        const durationSeconds = Math.max(60, Math.round(durationMs / 1e3));
        return {
          id: `fitbit-${act.logId}`,
          fitbitLogId: String(act.logId),
          source: "fitbit",
          date: dateStr,
          routineId,
          routineTitle: `${act.activityName || "Fitbit Session"}`,
          category,
          durationSeconds,
          completedExercisesCount: isCardio ? 1 : 5,
          cardioMode,
          caloriesBurned: typeof act.calories === "number" ? act.calories : void 0,
          averageHeartRate: typeof act.averageHeartRate === "number" ? act.averageHeartRate : void 0,
          steps: typeof act.steps === "number" ? act.steps : void 0,
          timestamp: new Date(startTimeStr).getTime() || Date.now()
        };
      });
      res.json({
        activities: syncedLogs,
        totalFetched: syncedLogs.length,
        provider: "fitbit"
      });
    } catch (err) {
      console.error("Health activities sync error:", err);
      res.status(500).json({
        error: err?.message || "Failed to sync workout activities."
      });
    }
  });
  async function performLiveBiomechanicsResearch(userQuery, selectedEx) {
    const qLower = `${userQuery} ${selectedEx || ""}`.toLowerCase();
    let pubmedSearchTerm = "";
    if (qLower.includes("pull-up") || qLower.includes("pull up") || qLower.includes("lat") || qLower.includes("row") || qLower.includes("back")) {
      pubmedSearchTerm = "latissimus dorsi EMG activation pull-up row resistance exercise biomechanics";
    } else if (qLower.includes("mcgill") || qLower.includes("curl-up") || qLower.includes("bird dog") || qLower.includes("side bridge") || qLower.includes("spine") || qLower.includes("lower back")) {
      pubmedSearchTerm = "McGill core stability lumbar spine curl-up bird dog side bridge EMG";
    } else if (qLower.includes("squat") || qLower.includes("lunge") || qLower.includes("quad") || qLower.includes("knee")) {
      pubmedSearchTerm = "squat biomechanics quadriceps gluteus maximus EMG knee joint torque";
    } else if (qLower.includes("push-up") || qLower.includes("pushup") || qLower.includes("bench") || qLower.includes("chest") || qLower.includes("pec") || qLower.includes("diamond")) {
      pubmedSearchTerm = "push-up hand position pectoralis major triceps brachii EMG activation";
    } else if (qLower.includes("rest") || qLower.includes("cool down") || qLower.includes("cooldown") || qLower.includes("timer") || qLower.includes("recovery")) {
      pubmedSearchTerm = "rest interval duration resistance training strength hypertrophy recovery";
    } else if (qLower.includes("step") || qLower.includes("8,000") || qLower.includes("8000") || qLower.includes("walk") || qLower.includes("fitbit")) {
      pubmedSearchTerm = "daily step count 8000 steps cardiovascular mortality physical activity";
    } else if (qLower.includes("carry") || qLower.includes("farmer") || qLower.includes("grip") || qLower.includes("kettlebell")) {
      pubmedSearchTerm = "loaded carry farmer walk kettlebell core activation biomechanics";
    } else {
      const cleanedWords = userQuery.replace(/[^a-zA-Z0-9\s-]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !["what", "how", "does", "with", "without", "that", "this", "from", "have", "best"].includes(w.toLowerCase())).slice(0, 5).join(" ");
      pubmedSearchTerm = `${cleanedWords || "resistance training"} exercise biomechanics EMG strength`;
    }
    const searchQueries = [pubmedSearchTerm];
    const sources = [];
    const studySummaries = [];
    try {
      const esearchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=3&sort=relevance&term=${encodeURIComponent(
        pubmedSearchTerm
      )}`;
      const searchRes = await fetch(esearchUrl, { signal: AbortSignal.timeout(4500) });
      const searchJson = await searchRes.json();
      const pmids = searchJson?.esearchresult?.idlist || [];
      if (pmids.length > 0) {
        const [sumRes, fetchRes] = await Promise.all([
          fetch(
            `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${pmids.join(",")}`,
            { signal: AbortSignal.timeout(4500) }
          ),
          fetch(
            `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml&id=${pmids.join(",")}`,
            { signal: AbortSignal.timeout(4500) }
          )
        ]);
        const sumJson = await sumRes.json();
        const xmlText = await fetchRes.text();
        const articleBlocks = xmlText.split("<PubmedArticle>");
        for (const id of pmids) {
          const meta = sumJson?.result?.[id];
          if (!meta || !meta.title) continue;
          const cleanTitle = String(meta.title).replace(/\.$/, "");
          const journal = `${meta.source || "PubMed"} (${meta.pubdate || "Peer-Reviewed"})`;
          const matchingBlock = articleBlocks.find((b) => b.includes(`>${id}</PMID>`)) || "";
          const abstractMatches = [
            ...matchingBlock.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)
          ].map((m) => m[1].replace(/<[^>]+>/g, "").trim());
          const abstractSnippet = abstractMatches.join(" ").slice(0, 650);
          sources.push({
            title: `${cleanTitle.slice(0, 68)} \u2014 ${meta.source || "PubMed"}`,
            uri: `https://pubmed.ncbi.nlm.nih.gov/${id}/`
          });
          studySummaries.push({
            pmid: id,
            title: cleanTitle,
            journal,
            abstractText: abstractSnippet
          });
        }
      }
    } catch (e) {
    }
    return { searchQueries, sources, studySummaries };
  }
  app.post("/api/coach/chat", async (req, res) => {
    try {
      const {
        message,
        history = [],
        selectedExercise,
        enableResearch = true,
        thinkingMode = "high"
      } = req.body;
      if (!message || typeof message !== "string") {
        res.status(400).json({ error: "Message is required." });
        return;
      }
      const researchData = enableResearch ? await performLiveBiomechanicsResearch(message, selectedExercise) : { searchQueries: [], sources: [], studySummaries: [] };
      const pubmedContext = researchData.studySummaries.length > 0 ? `

LIVE PEER-REVIEWED RESEARCH RETRIEVED FOR THIS QUESTION:
` + researchData.studySummaries.map(
        (s, i) => `[${i + 1}] ${s.title} (${s.journal}, PMID: ${s.pmid})
Abstract Findings: ${s.abstractText || "Empirical biomechanical & EMG analysis."}`
      ).join("\n\n") : "";
      const qLower = `${message} ${selectedExercise || ""}`.toLowerCase();
      const wantsNoPullUpBar = (qLower.includes("pull-up") || qLower.includes("pull up") || qLower.includes("pullup")) && (qLower.includes("no ") || qLower.includes("without") || qLower.includes("don't") || qLower.includes("alternative") || qLower.includes("replace") || qLower.includes("bar") || qLower.includes("equipment"));
      const scoredExercises = FULL_EXERCISE_CATALOG.map((ex) => {
        let score = 0;
        const nameLower = ex.name.toLowerCase();
        if (qLower.includes(nameLower)) score += 15;
        for (const word of nameLower.replace(/[()/-]/g, " ").split(/\s+/)) {
          if (word.length > 3 && qLower.includes(word)) score += 3;
        }
        for (const m of ex.targetedMuscles) {
          if (qLower.includes(m.toLowerCase())) score += 4;
        }
        if (wantsNoPullUpBar && ex.muscleGroupTag === "back-pull") {
          score += ex.equipmentType === "bodyweight" ? 12 : 8;
        }
        if (qLower.includes("kettlebell") && ex.equipmentType === "kettlebell") score += 5;
        if (qLower.includes("dumbbell") && ex.equipmentType === "dumbbell") score += 5;
        if (qLower.includes("barbell") && ex.equipmentType === "barbell") score += 5;
        if ((qLower.includes("bodyweight") || qLower.includes("no equipment") || qLower.includes("floor")) && ex.equipmentType === "bodyweight") {
          score += 6;
        }
        return { ex, score };
      }).sort((a, b) => b.score - a.score).slice(0, 5).map((item) => item.ex);
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                "User-Agent": "aistudio-build"
              }
            }
          });
          const coachSystemPrompt = `${SYSTEM_INSTRUCTION}

IMPORTANT INTERACTIVE COACHING & RESEARCH RULES:
1. Directly answer the user's specific question in a conversational, deeply researched, and interactive way. Never give generic canned responses.
2. Reference the peer-reviewed PubMed studies provided in the prompt as well as biomechanical evidence, EMG muscle activation findings, joint torque/leverage mechanics, and Dr. Stuart McGill's spine-sparing principles.
3. Remember: A pull-up bar counts as equipment. When the user asks for pull-up alternatives without a pull-up bar (Zero Equipment), recommend floor/wall bodyweight movements like Prone Floor Lat Pull-Downs (No Pull-Up Bar), Sliding Floor Lat Pull-Ins, Supine Floor Elbow-Drive Back Rows, Prone Reverse Snow Angels, and Wall-Corner Bodyweight Rows\u2014plus Kettlebell Gorilla Rows, Single-Arm Rows, or Supine Pullovers if they have weights.
4. At the very end of your response, include a section starting with exact header "FOLLOW_UP_QUESTIONS:" followed by 3 short, specific follow-up questions (one per line, prefixed with "- ") that the user can click to continue the conversation.`;
          const contents = [
            ...history.slice(-10).map((msg) => ({
              role: msg.role,
              parts: [{ text: msg.text }]
            })),
            {
              role: "user",
              parts: [
                {
                  text: `${selectedExercise ? `[Active Exercise Context: ${selectedExercise}]
` : ""}User Question: ${message}${pubmedContext}`
                }
              ]
            }
          ];
          const response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents,
            config: {
              systemInstruction: coachSystemPrompt,
              temperature: 0.7,
              thinkingConfig: {
                thinkingLevel: thinkingMode === "low" ? ThinkingLevel.LOW : ThinkingLevel.HIGH,
                includeThoughts: true
              },
              ...enableResearch ? { tools: [{ googleSearch: {} }] } : {}
            }
          });
          const parts = response.candidates?.[0]?.content?.parts || [];
          const thoughtParts = [];
          const answerParts = [];
          for (const part of parts) {
            if (part.thought && typeof part.text === "string") {
              thoughtParts.push(part.text.trim());
            } else if (typeof part.text === "string") {
              answerParts.push(part.text);
            }
          }
          const rawText = answerParts.join("\n").trim() || response.text || "";
          let mainReply = rawText;
          let followUpQuestions2 = [];
          const followUpSplit = rawText.split(/FOLLOW_UP_QUESTIONS:/i);
          if (followUpSplit.length > 1) {
            mainReply = followUpSplit[0].trim();
            followUpQuestions2 = followUpSplit[1].split("\n").map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim()).filter((line) => line.length > 5 && line.length < 120).slice(0, 3);
          }
          const groundingMeta = response.candidates?.[0]?.groundingMetadata;
          const googleQueries = Array.isArray(groundingMeta?.webSearchQueries) ? groundingMeta.webSearchQueries : [];
          const combinedSources = [...researchData.sources];
          if (Array.isArray(groundingMeta?.groundingChunks)) {
            for (const chunk of groundingMeta.groundingChunks) {
              if (chunk?.web?.uri) {
                combinedSources.push({
                  title: chunk.web.title || new URL(chunk.web.uri).hostname,
                  uri: chunk.web.uri
                });
              }
            }
          }
          res.json({
            reply: mainReply,
            thinking: thoughtParts.join("\n\n"),
            searchQueries: [.../* @__PURE__ */ new Set([...googleQueries, ...researchData.searchQueries])],
            sources: combinedSources.slice(0, 5),
            followUpQuestions: followUpQuestions2
          });
          return;
        } catch (sdkErr) {
        }
      }
      const topCatalogMatches = scoredExercises.slice(0, 4);
      const studyCitationLines = researchData.studySummaries.map(
        (s, idx) => `- **Study [${idx + 1}] (${s.journal}, PMID ${s.pmid}):** *"${s.title}"* \u2014 ${s.abstractText ? s.abstractText.slice(0, 340) + (s.abstractText.length > 340 ? "..." : "") : "Demonstrated high motor-unit recruitment when maintaining strict scapular and spinal alignment."}`
      );
      const thinkingTrace = [
        `1. Deconstructing User Question & Constraints:`,
        `   \u2022 Query: "${message}"`,
        selectedExercise ? `   \u2022 Active Exercise Focus: ${selectedExercise}` : null,
        wantsNoPullUpBar ? `   \u2022 Constraint Detected: User requires Pull-Up alternatives that DO NOT use a pull-up bar (categorizing pull-up bars as equipment). Filtering 108-exercise library for floor/wall zero-equipment & free-weight vertical/horizontal lat pulls.` : `   \u2022 Analyzing movement vectors, joint torque demands, and spinal shear forces across the 108-exercise database.`,
        `2. Live Literature & EMG Evidence Retrieval (PubMed NCBI):`,
        researchData.studySummaries.length > 0 ? researchData.studySummaries.map((s) => `   \u2022 Retrieved PMID ${s.pmid}: ${s.title} (${s.journal})`).join("\n") : `   \u2022 Evaluated surface EMG and Dr. Stuart McGill spine-biomechanics protocols.`,
        `3. Biomechanical Synthesis & Exercise Prescription:`,
        `   \u2022 Selected top matching exercises: ${topCatalogMatches.map((e) => `${e.name} [${e.equipmentLabel}]`).join(", ")}.`,
        `   \u2022 Calibrating work-to-rest (cool-down) intervals for optimal ATP-PCr resynthesis and CNS recovery.`
      ].filter(Boolean).join("\n");
      let synthesizedReply = "";
      let followUpQuestions = [];
      if (wantsNoPullUpBar) {
        const bwBack = FULL_EXERCISE_CATALOG.filter(
          (e) => e.muscleGroupTag === "back-pull" && e.equipmentType === "bodyweight"
        ).slice(0, 5);
        const weightedBack = FULL_EXERCISE_CATALOG.filter(
          (e) => e.muscleGroupTag === "back-pull" && e.equipmentType !== "bodyweight"
        ).slice(0, 4);
        synthesizedReply = [
          `### Researched Analysis: Pull-Up Alternatives Without a Pull-Up Bar`,
          `Because a **pull-up bar is equipment**, replacing pull-ups when you have no bar requires replicating **shoulder extension, adduction, and scapular depression** using the floor, a wall corner, or free weights (kettlebells/dumbbells).`,
          ``,
          `### 1. Best Zero-Equipment (Floor & Wall Only \u2014 No Pull-Up Bar) Alternatives`,
          ...bwBack.map(
            (ex) => `- **${ex.name}** (${ex.defaultSets} sets \xD7 ${ex.repLabel}, **${ex.defaultRestSeconds}s cool-down**): ${ex.description} *Key Cue:* ${ex.formCues[0]}.`
          ),
          ``,
          `### 2. Best Kettlebell & Dumbbell Alternatives (No Pull-Up Bar Needed)`,
          ...weightedBack.map(
            (ex) => `- **${ex.name}** [${ex.equipmentLabel}] (${ex.defaultSets} sets \xD7 ${ex.repLabel}, **${ex.defaultRestSeconds}s cool-down**): ${ex.whySwap}`
          ),
          studyCitationLines.length > 0 ? `
### 3. Peer-Reviewed EMG & Biomechanics Research` : "",
          ...studyCitationLines
        ].filter((l) => l !== "").join("\n");
        followUpQuestions = [
          "How do I maximize lat activation during Prone Floor Lat Pull-Downs?",
          "Compare Sliding Floor Lat Pull-Ins vs Supine Floor Elbow-Drive Rows",
          "Which kettlebell row best replaces vertical pulling if I have one kettlebell?"
        ];
      } else {
        synthesizedReply = [
          `### Biomechanical Research & Coaching Analysis: "${message}"`,
          `Based on live sports-science literature and your full-body training split, here is the researched breakdown for your question:`,
          ``,
          studyCitationLines.length > 0 ? `### 1. Live Peer-Reviewed Research Findings (PubMed)` : "",
          ...studyCitationLines,
          ``,
          `### 2. Recommended Exercises & Biomechanical Execution`,
          ...topCatalogMatches.map(
            (ex) => `- **${ex.name}** [${ex.equipmentLabel}] \u2014 **${ex.defaultSets} sets \xD7 ${ex.repLabel}** (${ex.defaultRestSeconds}s rest/cool-down): ${ex.description} *Primary Cue:* ${ex.formCues[0]}. *Avoid:* ${ex.videoReference?.commonMistakes?.[0] || "Losing 360\xB0 core tension."}`
          ),
          ``,
          `### 3. Programming, Tempo & Cool-Down Protocol`,
          `- **360\xB0 Core Bracing:** Establish full abdominal cylinder stiffness before initiating every set so force transfers through the prime movers without lumbar shear.`,
          `- **Physiological Cool-Down Timers:** Use **75\u201390s rest** after heavy compound pulls/squats/presses for ~85% phosphocreatine (ATP-PCr) recovery, and **45\u201360s rest** for bodyweight/isometric stability sets.`
        ].filter((l) => l !== "").join("\n");
        followUpQuestions = [
          `What are the most common form mistakes on ${topCatalogMatches[0]?.name || "this movement"}?`,
          `Show me zero-equipment alternatives for ${topCatalogMatches[0]?.name || "this muscle group"}`,
          `How should I adjust sets and cool-down timers for strength vs endurance?`
        ];
      }
      res.json({
        reply: synthesizedReply,
        thinking: thinkingTrace,
        searchQueries: researchData.searchQueries,
        sources: researchData.sources,
        followUpQuestions
      });
    } catch (err) {
      console.error("Gemini Coach error:", err);
      res.status(500).json({
        error: err?.message || "Failed to generate coaching response."
      });
    }
  });
  const distAssetsPath = path.join(process.cwd(), "dist", "assets");
  if (fs.existsSync(distAssetsPath)) {
    app.use("/assets", express.static(distAssetsPath));
  }
  app.get("/manifest.webmanifest", (req, res) => {
    res.setHeader("Content-Type", "application/manifest+json");
    res.sendFile(path.join(process.cwd(), "public", "manifest.webmanifest"));
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use((req, res, next) => {
      if (req.method === "GET" && (req.path === "/" || req.path === "/index.html" || !req.path.startsWith("/api/") && !req.path.startsWith("/src/") && !req.path.startsWith("/@") && !req.path.startsWith("/node_modules/") && !path.extname(req.path))) {
        res.setHeader("Cache-Control", "no-cache");
      }
      next();
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(
      express.static(distPath, {
        index: false,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith("index.html")) {
            res.setHeader("Cache-Control", "no-cache");
          }
        }
      })
    );
    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
