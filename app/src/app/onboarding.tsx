import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useProfile } from "@/profile/profile-context";
import { prepareAudio } from "@/tutor/voice";
import { colors, radius, spacing, type } from "@/ui/theme";

const AGES = [4, 5, 6, 7];

// Filled in by the parent once; the child never needs to read this screen.
const Onboarding = () => {
  const { addChild } = useProfile();
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | null>(null);
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
      <Text style={styles.title}>Halo, Ayah dan Bunda!</Text>
      <Text style={styles.body}>Siapa nama panggilan si kecil?</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Contoh: Aya"
        style={styles.input}
        autoCapitalize="words"
        maxLength={20}
      />
      <Text style={styles.body}>Berapa usianya?</Text>
      <View style={styles.ages}>
        {AGES.map((option) => (
          <Pressable
            key={option}
            onPress={() => setAge(option)}
            style={[styles.age, age === option && styles.ageSelected]}
            accessibilityRole="button"
            accessibilityLabel={`${option} tahun`}
          >
            <Text style={[styles.ageText, age === option && styles.ageTextSelected]}>{option}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.note}>
        Kak Pinta perlu mikrofon untuk mendengar jawaban anak. Rekaman suara tidak disimpan.
      </Text>
      {micDenied && (
        <Text style={styles.warning}>Izin mikrofon belum diberikan. Aktifkan di pengaturan HP, lalu coba lagi.</Text>
      )}
      <Pressable
        onPress={handleContinue}
        disabled={!canContinue}
        style={[styles.button, !canContinue && styles.buttonDisabled]}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>Mulai belajar</Text>
      </Pressable>
    </SafeAreaView>
  );
};

export default Onboarding;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.sky, padding: spacing.lg, gap: spacing.md },
  title: { ...type.title, color: colors.ink, marginTop: spacing.lg },
  body: { ...type.body, color: colors.ink },
  input: {
    ...type.body,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.ink,
  },
  ages: { flexDirection: "row", gap: spacing.md },
  age: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  ageSelected: { backgroundColor: colors.sea },
  ageText: { ...type.body, color: colors.ink },
  ageTextSelected: { color: colors.white },
  note: { ...type.caption, color: colors.inkSoft },
  warning: { ...type.caption, color: colors.listening },
  button: {
    marginTop: "auto",
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 4,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { ...type.body, color: colors.white },
});
