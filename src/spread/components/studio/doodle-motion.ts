/* Generated from the motion spec (docs/spread-studio/ICON_SPEC.md section 7). Positions and pivots are % of the art. */
import work_plant_l from "@/spread/assets/illustrations/motion/work-plant-l.webp";
import work_plant_r from "@/spread/assets/illustrations/motion/work-plant-r.webp";
import work_note_1 from "@/spread/assets/illustrations/motion/work-note-1.webp";
import work_note_2 from "@/spread/assets/illustrations/motion/work-note-2.webp";
import health_leaves_l from "@/spread/assets/illustrations/motion/health-leaves-l.webp";
import health_apple_leaves from "@/spread/assets/illustrations/motion/health-apple-leaves.webp";
import health_leaves_r from "@/spread/assets/illustrations/motion/health-leaves-r.webp";
import health_heart_r from "@/spread/assets/illustrations/motion/health-heart-r.webp";
import health_heart_l from "@/spread/assets/illustrations/motion/health-heart-l.webp";
import home_sun from "@/spread/assets/illustrations/motion/home-sun.webp";
import home_smoke from "@/spread/assets/illustrations/motion/home-smoke.webp";
import home_tree_r from "@/spread/assets/illustrations/motion/home-tree-r.webp";
import home_tree_l from "@/spread/assets/illustrations/motion/home-tree-l.webp";
import personal_leaves from "@/spread/assets/illustrations/motion/personal-leaves.webp";
import personal_heart_o from "@/spread/assets/illustrations/motion/personal-heart-o.webp";
import personal_heart_r from "@/spread/assets/illustrations/motion/personal-heart-r.webp";
import fitness_sun from "@/spread/assets/illustrations/motion/fitness-sun.webp";
import fitness_shoes from "@/spread/assets/illustrations/motion/fitness-shoes.webp";
import family_sun from "@/spread/assets/illustrations/motion/family-sun.webp";
import family_heart from "@/spread/assets/illustrations/motion/family-heart.webp";
import family_tree_l from "@/spread/assets/illustrations/motion/family-tree-l.webp";
import family_tree_r from "@/spread/assets/illustrations/motion/family-tree-r.webp";
import school_star from "@/spread/assets/illustrations/motion/school-star.webp";
import school_globe from "@/spread/assets/illustrations/motion/school-globe.webp";
import school_pencils from "@/spread/assets/illustrations/motion/school-pencils.webp";
import school_pencil from "@/spread/assets/illustrations/motion/school-pencil.webp";
import project_bulb from "@/spread/assets/illustrations/motion/project-bulb.webp";
import project_leaves from "@/spread/assets/illustrations/motion/project-leaves.webp";
import project_pencil from "@/spread/assets/illustrations/motion/project-pencil.webp";
import project_note from "@/spread/assets/illustrations/motion/project-note.webp";
import church_sun from "@/spread/assets/illustrations/motion/church-sun.webp";
import church_cloud_l from "@/spread/assets/illustrations/motion/church-cloud-l.webp";
import church_cloud_r from "@/spread/assets/illustrations/motion/church-cloud-r.webp";
import church_tree_l from "@/spread/assets/illustrations/motion/church-tree-l.webp";
import church_tree_r from "@/spread/assets/illustrations/motion/church-tree-r.webp";
import business_plant from "@/spread/assets/illustrations/motion/business-plant.webp";
import business_arrow from "@/spread/assets/illustrations/motion/business-arrow.webp";
import business_bars from "@/spread/assets/illustrations/motion/business-bars.webp";
import business_spark from "@/spread/assets/illustrations/motion/business-spark.webp";
import custom_star from "@/spread/assets/illustrations/motion/custom-star.webp";

export type MotionKind = "sway" | "flutter" | "beat" | "bob" | "drift" | "spin" | "rock" | "grow" | "nudge";
export type MotionLayer = { src: string; kind: MotionKind; box: [number, number, number, number]; origin: [number, number]; amp: number; dur: number; delay: number };
export type MotionFx =
  | { k: "steam"; x: number; y: number; w: number }
  | { k: "smoke"; x: number; y: number }
  | { k: "sparkle"; x: number; y: number; d?: number }
  | { k: "shine"; pts: [number, number][] }
  | { k: "glow"; x: number; y: number; r: number; c: string }
  | { k: "shimmer"; x: number; y: number; h: number }
  | { k: "speed"; x: number; y: number };

