import { useMemo, useRef, useState } from "react";
import { randomUUID } from "expo-crypto";
import { router } from "expo-router";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/Button";
import { useTrainingDefaults } from "@/features/preferences";
import { useTraining } from "@/features/training";
import { useTheme } from "@/theme/useTheme";
import { useRoutineDraft } from "@/features/routines";
import { Copy } from "./fields";
import { ExerciseFilter } from "./ExerciseFilter";
import { filterCatalog, useCatalog } from "./catalog";
export function ExercisePickerScreen({
  target,
}: {
  target: "workout" | "routine";
}) {
  const query = useCatalog();
  const defaults = useTrainingDefaults();
  const training = useTraining();
  const { scope, colors } = useTheme();
  const add = useRoutineDraft((state) => state.add);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState("");
  const [equipment, setEquipment] = useState("");
  const muscles = useMemo(
    () =>
      Array.from(new Set((query.data ?? []).map((item) => item.primary_muscle)))
        .filter(Boolean)
        .sort(),
    [query.data],
  );
  const equipmentOptions = useMemo(
    () =>
      Array.from(new Set((query.data ?? []).map((item) => item.equipment)))
        .filter(Boolean)
        .sort(),
    [query.data],
  );
  const visibleItems = filterCatalog(
    query.data ?? [],
    search,
    muscle,
    equipment,
    false,
  );
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
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.safe, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <FlatList
          data={visibleItems}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <>
              <View style={styles.heading}>
                <Text
                  accessibilityRole="header"
                  style={[styles.title, { color: colors.text }]}
                >
                  Add exercises
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Create exercise"
                  onPress={() => router.push("/custom-exercise")}
                  style={[styles.create, { borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.accentText, fontWeight: "700" }}>
                    ＋ Custom
                  </Text>
                </Pressable>
              </View>
              <TextInput
                accessibilityLabel="Search exercises"
                placeholder="Search exercises"
                placeholderTextColor={colors.secondary}
                value={search}
                onChangeText={setSearch}
                style={[
                  styles.search,
                  {
                    color: colors.text,
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              />
              <View style={styles.filters}>
                <ExerciseFilter
                  label="Muscle"
                  value={muscle}
                  options={muscles}
                  onChange={setMuscle}
                />
                <ExerciseFilter
                  label="Equipment"
                  value={equipment}
                  options={equipmentOptions}
                  onChange={setEquipment}
                />
              </View>
              <View style={styles.count}>
                <Text style={{ color: colors.secondary }}>
                  {visibleItems.length}{" "}
                  {visibleItems.length === 1 ? "exercise" : "exercises"} · A–Z
                </Text>
                <Text style={{ color: colors.accentText }}>
                  {selected.length} selected
                </Text>
              </View>
              {query.isPending ? <Copy>Loading exercises…</Copy> : null}
              {query.isError ? (
                <Button
                  label="Retry exercises"
                  onPress={() => {
                    void query.refetch();
                  }}
                />
              ) : null}
            </>
          }
          ListEmptyComponent={
            query.isSuccess ? (
              <Text style={[styles.empty, { color: colors.secondary }]}>
                No matching exercises.
              </Text>
            ) : null
          }
          renderItem={({ item }) => {
            const chosen = selected.includes(item.id);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  chosen ? `Selected · ${item.name}` : item.name
                }
                accessibilityState={{ selected: chosen }}
                onPress={() =>
                  setSelected((old) =>
                    chosen
                      ? old.filter((id) => id !== item.id)
                      : [...old, item.id],
                  )
                }
                style={[styles.row, { borderColor: colors.border }]}
              >
                <View
                  style={[
                    styles.thumb,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={{ color: colors.secondary, fontSize: 24 }}
                  >
                    ◇
                  </Text>
                </View>
                <View style={styles.body}>
                  <Text style={[styles.name, { color: colors.text }]}>
                    {chosen ? `Selected · ${item.name}` : item.name}
                  </Text>
                  <Text style={[styles.subtitle, { color: colors.secondary }]}>
                    {item.primary_muscle} · {item.equipment}
                    {item.origin === "custom" ? " · My exercise" : ""}
                  </Text>
                </View>
                <Text
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  style={{
                    color: chosen ? colors.accentText : colors.secondary,
                    fontSize: 22,
                  }}
                >
                  {chosen ? "✓" : "+"}
                </Text>
              </Pressable>
            );
          }}
        />
        <View
          style={[
            styles.footer,
            { borderColor: colors.border, backgroundColor: colors.background },
          ]}
        >
          {defaults.pending ? <Copy>Loading training preferences…</Copy> : null}
          {defaults.error ? (
            <>
              <Copy>{defaults.error}</Copy>
              <Button
                label="Retry training preferences"
                onPress={defaults.retry}
              />
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 16 },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 16,
  },
  title: { fontSize: 30, fontWeight: "700", flexShrink: 1 },
  create: {
    minHeight: 48,
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  search: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginTop: 20,
  },
  filters: { flexDirection: "row", gap: 8, marginTop: 12 },
  count: {
    minHeight: 52,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  empty: { textAlign: "center", paddingVertical: 48 },
  row: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  thumb: {
    height: 56,
    width: 56,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: "700" },
  subtitle: { fontSize: 12, marginTop: 5 },
  footer: { borderTopWidth: 1, padding: 16, gap: 8 },
});
