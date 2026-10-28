import { useMemo } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { scopedSettings } from "@/services/scopedSettings";
import { Alert } from "react-native";
import { useTraining } from "@/features/training";
import { SettingsScreen } from "./SettingsScreen";
export function SettingsRoute() {
  const training = useTraining();
  const { session } = useAuth();
  const settingsPort = useMemo(
    () => (session ? scopedSettings(session.user.id) : undefined),
    [session],
  );
  const beforeSignOut = async () => {
    if (!training.hasLocalChanges) return true;
    return new Promise<boolean>((resolve) =>
      Alert.alert(
        "Unsaved workout changes",
        "Stay to retry saving, or discard this device’s pending edits before signing out.",
        [
          { text: "Stay", style: "cancel", onPress: () => resolve(false) },
          {
            text: "Discard and sign out",
            style: "destructive",
            onPress: () => {
              void training
                .discardPending()
                .then(() => resolve(true))
                .catch(() => resolve(false));
            },
          },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      ),
    );
  };
  return (
    <SettingsScreen
      beforeSignOut={beforeSignOut}
      {...(settingsPort ? { settingsPort } : {})}
    />
  );
}
