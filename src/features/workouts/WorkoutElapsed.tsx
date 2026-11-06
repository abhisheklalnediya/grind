import { useEffect, useState } from "react";
import { Text } from "react-native";
import { useTheme } from "@/theme/useTheme";

export function WorkoutElapsed({ startedAt }: { startedAt: string }) {
  const { colors } = useTheme();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  const seconds = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000));
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const display = hours
    ? `${hours}:${String(minutes % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
    : `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <Text
      accessibilityLabel={`Elapsed workout time ${minutes} minutes ${seconds % 60} seconds`}
      style={{ color: colors.secondary, fontVariant: ["tabular-nums"] }}
    >
      {display} elapsed
    </Text>
  );
}
