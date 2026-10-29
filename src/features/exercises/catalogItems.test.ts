import {
  makeCatalogExercise,
  trainingId,
} from "../../../tests/fixtures/training";
import type { BundledExercise } from "@/services/exercises";
import { catalogItems } from "./catalogItems";

const local: BundledExercise = {
  id: "bench-press",
  name: "Barbell Bench Press",
  description: "",
  instructions: [],
  primaryMuscles: ["chest"],
  secondaryMuscles: ["triceps"],
  equipment: "barbell",
  synonyms: ["bench"],
};
const server = {
  ...makeCatalogExercise(),
  name: "Reviewed press",
  source_key: "repdb",
  source_exercise_id: "bench-press",
};
const filters = { query: "", muscle: "", equipment: "" };
it("joins only explicit source identities and preserves distinct custom or unmatched entries", () => {
  const custom = {
    ...server,
    id: trainingId(12),
    origin: "custom" as const,
    owner_id: trainingId(13),
  };
  const independent = {
    ...server,
    id: trainingId(14),
    source_exercise_id: "other",
  };
  const rows = catalogItems(
    [local],
    [server, custom, independent],
    filters,
    false,
  );
  expect(rows).toHaveLength(3);
  expect(rows.find((item) => item.kind === "repdb")).toMatchObject({
    server: { id: server.id },
  });
  expect(rows.filter((item) => item.kind === "server")).toHaveLength(2);
  expect(catalogItems([local], [server, custom], filters, true)).toMatchObject([
    { kind: "server", exercise: { id: custom.id } },
  ]);
});
it("matches both source aliases and server terms without creating duplicate rows", () => {
  expect(
    catalogItems([local], [server], { ...filters, query: "bench" }, false),
  ).toHaveLength(1);
  expect(
    catalogItems([local], [server], { ...filters, query: "reviewed" }, false),
  ).toHaveLength(1);
  expect(
    catalogItems([local], [server], { ...filters, query: "absent" }, false),
  ).toHaveLength(0);
  const archived = { ...server, archived_at: "2026-10-29T00:00:00Z" };
  expect(catalogItems([local], [archived], filters, false)).toEqual([]);
});
it("hides unconfigured server and bundled exercises from the selectable list", () => {
  const unavailable = {
    ...server,
    is_configured: false,
    load_mode: null,
    load_convention: null,
    tracking_type: null,
  };
  expect(catalogItems([local], [unavailable], filters, false)).toEqual([]);
});
