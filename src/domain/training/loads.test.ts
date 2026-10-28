import {
  displayLoad,
  isSetCompleteable,
  loadFieldLabel,
  parseLoadInput,
  toCanonicalKg,
} from "./loads";

it("keeps incomplete/invalid editor strings out of saved numeric values", () => {
  for (const raw of ["", ".", "72.", "0."])
    expect(parseLoadInput(raw, "external")).toEqual({ status: "incomplete" });
  for (const raw of [
    "-1",
    "1e3",
    " 72",
    "72 ",
    "1.2345",
    "100001",
    "100001.",
    "abc.",
    `${"0".repeat(33)}.`,
  ]) {
    expect(parseLoadInput(raw, "external")).toEqual({ status: "invalid" });
  }
  expect(parseLoadInput("62.500", "external")).toEqual({
    status: "valid",
    value: "62.500",
  });
  expect(parseLoadInput(".5", "weighted_bodyweight")).toEqual({
    status: "valid",
    value: ".5",
  });
  expect(parseLoadInput("0", "external")).toEqual({
    status: "valid",
    value: "0",
  });
  expect(parseLoadInput("0", "assisted")).toEqual({ status: "invalid" });
  expect(parseLoadInput("20", "assisted")).toEqual({
    status: "valid",
    value: "20",
  });
  expect(parseLoadInput("", "bodyweight")).toEqual({
    status: "valid",
    value: null,
  });
  expect(parseLoadInput("80", "bodyweight")).toEqual({ status: "invalid" });
});
it("requires positive whole reps and explicit load semantics before completion", () => {
  for (const reps of [null, 0, -1, 1.5, 10001])
    expect(isSetCompleteable({ entered_load: "20", reps }, "external")).toBe(
      false,
    );
  expect(isSetCompleteable({ entered_load: null, reps: 8 }, "bodyweight")).toBe(
    true,
  );
  expect(isSetCompleteable({ entered_load: "80", reps: 8 }, "bodyweight")).toBe(
    false,
  );
  expect(isSetCompleteable({ entered_load: null, reps: 8 }, "external")).toBe(
    false,
  );
  expect(isSetCompleteable({ entered_load: "72.", reps: 8 }, "external")).toBe(
    false,
  );
  expect(isSetCompleteable({ entered_load: "20", reps: 8 }, "external")).toBe(
    true,
  );
  expect(isSetCompleteable({ entered_load: "0", reps: 8 }, "assisted")).toBe(
    false,
  );
  expect(
    isSetCompleteable({ entered_load: "10", reps: 8 }, "weighted_bodyweight"),
  ).toBe(true);
});
it("normalizes bounded decimal strings exactly without overwriting input units", () => {
  expect(toCanonicalKg("1", "lb")).toBe("0.45359237");
  expect(toCanonicalKg("0.001", "lb")).toBe("0.00045359237");
  expect(toCanonicalKg("100000", "lb")).toBe("45359.237");
  expect(toCanonicalKg("99999.999", "lb")).toBe("45359.23654640763");
  expect(toCanonicalKg("62.500", "kg")).toBe("62.5");
  expect(toCanonicalKg("0000", "kg")).toBe("0");
  expect(toCanonicalKg(".5", "kg")).toBe("0.5");
  expect(toCanonicalKg("10", "kg")).toBe("10");
  expect(() => toCanonicalKg("72.", "kg")).toThrow();
  const original = "62.500";
  expect(displayLoad(original, "kg", "kg")).toBe(original);
  expect(displayLoad("100", "lb", "kg")).toBe("45.359");
  expect(displayLoad("100", "kg", "lb")).toBe("220.462");
  expect(displayLoad("0", "lb", "kg")).toBe("0");
  expect(original).toBe("62.500");
  expect(() => displayLoad("bad", "kg", "lb")).toThrow();
});
it("labels assistance and added load without implying lifted body mass", () => {
  expect(loadFieldLabel("external", "kg")).toBe("Weight (kg)");
  expect(loadFieldLabel("bodyweight", "kg")).toBe("Reps only");
  expect(loadFieldLabel("assisted", "lb")).toBe("Assistance (lb)");
  expect(loadFieldLabel("weighted_bodyweight", "kg")).toBe("Added weight (kg)");
});
