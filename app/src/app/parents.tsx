import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { completedCount, LEVELS_PER_SUBJECT, PLACES } from "@/lessons/catalog";
import { useProfile } from "@/profile/profile-context";
import { Icon } from "@/ui/icons";
import { BackButton, BigButton } from "@/ui/primitives";
import { colors, fonts, radius, spacing, type } from "@/ui/theme";

const LIMITS = [10, 15, 20];

// A small sum a young child can't solve keeps this area for the adults.
const makeGate = () => {
  const a = 4 + Math.floor(Math.random() * 6);
  const b = 4 + Math.floor(Math.random() * 6);
  return { question: `Berapa ${a} + ${b}?`, answer: String(a + b) };
};

const Parents = () => {
  const { child, dailyLimitMinutes, setDailyLimit } = useProfile();
  const [gate] = useState(makeGate);
  const [typed, setTyped] = useState("");
  const [wrong, setWrong] = useState(false);
  const [open, setOpen] = useState(false);

  if (!child) return null;

  if (!open) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <BackButton />
          <Text style={styles.title}>Area orang tua</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Khusus orang dewasa</Text>
          <Text style={styles.body}>Jawab soal ini untuk masuk: {gate.question}</Text>
          <TextInput
            value={typed}
            onChangeText={(text) => {
              setTyped(text);
              setWrong(false);
            }}
            keyboardType="number-pad"
            style={styles.input}
            maxLength={2}
            accessibilityLabel={gate.question}
          />
          {wrong && <Text style={styles.warning}>Belum tepat, coba lagi.</Text>}
        </View>
        <View style={styles.footer}>
          <BigButton
            label="Masuk"
            color={colors.blue}
            shadow="#174A94"
            onPress={() => (typed.trim() === gate.answer ? setOpen(true) : setWrong(true))}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.title}>Area orang tua</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.childCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{child.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.childText}>
            <Text style={styles.childName}>{child.name}</Text>
            <Text style={styles.childMeta}>
              {child.age} tahun · {child.stars} bintang
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Kemajuan belajar</Text>
          {PLACES.map((place) => {
            const done = completedCount(place.subject, child.completedLessons);
            return (
              <View key={place.subject} style={styles.progressRow}>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressName}>{place.subjectName}</Text>
                  <Text style={styles.progressValue}>
                    Level {done} dari {LEVELS_PER_SUBJECT} selesai
                  </Text>
                </View>
                <View style={[styles.track, { backgroundColor: place.tint }]}>
                  <View style={[styles.fill, { width: `${(done / LEVELS_PER_SUBJECT) * 100}%`, backgroundColor: place.color }]} />
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Batas belajar per hari</Text>
          <View style={styles.limits}>
            {LIMITS.map((minutes) => {
              const selected = dailyLimitMinutes === minutes;
              return (
                <Pressable
                  key={minutes}
                  onPress={() => setDailyLimit(minutes)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[styles.limit, selected && styles.limitSelected]}
                >
                  <Text style={[styles.limitText, selected && styles.limitTextSelected]}>{minutes} menit</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.small}>Setelah batas tercapai, Kak Pinta mengajak si kecil istirahat.</Text>
        </View>

        <View style={styles.privacy}>
          <Icon name="shield" size={22} color={colors.green} />
          <Text style={styles.privacyText}>
            Rekaman suara tidak disimpan. Data yang disimpan hanya nama panggilan, usia, dan kemajuan belajar.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Parents;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 20, gap: 14 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { ...type.title, fontSize: 26, color: colors.ink },
  content: { gap: 14, paddingBottom: spacing.lg },
  card: { gap: 12, padding: 16, borderRadius: 20, backgroundColor: colors.white },
  cardTitle: { fontFamily: fonts.bodyHeavy, fontSize: 17, color: colors.ink },
  body: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.inkBody },
  small: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.inkSoft },
  input: {
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.line,
    paddingHorizontal: 16,
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.ink,
  },
  warning: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.red },
  footer: { marginTop: "auto", paddingBottom: spacing.md },
  childCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 20, backgroundColor: colors.white },
  avatar: { width: 48, height: 48, borderRadius: radius.full, backgroundColor: colors.orangeTint, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.display, fontSize: 22, color: colors.orangeDark },
  childText: { flex: 1 },
  childName: { fontFamily: fonts.bodyHeavy, fontSize: 18, color: colors.ink },
  childMeta: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkSoft },
  progressRow: { gap: 6 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between" },
  progressName: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.ink },
  progressValue: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkSoft },
  track: { height: 12, borderRadius: 6 },
  fill: { height: 12, borderRadius: 6 },
  limits: { flexDirection: "row", gap: 10 },
  limit: { flex: 1, height: 48, borderRadius: 14, borderWidth: 2, borderColor: colors.line, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  limitSelected: { backgroundColor: colors.blue, borderColor: colors.blue },
  limitText: { fontFamily: fonts.bodyHeavy, fontSize: 16, color: colors.ink },
  limitTextSelected: { color: colors.white },
  privacy: { flexDirection: "row", gap: 12, alignItems: "flex-start", padding: 16, borderRadius: 20, backgroundColor: colors.white },
  privacyText: { flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.inkBody },
});
