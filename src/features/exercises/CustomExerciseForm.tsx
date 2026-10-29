import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { randomUUID } from "expo-crypto";
import { router, useNavigation } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  customExercisePayloadSchema,
  type CustomExercisePayload,
  type TrainingExercise,
  type ConfiguredExercise,
} from "@/domain/training";
import { useTraining } from "@/features/training";
import { Screen } from "@/components/Screen";
import { Heading } from "@/components/Heading";
import { Button } from "@/components/Button";
import { Copy, Field } from "./fields";
import { loadModes } from "./catalog";
const empty: CustomExercisePayload = {
  name: "",
  primary_muscle: "",
  equipment: "",
  category: "Strength",
  load_convention: "",
  load_mode: "external",
};
export function CustomExerciseForm({
  id,
  existing,
  catalog,
}: {
  id?: string;
  existing?: ConfiguredExercise;
  catalog: TrainingExercise[];
}) {
  const { api } = useTraining();
  const client = useQueryClient();
  const [form, setForm] = useState<CustomExercisePayload>(() =>
    existing
      ? {
          name: existing.name,
          primary_muscle: existing.primary_muscle,
          equipment: existing.equipment,
          category: existing.category,
          load_convention: existing.load_convention,
          load_mode: existing.load_mode,
        }
      : empty,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const operation = useRef<{ key: string; id: string } | null>(null);
  const navigation = useNavigation();
  const allowExit = useRef(false);
  const initialForm = useRef(form);
  useEffect(
    () =>
      navigation.addListener("beforeRemove", (event) => {
        if (
          allowExit.current ||
          JSON.stringify(form) === JSON.stringify(initialForm.current)
        )
          return;
        event.preventDefault();
        Alert.alert(
          "Discard exercise changes?",
          "Unsaved changes will be lost.",
          [
            { text: "Keep editing", style: "cancel" },
            {
              text: "Discard",
              style: "destructive",
              onPress: () => {
                allowExit.current = true;
                navigation.dispatch(event.data.action);
              },
            },
          ],
        );
      }),
    [navigation, form],
  );
  const allowed = !id || existing?.origin === "custom";
  const mutate = async (archive: boolean) => {
    if (!api || busy || !allowed) return;
    const parsed = customExercisePayloadSchema.safeParse(form);
    if (!archive && !parsed.success) {
      setError(
        "Complete all fields. Names must be at most 80 characters; muscle, equipment and category at most 40.",
      );
      return;
    }
    const key = JSON.stringify({ id, archive, form });
    if (operation.current?.key !== key)
      operation.current = { key, id: randomUUID() };
    setBusy(true);
    setError("");
    try {
      if (archive && id) await api.archiveExercise(operation.current.id, id);
      else if (parsed.success)
        await api.saveExercise(operation.current.id, id ?? null, parsed.data);
      await client.invalidateQueries({ queryKey: ["catalog"] });
      allowExit.current = true;
      router.back();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Couldn’t save. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Heading
        title={id ? "Edit exercise" : "Create exercise"}
        subtitle="Your custom definition. Previous workout snapshots stay unchanged."
      />
      {!allowed ? <Copy>This exercise cannot be edited.</Copy> : null}
      {(
        [
          "name",
          "primary_muscle",
          "equipment",
          "category",
          "load_convention",
        ] as const
      ).map((key) => (
        <Field
          key={key}
          label={
            {
              name: "Exercise name",
              primary_muscle: "Primary muscle",
              equipment: "Equipment",
              category: "Category",
              load_convention: "Load convention",
            }[key]
          }
          value={form[key]}
          onChange={(value) => setForm({ ...form, [key]: value })}
        />
      ))}
      {Object.entries(loadModes).map(([mode, label]) => (
        <Button
          key={mode}
          secondary
          selected={form.load_mode === mode}
          label={label}
          onPress={() => {
            if (
              mode === "external" ||
              mode === "bodyweight" ||
              mode === "assisted" ||
              mode === "weighted_bodyweight"
            )
              setForm({ ...form, load_mode: mode });
          }}
        />
      ))}
      {catalog.some(
        (item) =>
          item.id !== id &&
          item.name.trim().toLowerCase() === form.name.trim().toLowerCase(),
      ) ? (
        <Copy>
          An exercise with this name already exists. Check its equipment and
          load convention before creating another.
        </Copy>
      ) : null}
      {error ? <Copy>{error}</Copy> : null}
      <Button
        disabled={busy || !allowed || !api}
        label={busy ? "Saving…" : "Save exercise"}
        onPress={() => {
          void mutate(false);
        }}
      />
      <Button
        secondary
        label="Cancel"
        onPress={() =>
          Alert.alert(
            "Discard exercise changes?",
            "Unsaved changes will be lost.",
            [
              { text: "Keep editing", style: "cancel" },
              {
                text: "Discard",
                style: "destructive",
                onPress: () => {
                  allowExit.current = true;
                  router.back();
                },
              },
            ],
          )
        }
      />
      {id && allowed ? (
        <Button
          secondary
          disabled={busy}
          label="Archive exercise"
          onPress={() =>
            Alert.alert(
              "Archive exercise?",
              "It will leave the library. Previous workouts keep their original exercise.",
              [
                { text: "Keep exercise", style: "cancel" },
                {
                  text: "Archive",
                  style: "destructive",
                  onPress: () => {
                    void mutate(true);
                  },
                },
              ],
            )
          }
        />
      ) : null}
    </Screen>
  );
}
