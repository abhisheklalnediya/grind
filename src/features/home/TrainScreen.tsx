import { useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen } from "@/components/Screen";
import { Heading } from "@/components/Heading";
import { Button } from "@/components/Button";
import { useTraining } from "@/features/training";
import { useTheme } from "@/theme/useTheme";
export function TrainScreen() {
  const training = useTraining();
  const { scope, colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const routines = useQuery({
    queryKey: ["routines", scope],
    queryFn: async () => (training.api ? training.api.routines() : []),
    enabled: Boolean(training.api),
  });
  const recentWorkouts = useQuery({
    queryKey: ["history", "recent", scope],
    queryFn: async () => {
      if (!training.api) throw new Error("Sign in to view history.");
      return training.api.history(null);
    },
    enabled: Boolean(training.api),
  });
  const start = async () => {
    setBusy(true);
    setError("");
    try {
      await training.start(null);
      router.push("/workout");
    } catch {
      setError(
        "Couldn’t open your workout. Your changes are kept; retry when connected.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Heading
        title="Ready to work?"
        subtitle="Build a session or start from your routine."
      />
      {training.session?.status === "active" ? (
        <Button
          label={`Resume ${training.session.name}`}
          onPress={() => router.push("/workout")}
        />
      ) : (
        <Button
          label={busy ? "Opening…" : "Start empty workout"}
          disabled={busy || training.status === "loading"}
          onPress={() => {
            void start();
          }}
        />
      )}
      {error ? (
        <Text accessibilityRole="alert" style={{ color: colors.error }}>
          {error}
        </Text>
      ) : null}
      {training.error ? (
        <>
          <Text accessibilityRole="alert" style={{ color: colors.error }}>
            {training.error}
          </Text>
          <Button
            label="Retry workout recovery"
            onPress={() => {
              void training.retry().catch(() => {});
            }}
          />
        </>
      ) : null}
      <Heading title="Your routines" />
      <Button
        label="Create routine"
        secondary
        onPress={() => router.push("/routine-edit")}
      />
      {routines.isPending ? (
        <Text style={{ color: colors.secondary }}>Loading routines…</Text>
      ) : routines.isError ? (
        <Button
          label="Retry routines"
          onPress={() => {
            void routines.refetch();
          }}
        />
      ) : routines.data.length === 0 ? (
        <Text style={{ color: colors.secondary }}>
          Save a routine to repeat your favourite session.
        </Text>
      ) : (
        routines.data.map((routine) => (
          <Button
            key={routine.id}
            label={routine.name}
            secondary
            onPress={() =>
              router.push({ pathname: "/routine", params: { id: routine.id } })
            }
          />
        ))
      )}
      <Button
        label="View completed workouts"
        secondary
        onPress={() => router.push("/(tabs)/history")}
      />
      <Heading title="Recent workouts" />
      {recentWorkouts.isPending ? (
        <Text style={{ color: colors.secondary }}>
          {training.api ? "Loading recent workouts…" : "Sign in to view workouts."}
        </Text>
      ) : recentWorkouts.isError ? (
        <>
          <Text accessibilityRole="alert" style={{ color: colors.error }}>
            Couldn’t load recent workouts.
          </Text>
          <Button
            label="Retry recent workouts"
            secondary
            onPress={() => { void recentWorkouts.refetch(); }}
          />
        </>
      ) : recentWorkouts.data.items.length === 0 ? (
        <Text style={{ color: colors.secondary }}>
          Completed workouts will appear here.
        </Text>
      ) : (
        recentWorkouts.data.items.slice(0, 5).map((workout) => {
          const date = new Intl.DateTimeFormat(undefined, {
            timeZone: workout.timezone,
            dateStyle: "medium",
          }).format(new Date(workout.finished_at ?? workout.started_at));
          return (
            <Button
              key={workout.id}
              label={`${workout.name} · ${date}`}
              secondary
              onPress={() => router.push(`/history-detail?id=${workout.id}`)}
            />
          );
        })
      )}
    </Screen>
  );
}
