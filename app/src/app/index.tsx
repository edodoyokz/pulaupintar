import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useProfile } from "@/profile/profile-context";
import { KakPinta } from "@/ui/kak-pinta";
import { colors, fonts, spacing, type } from "@/ui/theme";

const Index = () => {
  const { ready, child } = useProfile();
  if (!ready) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.content}>
          <KakPinta size={112} mood="happy" />
          <Text style={styles.title}>Pulau Pintar</Text>
          <Text style={styles.subtitle}>Menyiapkan profil belajar...</Text>
          <ActivityIndicator size="large" color={colors.blue} style={styles.spinner} />
        </View>
      </SafeAreaView>
    );
  }
  return <Redirect href={child ? "/island" : "/onboarding"} />;
};

export default Index;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.sky, alignItems: "center", justifyContent: "center" },
  content: { alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg },
  title: { ...type.title, color: colors.ink },
  subtitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.inkBody },
  spinner: { marginTop: spacing.sm },
});
