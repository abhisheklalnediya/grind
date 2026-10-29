import {
  exerciseImage,
  readBundledCatalog,
  searchBundledExercises,
} from "./index";

const row = {
  id: "curl",
  name: "Barbell Curl",
  description: "Curl",
  instructions: ["Lift"],
  primary_muscles: ["biceps_brachii"],
  secondary_muscles: ["brachialis"],
  equipment: "barbell",
  synonyms: ["arm curl"],
};
it("validates and maps a source archive without inventing IDs", () => {
  expect(readBundledCatalog({ schema_version: 3, exercises: [row] })).toEqual([
    {
      id: "curl",
      name: "Barbell Curl",
      description: "Curl",
      instructions: ["Lift"],
      primaryMuscles: ["biceps_brachii"],
      secondaryMuscles: ["brachialis"],
      equipment: "barbell",
      synonyms: ["arm curl"],
    },
  ]);
  expect(readBundledCatalog({})).toBeNull();
  expect(
    readBundledCatalog({ schema_version: 3, exercises: [row, row] }),
  ).toBeNull();
  expect(
    readBundledCatalog({
      schema_version: 3,
      exercises: [
        {
          ...row,
          equipment: undefined,
          secondary_muscles: undefined,
          synonyms: undefined,
        },
      ],
    })?.[0]?.equipment,
  ).toBe("unspecified");
  expect(
    readBundledCatalog({
      schema_version: 3,
      exercises: [{ ...row, equipment: undefined, is_bodyweight: true }],
    })?.[0]?.equipment,
  ).toBe("bodyweight");
});
it("combines alias, secondary muscle and equipment filters", () => {
  const items =
    readBundledCatalog({ schema_version: 3, exercises: [row] }) ?? [];
  expect(
    searchBundledExercises(items, {
      query: "ARM CURL",
      muscle: "brachialis",
      equipment: "barbell",
    }),
  ).toHaveLength(1);
  expect(
    searchBundledExercises(items, {
      query: "",
      muscle: "chest",
      equipment: "",
    }),
  ).toHaveLength(0);
  expect(
    searchBundledExercises(items, {
      query: "",
      muscle: "",
      equipment: "cable",
    }),
  ).toHaveLength(0);
  expect(exerciseImage("missing")).toBeUndefined();
});
