import { useEditorStore } from "./useEditorStore";
it("resets transient search on account boundary cleanup", () => {
  useEditorStore.getState().setSearch("curl");
  expect(useEditorStore.getState().search).toBe("curl");
  useEditorStore.getState().reset();
  expect(useEditorStore.getState().search).toBe("");
});
