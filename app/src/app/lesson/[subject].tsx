import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Subject } from "@/api/types";
import { findLesson, type Lesson } from "@/lessons/catalog";
import { useProfile } from "@/profile/profile-context";
import type { ChildProfile } from "@/profile/storage";
import { useTutorSession } from "@/tutor/use-tutor-session";
import { colors, radius, spacing, type } from "@/ui/theme";
import { TutorAvatar } from "@/ui/tutor-avatar";

const LessonScreen = () => {
  const { subject } = useLocalSearchParams<{ subject: Subject }>();
  const { child } = useProfile();
  const lesson = findLesson(subject);
  if (!lesson || !child) return null;
  return <Session lesson={lesson} child={child} />;
};

export default LessonScreen;

const Session = ({ lesson, child }: { lesson: Lesson; child: ChildProfile }) => {
  const { recordLessonDone } = useProfile();
  const session = useTutorSession(lesson, child);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    session.start();
  }, [session]);

  useEffect(() => {
    if (session.phase === "done") recordLessonDone(lesson.id, session.correctCount);
    // Record once when the session reaches its end.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.phase]);

  const listening = session.phase === "listening";
  const micEnabled = session.phase === "your-turn" || listening;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Kembali">
          <Text style={styles.back}>✕</Text>
        </Pressable>
        <Text style={styles.progress}>
          {session.phase === "done" ? "Selesai!" : `Soal ${session.itemNumber} dari ${session.itemTotal}`}
        </Text>
      </View>

      <View style={styles.stage}>
        <TutorAvatar speaking={session.phase === "speaking"} listening={listening} />
        <Text style={styles.caption}>{session.caption}</Text>
        {session.phase !== "done" && session.item.visual && (
          <Text style={styles.visual}>{session.item.visual}</Text>
        )}
        {session.heard !== "" && <Text style={styles.heard}>Kamu bilang: “{session.heard}”</Text>}
      </View>

      {session.phase === "done" ? (
        <View style={styles.reward}>
          <Text style={styles.rewardStars}>{"⭐".repeat(Math.max(1, session.correctCount))}</Text>
          <Pressable onPress={() => router.back()} style={styles.homeButton} accessibilityRole="button">
            <Text style={styles.homeText}>Kembali ke pulau</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.micArea}>
          {session.phase === "checking" || session.phase === "speaking" ? (
            <ActivityIndicator size="large" color={colors.sea} />
          ) : null}
          <Pressable
            onPress={listening ? session.stopListening : session.startListening}
            disabled={!micEnabled}
            style={[styles.mic, listening && styles.micActive, !micEnabled && styles.micDisabled]}
            accessibilityRole="button"
            accessibilityLabel={listening ? "Selesai bicara" : "Tekan untuk menjawab"}
          >
            <Text style={styles.micIcon}>{listening ? "⏹" : "🎤"}</Text>
          </Pressable>
          <Text style={styles.micHint}>{listening ? "Kak Pinta mendengarkan…" : micEnabled ? "Tekan lalu jawab" : ""}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.sky, padding: spacing.lg },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  back: { fontSize: 28, color: colors.inkSoft, padding: spacing.sm },
  progress: { ...type.caption, color: colors.inkSoft },
  stage: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg },
  caption: { ...type.body, color: colors.ink, textAlign: "center" },
  visual: { fontSize: 64, textAlign: "center" },
  heard: { ...type.caption, color: colors.inkSoft },
  micArea: { alignItems: "center", gap: spacing.sm, minHeight: 180, justifyContent: "flex-end" },
  mic: {
    width: 112,
    height: 112,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  micActive: { backgroundColor: colors.listening },
  micDisabled: { opacity: 0.35 },
  micIcon: { fontSize: 48 },
  micHint: { ...type.caption, color: colors.inkSoft, minHeight: 22 },
  reward: { alignItems: "center", gap: spacing.lg, minHeight: 180 },
  rewardStars: { fontSize: 48 },
  homeButton: { backgroundColor: colors.success, borderRadius: radius.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
  homeText: { ...type.body, color: colors.white },
});