export const MOTION: Record<string, { layers: MotionLayer[]; fx: MotionFx[] }> = {
  work: {
  layers: [
    { src: work_plant_l, kind: "sway", box: [0.76, 3.66, 26.46, 58.61], origin: [53.8, 99.5], amp: 3.2, dur: 4.6, delay: 0 },
    { src: work_plant_r, kind: "sway", box: [83.97, 4.76, 16.03, 48.35], origin: [50.1, 99.8], amp: 3.8, dur: 3.9, delay: -1.4 },
    { src: work_note_1, kind: "flutter", box: [58.78, 4.76, 12.47, 18.32], origin: [49.9, 6.8], amp: 3, dur: 3.3, delay: -0.6 },
    { src: work_note_2, kind: "flutter", box: [75.83, 6.96, 11.20, 18.32], origin: [46.2, 5.7], amp: 3.5, dur: 2.9, delay: -2.0 },
  ],
  fx: [
    {k: "steam", x: 86.5, y: 49, w: 10},
    {k: "shine", pts: [[22, 22], [56, 20], [59, 62], [25, 66]]},
    {k: "sparkle", x: 40, y: 12},
    {k: "sparkle", x: 34, y: 7, d: -1.2},
  ],
  },
  health: {
  layers: [
    { src: health_leaves_l, kind: "sway", box: [1.78, 32.97, 18.32, 47.25], origin: [61.2, 99.5], amp: 3.5, dur: 4.2, delay: 0 },
    { src: health_apple_leaves, kind: "sway", box: [41.98, 6.96, 28.24, 33.33], origin: [53.2, 99.1], amp: 4, dur: 3.6, delay: -1.1 },
    { src: health_leaves_r, kind: "sway", box: [70.99, 34.80, 23.16, 43.22], origin: [34.6, 97.6], amp: 3.2, dur: 4.8, delay: -2.3 },
    { src: health_heart_r, kind: "beat", box: [71.76, 3.66, 21.37, 29.67], origin: [47.9, 48.3], amp: 0.11, dur: 1.6, delay: 0 },
    { src: health_heart_l, kind: "beat", box: [3.82, 7.69, 11.20, 19.41], origin: [55.2, 42.8], amp: 0.14, dur: 1.6, delay: -0.4 },
  ],
  fx: [
    {k: "sparkle", x: 40, y: 10},
    {k: "sparkle", x: 67, y: 34, d: -0.8},
    {k: "shimmer", x: 29, y: 40, h: 40},
  ],
  },
  home: {
  layers: [
    { src: home_sun, kind: "spin", box: [3.82, 1.83, 29.26, 34.43], origin: [55.3, 49.9], amp: 360, dur: 40, delay: 0 },
    { src: home_smoke, kind: "bob", box: [60.81, 0.00, 17.30, 15.02], origin: [41.5, 93.2], amp: -21.31, dur: 2.8, delay: 0 },
    { src: home_tree_r, kind: "sway", box: [74.81, 25.64, 21.37, 45.42], origin: [33.6, 97.7], amp: 2.6, dur: 4.4, delay: -1 },
    { src: home_tree_l, kind: "sway", box: [3.82, 37.00, 18.32, 35.16], origin: [50.1, 99.5], amp: 2.6, dur: 5, delay: -2.4 },
  ],
  fx: [
    {k: "smoke", x: 67, y: 13},
    {k: "sparkle", x: 45, y: 8, d: -0.5},
    {k: "sparkle", x: 86, y: 14, d: -1.6},
  ],
  },
  personal: {
  layers: [
    { src: personal_leaves, kind: "sway", box: [0.00, 8.79, 23.16, 65.57], origin: [73.4, 97.9], amp: 3.4, dur: 4.4, delay: 0 },
    { src: personal_heart_o, kind: "beat", box: [57.00, 11.72, 12.21, 19.41], origin: [49.1, 52.9], amp: 0.13, dur: 1.7, delay: -0.5 },
    { src: personal_heart_r, kind: "beat", box: [69.97, 2.93, 15.27, 22.34], origin: [46.0, 49.5], amp: 0.11, dur: 1.7, delay: 0 },
  ],
  fx: [
    {k: "steam", x: 79, y: 31, w: 12},
    {k: "sparkle", x: 90, y: 16, d: -0.7},
    {k: "sparkle", x: 56, y: 6},
  ],
  },
  fitness: {
  layers: [
    { src: fitness_sun, kind: "spin", box: [2.80, 0.73, 28.24, 34.43], origin: [50.3, 50.1], amp: 360, dur: 36, delay: 0 },
    { src: fitness_shoes, kind: "bob", box: [0.00, 30.77, 66.16, 55.31], origin: [49.9, 96.2], amp: -2.89, dur: 1.4, delay: 0 },
  ],
  fx: [
    {k: "speed", x: 3, y: 46},
    {k: "shimmer", x: 80, y: 30, h: 38},
    {k: "sparkle", x: 55, y: 10, d: -0.9},
  ],
  },
  family: {
  layers: [
    { src: family_sun, kind: "spin", box: [3.82, 1.83, 28.24, 35.53], origin: [53.8, 48.3], amp: 360, dur: 40, delay: 0 },
    { src: family_heart, kind: "beat", box: [53.94, 4.76, 17.30, 22.34], origin: [46.6, 50.3], amp: 0.12, dur: 1.6, delay: 0 },
    { src: family_tree_l, kind: "sway", box: [0.76, 37.00, 19.34, 54.21], origin: [42.6, 95.9], amp: 2.8, dur: 4.6, delay: -1 },
    { src: family_tree_r, kind: "sway", box: [81.93, 38.83, 15.27, 52.38], origin: [59.4, 95.8], amp: 3, dur: 4.1, delay: -2.6 },
  ],
  fx: [
    {k: "sparkle", x: 45, y: 12},
    {k: "sparkle", x: 78, y: 28, d: -1.1},
  ],
  },
  school: {
  layers: [
    { src: school_star, kind: "rock", box: [6.87, 7.69, 16.28, 23.44], origin: [49.9, 48.2], amp: 10, dur: 3.2, delay: 0 },
    { src: school_globe, kind: "rock", box: [63.87, 6.96, 26.21, 38.10], origin: [50.1, 50.0], amp: 6, dur: 5.2, delay: -1 },
    { src: school_pencils, kind: "sway", box: [42.75, 11.72, 18.32, 26.37], origin: [50.5, 99.6], amp: 2.4, dur: 3.4, delay: -0.7 },
    { src: school_pencil, kind: "sway", box: [66.92, 66.67, 18.32, 33.33], origin: [16.8, 94.0], amp: 4, dur: 1.2, delay: 0 },
  ],
  fx: [
    {k: "sparkle", x: 29, y: 10, d: -0.6},
    {k: "sparkle", x: 91, y: 46},
  ],
  },
  project: {
  layers: [
    { src: project_bulb, kind: "beat", box: [50.89, 39.93, 19.34, 23.08], origin: [52.3, 69.7], amp: 0.08, dur: 2.2, delay: 0 },
    { src: project_leaves, kind: "sway", box: [6.87, 63.74, 22.14, 29.30], origin: [36.7, 93.0], amp: 3.4, dur: 4.2, delay: -1 },
    { src: project_pencil, kind: "sway", box: [62.85, 48.72, 25.19, 51.28], origin: [8.5, 96.1], amp: 3, dur: 1.3, delay: 0 },
    { src: project_note, kind: "flutter", box: [1.78, 18.68, 21.37, 52.38], origin: [52.5, 4.4], amp: 2.2, dur: 4, delay: -1.6 },
  ],
  fx: [
    {k: "glow", x: 61, y: 55, r: 12, c: "#ffd84a"},
    {k: "sparkle", x: 88, y: 12},
    {k: "sparkle", x: 10, y: 10, d: -1.3},
  ],
  },
  church: {
  layers: [
    { src: church_sun, kind: "spin", box: [54.96, 0.73, 31.04, 40.29], origin: [51.7, 45.3], amp: 360, dur: 40, delay: 0 },
    { src: church_cloud_l, kind: "drift", box: [2.80, 4.76, 30.28, 26.37], origin: [50.2, 50.2], amp: 8.59, dur: 7, delay: 0 },
    { src: church_cloud_r, kind: "drift", box: [70.99, 28.94, 25.19, 20.15], origin: [51.6, 49.9], amp: -9.53, dur: 8, delay: -3 },
    { src: church_tree_l, kind: "sway", box: [1.78, 37.00, 22.39, 62.27], origin: [50.1, 93.1], amp: 2.4, dur: 4.8, delay: -1 },
    { src: church_tree_r, kind: "sway", box: [70.99, 49.82, 25.19, 49.45], origin: [43.7, 91.4], amp: 2.8, dur: 4.2, delay: -2.5 },
  ],
  fx: [
    {k: "glow", x: 46, y: 19, r: 9, c: "#ffb35a"},
    {k: "sparkle", x: 37, y: 34, d: -0.7},
  ],
  },
  business: {
  layers: [
    { src: business_plant, kind: "sway", box: [0.00, 24.91, 17.05, 48.35], origin: [58.7, 99.5], amp: 3.4, dur: 4.4, delay: 0 },
    { src: business_arrow, kind: "nudge", box: [20.87, 18.68, 44.27, 38.46], origin: [50.0, 50.2], amp: 3.16, dur: 2.6, delay: 0 },
    { src: business_bars, kind: "grow", box: [21.88, 38.83, 36.13, 40.29], origin: [50.1, 99.7], amp: 0.16, dur: 2.6, delay: 0 },
    { src: business_spark, kind: "beat", box: [83.97, 34.80, 12.21, 12.45], origin: [49.4, 49.8], amp: 0.25, dur: 1.8, delay: -0.4 },
  ],
  fx: [
    {k: "sparkle", x: 66, y: 14},
    {k: "sparkle", x: 10, y: 8, d: -1.1},
  ],
  },
  custom: {
  layers: [
    { src: custom_star, kind: "rock", box: [32.82, 16.85, 32.32, 45.42], origin: [50.1, 51.0], amp: 7, dur: 3.4, delay: 0 },
  ],
  fx: [
    {k: "sparkle", x: 12, y: 14},
    {k: "sparkle", x: 88, y: 10, d: -0.6},
    {k: "sparkle", x: 86, y: 86, d: -1.3},
    {k: "sparkle", x: 16, y: 90, d: -0.9},
    {k: "glow", x: 49, y: 40, r: 16, c: "#ffd84a"},
  ],
  },
};
