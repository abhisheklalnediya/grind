import { WorkoutDetailScreen } from "@/features/history";
export function SummaryScreen({ id }: { id: string }) {
  return <WorkoutDetailScreen id={id} summary />;
}
