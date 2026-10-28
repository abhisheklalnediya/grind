import type { TrainingSession } from "@/domain/training";
import { StyleSheet, Text, View } from "react-native";
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
      <Heading title="History" />
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
        <Text style={{ color: colors.secondary }}>
          Your completed workouts will appear here.
        </Text>
      ) : null}
      {Array.from(groups, ([day, sessions]) => (
        <View key={day} style={styles.row}>
          <Text accessibilityRole="header" style={{ color: colors.secondary }}>
            {day}
          </Text>
          {sessions.map((session) => (
            <Button
              key={session.id}
              secondary
              label={session.name}
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

const styles = StyleSheet.create({ group: { gap: 12 }, row: { gap: 8 } });
