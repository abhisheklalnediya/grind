import { useState } from "react";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Heading } from "@/components/Heading";
import { Button } from "@/components/Button";
import { Copy, Field } from "./fields";
import { filterCatalog, loadModes, useCatalog } from "./catalog";
export function ExerciseLibraryScreen() {
  const query = useCatalog();
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState("");
  const [equipment, setEquipment] = useState("");
  const [custom, setCustom] = useState(false);
  const items = filterCatalog(
    query.data ?? [],
    search,
    muscle,
    equipment,
    custom,
  );
  return (
    <Screen>
      <Heading
        title="Exercises"
        subtitle="Find an exercise or create your own."
      />
      <Field label="Search exercises" value={search} onChange={setSearch} />
      <Field label="Muscle filter" value={muscle} onChange={setMuscle} />
      <Field
        label="Equipment filter"
        value={equipment}
        onChange={setEquipment}
      />
      <Button
        secondary
        selected={custom}
        label={custom ? "Custom only · on" : "Custom only · off"}
        onPress={() => setCustom(!custom)}
      />
      <Button
        label="Create exercise"
        onPress={() => router.push("/custom-exercise")}
      />
      {query.isPending ? <Copy>Loading exercises…</Copy> : null}
      {query.isError ? (
        <>
          <Copy>Couldn’t load exercises.</Copy>
          <Button
            label="Retry exercises"
            onPress={() => {
              void query.refetch();
            }}
          />
        </>
      ) : null}
      {query.isSuccess && !items.length ? (
        <Copy>No matching exercises.</Copy>
      ) : null}
      {items.map((item) => (
        <Button
          key={item.id}
          secondary
          label={`${item.name} · ${loadModes[item.load_mode]}`}
          onPress={() =>
            router.push({
              pathname: "/exercise-detail",
              params: { id: item.id },
            })
          }
        />
      ))}
    </Screen>
  );
}
