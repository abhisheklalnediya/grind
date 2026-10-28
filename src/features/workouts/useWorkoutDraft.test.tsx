import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { Text, TextInput } from "react-native";
import { useWorkoutDraft } from "./useWorkoutDraft";
const mockTraining = { raw: {} as Record<string, string>, setRaw: jest.fn() };
jest.mock("@/features/training", () => ({ useTraining: () => mockTraining }));
const error = jest.fn();
const blur = jest.fn();
function Probe({
  draftKey = "notes",
  saved = "Saved note",
}: {
  draftKey?: string;
  saved?: string;
}) {
  const draft = useWorkoutDraft(draftKey, saved, error);
  return (
    <>
      <TextInput
        accessibilityLabel="Note"
        value={draft.value}
        onChangeText={draft.change}
        onBlur={() => blur(draft.latest.current)}
      />
      <Text>{draft.latest.current}</Text>
    </>
  );
}
beforeEach(() => {
  jest.clearAllMocks();
  mockTraining.raw = {};
  mockTraining.setRaw.mockResolvedValue(undefined);
});
it("recovers raw text on mount and preserves every keystroke before blur", async () => {
  mockTraining.raw.notes = "Recovered unblurred";
  const view = await render(<Probe />);
  expect(screen.getByLabelText("Note").props.value).toBe("Recovered unblurred");
  mockTraining.setRaw.mockImplementation(async (key: string, value: string) => {
    mockTraining.raw[key] = value;
  });
  await fireEvent.changeText(screen.getByLabelText("Note"), "");
  expect(mockTraining.setRaw).toHaveBeenCalledWith("notes", "");
  await view.rerender(<Probe />);
  expect(screen.getByLabelText("Note").props.value).toBe("");
});
it("keeps latest rapid text while writes finish and reports storage failure", async () => {
  let resolveFirst: () => void = () => {};
  mockTraining.setRaw.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        resolveFirst = resolve;
      }),
  );
  const view = await render(<Probe />);
  await fireEvent.changeText(screen.getByLabelText("Note"), "First");
  mockTraining.raw.notes = "First";
  await view.rerender(<Probe />);
  await fireEvent.changeText(screen.getByLabelText("Note"), "Latest");
  await act(async () => {
    resolveFirst();
  });
  mockTraining.setRaw.mockRejectedValueOnce(Error("disk"));
  await fireEvent.changeText(screen.getByLabelText("Note"), "Keep text");
  await waitFor(() =>
    expect(error).toHaveBeenCalledWith(
      "Could not preserve input. Retry before leaving.",
    ),
  );
});

it("does not send a previous workout’s text after a key switch with an old write pending", async () => {
  let finish: () => void = () => {};
  mockTraining.setRaw.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const view = await render(<Probe />);
  await fireEvent.changeText(screen.getByLabelText("Note"), "Old unsent name");
  await view.rerender(
    <Probe draftKey="new-workout:name" saved="New workout" />,
  );
  expect(screen.getByLabelText("Note").props.value).toBe("New workout");
  await fireEvent(screen.getByLabelText("Note"), "blur");
  expect(blur).toHaveBeenLastCalledWith("New workout");
  await act(async () => {
    finish();
  });
  await fireEvent(screen.getByLabelText("Note"), "blur");
  expect(blur).toHaveBeenLastCalledWith("New workout");
  await fireEvent.changeText(screen.getByLabelText("Note"), "New draft");
  expect(mockTraining.setRaw).toHaveBeenLastCalledWith(
    "new-workout:name",
    "New draft",
  );
});
