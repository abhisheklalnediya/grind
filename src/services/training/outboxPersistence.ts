import {
  draftSchema,
  type DraftDocument,
  type DraftStorage,
} from "./outboxState";
import { TrainingError } from "./errors";
export function draftPersistence(scope: string, storage: DraftStorage) {
  const prefix = `grind.training.v1.${encodeURIComponent(scope)}`;
  const pointer = `${prefix}.active`;
  const key = (draft: DraftDocument) =>
    `${prefix}.${draft.session?.id ?? "start"}`;
  return {
    async read(): Promise<DraftDocument | null> {
      const suffix = await storage.getItem(pointer);
      if (suffix === null) return null;
      if (suffix !== "start" && !/^[a-f0-9-]{36}$/i.test(suffix))
        throw new TrainingError("response");
      const text = await storage.getItem(`${prefix}.${suffix}`);
      if (text === null || text.length > 1_000_000)
        throw new TrainingError("response");
      const draft = draftSchema.parse(JSON.parse(text));
      if ((draft.session?.id ?? "start") !== suffix)
        throw new TrainingError("response");
      return draft;
    },
    async write(draft: DraftDocument): Promise<void> {
      const valid = draftSchema.parse(draft);
      const text = JSON.stringify(valid);
      if (text.length > 1_000_000) throw new TrainingError("validation");
      await storage.setItem(key(valid), text);
      await storage.setItem(pointer, valid.session?.id ?? "start");
    },
  };
}
