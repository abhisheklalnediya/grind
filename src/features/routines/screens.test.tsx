import { Alert } from "react-native";
import {
  render,
  fireEvent,
  waitFor,
  screen,
  cleanup,
  act,
} from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTraining } from "@/features/training";
import {
  makeCatalogExercise,
  makeRoutine,
  trainingId,
} from "../../../tests/fixtures/training";
import { createTrainingApi } from "@/services/training/api";
import { TrainingError } from "@/services/training/errors";
import {
  RoutineDetailScreen,
  RoutineEditorScreen,
  useRoutineDraft,
} from "./index";
import { TemplateExercise } from "./TemplateExercise";
import type { RoutinePayload, SetType, TrainingRoutine } from "@/domain/training";
jest.mock("@/features/training", () => ({ useTraining: jest.fn() }));
const mockListener = jest.fn();
const mockDispatch = jest.fn();
const mockNavigation = { addListener: mockListener, dispatch: mockDispatch };
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useNavigation: () => mockNavigation,
}));
let mockUuid = 10;
jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(
    () => `10000000-0000-4000-8000-${String(mockUuid++).padStart(12, "0")}`,
  ),
}));
const catalog = makeCatalogExercise();
const template: RoutinePayload["exercises"][number] = {
  id: trainingId(7),
  exercise_id: catalog.id,
  position: 0,
  load_mode: "external",
  notes: "",
  rest_seconds: 120,
  sets: [],
};
function setup({
  error = false,
  saveConflict = false,
  supportedTypes = ["warmup", "working"] as SetType[],
} = {}) {
  const api = createTrainingApi({ rpc: jest.fn(), catalog: jest.fn() });
  jest.spyOn(api, "catalog").mockResolvedValue([catalog]);
  jest.spyOn(api, "supportedSetTypes").mockResolvedValue(supportedTypes);
  const read = jest.spyOn(api, "routine");
  if (error) read.mockRejectedValue(new Error("offline"));
  else read.mockResolvedValue({ ...makeRoutine(), exercises: [template] });
  const save = jest.spyOn(api, "saveRoutine");
  if (saveConflict) save.mockRejectedValue(new TrainingError("conflict"));
  else save.mockResolvedValue(makeRoutine());
  const archive = jest
    .spyOn(api, "archiveRoutine")
    .mockResolvedValue(makeRoutine());
  const start = jest.fn().mockResolvedValue({});
  jest
    .mocked(useTraining)
    .mockReturnValue({ api, session: null, start } as unknown as ReturnType<
      typeof useTraining
    >);
  return { api, read, save, archive, start };
}
async function mount(element: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>{element}</QueryClientProvider>,
  );
}
beforeEach(() => {
  jest.clearAllMocks();
  useRoutineDraft.getState().clear();
  mockListener.mockReturnValue(jest.fn());
});
afterEach(cleanup);
it("creates, retains and scopes transient template selection and edits", () => {
  const store = useRoutineDraft.getState();
  store.update({ name: "ignored", exercises: [] });
  store.add("a", [catalog]);
  expect(useRoutineDraft.getState().draft).toBeNull();
  store.begin("a");
  store.add("b", [catalog]);
  expect(useRoutineDraft.getState().draft?.payload.exercises).toHaveLength(0);
  store.add("a", [catalog]);
  store.update({
    ...useRoutineDraft.getState().draft?.payload,
    name: "Push",
    exercises: [template],
  });
  store.begin("a");
  expect(useRoutineDraft.getState().draft?.payload.name).toBe("Push");
  store.begin("b", makeRoutine());
  expect(useRoutineDraft.getState().draft?.version).toBe(1);
  expect(useRoutineDraft.getState().draft?.dirty).toBe(false);
});
it("retains a distance exercise tracking type in the routine draft", () => {
  useRoutineDraft.getState().begin("a");
  useRoutineDraft
    .getState()
    .add("a", [{ ...catalog, tracking_type: "distance_duration" }]);
  expect(
    useRoutineDraft.getState().draft?.payload.exercises[0]?.tracking_type,
  ).toBe("distance_duration");
});
it("rejects an unconfigured exercise in a routine draft", () => {
  useRoutineDraft.getState().begin("a");
  expect(() =>
    useRoutineDraft
      .getState()
      .add("a", [
        {
          ...catalog,
          origin: "provider",
          is_configured: false,
          load_mode: null,
          load_convention: null,
          tracking_type: null,
        },
      ]),
  ).toThrow("not yet available");
  expect(useRoutineDraft.getState().draft?.payload.exercises).toEqual([]);
});
it("edits a timed routine set and distance unit", async () => {
  setup();
  const onChange = jest.fn();
  await mount(
    <TemplateExercise
      exercise={{
        ...template,
        tracking_type: "distance_duration",
        sets: [
          {
            id: trainingId(8),
            position: 0,
            set_type: "working",
            entered_load: null,
            entered_unit: "kg",
            reps: null,
          },
        ],
      }}
      name="Run"
      onChange={onChange}
      onRemove={jest.fn()}
      onUp={jest.fn()}
      onDown={jest.fn()}
    />,
  );
  await fireEvent.changeText(
    screen.getByLabelText("Set 1 duration seconds"),
    "120",
  );
  expect(onChange).toHaveBeenLastCalledWith(
    expect.objectContaining({
      sets: [expect.objectContaining({ duration_seconds: 120 })],
    }),
  );
  await fireEvent.changeText(screen.getByLabelText("Set 1 distance"), "1.25");
  expect(onChange).toHaveBeenLastCalledWith(
    expect.objectContaining({
      sets: [
        expect.objectContaining({
          entered_distance: "1.25",
          distance_unit: "km",
        }),
      ],
    }),
  );
  await fireEvent.press(screen.getByText("Distance unit: km"));
  expect(onChange).toHaveBeenLastCalledWith(
    expect.objectContaining({
      sets: [expect.objectContaining({ distance_unit: "mi" })],
    }),
  );
});
it("shows saved routine and starts it without changing its template", async () => {
  const { start } = setup();
  await mount(<RoutineDetailScreen id={trainingId(4)} />);
  await screen.findByText("Push day");
  await fireEvent.press(screen.getByText("Start routine"));
  await waitFor(() => expect(start).toHaveBeenCalledWith(trainingId(4)));
  expect(router.push).toHaveBeenCalledWith("/workout");
  await fireEvent.press(screen.getByText("Edit routine"));
  expect(router.push).toHaveBeenCalledWith({
    pathname: "/routine-edit",
    params: { id: trainingId(4) },
  });
});
it("shows total and per-set targets across load modes and tracking types", async () => {
  const { read } = setup();
  const base = makeRoutine();
  const external: TrainingRoutine["exercises"][number] = {
    ...template,
    sets: [
      {
        id: trainingId(30),
        position: 0,
        set_type: "warmup",
        entered_load: "18.50",
        entered_unit: "lb",
        reps: 8,
      },
      {
        id: trainingId(31),
        position: 1,
        set_type: "working",
        entered_load: null,
        entered_unit: "kg",
        reps: null,
      },
      ...(["drop", "failure", "rest_pause"] as const).map((set_type, index) => ({
        id: trainingId(40 + index),
        position: 2 + index,
        set_type,
        entered_load: null,
        entered_unit: "kg" as const,
        reps: 8,
      })),
    ],
  };
  const variants: TrainingRoutine["exercises"] = [
    external,
    {
      ...template,
      id: trainingId(32),
      load_mode: "bodyweight",
      sets: [
        {
          id: trainingId(33),
          position: 0,
          set_type: "working",
          entered_load: null,
          entered_unit: "kg",
          reps: 6,
        },
      ],
    },
    {
      ...template,
      id: trainingId(34),
      load_mode: "assisted",
      sets: [
        {
          id: trainingId(35),
          position: 0,
          set_type: "working",
          entered_load: null,
          entered_unit: "lb",
          reps: 5,
        },
      ],
    },
    {
      ...template,
      id: trainingId(36),
      tracking_type: "duration",
      sets: [
        {
          id: trainingId(37),
          position: 0,
          set_type: "warmup",
          entered_load: null,
          entered_unit: "kg",
          reps: null,
          duration_seconds: null,
        },
      ],
    },
    {
      ...template,
      id: trainingId(38),
      tracking_type: "distance_duration",
      sets: [
        {
          id: trainingId(39),
          position: 0,
          set_type: "working",
          entered_load: null,
          entered_unit: "kg",
          reps: null,
          duration_seconds: 600,
          entered_distance: "1.25",
          distance_unit: "mi",
        },
      ],
    },
  ];
  read.mockResolvedValue({ ...base, exercises: variants });
  await mount(<RoutineDetailScreen id={trainingId(4)} />);
  await screen.findByText("9 planned sets");
  expect(screen.getByText("01")).toBeVisible();
  expect(screen.getByText("05")).toBeVisible();
  expect(screen.getByText("Warm-up 1 · Weight 18.50 lb · 8 reps")).toBeTruthy();
  expect(
    screen.getByText("Working 1 · Weight unspecified · reps unspecified"),
  ).toBeTruthy();
  expect(screen.getByText("Working 1 · Bodyweight · 6 reps")).toBeTruthy();
  expect(
    screen.getByText("Working 1 · Assistance unspecified · 5 reps"),
  ).toBeTruthy();
  expect(screen.getByText("Warm-up 1 · Duration unspecified")).toBeTruthy();
  expect(screen.getByText("Working 1 · 600 sec · 1.25 mi")).toBeTruthy();
  expect(screen.getByText("Drop 1 · Weight unspecified · 8 reps")).toBeTruthy();
  expect(screen.getByText("Failure 1 · Weight unspecified · 8 reps")).toBeTruthy();
  expect(screen.getByText("Rest-pause 1 · Weight unspecified · 8 reps")).toBeTruthy();
});
it("archives only after confirmation and retries failed reads", async () => {
  const { read, archive } = setup({ error: true });
  const alert = jest.spyOn(Alert, "alert");
  await mount(<RoutineDetailScreen id={trainingId(4)} />);
  await screen.findByText("Retry routine");
  read.mockResolvedValue(makeRoutine());
  await fireEvent.press(screen.getByText("Retry routine"));
  await screen.findByText("Push day");
  await fireEvent.press(screen.getByText("Archive routine"));
  await act(async () => {
    await alert.mock.calls.at(-1)?.[2]?.[1]?.onPress?.();
  });
  await waitFor(() =>
    expect(archive).toHaveBeenCalledWith(expect.any(String), trainingId(4), 1),
  );
});
it("validates a new routine and saves atomic server payload", async () => {
  const { save } = setup();
  await mount(<RoutineEditorScreen />);
  await fireEvent.press(screen.getByText("Save routine"));
  expect(screen.getByText(/Check the routine name/)).toBeTruthy();
  await fireEvent.changeText(
    screen.getByLabelText("Routine name"),
    "New routine",
  );
  await fireEvent.press(screen.getByText("Add exercises"));
  expect(router.push).toHaveBeenCalledWith({
    pathname: "/exercise-picker",
    params: { target: "routine" },
  });
  await fireEvent.press(screen.getByText("Save routine"));
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith(expect.any(String), null, null, {
      name: "New routine",
      exercises: [],
    }),
  );
  expect(router.back).toHaveBeenCalled();
});
it("preserves draft for picker return and guards unsaved exit", async () => {
  setup();
  const alert = jest.spyOn(Alert, "alert");
  await mount(<RoutineEditorScreen />);
  await fireEvent.changeText(screen.getByLabelText("Routine name"), "Draft");
  const preventDefault = jest.fn();
  const callback = mockListener.mock.calls.at(-1)?.[1];
  callback({ preventDefault, data: { action: { type: "GO_BACK" } } });
  expect(preventDefault).toHaveBeenCalled();
  await act(async () => {
    await alert.mock.calls.at(-1)?.[2]?.[1]?.onPress?.();
  });
  expect(mockDispatch).toHaveBeenCalledWith({ type: "GO_BACK" });
  expect(useRoutineDraft.getState().draft).toBeNull();
});
it("loads an existing draft, edits notes/rest and sets, then retains it on conflict", async () => {
  const { save } = setup({ saveConflict: true });
  await mount(<RoutineEditorScreen id={trainingId(4)} />);
  await screen.findByLabelText("Notes for Bench press");
  await fireEvent.changeText(
    screen.getByLabelText("Notes for Bench press"),
    "Controlled",
  );
  await fireEvent.changeText(
    screen.getByLabelText("Rest seconds for Bench press"),
    "90",
  );
  await fireEvent.press(screen.getByText("Add set to Bench press"));
  await fireEvent.changeText(screen.getByLabelText("Set 1 reps"), "8");
  await fireEvent.changeText(screen.getByLabelText("Set 1 Weight (kg)"), "20");
  await fireEvent.press(screen.getByText("Save routine"));
  await screen.findByText("Review saved version");
  expect(save).toHaveBeenCalledWith(
    expect.any(String),
    trainingId(4),
    1,
    expect.objectContaining({ name: "Push day" }),
  );
  expect(useRoutineDraft.getState().draft?.payload.exercises[0]?.notes).toBe(
    "Controlled",
  );
  const alert = jest.spyOn(Alert, "alert");
  await fireEvent.press(screen.getByText("Review saved version"));
  await waitFor(() =>
    expect(alert).toHaveBeenCalledWith(
      expect.stringContaining("Saved version"),
      expect.any(String),
      expect.any(Array),
    ),
  );
  await act(async () => {
    await alert.mock.calls.at(-1)?.[2]?.[1]?.onPress?.();
  });
  expect(useRoutineDraft.getState().draft?.version).toBe(1);
  expect(screen.queryByText("Review saved version")).toBeNull();
});
it("template controls change type, unit, null fields and remove sets", async () => {
  setup({ supportedTypes: ["warmup", "working", "drop", "failure", "rest_pause"] });
  const onChange = jest.fn();
  const callbacks = { onRemove: jest.fn(), onUp: jest.fn(), onDown: jest.fn() };
  const set = {
    id: trainingId(8),
    position: 0,
    set_type: "working" as const,
    entered_load: null,
    entered_unit: "kg" as const,
    reps: null,
  };
  await mount(
    <TemplateExercise
      exercise={{ ...template, sets: [set] }}
      name="Bench"
      onChange={onChange}
      {...callbacks}
    />,
  );
  await fireEvent.press(screen.getByLabelText("Set 1: Set type: Working set"));
  await fireEvent.press(screen.getByRole("button", { name: "Drop set" }));
  expect(onChange).toHaveBeenLastCalledWith(
    expect.objectContaining({
      sets: [expect.objectContaining({
        id: trainingId(8),
        position: 0,
        set_type: "drop",
        entered_unit: "kg",
        reps: null,
      })],
    }),
  );
  await fireEvent.press(screen.getByText("Use lb"));
  await fireEvent.changeText(screen.getByLabelText("Set 1 reps"), "");
  await fireEvent.changeText(screen.getByLabelText("Set 1 Weight (kg)"), "");
  await fireEvent.press(screen.getByText("Remove set 1"));
  expect(onChange).toHaveBeenLastCalledWith(
    expect.objectContaining({ sets: [] }),
  );
  await fireEvent.press(screen.getByText("Move Bench up"));
  await fireEvent.press(screen.getByText("Move Bench down"));
  await fireEvent.press(screen.getByText("Remove Bench"));
  expect(callbacks.onRemove).toHaveBeenCalled();
  await cleanup();
  await mount(
    <TemplateExercise
      exercise={{ ...template, load_mode: "bodyweight", sets: [set] }}
      name="Pull-up"
      onChange={onChange}
      {...callbacks}
    />,
  );
  expect(screen.queryByText("Use lb")).toBeNull();
});
it("reorders and removes template exercises while retaining stable identity", async () => {
  setup();
  useRoutineDraft.getState().begin("unconfigured");
  useRoutineDraft.getState().update({
    name: "Draft",
    exercises: [template, { ...template, id: trainingId(15), position: 1 }],
  });
  await mount(<RoutineEditorScreen />);
  await screen.findAllByText("Move Bench press down");
  const down = screen.getAllByText("Move Bench press down");
  const up = screen.getAllByText("Move Bench press up");
  if (!down[0] || !up[0]) throw new Error("Missing reorder controls");
  await fireEvent.press(up[0]);
  await fireEvent.press(down[0]);
  expect(useRoutineDraft.getState().draft?.payload.exercises[0]?.id).toBe(
    trainingId(15),
  );
  const currentUp = screen.getAllByText("Move Bench press up")[1];
  if (!currentUp) throw new Error("Missing reorder control");
  await fireEvent.press(currentUp);
  expect(useRoutineDraft.getState().draft?.payload.exercises[0]?.id).toBe(
    template.id,
  );
  const remove = screen.getAllByText("Remove Bench press")[0];
  if (!remove) throw new Error("Missing remove control");
  await fireEvent.press(remove);
  expect(useRoutineDraft.getState().draft?.payload.exercises).toHaveLength(1);
  await fireEvent.press(screen.getByText("Cancel"));
  expect(router.back).toHaveBeenCalled();
});
it("lets a reviewed conflict replace the draft with the saved template", async () => {
  const { read } = setup({ saveConflict: true });
  const alert = jest.spyOn(Alert, "alert");
  await mount(<RoutineEditorScreen id={trainingId(4)} />);
  await screen.findByLabelText("Routine name");
  await fireEvent.changeText(
    screen.getByLabelText("Routine name"),
    "Local draft",
  );
  await fireEvent.press(screen.getByText("Save routine"));
  await screen.findByText("Review saved version");
  read.mockResolvedValue({
    ...makeRoutine(),
    name: "Saved elsewhere",
    version: 2,
  });
  await fireEvent.press(screen.getByText("Review saved version"));
  await waitFor(() =>
    expect(alert).toHaveBeenCalledWith(
      "Saved version 2: Saved elsewhere",
      expect.any(String),
      expect.any(Array),
    ),
  );
  await act(async () => {
    await alert.mock.calls.at(-1)?.[2]?.[2]?.onPress?.();
  });
  expect(screen.getByLabelText("Routine name").props.value).toBe(
    "Saved elsewhere",
  );
  expect(useRoutineDraft.getState().draft?.dirty).toBe(false);
});
it("shows start failures and retries routine editor loading", async () => {
  const { start, read } = setup({ error: true });
  await mount(<RoutineEditorScreen id={trainingId(4)} />);
  await screen.findByText("Retry routine");
  read.mockResolvedValue(makeRoutine());
  await fireEvent.press(screen.getByText("Retry routine"));
  await screen.findByLabelText("Routine name");
  await cleanup();
  start.mockRejectedValue(new Error("Cannot start"));
  await mount(<RoutineDetailScreen id={trainingId(4)} />);
  await screen.findByText("Push day");
  await fireEvent.press(screen.getByText("Start routine"));
  await screen.findByText("Cannot start");
});
it("retains partial template input, removes a middle set and toggles warmup/unit back", async () => {
  setup();
  const first = {
    id: trainingId(11),
    position: 0,
    set_type: "warmup" as const,
    entered_load: "5",
    entered_unit: "lb" as const,
    reps: 4,
  };
  const onChange = jest.fn();
  await mount(
    <TemplateExercise
      name="Row"
      exercise={{
        ...template,
        sets: [first, { ...first, id: trainingId(12), position: 1 }],
      }}
      onChange={onChange}
      onUp={jest.fn()}
      onDown={jest.fn()}
      onRemove={jest.fn()}
    />,
  );
  const unit = screen.getAllByText("View in kg")[0];
  if (!unit) throw new Error("Missing set controls");
  await fireEvent.press(screen.getByLabelText("Set 1: Set type: Warm-up set"));
  await fireEvent.press(screen.getByRole("button", { name: "Working set" }));
  await fireEvent.press(unit);
  await fireEvent.press(screen.getByText("Remove set 1"));
  expect(onChange).toHaveBeenLastCalledWith(
    expect.objectContaining({
      sets: [expect.objectContaining({ id: trainingId(12), position: 0 })],
    }),
  );
});
it("gates new routine set types by server capability without rewriting stored values", async () => {
  setup({ supportedTypes: ["warmup", "working", "drop"] });
  const onChange = jest.fn();
  const preserved = {
    id: trainingId(19),
    position: 0,
    set_type: "failure" as const,
    entered_load: "22.5",
    entered_unit: "lb" as const,
    reps: 6,
  };
  const working = {
    ...preserved,
    id: trainingId(20),
    position: 1,
    set_type: "working" as const,
  };
  await mount(
    <TemplateExercise
      name="Bench"
      exercise={{ ...template, sets: [preserved, working] }}
      onChange={onChange}
      onUp={jest.fn()}
      onDown={jest.fn()}
      onRemove={jest.fn()}
    />,
  );
  expect(onChange).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText("Set 1: Set type: Failure set"));
  expect(screen.getByRole("button", { name: "Drop set" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Failure set" })).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Drop set" }));
  expect(onChange).toHaveBeenLastCalledWith(
    expect.objectContaining({
      sets: [
        expect.objectContaining({ ...preserved, set_type: "drop" }),
        expect.objectContaining(working),
      ],
    }),
  );
  await fireEvent.press(screen.getByLabelText("Set 2: Set type: Working set"));
  expect(screen.queryByRole("button", { name: "Failure set" })).toBeNull();
});
it("resumes an existing active workout without starting another session", async () => {
  const { api, start } = setup();
  jest.mocked(useTraining).mockReturnValue({
    api,
    start,
    session: { id: trainingId(99), status: "active" },
  } as unknown as ReturnType<typeof useTraining>);
  start.mockRejectedValueOnce(Error("already active"));
  await mount(<RoutineDetailScreen id={trainingId(4)} />);
  await fireEvent.press(await screen.findByText("Resume active workout"));
  expect(start).not.toHaveBeenCalled();
  expect(router.push).toHaveBeenCalledWith("/workout");
});
it("locks editing and exit during save, then restores the draft after failure", async () => {
  const { save } = setup();
  let rejectSave: (error: Error) => void = () => {
    throw new Error("Save has not started");
  };
  save.mockImplementation(
    () =>
      new Promise((_, reject) => {
        rejectSave = reject;
      }),
  );
  const alert = jest.spyOn(Alert, "alert");
  await mount(<RoutineEditorScreen />);
  await fireEvent.changeText(
    screen.getByLabelText("Routine name"),
    "Keep my draft",
  );
  await fireEvent.press(screen.getByText("Save routine"));
  await screen.findByText(
    "Saving routine… Please wait before editing or leaving.",
  );
  expect(screen.queryByLabelText("Routine name")).toBeNull();
  expect(screen.queryByText("Add exercises")).toBeNull();
  expect(screen.queryByText("Cancel")).toBeNull();
  const preventDefault = jest.fn();
  const listener = mockListener.mock.calls.at(-1)?.[1];
  listener({ preventDefault, data: { action: { type: "GO_BACK" } } });
  expect(preventDefault).toHaveBeenCalledTimes(1);
  expect(alert).not.toHaveBeenCalled();
  await act(async () => rejectSave(new Error("Connection interrupted")));
  expect(await screen.findByText("Connection interrupted")).toBeTruthy();
  expect(screen.getByLabelText("Routine name").props.value).toBe(
    "Keep my draft",
  );
  expect(useRoutineDraft.getState().draft?.dirty).toBe(true);
  await fireEvent.press(screen.getByText("Cancel"));
  expect(router.back).toHaveBeenCalledTimes(1);
});
