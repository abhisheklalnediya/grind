import mockSafeAreaContext from "react-native-safe-area-context/jest/mock";
import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
jest.mock("react-native-safe-area-context", () => mockSafeAreaContext);
jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);
