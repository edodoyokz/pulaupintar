import { Baloo2_800ExtraBold } from "@expo-google-fonts/baloo-2";
import { Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from "@expo-google-fonts/nunito";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ProfileProvider } from "@/profile/profile-context";

SplashScreen.preventAutoHideAsync();

const RootLayout = () => {
  const [fontsLoaded, fontError] = useFonts({
    Baloo2_800ExtraBold,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });
  const fontsReady = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync();
  }, [fontsReady]);

  if (!fontsReady) return null;

  return (
    <ProfileProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </ProfileProvider>
  );
};

export default RootLayout;
