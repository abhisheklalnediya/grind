import { router } from "expo-router";
import { useTraining } from "@/features/training";
import { Button } from "@/components/Button";
export function ResumeStrip() {
  const { session } = useTraining();
  return session?.status === "active" ? (
    <Button
      label={`Resume ${session.name}`}
      onPress={() => router.push("/workout")}
    />
  ) : null;
}
