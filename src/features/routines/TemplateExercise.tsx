import { LoadUnitControl } from "@/components/LoadUnitControl";
import { useTrainingDefaults } from "@/features/preferences";
import { Button } from "@/components/Button";
import { Field, Copy } from "@/features/exercises/shared";
import { loadFieldLabel, type RoutinePayload } from "@/domain/training";
import { randomUUID } from "expo-crypto";
type Exercise = RoutinePayload["exercises"][number];
export function TemplateExercise({
  exercise,
  name,
  onChange,
  onRemove,
  onUp,
  onDown,
}: {
  exercise: Exercise;
  name: string;
  onChange: (value: Exercise) => void;
  onRemove: () => void;
  onUp: () => void;
  onDown: () => void;
}) {
  const defaults = useTrainingDefaults();
  return (
    <>
      <Copy>{name}</Copy>
      <Button secondary label={`Move ${name} up`} onPress={onUp} />
      <Button secondary label={`Move ${name} down`} onPress={onDown} />
      <Field
        label={`Notes for ${name}`}
        value={exercise.notes}
        onChange={(notes) => onChange({ ...exercise, notes })}
      />
      <Field
        numeric
        label={`Rest seconds for ${name}`}
        value={String(exercise.rest_seconds)}
        onChange={(value) =>
          onChange({ ...exercise, rest_seconds: Number(value) })
        }
      />
      {exercise.sets.map((set, index) => (
        <TemplateSet
          key={set.id}
          set={set}
          index={index}
          mode={exercise.load_mode}
          trackingType={exercise.tracking_type ?? "reps"}
          onChange={(value) =>
            onChange({
              ...exercise,
              sets: exercise.sets.map((item) =>
                item.id === set.id ? value : item,
              ),
            })
          }
          onRemove={() =>
            onChange({
              ...exercise,
              sets: exercise.sets
                .filter((item) => item.id !== set.id)
                .map((item, position) => ({ ...item, position })),
            })
          }
        />
      ))}
      {defaults.error ? (
        <>
          <Copy>{defaults.error}</Copy>
          <Button label="Retry defaults" onPress={defaults.retry} />
        </>
      ) : null}
      <Button
        secondary
        label={`Add set to ${name}`}
        disabled={defaults.pending || Boolean(defaults.error)}
        onPress={() =>
          onChange({
            ...exercise,
            sets: [
              ...exercise.sets,
              {
                id: randomUUID(),
                position: exercise.sets.length,
                set_type: "working",
                entered_load: null,
                entered_unit: defaults.unit,
                reps: null,
              },
            ],
          })
        }
      />
      <Button secondary label={`Remove ${name}`} onPress={onRemove} />
    </>
  );
}
function TemplateSet({
  set,
  index,
  mode,
  trackingType,
  onChange,
  onRemove,
}: {
  set: Exercise["sets"][number];
  index: number;
  mode: Exercise["load_mode"];
  trackingType: NonNullable<Exercise["tracking_type"]>;
  onChange: (set: Exercise["sets"][number]) => void;
  onRemove: () => void;
}) {
  return (
    <>
      <Copy>Set {index + 1}</Copy>
      <Button
        secondary
        label={set.set_type === "working" ? "Working set" : "Warm-up set"}
        onPress={() =>
          onChange({
            ...set,
            set_type: set.set_type === "working" ? "warmup" : "working",
          })
        }
      />
      {trackingType !== "reps" ? (
        <>
          <Field
            numeric
            label={`Set ${index + 1} duration seconds`}
            value={
              set.duration_seconds == null ? "" : String(set.duration_seconds)
            }
            onChange={(value) =>
              onChange({
                ...set,
                duration_seconds: value ? Number(value) : null,
              })
            }
          />
          {trackingType === "distance_duration" ? (
            <>
              <Field
                numeric
                label={`Set ${index + 1} distance`}
                value={set.entered_distance ?? ""}
                onChange={(value) =>
                  onChange({
                    ...set,
                    entered_distance: value || null,
                    distance_unit: set.distance_unit ?? "km",
                  })
                }
              />
              <Button
                secondary
                label={`Distance unit: ${set.distance_unit ?? "km"}`}
                disabled={Boolean(set.entered_distance)}
                onPress={() =>
                  onChange({
                    ...set,
                    distance_unit:
                      (set.distance_unit ?? "km") === "km" ? "mi" : "km",
                  })
                }
              />
              {set.entered_distance ? (
                <Copy>Clear distance to change its unit.</Copy>
              ) : null}
            </>
          ) : null}
        </>
      ) : mode !== "bodyweight" ? (
        <>
          <Field
            numeric
            label={`Set ${index + 1} ${loadFieldLabel(mode, set.entered_unit)}`}
            value={set.entered_load ?? ""}
            onChange={(value) =>
              onChange({ ...set, entered_load: value || null })
            }
          />
          <LoadUnitControl
            load={set.entered_load}
            unit={set.entered_unit}
            onChangeUnit={(unit) => onChange({ ...set, entered_unit: unit })}
          />
        </>
      ) : null}
      {trackingType === "reps" ? (
        <Field
          numeric
          label={`Set ${index + 1} reps`}
          value={set.reps === null ? "" : String(set.reps)}
          onChange={(value) =>
            onChange({ ...set, reps: value ? Number(value) : null })
          }
        />
      ) : null}
      <Button secondary label={`Remove set ${index + 1}`} onPress={onRemove} />
    </>
  );
}
