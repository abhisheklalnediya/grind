import { StyleSheet } from "react-native";
export const styles = StyleSheet.create({
  row: { gap: 8, padding: 8, borderWidth: 1, borderRadius: 12 },
  loggingRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  setColumn: { minWidth: 30, gap: 4 },
  previousColumn: { flexBasis: 50, flexGrow: 1 },
  inputColumn: { minWidth: 52, flexBasis: 52, flexGrow: 1, gap: 4 },
  completeColumn: { minWidth: 76, flexBasis: 76, flexGrow: 1 },
  tools: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  input: {
    minHeight: 48,
    fontSize: 20,
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
  },
});
