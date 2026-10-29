import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Linking, Text } from "react-native";
import { Screen } from "@/components/Screen";
import { Heading } from "@/components/Heading";
import { Button } from "@/components/Button";
import { useTraining } from "@/features/training";
import { useTheme } from "@/theme/useTheme";
import { ExerciseHistory } from "./ExerciseHistory";
import { Copy } from "./fields";
import { loadModes, useCatalog } from "./catalog";
export function ExerciseDetailScreen({ id }: { id: string }) {
  const catalog = useCatalog();
  const exercise = catalog.data?.find((item) => item.id === id);
  const { api } = useTraining();
  const { scope, colors } = useTheme();
  const previous = useQuery({
    queryKey: ["exercise-previous", scope, id, exercise?.load_mode],
    queryFn: () => {
      if (!api || !exercise) throw new Error("Exercise unavailable.");
      return api.previous(id, exercise.load_mode);
    },
    enabled: Boolean(api && exercise),
  });
  return (
    <Screen>
      <Heading title={exercise?.name ?? "Exercise"} />
      {catalog.isPending ? <Copy>Loading exercise…</Copy> : null}
      {catalog.isError ? (
        <Button
          label="Retry exercise"
          onPress={() => {
            void catalog.refetch();
          }}
        />
      ) : null}
      {catalog.isSuccess && !exercise ? (
        <Copy>This exercise is unavailable for new workouts.</Copy>
      ) : null}
      {exercise ? (
        <>
          <Copy>
            {exercise.primary_muscle} · {exercise.equipment} ·{" "}
            {exercise.category}
          </Copy>
          <Copy>
            {loadModes[exercise.load_mode]} · {exercise.load_convention}
          </Copy>
          <Copy>
            Use a controlled range of motion and a load appropriate to your
            ability. Stop if movement causes pain.
          </Copy>
          <Copy>
            Exercise illustrations and detailed instructions are not available
            yet.
          </Copy>
          <Text
            accessibilityRole="link"
            accessibilityLabel="Exercise data by RepDB, opens website"
            onPress={() => {
              void Linking.openURL("https://repdb.co").catch(() => {});
            }}
            style={{
              color: colors.text,
              textDecorationLine: "underline",
              minHeight: 48,
            }}
          >
            Exercise data by RepDB (repdb.co)
          </Text>
          <Heading title="Latest performance" />
          {previous.isPending ? (
            <Copy>Loading previous performance…</Copy>
          ) : null}
          {previous.isError ? (
            <Button
              label="Retry previous performance"
              onPress={() => {
                void previous.refetch();
              }}
            />
          ) : null}
          {previous.isSuccess && !previous.data ? (
            <Copy>No completed workout for this exercise and load mode.</Copy>
          ) : null}
          {previous.data?.sets.map((set) => (
            <Copy key={`${set.set_type}-${set.ordinal}`}>
              {set.set_type === "warmup" ? "Warm-up" : "Working"}{" "}
              {set.ordinal + 1}:{" "}
              {set.entered_load === null
                ? "Bodyweight"
                : `${set.entered_load} ${set.entered_unit}`}{" "}
              × {set.reps} reps
            </Copy>
          ))}
          <ExerciseHistory exercise={exercise} />
          <Copy>Personal records will be available in a later milestone.</Copy>
          {exercise.origin === "custom" ? (
            <Button
              label="Edit exercise"
              onPress={() =>
                router.push({ pathname: "/custom-exercise", params: { id } })
              }
            />
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
