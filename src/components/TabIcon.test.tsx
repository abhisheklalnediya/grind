import { render, screen } from "@testing-library/react-native";
import { TabIcon, type TabIconName } from "./TabIcon";

const variants: { name: TabIconName; shape: string }[] = [
  { name: "train", shape: "train-bar" },
  { name: "history", shape: "history-face" },
  { name: "exercises", shape: "exercises-line-0" },
  { name: "settings", shape: "settings-track-0" },
];

it.each(variants)(
  "renders the $name icon in the supplied semantic tint",
  async ({ name, shape }) => {
    await render(<TabIcon name={name} color="#52606D" size={24} />);

    expect(screen.getByTestId(`tab-icon-${name}`)).toHaveStyle({
      width: 24,
      height: 24,
    });
    expect(screen.getByTestId(shape)).toBeVisible();
    expect(screen.queryByText(/[\u25a1\u25a0\ufffd]/)).toBeNull();
    if (name === "train") {
      expect(screen.getByTestId("train-bar")).toHaveStyle({
        backgroundColor: "#52606D",
      });
    }
    if (name === "history") {
      expect(screen.getByTestId("history-face")).toHaveStyle({
        borderColor: "#52606D",
      });
    }
    if (name === "exercises" || name === "settings") {
      expect(screen.getByTestId(shape)).toHaveStyle({
        backgroundColor: "#52606D",
      });
    }
  },
);

it("scales the icon container to the navigator-provided size", async () => {
  await render(<TabIcon name="history" color="#4F5D00" size={30} />);
  expect(screen.getByTestId("tab-icon-history")).toHaveStyle({
    width: 30,
    height: 30,
  });
});
