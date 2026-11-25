import { Redirect, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { completedCount, LEVELS_PER_SUBJECT, PLACES, type Place } from "@/lessons/catalog";
import { useProfile } from "@/profile/profile-context";
import { prepareAudio, speak, stopSpeaking } from "@/tutor/voice";
import { Icon } from "@/ui/icons";
import { KakPinta } from "@/ui/kak-pinta";
import { PlaceIcon } from "@/ui/place-icon";
import { webCursor } from "@/ui/primitives";
import { colors, fonts, layout, radius, spacing, type } from "@/ui/theme";

const Island = () => {
  const { child, limitReached } = useProfile();
  const childName = child?.name;
  const [speaking, setSpeaking] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!childName) return;
      let active = true;
      const greeting = limitReached
        ? `Waktunya istirahat, ${childName}! Besok kita belajar lagi.`
        : `Halo ${childName}! Mau belajar di mana hari ini?`;
      prepareAudio()
        .then(async () => {
          if (!active) return;
          setSpeaking(true);
          try {
            await speak([{ lang: "id", text: greeting }]);
          } finally {
            if (active) setSpeaking(false);
          }
        })
        // No audio permission or audio setup failed: the island works without the spoken greeting.
        .catch(() => undefined);
      return () => {
        active = false;
        setSpeaking(false);
        stopSpeaking();
      };
    }, [childName, limitReached]),
  );

  if (!child) return <Redirect href="/onboarding" />;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <View style={styles.header}>
            <Text style={styles.title}>Pulau Pintar</Text>
            <View style={styles.stars} accessibilityLabel={`${child.stars} bintang`}>
              <Icon name="star" size={24} color={colors.gold} strokeColor={colors.goldStroke} />
              <Text style={styles.starCount}>{child.stars}</Text>
            </View>
          </View>

          <View style={styles.greeting}>
            <KakPinta size={104} mood={limitReached && !speaking ? "happy" : "talk"} />
            <View style={styles.bubble}>
              <Text style={styles.bubbleText}>
                {limitReached
                  ? `Waktunya istirahat, ${child.name}! Besok kita belajar lagi.`
                  : `Halo, ${child.name}! Mau belajar di mana hari ini?`}
              </Text>
            </View>
          </View>

          <View style={styles.places}>
            {PLACES.map((place) => (
              <PlaceCard
                key={place.subject}
                place={place}
                done={completedCount(place.subject, child.completedLessons)}
                locked={limitReached}
              />
            ))}
          </View>

          <Pressable
            onPress={() => {
              stopSpeaking();
              router.push("/parents");
            }}
            style={({ pressed }) => [
              styles.parents,
              webCursor(),
              pressed && styles.parentsPressed,
            ]}
            accessibilityRole="button"
          >
            <Icon name="lock" size={18} color={colors.inkBody} />
            <Text style={styles.parentsText}>Area orang tua</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const PlaceCard = ({ place, done, locked }: { place: Place; done: number; locked: boolean }) => {
  const allDone = done >= LEVELS_PER_SUBJECT;
  const levelText = allDone ? "Semua level selesai" : `Level ${done + 1}`;
  return (
    <Pressable
      disabled={locked}
      onPress={() => {
        stopSpeaking();
        router.push({ pathname: "/levels/[subject]", params: { subject: place.subject } });
      }}
      style={({ pressed }) => [
        styles.place,
        { borderBottomColor: place.shadow },
        locked && styles.placeLocked,
        webCursor(locked),
        pressed && !locked && styles.placePressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: locked }}
      accessibilityLabel={`${place.name}, ${place.subjectName}, ${levelText}`}
    >
      <View style={[styles.placeIcon, { backgroundColor: place.tint }]}>
        <PlaceIcon subject={place.subject} color={place.color} />
      </View>
      <View style={styles.placeText}>
        <Text style={styles.placeName}>{place.name}</Text>
        <Text style={styles.placeSubject}>
          {place.subjectName} · {levelText}
        </Text>
        <View style={styles.levelDots}>
          {Array.from({ length: LEVELS_PER_SUBJECT }, (_, index) => {
            const completed = index < done;
            return (
              <View
                key={index}
                style={[
                  styles.levelDot,
                  completed
                    ? { backgroundColor: place.color }
                    : { backgroundColor: place.tint, borderWidth: 1.5, borderColor: colors.borderControl },
                ]}
              />
            );
          })}
        </View>
      </View>
    </Pressable>
  );
};

export default Island;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.sky },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: spacing.xs },
  inner: { flexGrow: 1, maxWidth: layout.maxWidth, width: "100%", alignSelf: "center", gap: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { ...type.title, color: colors.ink },
  stars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    backgroundColor: colors.white,
  },
  starCount: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
  greeting: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  bubble: {
    flex: 1,
    marginBottom: 18,
    padding: 14,
    borderRadius: 22,
    borderBottomLeftRadius: 6,
    backgroundColor: colors.white,
  },
  bubbleText: { fontFamily: fonts.bodyHeavy, fontSize: 18, lineHeight: 24, color: colors.ink },
  places: { gap: 14 },
  place: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    borderRadius: 26,
    borderBottomWidth: 6,
    backgroundColor: colors.white,
  },
  placePressed: { transform: [{ translateY: 3 }], opacity: 0.94 },
  placeLocked: { opacity: 0.55 },
  placeIcon: { width: 76, height: 76, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  placeText: { flex: 1, gap: 4 },
  placeName: { ...type.heading, lineHeight: 26, color: colors.ink },
  placeSubject: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.inkSoft },
  levelDots: { flexDirection: "row", gap: 6, marginTop: 4 },
  levelDot: { width: 22, height: 9, borderRadius: 5 },
  parents: {
    marginTop: "auto",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.borderControl,
    marginBottom: spacing.sm,
  },
  parentsPressed: { transform: [{ scale: 0.97 }], opacity: 0.86 },
  parentsText: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.inkBody },
});
