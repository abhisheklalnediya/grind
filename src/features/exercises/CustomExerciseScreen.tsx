import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { Copy } from "./fields";
import { useCatalog } from "./catalog";
import { CustomExerciseForm } from "./CustomExerciseForm";
export function CustomExerciseScreen({ id }: { id?: string }) {
  const catalog = useCatalog();
  const existing = catalog.data?.find((item) => item.id === id);
  if (id && catalog.isPending)
    return (
      <Screen>
        <Copy>Loading exercise…</Copy>
      </Screen>
    );
  if (id && catalog.isError)
    return (
      <Screen>
        <Copy>Couldn’t load exercise.</Copy>
        <Button
          label="Retry exercise"
          onPress={() => {
            void catalog.refetch();
          }}
        />
      </Screen>
    );
  return (
    <CustomExerciseForm
      key={id ?? "new"}
      {...(id ? { id } : {})}
      {...(existing ? { existing } : {})}
      catalog={catalog.data ?? []}
    />
  );
}
