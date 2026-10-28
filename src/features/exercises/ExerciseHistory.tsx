import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import type { TrainingExercise, TrainingSession } from "@/domain/training";
import { Button } from "@/components/Button";
import { Heading } from "@/components/Heading";
import { useTraining } from "@/features/training";
import { useTheme } from "@/theme/useTheme";
import { Copy } from "./fields";
type Cursor = { finished_at: string; id: string } | null;
export function ExerciseHistory({ exercise }: { exercise: TrainingExercise }) {
  const { api } = useTraining();
  const { scope } = useTheme();
  const history = useInfiniteQuery({
    queryKey: [
      "exercise-history",
      scope,
      exercise.id,
      exercise.load_mode,
      exercise.load_convention,
    ],
    initialPageParam: null as Cursor,
    queryFn: ({ pageParam }) => {
      if (!api) throw new Error("Sign in to view exercise history.");
      return api.history(pageParam);
    },
    getNextPageParam: (page) => page.next_cursor,
    enabled: Boolean(api),
  });
  const matches = (
    history.data?.pages.flatMap((page) => page.items) ?? []
  ).flatMap((session) => {
    const rows = session.exercises.filter(
      (row) =>
        row.exercise_id === exercise.id &&
        row.load_mode === exercise.load_mode &&
        row.load_convention === exercise.load_convention,
    );
    return rows.length ? [{ session, rows }] : [];
  });
  return (
    <>
      <Heading title="Exercise history" />
      <Button
        secondary
        label="Refresh exercise history"
        disabled={history.isFetching}
        onPress={() => {
          void history.refetch();
        }}
      />
      {history.isPending ? (
        <Copy>
          {api
            ? "Loading exercise history…"
            : "Sign in to view exercise history."}
        </Copy>
      ) : null}
      {history.isError && !history.isFetchNextPageError ? (
        <Button
          label="Retry exercise history"
          onPress={() => {
            void history.refetch();
          }}
        />
      ) : null}
      {history.isSuccess && matches.length === 0 ? (
        <Copy>
          {history.hasNextPage
            ? "No matches in these workouts. Load more to search older history."
            : "No completed history for this exercise, load mode and convention."}
        </Copy>
      ) : null}
      {matches.map(({ session, rows }) => (
        <ExerciseHistoryRow
          key={session.id}
          name={session.name}
          id={session.id}
          date={new Intl.DateTimeFormat(undefined, {
            dateStyle: "long",
            timeZone: session.timezone,
          }).format(new Date(session.finished_at ?? session.started_at))}
          rows={rows}
        />
      ))}
      {history.hasNextPage ? (
        <Button
          secondary
          label={
            history.isFetchNextPageError
              ? "Retry older exercise history"
              : "Load older exercise history"
          }
          disabled={history.isFetchingNextPage}
          onPress={() => {
            void history.fetchNextPage();
          }}
        />
      ) : null}
    </>
  );
}
function ExerciseHistoryRow({
  name,
  id,
  date,
  rows,
}: {
  name: string;
  id: string;
  date: string;
  rows: TrainingSession["exercises"];
}) {
  return (
    <>
      <Button
        secondary
        label={`${name} · ${date}`}
        onPress={() =>
          router.push({ pathname: "/history-detail", params: { id } })
        }
      />
      {rows.flatMap((row) =>
        row.sets
          .filter((set) => set.completed_at)
          .map((set) => (
            <Copy key={set.id}>
              {set.set_type === "warmup" ? "Warm-up" : "Working"}{" "}
              {set.position + 1}:{" "}
              {set.entered_load === null
                ? "Bodyweight"
                : `${set.entered_load} ${set.entered_unit}`}{" "}
              × {set.reps} reps
            </Copy>
          )),
      )}
    </>
  );
}
