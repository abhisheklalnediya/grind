import { useLocalSearchParams } from "expo-router";
import { SummaryScreen } from "@/features/workouts";
export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SummaryScreen id={id ?? ""} />;
}
