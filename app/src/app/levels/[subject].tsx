import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Subject } from "@/api/types";
import {
  findLesson,
  isUnlocked,
  LEVEL_TITLES,
  LEVELS_PER_SUBJECT,
  lessonId,
  PLACES,
} from "@/lessons/catalog";
import { useProfile } from "@/profile/profile-context";
import { Icon } from "@/ui/icons";
import { BackButton, BigButton, webCursor } from "@/ui/primitives";
import { colors, fonts, layout, radius, spacing, type } from "@/ui/theme";

type LevelState = "done" | "open" | "locked" | "soon";

const Levels = () => {
  const { subject } = useLocalSearchParams<{ subject: Subject }>();
  const { child } = useProfile();
  const place = PLACES.find((candidate) => candidate.subject === subject);

  if (!child) return <Redirect href="/onboarding" />;

  if (!place) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.inner}>
          <View style={styles.header}>
            <BackButton />
            <Text style={styles.title}>Pulau Pintar</Text>
          </View>
          <View style={styles.fallbackCard}>
            <Text style={styles.fallbackTitle}>Tempat belajar tidak ditemukan</Text>
            <Text style={styles.fallbackBody}>Pilih kembali kebun, rumah, atau pantai di halaman pulau.</Text>
            <BigButton label="Kembali ke pulau" onPress={() => router.replace("/island")} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const stateOf = (level: number): LevelState => {
    if (child.completedLessons.includes(lessonId(place.subject, level))) return "done";
    if (!findLesson(place.subject, level)) return "soon";
    return isUnlocked(place.subject, level, child.completedLessons) ? "open" : "locked";
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <BackButton />
          <View style={styles.headerText}>
            <Text style={styles.title}>{place.name}</Text>
            <Text style={styles.subtitle}>{place.subjectName}</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {Array.from({ length: LEVELS_PER_SUBJECT }, (_, index) => {
            const level = index + 1;
            const state = stateOf(level);
            const playable = state === "open" || state === "done";
            return (
              <Pressable
                key={level}
                disabled={!playable}
                onPress={() =>
                  router.push({ pathname: "/lesson/[id]", params: { id: lessonId(place.subject, level) } })
                }
                style={({ pressed }) => [
                  styles.card,
                  { borderBottomColor: playable ? place.shadow : colors.line },
                  !playable && styles.cardDim,
                  webCursor(!playable),
                  pressed && playable && styles.cardPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Level ${level}, ${LEVEL_TITLES[place.subject][index]}`}
                accessibilityState={{ disabled: !playable }}
              >
                <View style={[styles.badge, { backgroundColor: playable ? place.color : colors.line }]}>
                  <Text style={[styles.badgeText, !playable && styles.badgeTextLocked]}>{level}</Text>
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{LEVEL_TITLES[place.subject][index]}</Text>
                  <Text style={styles.cardState}>
                    {state === "done"
                      ? "Selesai"
                      : state === "open"
                        ? "Ayo main!"
                        : state === "soon"
                          ? "Segera hadir"
                          : "Selesaikan level sebelumnya"}
                  </Text>
                </View>
                {state === "done" && <Icon name="check" size={28} color={colors.green} />}
                {state === "open" && <Icon name="play" size={28} color={place.color} />}
                {(state === "locked" || state === "soon") && <Icon name="lock" size={24} color={colors.inkSoft} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default Levels;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.sky, paddingHorizontal: 20 },
  inner: { flex: 1, maxWidth: layout.maxWidth, width: "100%", alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: spacing.md },
  headerText: { flex: 1 },
  title: { ...type.title, color: colors.ink },
  subtitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.inkSoft },
  list: { gap: 12, paddingBottom: spacing.lg },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 24,
    borderBottomWidth: 6,
    backgroundColor: colors.white,
  },
  cardPressed: { transform: [{ translateY: 3 }], opacity: 0.94 },
  cardDim: { opacity: 0.78 },
  badge: { width: 56, height: 56, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  badgeText: { fontFamily: fonts.display, fontSize: 28, color: colors.white },
  badgeTextLocked: { color: colors.inkBody },
  cardText: { flex: 1, gap: 2 },
  cardTitle: { fontFamily: fonts.bodyHeavy, fontSize: 18, lineHeight: 23, color: colors.ink },
  cardState: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkSoft },
  fallbackCard: {
    gap: 12,
    padding: 20,
    borderRadius: 24,
    backgroundColor: colors.white,
    marginTop: spacing.md,
  },
  fallbackTitle: { ...type.heading, color: colors.ink },
  fallbackBody: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.inkBody },
});
