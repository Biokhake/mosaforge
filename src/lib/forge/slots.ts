import type { GroupId, SlotDef, Vec3 } from "./types";

const S = (id: string, group: GroupId, label: string, socket: Vec3): SlotDef => ({
  id,
  group,
  label,
  socket,
});

export const SLOTS: SlotDef[] = [
  S("helm", "head", "Helm", [0, 1.82, 0]),
  S("visor", "head", "Visor", [0, 1.81, 0.065]),
  S("brow", "head", "Brow", [0, 1.87, 0.06]),
  S("eyeL", "head", "Eye L", [-0.048, 1.82, 0.07]),
  S("eyeR", "head", "Eye R", [0.048, 1.82, 0.07]),
  S("nose", "head", "Nose", [0, 1.79, 0.075]),
  S("mouth", "head", "Mouth", [0, 1.745, 0.065]),
  S("jaw", "head", "Jaw", [0, 1.69, 0.04]),
  S("earL", "head", "Ear L", [-0.115, 1.81, 0]),
  S("earR", "head", "Ear R", [0.115, 1.81, 0]),
  S("vfin", "head", "Crest", [0, 1.91, 0.04]),
  S("antennaL", "head", "Antenna L", [-0.08, 1.89, -0.01]),
  S("antennaR", "head", "Antenna R", [0.08, 1.89, -0.01]),
  S("cheekL", "head", "Cheek L", [-0.095, 1.76, 0.035]),
  S("cheekR", "head", "Cheek R", [0.095, 1.76, 0.035]),
  S("chin", "head", "Chin Guard", [0, 1.71, 0.065]),

  S("collar", "torso", "Collar", [0, 1.62, 0.02]),
  S("chestCore", "torso", "Chest Core", [0, 1.44, 0.04]),
  S("pecL", "torso", "Pec L", [-0.13, 1.46, 0.09]),
  S("pecR", "torso", "Pec R", [0.13, 1.46, 0.09]),
  S("cockpit", "torso", "Cockpit", [0, 1.4, 0.14]),
  S("abdomen", "torso", "Abdomen", [0, 1.22, 0.03]),

  S("pelvis", "waist", "Pelvis", [0, 1.06, 0]),
  S("skirtF", "waist", "Skirt F", [0, 1.02, 0.12]),
  S("skirtB", "waist", "Skirt B", [0, 1.02, -0.1]),
  S("skirtL", "waist", "Skirt L", [-0.16, 1.02, 0]),
  S("skirtR", "waist", "Skirt R", [0.16, 1.02, 0]),

  S("shoulderR", "armR", "Shoulder R", [0.3, 1.48, 0]),
  S("upperR", "armR", "Upper R", [0.3, 1.28, 0]),
  S("elbowR", "armR", "Elbow R", [0.3, 1.1, 0]),
  S("forearmR", "armR", "Forearm R", [0.3, 0.92, 0]),
  S("vambraceR", "armR", "Vambrace R", [0.3, 0.9, 0.03]),
  S("handR", "armR", "Hand R", [0.3, 0.74, 0]),

  S("shoulderL", "armL", "Shoulder L", [-0.3, 1.48, 0]),
  S("upperL", "armL", "Upper L", [-0.3, 1.28, 0]),
  S("elbowL", "armL", "Elbow L", [-0.3, 1.1, 0]),
  S("forearmL", "armL", "Forearm L", [-0.3, 0.92, 0]),
  S("vambraceL", "armL", "Vambrace L", [-0.3, 0.9, 0.03]),
  S("handL", "armL", "Hand L", [-0.3, 0.74, 0]),

  S("hipR", "legR", "Hip R", [0.14, 0.98, 0]),
  S("thighR", "legR", "Thigh R", [0.14, 0.76, 0]),
  S("kneeR", "legR", "Knee R", [0.14, 0.5, 0.02]),
  S("shinR", "legR", "Shin R", [0.14, 0.28, 0.01]),
  S("ankleR", "legR", "Ankle R", [0.14, 0.1, 0]),
  S("footR", "legR", "Foot R", [0.14, 0.04, 0.02]),

  S("hipL", "legL", "Hip L", [-0.14, 0.98, 0]),
  S("thighL", "legL", "Thigh L", [-0.14, 0.76, 0]),
  S("kneeL", "legL", "Knee L", [-0.14, 0.5, 0.02]),
  S("shinL", "legL", "Shin L", [-0.14, 0.28, 0.01]),
  S("ankleL", "legL", "Ankle L", [-0.14, 0.1, 0]),
  S("footL", "legL", "Foot L", [-0.14, 0.04, 0.02]),

  S("pack", "back", "Pack Core", [0, 1.46, -0.16]),
  S("thrusterL", "back", "Thruster L", [-0.14, 1.42, -0.24]),
  S("thrusterR", "back", "Thruster R", [0.14, 1.42, -0.24]),
  S("binderL", "back", "Binder L", [-0.24, 1.5, -0.18]),
  S("binderR", "back", "Binder R", [0.24, 1.5, -0.18]),
  S("stabilizer", "back", "Stabilizer", [0, 1.28, -0.22]),

  S("weaponR", "weapon", "Weapon R", [0.3, 0.74, 0]),
  S("weaponL", "weapon", "Weapon L", [-0.3, 0.74, 0]),
  S("shield", "weapon", "Shield", [-0.33, 0.92, 0.04]),

  S("extra1", "extra", "R Shoulder HP", [0.34, 1.56, -0.06]),
  S("extra2", "extra", "L Shoulder HP", [-0.34, 1.56, -0.06]),
  S("extra3", "extra", "R Hip HP", [0.2, 1.04, 0.1]),
  S("extra4", "extra", "L Hip HP", [-0.2, 1.04, 0.1]),
  S("extra5", "extra", "Head Rear HP", [0, 1.76, -0.16]),
  S("extra6", "extra", "Waist Rear HP", [0, 1.14, -0.18]),
  S("extra7", "extra", "Face Front HP", [0, 1.81, 0.12]),
  S("extra8", "extra", "Chest HP", [0, 1.44, 0.18]),
];

export const SLOT_BY_ID = Object.fromEntries(SLOTS.map((s) => [s.id, s]));

export const GROUPS: { id: GroupId; label: string }[] = [
  { id: "head", label: "Head" },
  { id: "torso", label: "Torso" },
  { id: "waist", label: "Waist" },
  { id: "armR", label: "Arm R" },
  { id: "armL", label: "Arm L" },
  { id: "legR", label: "Leg R" },
  { id: "legL", label: "Leg L" },
  { id: "back", label: "Back" },
  { id: "weapon", label: "Weapons" },
  { id: "extra", label: "Extra" },
];

export const GHOST_BOXES: { id: string; p: Vec3; s: Vec3 }[] = [
  { id: "head", p: [0, 1.82, 0], s: [0.18, 0.2, 0.2] },
  { id: "torso", p: [0, 1.4, 0.02], s: [0.32, 0.42, 0.2] },
  { id: "waist", p: [0, 1.06, 0], s: [0.26, 0.16, 0.18] },
  { id: "armR", p: [0.3, 1.12, 0], s: [0.12, 0.72, 0.12] },
  { id: "armL", p: [-0.3, 1.12, 0], s: [0.12, 0.72, 0.12] },
  { id: "legR", p: [0.14, 0.5, 0], s: [0.14, 0.96, 0.16] },
  { id: "legL", p: [-0.14, 0.5, 0], s: [0.14, 0.96, 0.16] },
  { id: "pack", p: [0, 1.42, -0.2], s: [0.22, 0.28, 0.14] },
];
