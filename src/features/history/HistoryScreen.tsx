import type { TrainingSession } from "@/domain/training";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Button } from "@/components/Button";
import { Heading } from "@/components/Heading";
import { Screen } from "@/components/Screen";
import { useTraining } from "@/features/training";
import { useTheme } from "@/theme/useTheme";
type Cursor = { finished_at: string; id: string } | null;
export function HistoryScreen() {
  const training = useTraining();
  const { colors, scope } = useTheme();
  const history = useInfiniteQuery({
    queryKey: ["history", scope],
    initialPageParam: null as Cursor,
    queryFn: async ({ pageParam }) => {
      if (!training.api) throw new Error("Sign in to view history.");
      return training.api.history(pageParam);
    },
    getNextPageParam: (page) => page.next_cursor,
    enabled: !!training.api,
  });
  const groups = new Map<string, TrainingSession[]>();
  for (const session of history.data?.pages.flatMap((page) => page.items) ??
    []) {
    const day = new Intl.DateTimeFormat(undefined, {
      timeZone: session.timezone,
      dateStyle: "long",
    }).format(new Date(session.finished_at ?? session.started_at));
    const group = groups.get(day) ?? [];
    group.push(session);
    groups.set(day, group);
  }
  return (
    <Screen>
      <Heading
        title="Put in the work."
        subtitle="Every session builds on the last."
      />
      <Button
        secondary
        label="Refresh history"
        disabled={history.isFetching}
        onPress={() => {
          void history.refetch();
        }}
      />
      {history.isPending ? (
        <Text style={{ color: colors.text }}>
          {training.api ? "Loading history…" : "Sign in to view history."}
        </Text>
      ) : null}
      {history.isError ? (
        <Button
          label="Retry history"
          onPress={() => {
            void history.refetch();
          }}
        />
      ) : null}
      {history.data?.pages.every((page) => page.items.length === 0) ? (
        <View style={styles.empty}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>
            Your story starts here.
          </Text>
          <Text style={{ color: colors.secondary }}>
            Complete a workout and find it here.
          </Text>
          <Button
            label="Start a workout"
            onPress={() => router.push("/(tabs)")}
          />
        </View>
      ) : null}
      {Array.from(groups, ([day, sessions]) => (
        <View key={day} style={styles.row}>
          <Text accessibilityRole="header" style={{ color: colors.secondary }}>
            {day}
          </Text>
          {sessions.map((session) => (
            <HistoryCard
              key={session.id}
              session={session}
              onPress={() => router.push(`/history-detail?id=${session.id}`)}
            />
          ))}
        </View>
      ))}
      {history.hasNextPage ? (
        <Button
          secondary
          disabled={history.isFetchingNextPage}
          label={
            history.isFetchNextPageError
              ? "Retry more workouts"
              : "Load more workouts"
          }
          onPress={() => {
            void history.fetchNextPage();
          }}
        />
      ) : null}
    </Screen>
  );
}

function HistoryCard({
  session,
  onPress,
}: {
  session: TrainingSession;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const timestamp = session.finished_at ?? session.started_at;
  const date = new Intl.DateTimeFormat(undefined, {
    timeZone: session.timezone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
  const duration = session.finished_at
    ? Math.max(
        0,
        Math.round(
          (Date.parse(session.finished_at) - Date.parse(session.started_at)) /
            60000,
        ),
      )
    : 0;
  const durationLabel =
    duration >= 60
      ? `${Math.floor(duration / 60)} hr${duration >= 120 ? "s" : ""}${duration % 60 ? ` ${duration % 60} min` : ""}`
      : `${duration} min`;
  const exerciseCount = session.exercises.length;
  const completedSets = session.exercises.reduce(
    (count, exercise) =>
      count + exercise.sets.filter((set) => Boolean(set.completed_at)).length,
    0,
  );
  const accessibilityLabel = `${session.name}, ${date}, ${durationLabel}, ${exerciseCount} ${exerciseCount === 1 ? "exercise" : "exercises"}, ${completedSets} completed ${completedSets === 1 ? "set" : "sets"}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: colors.border,
          backgroundColor: colors.surface,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={styles.cardCopy}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
          {session.name}
        </Text>
        <Text style={{ color: colors.secondary }}>{date}</Text>
        <Text style={{ color: colors.secondary }}>
          {durationLabel} · {exerciseCount} {exerciseCount === 1 ? "exercise" : "exercises"} · {completedSets} {completedSets === 1 ? "set" : "sets"}
        </Text>
      </View>
      <Text accessibilityElementsHidden style={{ color: colors.accentText }}>
        ›
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8 },
  empty: { gap: 12, paddingVertical: 20 },
  card: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardCopy: { flex: 1, gap: 4 },
});
