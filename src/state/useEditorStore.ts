import { create } from "zustand";
type EditorState = {
  search: string;
  setSearch: (value: string) => void;
  reset: () => void;
};
// Transient presentation only. Server data belongs to TanStack Query.
export const useEditorStore = create<EditorState>((set) => ({
  search: "",
  setSearch: (search) => set({ search }),
  reset: () => set({ search: "" }),
}));
