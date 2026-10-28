import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { TrainingSession } from "@/domain/training";
import { TrainingProvider } from "@/features/training";
import { WorkoutScreen, FinishScreen } from "@/features/workouts";
import { createTrainingApi } from "@/services/training/api";
import { projectCommand } from "@/services/training/projection";
import { makeSession, makeSet, trainingId } from "./fixtures/training";
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));
it("recovers unblurred name, notes and rest, blocks finish, then clears drafts only after acknowledged commands", async () => {
  const exercise = {
    id: trainingId(2),
    exercise_id: trainingId(8),
    position: 0,
    name: "Bench",
    load_convention: "Total",
    load_mode: "external" as const,
    notes: "Original",
    rest_seconds: 120,
    sets: [{ ...makeSet(), completed_at: "2026-10-28T10:00:00Z" }],
  };
  let server: TrainingSession = { ...makeSession(), exercises: [exercise] };
  const api = {
    ...createTrainingApi({ rpc: jest.fn(), catalog: jest.fn() }),
    active: async () => server,
    workout: async () => server,
    previous: async () => null,
    apply: jest.fn(
      async (
        _op: string,
        _id: string,
        revision: number,
        command: Parameters<typeof projectCommand>[1]["command"],
      ) => {
        server = {
          ...projectCommand(server, { command }, Date.now()),
          revision: revision + 1,
        };
        return server;
      },
    ),
  };
  const data = new Map<string, string>();
  const storage = {
    getItem: async (key: string) => data.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: async (key: string) => {
      data.delete(key);
    },
  };
  let n = 50;
  const mount = () =>
    render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: { queries: { retry: false, gcTime: Infinity } },
          })
        }
      >
        <TrainingProvider
          scope="test:user"
          api={api}
          storage={storage}
          uuid={() => trainingId(n++)}
        >
          <WorkoutScreen />
          <FinishScreen />
        </TrainingProvider>
      </QueryClientProvider>,
    );
  const first = await mount();
  await screen.findByLabelText("Workout name");
  await fireEvent.changeText(
    screen.getByLabelText("Workout name"),
    "Unblurred workout",
  );
  await fireEvent.changeText(
    screen.getByLabelText("Bench notes"),
    "Unblurred notes",
  );
  await fireEvent.changeText(screen.getByLabelText("Bench rest seconds"), "90");
  await waitFor(() =>
    expect(JSON.stringify([...data.values()])).toContain("Unblurred notes"),
  );
  expect(api.apply).not.toHaveBeenCalled();
  await first.unmount();
  await mount();
  await waitFor(() =>
    expect(screen.getByLabelText("Workout name").props.value).toBe(
      "Unblurred workout",
    ),
  );
  expect(screen.getByLabelText("Bench notes").props.value).toBe(
    "Unblurred notes",
  );
  expect(screen.getByLabelText("Bench rest seconds").props.value).toBe("90");
  expect(screen.getByText("Finish and save")).toBeDisabled();
  await fireEvent(screen.getByLabelText("Workout name"), "blur");
  await fireEvent(screen.getByLabelText("Bench notes"), "blur");
  await waitFor(() => expect(api.apply).toHaveBeenCalledTimes(2));
  await waitFor(() =>
    expect(screen.getByText("Finish and save")).toBeEnabled(),
  );
  expect(server.name).toBe("Unblurred workout");
  expect(server.exercises[0]?.notes).toBe("Unblurred notes");
  expect(server.exercises[0]?.rest_seconds).toBe(90);
  await act(async () => {});
});
