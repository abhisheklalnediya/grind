import { setTypeLabels, setTypeShortLabel } from "./setTypeLabels";
it("labels working ordinals and each distinct non-working type", () => {
  expect(setTypeShortLabel("working", 3)).toBe("3");
  expect(
    ["warmup", "drop", "failure", "rest_pause"].map(
      (value) => setTypeLabels[value as keyof typeof setTypeLabels],
    ),
  ).toEqual(["Warm-up", "Drop", "Failure", "Rest-pause"]);
  expect(setTypeShortLabel("warmup", 0)).toBe("W");
  expect(setTypeShortLabel("drop", 0)).toBe("D");
  expect(setTypeShortLabel("failure", 0)).toBe("F");
  expect(setTypeShortLabel("rest_pause", 0)).toBe("RP");
});
