import { useRef, useState } from "react";
import { randomUUID } from "expo-crypto";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Heading } from "@/components/Heading";
import { Button } from "@/components/Button";
import { useTrainingDefaults } from "@/features/preferences";
import { useTraining } from "@/features/training";
import { useTheme } from "@/theme/useTheme";
import { useRoutineDraft } from "@/features/routines";
import { Copy, Field } from "./fields";
import { filterCatalog, useCatalog } from "./catalog";
export function ExercisePickerScreen({
  target,
}: {
  target: "workout" | "routine";
}) {
  const query = useCatalog();
  const defaults = useTrainingDefaults();
  const training = useTraining();
  const { scope } = useTheme();
  const add = useRoutineDraft((state) => state.add);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState("");
  const [equipment, setEquipment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const added = useRef(new Set<string>());
  const ids = useRef(new Map<string, string>());
  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const items = (query.data ?? []).filter((item) =>
        selected.includes(item.id),
      );
      if (target === "routine") {
        if (
          !useRoutineDraft.getState().draft ||
          useRoutineDraft.getState().draft?.scope !== scope
        )
          throw new Error(
            "Return to the routine editor before adding exercises.",
          );
        add(scope, items, defaults.restSeconds);
      } else {
        if (!training.session)
          throw new Error("Start or resume a workout first.");
        let position = training.session.exercises.length;
        for (const item of items) {
          if (added.current.has(item.id)) continue;
          let id = ids.current.get(item.id);
          if (!id) {
            id = randomUUID();
            ids.current.set(item.id, id);
          }
          await training.command(
            {
              type: "add_exercise",
              id,
              exercise_id: item.id,
              position,
              load_mode: item.load_mode,
              notes: "",
              rest_seconds: defaults.restSeconds,
            },
            item,
          );
          added.current.add(item.id);
          position++;
        }
      }
      router.back();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Couldn’t add exercises.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Heading title="Add exercises" subtitle={`${selected.length} selected`} />
      <Field label="Search exercises" value={search} onChange={setSearch} />
      <Field label="Muscle filter" value={muscle} onChange={setMuscle} />
      <Field
        label="Equipment filter"
        value={equipment}
        onChange={setEquipment}
      />
      <Button
        secondary
        label="Create exercise"
        onPress={() => router.push("/custom-exercise")}
      />
      {query.isPending ? <Copy>Loading exercises…</Copy> : null}
      {query.isError ? (
        <Button
          label="Retry exercises"
          onPress={() => {
            void query.refetch();
          }}
        />
      ) : null}
      {query.isSuccess &&
      !filterCatalog(query.data ?? [], search, muscle, equipment, false)
        .length ? (
        <Copy>No matching exercises.</Copy>
      ) : null}
      {filterCatalog(query.data ?? [], search, muscle, equipment, false).map(
        (item) => (
          <Button
            key={item.id}
            secondary
            selected={selected.includes(item.id)}
            label={`${selected.includes(item.id) ? "Selected · " : ""}${item.name}`}
            onPress={() =>
              setSelected((old) =>
                old.includes(item.id)
                  ? old.filter((id) => id !== item.id)
                  : [...old, item.id],
              )
            }
          />
        ),
      )}
      {defaults.pending ? <Copy>Loading training preferences…</Copy> : null}
      {defaults.error ? (
        <>
          <Copy>{defaults.error}</Copy>
          <Button label="Retry training preferences" onPress={defaults.retry} />
        </>
      ) : null}
      {error ? <Copy>{error}</Copy> : null}
      <Button
        disabled={
          busy ||
          !selected.length ||
          defaults.pending ||
          Boolean(defaults.error)
        }
        label={busy ? "Adding…" : `Add ${selected.length} exercises`}
        onPress={() => {
          void submit();
        }}
      />
    </Screen>
  );
}
