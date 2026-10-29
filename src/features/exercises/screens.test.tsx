import { existsSync } from "node:fs";
import { join } from "node:path";
import { Alert, Linking } from "react-native";
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
  makeSession,
  trainingId,
} from "../../../tests/fixtures/training";
import { createTrainingApi } from "@/services/training/api";
import {
  ExerciseLibraryScreen,
  ExerciseDetailScreen,
  CustomExerciseScreen,
  ExercisePickerScreen,
} from "./index";
import { filterCatalog } from "./catalog";
import { useRoutineDraft } from "@/features/routines";
jest.mock("@/features/training", () => ({ useTraining: jest.fn() }));
const mockAddListener = jest.fn();
const mockDispatch = jest.fn();
const mockNavigation = { addListener: mockAddListener, dispatch: mockDispatch };
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useNavigation: () => mockNavigation,
}));
jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "10000000-0000-4000-8000-000000000099"),
}));
const exercise = makeCatalogExercise();
const custom = {
  ...exercise,
  id: trainingId(5),
  name: "Custom pull-up",
  origin: "custom" as const,
  owner_id: trainingId(6),
  primary_muscle: "Back",
  equipment: "Belt",
  load_mode: "weighted_bodyweight" as const,
};
function setup(
  options: {
    items?: (typeof exercise)[];
    catalogError?: boolean;
    mutationError?: boolean;
    session?: boolean;
  } = {},
) {
  const api = createTrainingApi({ rpc: jest.fn(), catalog: jest.fn() });
  const catalog = jest.spyOn(api, "catalog");
  if (options.catalogError) catalog.mockRejectedValue(new Error("offline"));
  else catalog.mockResolvedValue(options.items ?? [exercise, custom]);
  const save = jest.spyOn(api, "saveExercise");
  if (options.mutationError)
    save.mockRejectedValue(new Error("Save unavailable"));
  else save.mockResolvedValue(custom);
  const archive = jest.spyOn(api, "archiveExercise").mockResolvedValue(custom);
  jest.spyOn(api, "previous").mockResolvedValue(null);
  jest
    .spyOn(api, "history")
    .mockResolvedValue({ items: [], next_cursor: null });
  const command = jest.fn().mockResolvedValue(undefined);
  jest.mocked(useTraining).mockReturnValue({
    api,
    session: options.session ? makeSession() : null,
    command,
  } as unknown as ReturnType<typeof useTraining>);
  return { api, catalog, save, archive, command };
}
async function mount(element: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>{element}</QueryClientProvider>,
  );
}
beforeEach(() => {
  jest.clearAllMocks();
  useRoutineDraft.getState().clear();
});
afterEach(cleanup);
it("combines text, muscle, equipment and ownership filters while excluding archived entries", () => {
  expect(
    filterCatalog(
      [exercise, custom, { ...custom, archived_at: "today" }],
      "pull",
      "back",
      "belt",
      true,
    ),
  ).toEqual([custom]);
  expect(filterCatalog([exercise], "pull", "", "", false)).toEqual([]);
});
it("browses custom exercises with filters and opens their details", async () => {
  setup();
  await mount(<ExerciseLibraryScreen />);
  await fireEvent.changeText(screen.getByLabelText("Search exercises"), "pull");
  await fireEvent.press(screen.getByText("My exercises"));
  await fireEvent.press(screen.getByLabelText("Muscle filter"));
  await fireEvent.press(screen.getByText("Back"));
  await fireEvent.press(screen.getByLabelText("Equipment filter"));
  await fireEvent.press(screen.getByText("Belt"));
  const customRow = await screen.findByRole("button", {
    name: "Custom pull-up, Back · Belt, my exercise",
  });
  await fireEvent.press(customRow);
  expect(router.push).toHaveBeenCalledWith({
    pathname: "/exercise-detail",
    params: { id: custom.id },
  });
  await fireEvent.changeText(
    screen.getByLabelText("Search exercises"),
    "missing",
  );
  expect(screen.getByText("No exercises found")).toBeTruthy();
  await fireEvent.press(screen.getByText("Clear filters"));
  await fireEvent.press(screen.getByLabelText("Create exercise"));
  expect(router.push).toHaveBeenCalledWith("/custom-exercise");
});
it("retries catalog failures", async () => {
  const { catalog } = setup({ catalogError: true });
  await mount(<ExerciseLibraryScreen />);
  await screen.findByText("Couldn’t load your saved exercises.");
  catalog.mockResolvedValue([custom]);
  await fireEvent.press(screen.getByText("Retry exercises"));
  await fireEvent.changeText(
    screen.getByLabelText("Search exercises"),
    "Custom pull-up",
  );
  await screen.findByRole("button", {
    name: "Custom pull-up, Back · Belt, my exercise",
  });
});
it("renders real previous sets without claiming records or playback and permits custom editing", async () => {
  const { api } = setup();
  jest.spyOn(api, "previous").mockResolvedValue({
    session_id: trainingId(1),
    finished_at: "2026-10-27T12:00:00.000Z",
    sets: [
      {
        set_type: "working",
        ordinal: 0,
        entered_load: "20",
        entered_unit: "kg",
        reps: 8,
      },
      {
        set_type: "warmup",
        ordinal: 0,
        entered_load: null,
        entered_unit: "kg",
        reps: 5,
      },
    ],
  });
  await mount(<ExerciseDetailScreen id={custom.id} />);
  await screen.findByText("Working 1: 20 kg × 8 reps");
  expect(
    screen.getByText(
      "Exercise illustrations and detailed instructions are not available yet.",
    ),
  ).toBeTruthy();
  const link = screen.getByRole("link", {
    name: "Exercise data by RepDB, opens website",
  });
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  await fireEvent.press(link);
  expect(open).toHaveBeenCalledWith("https://repdb.co");
  open.mockRestore();
  expect(screen.getByText("Warm-up 1: Bodyweight × 5 reps")).toBeTruthy();
  await fireEvent.press(screen.getByText("Edit exercise"));
  expect(router.push).toHaveBeenCalledWith({
    pathname: "/custom-exercise",
    params: { id: custom.id },
  });
});
it("shows no history and unavailable definitions honestly", async () => {
  setup();
  await mount(<ExerciseDetailScreen id={exercise.id} />);
  await screen.findByText(
    "No completed workout for this exercise and load mode.",
  );
  await cleanup();
  await mount(<ExerciseDetailScreen id="missing" />);
  await screen.findByText("This exercise is unavailable for new workouts.");
});
it("validates custom definition, supports all load modes and saves only its payload", async () => {
  const { save } = setup();
  await mount(<CustomExerciseScreen />);
  await fireEvent.press(screen.getByText("Save exercise"));
  expect(screen.getByText(/Complete all fields/)).toBeTruthy();
  for (const [label, value] of [
    ["Exercise name", "Pull-up"],
    ["Primary muscle", "Back"],
    ["Equipment", "Belt"],
    ["Category", "Strength"],
    ["Load convention", "Added belt weight"],
  ])
    await fireEvent.changeText(screen.getByLabelText(label ?? ""), value ?? "");
  for (const label of [
    "Bodyweight",
    "Assisted",
    "Regular weights",
    "Weighted bodyweight",
  ])
    await fireEvent.press(screen.getByText(label));
  await fireEvent.press(screen.getByText("Save exercise"));
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith(
      expect.any(String),
      null,
      expect.objectContaining({
        load_mode: "weighted_bodyweight",
        name: "Pull-up",
      }),
    ),
  );
  expect(router.back).toHaveBeenCalled();
});
it("edits and archives custom identity after explicit confirmation", async () => {
  const { archive } = setup();
  const alert = jest.spyOn(Alert, "alert");
  await mount(<CustomExerciseScreen id={custom.id} />);
  await waitFor(() =>
    expect(screen.getByLabelText("Exercise name").props.value).toBe(
      custom.name,
    ),
  );
  await fireEvent.press(screen.getByText("Archive exercise"));
  const buttons = alert.mock.calls.at(-1)?.[2];
  await act(async () => {
    await buttons?.[1]?.onPress?.();
  });
  await waitFor(() =>
    expect(archive).toHaveBeenCalledWith(expect.any(String), custom.id),
  );
});
it("keeps mutation errors visible for retry and blocks edits to built-in exercises", async () => {
  setup({ mutationError: true });
  await mount(<CustomExerciseScreen id={custom.id} />);
  await waitFor(() =>
    expect(screen.getByLabelText("Exercise name").props.value).toBe(
      custom.name,
    ),
  );
  await fireEvent.press(screen.getByText("Save exercise"));
  await screen.findByText("Save unavailable");
  await cleanup();
  await mount(<CustomExerciseScreen id={exercise.id} />);
  await screen.findByText("This exercise cannot be edited.");
});
it("keeps picker selection across search and adds stable workout commands", async () => {
  const { command } = setup({ session: true });
  await mount(<ExercisePickerScreen target="workout" />);
  await screen.findByText("Bench press");
  await fireEvent.press(screen.getByText("Bench press"));
  await fireEvent.changeText(screen.getByLabelText("Search exercises"), "pull");
  await fireEvent.press(screen.getByText("Custom pull-up"));
  await fireEvent.press(screen.getByText("Add 2 exercises"));
  await waitFor(() => expect(command).toHaveBeenCalledTimes(2));
  expect(command).toHaveBeenCalledWith(
    expect.objectContaining({ type: "add_exercise", exercise_id: exercise.id }),
    exercise,
  );
});
it("adds routine selection into the same transient draft and rejects missing workout", async () => {
  setup();
  useRoutineDraft.getState().begin("unconfigured");
  await mount(<ExercisePickerScreen target="routine" />);
  await screen.findByText("Bench press");
  await fireEvent.press(screen.getByText("Bench press"));
  await fireEvent.press(screen.getByText("Add 1 exercises"));
  await waitFor(() =>
    expect(useRoutineDraft.getState().draft?.payload.exercises).toHaveLength(1),
  );
  await cleanup();
  await mount(<ExercisePickerScreen target="workout" />);
  await screen.findByText("Bench press");
  await fireEvent.press(screen.getByText("Bench press"));
  await fireEvent.press(screen.getByText("Add 1 exercises"));
  await screen.findByText("Start or resume a workout first.");
});
it("retries detail and previous errors independently", async () => {
  const { catalog, api } = setup({ catalogError: true });
  await mount(<ExerciseDetailScreen id={exercise.id} />);
  await screen.findByText("Retry exercise");
  catalog.mockResolvedValue([exercise]);
  jest.spyOn(api, "previous").mockRejectedValue(new Error("offline"));
  await fireEvent.press(screen.getByText("Retry exercise"));
  await screen.findByText("Retry previous performance");
  jest.spyOn(api, "previous").mockResolvedValue(null);
  jest
    .spyOn(api, "history")
    .mockResolvedValue({ items: [], next_cursor: null });
  await fireEvent.press(screen.getByText("Retry previous performance"));
  await screen.findByText(
    "No completed workout for this exercise and load mode.",
  );
});
it("retries custom load and explicitly discards a custom draft", async () => {
  const { catalog } = setup({ catalogError: true });
  const alert = jest.spyOn(Alert, "alert");
  await mount(<CustomExerciseScreen id={custom.id} />);
  await screen.findByText("Couldn’t load exercise.");
  catalog.mockResolvedValue([custom]);
  await fireEvent.press(screen.getByText("Retry exercise"));
  await screen.findByText("Save exercise");
  await fireEvent.press(screen.getByText("Cancel"));
  await act(async () => {
    await alert.mock.calls.at(-1)?.[2]?.[1]?.onPress?.();
  });
  expect(router.back).toHaveBeenCalled();
});
it("retries picker catalog, deselects an item, retains filters and navigates to custom creation", async () => {
  const { catalog } = setup({ catalogError: true });
  await mount(<ExercisePickerScreen target="routine" />);
  await screen.findByText("Retry exercises");
  catalog.mockResolvedValue([exercise]);
  await fireEvent.press(screen.getByText("Retry exercises"));
  await screen.findByText("Bench press");
  await fireEvent.press(screen.getByText("Bench press"));
  await fireEvent.press(screen.getByText("Selected · Bench press"));
  await fireEvent.press(screen.getByLabelText("Muscle filter"));
  await fireEvent.press(screen.getByText("Chest"));
  await fireEvent.press(screen.getByLabelText("Equipment filter"));
  await fireEvent.press(screen.getByText("Barbell"));
  await fireEvent.press(screen.getByLabelText("Create exercise"));
  expect(router.push).toHaveBeenCalledWith("/custom-exercise");
});
it("refuses routine selection without a matching account draft and preserves selection on command failure", async () => {
  const { command } = setup({ session: true });
  await mount(<ExercisePickerScreen target="routine" />);
  await screen.findByText("Bench press");
  await fireEvent.press(screen.getByText("Bench press"));
  await fireEvent.press(screen.getByText("Add 1 exercises"));
  await screen.findByText(
    "Return to the routine editor before adding exercises.",
  );
  await cleanup();
  command.mockRejectedValueOnce(new Error("Couldn’t add"));
  await mount(<ExercisePickerScreen target="workout" />);
  await screen.findByText("Bench press");
  await fireEvent.press(screen.getByText("Bench press"));
  await fireEvent.press(screen.getByText("Add 1 exercises"));
  await screen.findByText("Couldn’t add");
  await fireEvent.press(screen.getByText("Add 1 exercises"));
  await waitFor(() => expect(command).toHaveBeenCalledTimes(2));
  expect(command.mock.calls[0]?.[0].id).toBe(command.mock.calls[1]?.[0].id);
});
it("warns about duplicate names and guards native back without erasing the form", async () => {
  setup();
  const alert = jest.spyOn(Alert, "alert");
  await mount(<CustomExerciseScreen />);
  await fireEvent.changeText(
    screen.getByLabelText("Exercise name"),
    "Bench press",
  );
  await screen.findByText(/An exercise with this name already exists/);
  const preventDefault = jest.fn();
  const callback: unknown = mockAddListener.mock.calls.at(-1)?.[1];
  if (typeof callback !== "function")
    throw new Error("Missing navigation guard");
  callback({ preventDefault, data: { action: { type: "GO_BACK" } } });
  expect(preventDefault).toHaveBeenCalled();
  expect(screen.getByLabelText("Exercise name").props.value).toBe(
    "Bench press",
  );
  await act(async () => {
    await alert.mock.calls.at(-1)?.[2]?.[1]?.onPress?.();
  });
  expect(mockDispatch).toHaveBeenCalledWith({ type: "GO_BACK" });
});
it("retains picker selections across searches of a large catalog", async () => {
  const items = Array.from({ length: 45 }, (_, index) => ({
    ...exercise,
    id: trainingId(index + 200),
    name: `Exercise ${String(index).padStart(2, "0")}`,
  }));
  const { command } = setup({ items, session: true });
  await mount(<ExercisePickerScreen target="workout" />);
  await screen.findByText("Exercise 00");
  await fireEvent.press(screen.getByText("Exercise 00"));
  await fireEvent.changeText(screen.getByLabelText("Search exercises"), "44");
  await fireEvent.press(screen.getByText("Exercise 44"));
  await fireEvent.changeText(screen.getByLabelText("Search exercises"), "00");
  await fireEvent.press(screen.getByText("Add 2 exercises"));
  await waitFor(() => expect(command).toHaveBeenCalledTimes(2));
  expect(command).toHaveBeenCalledWith(
    expect.objectContaining({ exercise_id: items[44]?.id }),
    items[44],
  );
});
(existsSync(join(process.cwd(), "assets/exercises/repdb/free.en.json"))
  ? it
  : it.skip)(
  "browses RepDB entries in the list with honest local detail",
  async () => {
    setup();
    await mount(<ExerciseLibraryScreen />);
    await fireEvent.changeText(
      screen.getByLabelText("Search exercises"),
      "barbell ab rollout",
    );
    await screen.findByText("Barbell Ab Rollout");
    await fireEvent.press(screen.getByText("Barbell Ab Rollout"));
    expect(
      screen.getByText(/Import is required before adding this exercise/),
    ).toBeTruthy();
    expect(
      screen.getByText(/A kneeling ab rollout using a loaded barbell/),
    ).toBeTruthy();
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    await fireEvent.press(
      screen.getByRole("link", {
        name: "Exercise data by RepDB, opens website",
      }),
    );
    expect(open).toHaveBeenCalledWith("https://repdb.co");
    open.mockRestore();
    await fireEvent.press(screen.getByText("‹ Back to exercises"));
    expect(screen.getByText("Barbell Ab Rollout")).toBeTruthy();
  },
);
(existsSync(join(process.cwd(), "assets/exercises/repdb/free.en.json"))
  ? it
  : it.skip)(
  "preserves existing server exercises alongside the bundled catalog and custom exercises",
  async () => {
    setup({
      items: [{ ...exercise, name: "Server only seed marker" }, custom],
    });
    await mount(<ExerciseLibraryScreen />);
    await fireEvent.changeText(
      screen.getByLabelText("Search exercises"),
      "Server only seed marker",
    );
    const existing = await screen.findByRole("button", {
      name: "Server only seed marker, Chest · Barbell, existing catalog exercise",
    });
    await fireEvent.press(existing);
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/exercise-detail",
      params: { id: exercise.id },
    });
    await fireEvent.changeText(
      screen.getByLabelText("Search exercises"),
      "Custom pull-up",
    );
    expect(
      await screen.findByRole("button", {
        name: "Custom pull-up, Back · Belt, my exercise",
      }),
    ).toBeTruthy();
  },
);
