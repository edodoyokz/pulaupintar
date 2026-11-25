import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ProfileProvider } from "@/profile/profile-context";

const RootLayout = () => (
  <ProfileProvider>
    <StatusBar style="dark" />
    <Stack screenOptions={{ headerShown: false }} />
  </ProfileProvider>
);

export default RootLayout;
