import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
        subtitle="One set closer. Let’s make it count."
      />
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.eyebrow, { color: colors.accentText }]}>
          {training.session?.status === "active"
            ? "PICK UP WHERE YOU LEFT OFF"
            : "YOUR NEXT SESSION"}
        </Text>
        <Text style={[styles.heroTitle, { color: colors.text }]}>
          {training.session?.status === "active"
            ? "Keep it moving."
            : "Make it count."}
        </Text>
        <Text style={{ color: colors.secondary }}>
          {training.session?.status === "active"
            ? "Your workout is right where you left it."
            : "Start fresh or follow a routine below."}
        </Text>
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
      </View>
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
      <View style={styles.section}>
        <Text
          accessibilityRole="header"
          style={[styles.sectionTitle, { color: colors.text }]}
        >
          Your routines
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create routine"
          onPress={() => router.push("/routine-edit")}
          style={styles.link}
        >
          <Text style={[styles.linkText, { color: colors.accentText }]}>
            ＋ New
          </Text>
        </Pressable>
      </View>
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
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.rowTitle, { color: colors.text }]}>
            Your routine starts here
          </Text>
          <Text style={{ color: colors.secondary }}>
            Save a routine to repeat your favourite session.
          </Text>
          <Button
            label="Create a routine"
            secondary
            onPress={() => router.push("/routine-edit")}
          />
        </View>
      ) : (
        routines.data.map((routine) => (
          <Pressable
            key={routine.id}
            accessibilityRole="button"
            accessibilityLabel={`${routine.name} · ${routine.exercises.length} exercises · ${routine.exercises.reduce((total, exercise) => total + exercise.sets.length, 0)} sets`}
            onPress={() =>
              router.push({ pathname: "/routine", params: { id: routine.id } })
            }
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.rowTitle, { color: colors.text }]}>
              {routine.name}
            </Text>
            <Text style={{ color: colors.secondary }}>
              {routine.exercises.length} exercises ·{" "}
              {routine.exercises.reduce(
                (total, exercise) => total + exercise.sets.length,
                0,
              )}{" "}
              sets
            </Text>
          </Pressable>
        ))
      )}
      <View style={styles.section}>
        <Text
          accessibilityRole="header"
          style={[styles.sectionTitle, { color: colors.text }]}
        >
          Recent workouts
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View completed workouts"
          onPress={() => router.push("/(tabs)/history")}
          style={styles.link}
        >
          <Text style={[styles.linkText, { color: colors.accentText }]}>
            History →
          </Text>
        </Pressable>
      </View>
      {recentWorkouts.isPending ? (
        <Text style={{ color: colors.secondary }}>
          {training.api
            ? "Loading recent workouts…"
            : "Sign in to view workouts."}
        </Text>
      ) : recentWorkouts.isError ? (
        <>
          <Text accessibilityRole="alert" style={{ color: colors.error }}>
            Couldn’t load recent workouts.
          </Text>
          <Button
            label="Retry recent workouts"
            secondary
            onPress={() => {
              void recentWorkouts.refetch();
            }}
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
            <Pressable
              key={workout.id}
              accessibilityRole="button"
              accessibilityLabel={`${workout.name} · ${date} · ${workout.exercises.length} exercises`}
              onPress={() => router.push(`/history-detail?id=${workout.id}`)}
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.rowTitle, { color: colors.text }]}>
                {workout.name}
              </Text>
              <Text style={{ color: colors.secondary }}>
                {date} · {workout.exercises.length} exercises
              </Text>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.3 },
  heroTitle: { fontSize: 24, fontWeight: "800" },
  section: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sectionTitle: { fontSize: 20, fontWeight: "800", flexShrink: 1 },
  link: { minHeight: 48, justifyContent: "center", paddingHorizontal: 8 },
  linkText: { fontWeight: "700" },
  rowTitle: { fontSize: 16, fontWeight: "700" },
});
