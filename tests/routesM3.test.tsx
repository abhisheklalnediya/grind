import type { PropsWithChildren } from "react";
import { Text as MockText } from "react-native";
import { screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import TabsLayout from "../app/(tabs)/_layout";
import Train from "../app/(tabs)/index";
import History from "../app/(tabs)/history";
import Exercises from "../app/(tabs)/exercises";
import Settings from "../app/(tabs)/settings";
import WorkoutLayout from "../app/workout/_layout";
import Workout from "../app/workout/index";
import Finish from "../app/workout/finish";
import Summary from "../app/workout/summary";
import HistoryDetail from "../app/history-detail";
import ExerciseDetail from "../app/exercise-detail";
import ExercisePicker from "../app/exercise-picker";
import CustomExercise from "../app/custom-exercise";
import Routine from "../app/routine";
import RoutineEdit from "../app/routine-edit";
import AuthLayout from "../app/auth/_layout";
import SignIn from "../app/auth/sign-in";
import SignUp from "../app/auth/sign-up";
import Recovery from "../app/auth/recovery";
import Callback from "../app/auth/callback";
import Setup from "../app/auth/setup";
import Verify from "../app/auth/verify";
import NewPassword from "../app/auth/new-password";
let mockAllowed = true;
const MockDestination = ({
  name,
  ...props
}: {
  name: string;
  [key: string]: unknown;
}) => <MockText>{`${name}:${JSON.stringify(props)}`}</MockText>;
jest.mock("@/features/auth/AuthGate", () => ({
  AuthGate: ({ children }: PropsWithChildren) =>
    mockAllowed ? children : <MockText>Protected content withheld</MockText>,
}));
jest.mock("@/features/home/ResumeStrip", () => ({
  ResumeStrip: () => <MockText>Resume placement</MockText>,
}));
jest.mock("@/features/home/TrainScreen", () => ({
  TrainScreen: () => <MockDestination name="Train" />,
}));
jest.mock("@/features/shell/SettingsRoute", () => ({
  SettingsRoute: () => <MockDestination name="Settings" />,
}));
jest.mock("@/features/history", () => ({
  HistoryScreen: () => <MockDestination name="History" />,
  WorkoutDetailScreen: (props: { id: string }) => (
    <MockDestination name="Workout detail" {...props} />
  ),
}));
jest.mock("@/features/workouts", () => ({
  WorkoutScreen: () => <MockDestination name="Workout" />,
  FinishScreen: () => <MockDestination name="Finish" />,
  SummaryScreen: (props: { id: string }) => (
    <MockDestination name="Summary" {...props} />
  ),
}));
jest.mock("@/features/exercises", () => ({
  ExerciseLibraryScreen: () => <MockDestination name="Exercises" />,
  ExerciseDetailScreen: (props: { id: string }) => (
    <MockDestination name="Exercise detail" {...props} />
  ),
  ExercisePickerScreen: (props: { target: string }) => (
    <MockDestination name="Picker" {...props} />
  ),
  CustomExerciseScreen: (props: { id?: string }) => (
    <MockDestination name="Custom" {...props} />
  ),
}));
jest.mock("@/features/routines", () => ({
  RoutineDetailScreen: (props: { id: string }) => (
    <MockDestination name="Routine" {...props} />
  ),
  RoutineEditorScreen: (props: { id?: string }) => (
    <MockDestination name="Routine editor" {...props} />
  ),
}));
jest.mock("@/features/auth/AuthScreen", () => ({
  AuthScreen: (props: { mode: string }) => (
    <MockDestination name="Auth" {...props} />
  ),
}));
jest.mock("@/features/auth/CallbackScreen", () => ({
  CallbackScreen: () => <MockDestination name="Callback" />,
}));
jest.mock("@/features/auth/SetupScreen", () => ({
  SetupScreen: () => <MockDestination name="Setup" />,
}));
jest.mock("@/features/auth/VerifyScreen", () => ({
  VerifyScreen: () => <MockDestination name="Verify" />,
}));
jest.mock("@/features/auth/NewPasswordScreen", () => ({
  NewPasswordScreen: () => <MockDestination name="New password" />,
}));
const routes = {
  "(tabs)/_layout": TabsLayout,
  "(tabs)/index": Train,
  "(tabs)/history": History,
  "(tabs)/exercises": Exercises,
  "(tabs)/settings": Settings,
  "workout/_layout": WorkoutLayout,
  "workout/index": Workout,
  "workout/finish": Finish,
  "workout/summary": Summary,
  "history-detail": HistoryDetail,
  "exercise-detail": ExerciseDetail,
  "exercise-picker": ExercisePicker,
  "custom-exercise": CustomExercise,
  routine: Routine,
  "routine-edit": RoutineEdit,
  "auth/_layout": AuthLayout,
  "auth/sign-in": SignIn,
  "auth/sign-up": SignUp,
  "auth/recovery": Recovery,
  "auth/callback": Callback,
  "auth/setup": Setup,
  "auth/verify": Verify,
  "auth/new-password": NewPassword,
};
beforeEach(() => {
  mockAllowed = true;
});
it.each([
  ["/", "Train:{}"],
  ["/history", "History:{}"],
  ["/exercises", "Exercises:{}"],
  ["/settings", "Settings:{}"],
  ["/workout", "Workout:{}"],
  ["/workout/finish", "Finish:{}"],
  ["/workout/summary?id=saved-1", 'Summary:{"id":"saved-1"}'],
  ["/history-detail?id=saved-1", 'Workout detail:{"id":"saved-1"}'],
  ["/exercise-detail?id=catalog-1", 'Exercise detail:{"id":"catalog-1"}'],
  ["/routine?id=routine-1", 'Routine:{"id":"routine-1"}'],
  ["/routine-edit?id=routine-1", 'Routine editor:{"id":"routine-1"}'],
  ["/custom-exercise?id=custom-1", 'Custom:{"id":"custom-1"}'],
  ["/exercise-picker?target=routine", 'Picker:{"target":"routine"}'],
  ["/auth/sign-in", 'Auth:{"mode":"signin"}'],
  ["/auth/sign-up", 'Auth:{"mode":"signup"}'],
  ["/auth/recovery", 'Auth:{"mode":"recovery"}'],
  ["/auth/callback", "Callback:{}"],
  ["/auth/setup", "Setup:{}"],
  ["/auth/verify", "Verify:{}"],
  ["/auth/new-password", "New password:{}"],
])(
  "registers %s and composes the intended screen with route parameters",
  async (initialUrl, expected) => {
    await renderRouter(routes, { initialUrl });
    expect(screen.getByText(expected)).toBeVisible();
  },
);
it.each([
  ["/workout/summary", 'Summary:{"id":""}'],
  ["/history-detail", 'Workout detail:{"id":""}'],
  ["/exercise-detail", 'Exercise detail:{"id":""}'],
  ["/routine", 'Routine:{"id":""}'],
  ["/routine-edit", "Routine editor:{}"],
  ["/custom-exercise", "Custom:{}"],
  ["/exercise-picker", 'Picker:{"target":"workout"}'],
  ["/exercise-picker?target=invalid", 'Picker:{"target":"workout"}'],
])(
  "handles absent parameters or unsupported picker targets on %s",
  async (initialUrl, expected) => {
    await renderRouter(routes, { initialUrl });
    expect(screen.getByText(expected)).toBeVisible();
  },
);
it("places Resume outside the four-tab navigator and keeps protected destination screens gated", async () => {
  const view = await renderRouter(routes, { initialUrl: "/history" });
  expect(screen.getByText("Resume placement")).toBeVisible();
  expect(screen.getByRole("button", { name: /^Train, tab/ })).toBeVisible();
  expect(screen.getByRole("button", { name: /^History, tab/ })).toBeVisible();
  expect(screen.getByRole("button", { name: /^Exercises, tab/ })).toBeVisible();
  expect(screen.getByRole("button", { name: /^Settings, tab/ })).toBeVisible();
  await view.unmount();
  mockAllowed = false;
  await renderRouter(routes, { initialUrl: "/workout/finish" });
  expect(screen.getByText("Protected content withheld")).toBeVisible();
  expect(screen.queryByText("Finish:{}")).toBeNull();
});
