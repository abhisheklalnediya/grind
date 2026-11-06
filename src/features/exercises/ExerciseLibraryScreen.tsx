import { useMemo, useState } from "react";
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
import { isConfiguredExercise } from "@/domain/training";
import type { TrainingExercise } from "@/domain/training";
import { useTheme } from "@/theme/useTheme";
import {
  bundledExercises,
  catalogAvailable,
  exerciseImage,
} from "@/services/exercises";
import { useCatalog } from "./catalog";
import { catalogItems } from "./catalogItems";
import { ExerciseListRow } from "./ExerciseListRow";
import { ExerciseFilter } from "./ExerciseFilter";
import { RepdbExerciseDetail } from "./RepdbExerciseDetail";

type LocalExercise = (typeof bundledExercises)[number];

export function ExerciseLibraryScreen() {
  const { colors } = useTheme();
  const query = useCatalog();
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState("");
  const [equipment, setEquipment] = useState("");
  const [mine, setMine] = useState(false);
  const [selected, setSelected] = useState<{
    exercise: LocalExercise;
    available: boolean;
    loggingUnavailable: boolean;
    loadConvention: string | null;
    serverExercise: TrainingExercise | null;
  } | null>(null);
  const muscles = useMemo(
    () =>
      Array.from(
        new Set([
          ...(query.data ?? [])
            .filter(isConfiguredExercise)
            .map((item) => item.primary_muscle),
        ]),
      )
        .filter(Boolean)
        .sort(),
    [query.data],
  );
  const equipmentOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...(query.data ?? [])
            .filter(isConfiguredExercise)
            .map((item) => item.equipment),
        ]),
      )
        .filter(Boolean)
        .sort(),
    [query.data],
  );
  const items = useMemo(
    () =>
      catalogItems(
        bundledExercises,
        query.data ?? [],
        { query: search, muscle, equipment },
        mine,
      ),
    [search, muscle, equipment, mine, query.data],
  );
  if (selected)
    return (
      <RepdbExerciseDetail
        exercise={selected.exercise}
        available={selected.available}
        loggingUnavailable={selected.loggingUnavailable}
        loadConvention={selected.loadConvention}
        serverExercise={selected.serverExercise}
        onBack={() => setSelected(null)}
      />
    );
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
          data={items}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) => `${item.kind}:${item.exercise.id}`}
          contentContainerStyle={styles.content}
          renderItem={({ item }) =>
            item.kind === "repdb" ? (
              <ExerciseListRow
                name={item.exercise.name}
                subtitle={`${item.exercise.primaryMuscles.map(label).join(", ")} · ${label(item.exercise.equipment)}`}
                image={exerciseImage(item.exercise.id)}
                onPress={() =>
                  setSelected({
                    exercise: item.exercise,
                    available: Boolean(item.server),
                    loggingUnavailable: Boolean(
                      item.server && !isConfiguredExercise(item.server),
                    ),
                    loadConvention: item.server?.load_convention ?? null,
                    serverExercise: item.server ?? null,
                  })
                }
              />
            ) : (
              <ExerciseListRow
                name={item.exercise.name}
                subtitle={`${item.exercise.primary_muscle} · ${item.exercise.equipment}`}
                custom={item.exercise.origin === "custom"}
                existingCatalog={
                  catalogAvailable && item.exercise.origin !== "custom"
                }
                onPress={() =>
                  router.push({
                    pathname: "/exercise-detail",
                    params: { id: item.exercise.id },
                  })
                }
              />
            )
          }
          ListHeaderComponent={
            <>
              <View style={styles.heading}>
                <Text
                  accessibilityRole="header"
                  style={[styles.title, { color: colors.text }]}
                >
                  Exercises
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
              <View
                style={[
                  styles.search,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  accessible={false}
                  importantForAccessibility="no"
                  style={[styles.searchIcon, { color: colors.secondary }]}
                >
                  ⌕
                </Text>
                <TextInput
                  accessibilityLabel="Search exercises"
                  placeholder="Search exercises"
                  placeholderTextColor={colors.secondary}
                  value={search}
                  onChangeText={setSearch}
                  style={[styles.searchInput, { color: colors.text }]}
                />
              </View>
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
              <View style={[styles.scopes, { borderColor: colors.border }]}>
                {([false, true] as const).map((value) => (
                  <Pressable
                    key={String(value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: mine === value }}
                    onPress={() => setMine(value)}
                    style={[
                      styles.scope,
                      mine === value && {
                        borderBottomColor: colors.accentText,
                        borderBottomWidth: 2,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color:
                          mine === value ? colors.accentText : colors.secondary,
                        fontWeight: "600",
                      }}
                    >
                      {value ? "My exercises" : "All exercises"}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.count}>
                <Text
                  accessibilityLiveRegion="polite"
                  style={{ color: colors.secondary }}
                >
                  {items.length} {items.length === 1 ? "exercise" : "exercises"}{" "}
                  · A–Z
                </Text>
                {search || muscle || equipment ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setSearch("");
                      setMuscle("");
                      setEquipment("");
                    }}
                    style={styles.clear}
                  >
                    <Text style={{ color: colors.accentText }}>
                      Clear filters
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              {!catalogAvailable && !mine ? (
                <Text style={{ color: colors.secondary }}>
                  Bundled RepDB catalog is unavailable in this build.
                </Text>
              ) : null}
              {query.isPending ? (
                <Text style={{ color: colors.secondary }}>
                  Loading your exercises…
                </Text>
              ) : null}
              {query.isError ? (
                <View>
                  <Text style={{ color: colors.error }}>
                    Couldn’t load your saved exercises.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      void query.refetch();
                    }}
                    style={styles.clear}
                  >
                    <Text style={{ color: colors.accentText }}>
                      Retry exercises
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          }
          ListEmptyComponent={
            query.isSuccess ? (
              <View style={styles.empty}>
                <Text style={{ color: colors.text, fontWeight: "700" }}>
                  No exercises found
                </Text>
                <Text style={{ color: colors.secondary }}>
                  Try another search or clear your filters.
                </Text>
              </View>
            ) : null
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
function label(value: string) {
  return value.replaceAll("_", " ");
}
const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
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
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchIcon: { fontSize: 22 },
  searchInput: { flex: 1, minHeight: 48, padding: 0 },
  filters: { flexDirection: "row", gap: 8, marginTop: 12 },
  scopes: {
    flexDirection: "row",
    gap: 24,
    borderBottomWidth: 1,
    marginTop: 12,
  },
  scope: { minHeight: 48, justifyContent: "center" },
  count: {
    minHeight: 52,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clear: { minHeight: 48, justifyContent: "center" },
  empty: { alignItems: "center", gap: 8, paddingVertical: 48 },
});
