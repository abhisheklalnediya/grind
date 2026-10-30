import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { router, useNavigation } from "expo-router";
import { randomUUID } from "expo-crypto";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { routinePayloadSchema } from "@/domain/training";
import { TrainingError } from "@/services/training/errors";
import { useTraining } from "@/features/training";
import { useTheme } from "@/theme/useTheme";
import { Screen } from "@/components/Screen";
import { Heading } from "@/components/Heading";
import { Button } from "@/components/Button";
import { Field, Copy, useCatalog } from "@/features/exercises/shared";
import { useRoutineDraft } from "./draft";
import { TemplateExercise } from "./TemplateExercise";
export function RoutineEditorScreen({ id }: { id?: string }) {
  const { api } = useTraining();
  const { scope } = useTheme();
  const navigation = useNavigation();
  const client = useQueryClient();
  const catalog = useCatalog();
  const { draft, begin, update, clear, reviewVersion } = useRoutineDraft();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const allowExit = useRef(false);
  const saving = useRef(false);
  const operation = useRef<{ payload: string; id: string } | null>(null);
  const query = useQuery({
    queryKey: ["routine", scope, id],
    queryFn: () => {
      if (!api || !id) throw new Error("Routine unavailable.");
      return api.routine(id);
    },
    enabled: Boolean(api && id),
  });
  useEffect(() => {
    if (!id) begin(scope);
    else if (query.data) begin(scope, query.data);
  }, [id, scope, begin, query.data]);
  const current =
    draft?.scope === scope && draft.id === (id ?? null) ? draft : null;
  useEffect(
    () =>
      navigation.addListener("beforeRemove", (event) => {
        if (saving.current) {
          event.preventDefault();
          return;
        }
        if (!current?.dirty || allowExit.current) return;
        event.preventDefault();
        Alert.alert(
          "Discard routine changes?",
          "Your unsaved template will be lost.",
          [
            { text: "Keep editing", style: "cancel" },
            {
              text: "Discard",
              style: "destructive",
              onPress: () => {
                allowExit.current = true;
                clear();
                navigation.dispatch(event.data.action);
              },
            },
          ],
        );
      }),
    [navigation, current?.dirty, clear],
  );
  const save = async () => {
    if (!current || !api || saving.current) return;
    const parsed = routinePayloadSchema.safeParse(current.payload);
    if (!parsed.success) {
      setError(
        "Check the routine name, load values, reps and rest times (15–3600 seconds).",
      );
      return;
    }
    const payload = JSON.stringify({
      id,
      version: current.version,
      value: parsed.data,
    });
    if (operation.current?.payload !== payload)
      operation.current = { payload, id: randomUUID() };
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      await api.saveRoutine(
        operation.current.id,
        current.id,
        current.version,
        parsed.data,
      );
      await client.invalidateQueries({ queryKey: ["routines"] });
      await client.invalidateQueries({ queryKey: ["routine"] });
      saving.current = false;
      allowExit.current = true;
      clear();
      router.back();
    } catch (failure) {
      setConflict(
        failure instanceof TrainingError && failure.kind === "conflict",
      );
      setError(
        failure instanceof Error
          ? failure.message
          : "Couldn’t save. Please retry.",
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const move = (index: number, delta: number) => {
    if (!current) return;
    const next = index + delta;
    if (next < 0 || next >= current.payload.exercises.length) return;
    const exercises = [...current.payload.exercises];
    const first = exercises[index];
    const second = exercises[next];
    if (!first || !second) return;
    exercises[index] = second;
    exercises[next] = first;
    update({
      ...current.payload,
      exercises: exercises.map((exercise, position) => ({
        ...exercise,
        position,
      })),
    });
  };
  return (
    <Screen>
      <Heading title={id ? "Edit routine" : "Create routine"} />
      {query.isError ? (
        <Button
          label="Retry routine"
          onPress={() => {
            void query.refetch();
          }}
        />
      ) : null}
      {!current ? (
        <Copy>Loading routine…</Copy>
      ) : busy ? (
        <Copy>Saving routine… Please wait before editing or leaving.</Copy>
      ) : (
        <>
          <Field
            label="Routine name"
            value={current.payload.name}
            onChange={(name) => update({ ...current.payload, name })}
          />
          {current.payload.exercises.map((exercise, index) => (
            <TemplateExercise
              key={exercise.id}
              exercise={exercise}
              name={
                catalog.data?.find((item) => item.id === exercise.exercise_id)
                  ?.name ?? `Exercise ${index + 1}`
              }
              onChange={(value) =>
                update({
                  ...current.payload,
                  exercises: current.payload.exercises.map((item) =>
                    item.id === exercise.id ? value : item,
                  ),
                })
              }
              onRemove={() =>
                update({
                  ...current.payload,
                  exercises: current.payload.exercises
                    .filter((item) => item.id !== exercise.id)
                    .map((item, position) => ({ ...item, position })),
                })
              }
              onUp={() => move(index, -1)}
              onDown={() => move(index, 1)}
            />
          ))}
          <Button
            secondary
            label="Add exercises"
            onPress={() =>
              router.push({
                pathname: "/exercise-picker",
                params: { target: "routine" },
              })
            }
          />
          {error ? <Copy>{error}</Copy> : null}
          {conflict ? (
            <Button
              secondary
              label="Review saved version"
              onPress={() => {
                void query.refetch().then((result) => {
                  if (!result.data) return;
                  const saved = result.data;
                  Alert.alert(
                    `Saved version ${saved.version}: ${saved.name}`,
                    `${saved.exercises.length} exercises are saved. Your local edits remain unchanged. Reapplying replaces that saved template.`,
                    [
                      { text: "Keep reviewing", style: "cancel" },
                      {
                        text: "Reapply my draft",
                        onPress: () => {
                          reviewVersion(saved.version);
                          setConflict(false);
                          setError("");
                        },
                      },
                      {
                        text: "Use saved template",
                        style: "destructive",
                        onPress: () => {
                          clear();
                          begin(scope, saved);
                          setConflict(false);
                          setError("");
                        },
                      },
                    ],
                  );
                });
              }}
            />
          ) : null}
          <Button
            disabled={busy || conflict || !api}
            label={busy ? "Saving…" : "Save routine"}
            onPress={() => {
              void save();
            }}
          />
          <Button secondary label="Cancel" onPress={() => router.back()} />
        </>
      )}
    </Screen>
  );
}
