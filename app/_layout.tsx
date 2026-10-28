import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { invalidateTrainingHistory } from "@/services/trainingCache";
import { AppRuntime, AppNavigator } from "@/features/shell/AppRuntime";
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});
const completed = () => {
  void invalidateTrainingHistory(queryClient);
};
export default function RootLayout() {
  // Keep the root navigator mounted. Nested gates decide when page content may mount.
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppRuntime onCompleted={completed}>
            <AppNavigator />
          </AppRuntime>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
