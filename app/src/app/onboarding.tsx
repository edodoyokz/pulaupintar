import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useProfile } from "@/profile/profile-context";
import { prepareAudio } from "@/tutor/voice";
import { Icon } from "@/ui/icons";
import { KakPinta } from "@/ui/kak-pinta";
import { BigButton } from "@/ui/primitives";
import { colors, fonts, radius, spacing, type } from "@/ui/theme";

const AGES = [4, 5, 6, 7];

// Filled in by the parent once; the child never needs to read this screen.
const Onboarding = () => {
  const { addChild } = useProfile();
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | null>(5);
  const [micDenied, setMicDenied] = useState(false);
  const canContinue = name.trim().length > 0 && age !== null;

  const handleContinue = async () => {
    if (!canContinue) return;
    const granted = await prepareAudio();
    if (!granted) {
      setMicDenied(true);
      return;
    }
    await addChild(name.trim(), age);
    router.replace("/island");
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <KakPinta size={96} mood="happy" />
            <View style={styles.headerText}>
              <Text style={styles.brand}>PULAUPINTAR</Text>
              <Text style={styles.title}>Halo, Ayah dan Bunda!</Text>
            </View>
          </View>
          <Text style={styles.intro}>Isi sebentar, lalu serahkan HP ke si kecil. Kak Pinta yang akan mengajak belajar.</Text>

          <Text style={styles.label}>Nama panggilan si kecil</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Contoh: Aya"
            placeholderTextColor="#6B7488"
            style={styles.input}
            autoCapitalize="words"
            maxLength={20}
            accessibilityLabel="Nama panggilan si kecil"
          />

          <Text style={styles.label}>Usia</Text>
          <View style={styles.ages}>
            {AGES.map((option) => (
              <Pressable
                key={option}
                onPress={() => setAge(option)}
                style={[styles.age, age === option && styles.ageSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected: age === option }}
                accessibilityLabel={`${option} tahun`}
              >
                <Text style={[styles.ageText, age === option && styles.ageTextSelected]}>{option}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.note}>
            <View style={styles.noteIcon}>
              <Icon name="mic" size={24} color="#C2540A" />
            </View>
            <Text style={styles.noteText}>
              Kak Pinta perlu mikrofon untuk mendengar jawaban si kecil. Rekaman suara tidak disimpan.
            </Text>
          </View>
          {micDenied && (
            <Text style={styles.warning}>Izin mikrofon belum diberikan. Aktifkan di pengaturan HP, lalu coba lagi.</Text>
          )}

          <View style={styles.footer}>
            <BigButton label="Mulai belajar" onPress={handleContinue} disabled={!canContinue} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Onboarding;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.sky },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: 14 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerText: { flex: 1, gap: 2 },
  brand: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 1, color: colors.inkSoft },
  title: { ...type.title, fontSize: 30, lineHeight: 34, color: colors.ink },
  intro: { fontFamily: fonts.body, fontSize: 17, lineHeight: 25, color: colors.inkBody },
  label: { fontFamily: fonts.bodyHeavy, fontSize: 16, color: colors.ink, marginTop: 4 },
  input: {
    height: 56,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 18,
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.ink,
  },
  ages: { flexDirection: "row", gap: 12 },
  age: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  ageSelected: { backgroundColor: colors.blue, borderColor: colors.blue },
  ageText: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  ageTextSelected: { color: colors.white },
  note: { flexDirection: "row", gap: 14, alignItems: "flex-start", padding: 16, borderRadius: 20, backgroundColor: colors.white },
  noteIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#FFF1E6", alignItems: "center", justifyContent: "center" },
  noteText: { flex: 1, fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.inkBody },
  warning: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.red },
  footer: { marginTop: "auto", paddingBottom: spacing.md },
});
