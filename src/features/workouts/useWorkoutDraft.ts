import { useEffect, useRef, useState } from "react";
import { useTraining } from "@/features/training";
export function useWorkoutDraft(
  key: string,
  saved: string,
  onError: (message: string) => void,
) {
  const training = useTraining();
  const source = training.raw[key] ?? saved;
  const [local, setLocal] = useState<{ key: string; value: string } | null>(
    null,
  );
  const latest = useRef(source),
    writes = useRef(0);
  const identity = useRef(key);
  useEffect(() => {
    if (identity.current !== key) {
      identity.current = key;
      writes.current = 0;
      latest.current = source;
    } else if (writes.current === 0) latest.current = source;
  }, [key, source]);
  return {
    value: local?.key === key ? local.value : source,
    latest,
    change: (value: string) => {
      latest.current = value;
      setLocal({ key, value });
      writes.current++;
      void training
        .setRaw(key, value)
        .catch(() => {
          if (identity.current === key)
            onError("Could not preserve input. Retry before leaving.");
        })
        .finally(() => {
          if (identity.current === key) {
            writes.current--;
            if (writes.current === 0) setLocal(null);
          }
        });
    },
  };
}
