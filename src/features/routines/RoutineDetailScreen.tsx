import { useRef, useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { randomUUID } from "expo-crypto";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@/components/Screen";
import { Heading } from "@/components/Heading";
import { Button } from "@/components/Button";
import { useTraining } from "@/features/training";
import { useTheme } from "@/theme/useTheme";
import { Copy, useCatalog } from "@/features/exercises/shared";
export function RoutineDetailScreen({ id }: { id: string }) {
  const training = useTraining();
  const catalog = useCatalog();
  const { scope } = useTheme();
  const client = useQueryClient();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const operation = useRef<string | null>(null);
  const query = useQuery({
    queryKey: ["routine", scope, id],
    queryFn: () => {
      if (!training.api) throw new Error("Sign in to view routines.");
      return training.api.routine(id);
    },
    enabled: Boolean(training.api),
  });
  const action = async (archive: boolean) => {
    if (!training.api || !query.data || busy) return;
    setBusy(true);
    setError("");
    try {
      if (archive) {
        operation.current ??= randomUUID();
        await training.api.archiveRoutine(
          operation.current,
          id,
          query.data.version,
        );
        await client.invalidateQueries({ queryKey: ["routines"] });
        router.back();
      } else {
        if (training.session?.status !== "active") await training.start(id);
        router.push("/workout");
      }
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Couldn’t update routine.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Heading title={query.data?.name ?? "Routine"} />
      {query.isPending ? <Copy>Loading routine…</Copy> : null}
      {query.isError ? (
        <Button
          label="Retry routine"
          onPress={() => {
            void query.refetch();
          }}
        />
      ) : null}
      {query.data ? (
        <>
          <Copy>
            {query.data.exercises.length} exercises · version{" "}
            {query.data.version}
          </Copy>
          {query.data.exercises.map((exercise, index) => (
            <Copy key={exercise.id}>
              {catalog.data?.find((item) => item.id === exercise.exercise_id)
                ?.name ?? `Exercise ${index + 1}`}{" "}
              · {exercise.sets.length} sets · {exercise.rest_seconds}s rest
              {exercise.notes ? ` · ${exercise.notes}` : ""}
            </Copy>
          ))}
          {error ? <Copy>{error}</Copy> : null}
          <Button
            disabled={busy || Boolean(query.data.archived_at)}
            label={training.session ? "Resume active workout" : "Start routine"}
            onPress={() => {
              void action(false);
            }}
          />
          <Button
            secondary
            label="Edit routine"
            onPress={() =>
              router.push({ pathname: "/routine-edit", params: { id } })
            }
          />
          <Button
            secondary
            disabled={busy || Boolean(query.data.archived_at)}
            label="Archive routine"
            onPress={() =>
              Alert.alert(
                "Archive routine?",
                "Previous workouts keep their saved template snapshots.",
                [
                  { text: "Keep routine", style: "cancel" },
                  {
                    text: "Archive",
                    style: "destructive",
                    onPress: () => {
                      void action(true);
                    },
                  },
                ],
              )
            }
          />
        </>
      ) : null}
    </Screen>
  );
}
