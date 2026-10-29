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
import type { RoutinePayload } from "@/domain/training";
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
function setup({ error = false, saveConflict = false } = {}) {
  const api = createTrainingApi({ rpc: jest.fn(), catalog: jest.fn() });
  jest.spyOn(api, "catalog").mockResolvedValue([catalog]);
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
  expect(() => useRoutineDraft.getState().add("a", [{ ...catalog, origin: "provider", is_configured: false, load_mode: null, load_convention: null, tracking_type: null }])).toThrow("not yet available");
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
  const view = await render(
    <TemplateExercise
      exercise={{ ...template, sets: [set] }}
      name="Bench"
      onChange={onChange}
      {...callbacks}
    />,
  );
  await fireEvent.press(screen.getByText("Working set"));
  expect(onChange).toHaveBeenLastCalledWith(
    expect.objectContaining({
      sets: [expect.objectContaining({ set_type: "warmup" })],
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
  await view.rerender(
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
  const first = {
    id: trainingId(11),
    position: 0,
    set_type: "warmup" as const,
    entered_load: "5",
    entered_unit: "lb" as const,
    reps: 4,
  };
  const onChange = jest.fn();
  await render(
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
  const warmup = screen.getAllByText("Warm-up set")[0];
  const unit = screen.getAllByText("View in kg")[0];
  if (!warmup || !unit) throw new Error("Missing set controls");
  await fireEvent.press(warmup);
  await fireEvent.press(unit);
  await fireEvent.press(screen.getByText("Remove set 1"));
  expect(onChange).toHaveBeenLastCalledWith(
    expect.objectContaining({
      sets: [expect.objectContaining({ id: trainingId(12), position: 0 })],
    }),
  );
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
