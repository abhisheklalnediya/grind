import { StyleSheet } from "react-native";
export const styles = StyleSheet.create({
  row: {
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderBottomWidth: 0,
  },
  loggingRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  tableRow: { minHeight: 54 },
  setColumn: {
    width: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  setValue: { width: 48, textAlign: "center" },
  previousColumn: { flex: 1.2, minWidth: 42, justifyContent: "center" },
  previousValue: { flex: 1.2, minWidth: 42, textAlign: "center", fontSize: 11 },
  inputColumn: { flex: 1, minWidth: 42, gap: 4 },
  timedInput: { flex: 1, minWidth: 42, gap: 4 },
  completeColumn: { width: 50 },
  setActions: { flexDirection: "row", gap: 4 },
  tools: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  input: {
    minHeight: 48,
    fontSize: 20,
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    textAlign: "center",
  },
});
