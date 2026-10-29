import { Text } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/Button";
import { Heading } from "@/components/Heading";
import { Screen } from "@/components/Screen";
import { useTraining } from "@/features/training";
import { useTheme } from "@/theme/useTheme";
import { SessionDetails } from "./SessionDetails";
export function WorkoutDetailScreen({
  id,
  summary = false,
}: {
  id: string;
  summary?: boolean;
}) {
  const training = useTraining();
  const { colors, scope } = useTheme();
  const workout = useQuery({
    queryKey: ["workout", scope, id],
    queryFn: async () => {
      if (!training.api) throw new Error("Sign in to view workouts.");
      return training.api.workout(id);
    },
    enabled: !!training.api && id.length > 0,
  });
  return (
    <Screen>
      {!summary && (
        <Button secondary label="Back" onPress={() => router.back()} />
      )}
      <Heading
        title={
          summary && workout.data?.status === "completed"
            ? "Workout saved"
            : (workout.data?.name ?? "Workout details")
        }
      />
      {workout.isPending ? (
        <Text style={{ color: colors.text }}>
          {training.api ? "Loading workout…" : "Sign in to view this workout."}
        </Text>
      ) : workout.isError ? (
        <Button
          label="Retry workout"
          onPress={() => {
            void workout.refetch();
          }}
        />
      ) : workout.data.status === "completed" ? (
        <>
          <SessionDetails session={workout.data} />
          {summary && (
            <Button label="Done" onPress={() => router.replace("/(tabs)")} />
          )}
        </>
      ) : (
        <Text style={{ color: colors.text }}>
          This workout has not been completed.
        </Text>
      )}
    </Screen>
  );
}
