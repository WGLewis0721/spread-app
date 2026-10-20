import { allocateTimePersonas } from "./allocate-time";
import { createPlanPersonas } from "./create-plan";
import type { Behavior, Persona } from "./engine";
import { rearrangeWeekPersonas } from "./rearrange-week";
import { recoverDataPersonas } from "./recover-data";
import { unfinishedTasksPersonas } from "./unfinished-tasks";

export const BEHAVIOR_TITLES: Record<Behavior, string> = {
  create: "Creating a plan",
  allocate: "Allocating time",
  rearrange: "Rearranging a week",
  unfinished: "Handling unfinished tasks",
  recover: "Recovering saved data",
};

export const personasByBehavior: Record<Behavior, Persona[]> = {
  create: createPlanPersonas,
  allocate: allocateTimePersonas,
  rearrange: rearrangeWeekPersonas,
  unfinished: unfinishedTasksPersonas,
  recover: recoverDataPersonas,
};

export const allPersonas: Persona[] = Object.values(personasByBehavior).flat();
