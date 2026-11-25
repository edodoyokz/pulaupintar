import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { findLesson, findLessonById, lessonId, pickSessionItems, PLACES, type AppItem, type Lesson } from "@/lessons/catalog";
import { useProfile } from "@/profile/profile-context";
import type { ChildProfile } from "@/profile/storage";
import { useTutorSession } from "@/tutor/use-tutor-session";
import { Icon } from "@/ui/icons";
import { KakPinta, type KakPintaGaze, type KakPintaMood } from "@/ui/kak-pinta";
import { ObjectShape, PictureView } from "@/ui/picture";
import { BackButton, BigButton, CircleButton, ProgressDashes } from "@/ui/primitives";
import { colors, fonts, layout, radius, spacing } from "@/ui/theme";

const LessonScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { child, limitReached } = useProfile();
  // Decided once on entry, so finishing a lesson right at the limit still shows the reward.
  const [blocked] = useState(limitReached);
  const [attemptKey, setAttemptKey] = useState(0);
  const lesson = findLessonById(id);

  if (!child) return <Redirect href="/onboarding" />;

  if (!lesson) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.fallbackWrap}>
          <View style={styles.fallbackCard}>
            <Text style={styles.fallbackTitle}>Pelajaran tidak ditemukan</Text>
            <Text style={styles.fallbackBody}>Ayo kembali ke pulau untuk memilih pelajaran yang tersedia.</Text>
            <BigButton label="Kembali ke pulau" onPress={() => router.replace("/island")} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (blocked) return <TimeUp childName={child.name} />;
  return (
    <Session
      key={`${lesson.id}-${attemptKey}`}
      lesson={lesson}
      child={child}
      onRetry={() => setAttemptKey((previous) => previous + 1)}
    />
  );
};

export default LessonScreen;

const MicPulseRing = ({ size }: { size: number }) => {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(progress);
    if (reducedMotion) {
      progress.value = 0;
      return;
    }
    progress.value = 0;
    progress.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }), -1, false);
    return () => cancelAnimation(progress);
  }, [reducedMotion, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    if (reducedMotion) {
      return { opacity: 0.35, transform: [{ scale: 1.12 }] };
    }
    return {
      opacity: 0.45 * (1 - progress.value),
      transform: [{ scale: 1 + progress.value * 0.24 }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.micPulse,
        { width: size, height: size, borderRadius: size / 2 },
        animatedStyle,
      ]}
    />
  );
};

const Session = ({
  lesson,
  child,
  onRetry,
}: {
  lesson: Lesson;
  child: ChildProfile;
  onRetry: () => void;
}) => {
  const { height } = useWindowDimensions();
  const compact = height < 720;
  const [confirmExit, setConfirmExit] = useState(false);
  const [items] = useState<AppItem[]>(() => pickSessionItems(lesson));
  const [alreadyCompleted] = useState(() => child.completedLessons.includes(lesson.id));
  const { recordSession, recordUsage } = useProfile();
  const session = useTutorSession(lesson, child, items);
  const started = useRef(false);
  const recorded = useRef(false);
  const place = PLACES.find((candidate) => candidate.subject === lesson.subject) ?? PLACES[0];

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    session.start();
  }, [session]);

  useEffect(() => {
    if (session.phase !== "done" || recorded.current) return;
    recorded.current = true;
    recordSession({
      lessonId: lesson.id,
      stars: session.stars,
      passed: session.passed,
      seconds: session.elapsedSeconds(),
    });
  }, [session, lesson.id, recordSession]);

  // Leaving early still counts toward the parent's daily limit.
  const elapsedSeconds = session.elapsedSeconds;
  const recordUsageRef = useRef(recordUsage);
  recordUsageRef.current = recordUsage;
  const elapsedRef = useRef(elapsedSeconds);
  elapsedRef.current = elapsedSeconds;
  useEffect(
    () => () => {
      if (!started.current || recorded.current) return;
      recorded.current = true;
      recordUsageRef.current(elapsedRef.current());
    },
    [],
  );

  if (session.phase === "done") {
    return (
      <Reward
        lesson={lesson}
        childName={child.name}
        stars={session.stars}
        passed={session.passed}
        isNewSticker={session.passed && !alreadyCompleted}
        onRetry={onRetry}
      />
    );
  }

  const listening = session.phase === "listening";
  const checking = session.phase === "checking" || session.phase === "idle";
  const micEnabled = session.phase === "your-turn" || listening;
  const micSize = compact ? 96 : 112;
  const tutorMood: KakPintaMood =
    session.phase === "listening" ? "listen" : session.phase === "checking" ? "think" : "talk";
  const tutorReaction = session.feedback === "none" ? undefined : session.feedback;
  // The card and the microphone are both below Kak Pinta: it looks at the card while asking or showing
  // the answer, at the microphone when it is the child's turn, and up while it thinks.
  const tutorGaze: KakPintaGaze =
    session.phase === "checking"
      ? { x: 0.6, y: -1 }
      : session.phase === "your-turn"
        ? { x: 0, y: 1 }
        : session.phase === "speaking" && (session.feedback === "none" || session.feedback === "reveal")
          ? { x: 0, y: 0.7 }
          : { x: 0, y: 0 };

  const hintText = listening
    ? "Bicara sekarang, lalu tekan kotak merah"
    : micEnabled
      ? "Tekan mikrofon lalu jawab"
      : session.phase === "checking"
        ? "Sebentar ya, Kak Pinta memeriksa..."
        : session.phase === "idle"
          ? "Kak Pinta sedang bersiap..."
          : "Dengarkan Kak Pinta dulu, ya";

  const pictureBorderStyle =
    session.feedback === "correct"
      ? { borderColor: colors.green, borderStyle: "solid" as const }
      : session.feedback === "hint"
        ? { borderColor: colors.orange, borderStyle: "solid" as const }
        : session.feedback === "reveal"
          ? { borderColor: colors.blue, borderStyle: "solid" as const }
          : null;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.inner}>
        <View style={styles.topBar}>
          <BackButton icon="close" onPress={() => setConfirmExit(true)} />
          <ProgressDashes done={session.itemNumber - 1} total={session.itemTotal} color={place.color} />
          <Text style={styles.counter}>
            {session.itemNumber}/{session.itemTotal}
          </Text>
        </View>

        <View style={styles.tutor}>
          <View style={styles.bubble}>
            <Text style={[styles.bubbleText, compact && styles.bubbleTextCompact]} accessibilityLiveRegion="polite">
              {session.phase === "listening"
                ? "Kak Pinta mendengarkan..."
                : session.caption || "Kak Pinta siap mengajar!"}
            </Text>
          </View>
          <KakPinta
            size={compact ? 116 : 148}
            mood={tutorMood}
            reaction={tutorReaction}
            gaze={tutorGaze}
          />
          {(session.heard !== "" || session.feedback !== "none") && (
            <View style={styles.statusPills}>
              {session.feedback === "correct" && (
                <View style={[styles.feedbackPill, { backgroundColor: colors.greenTint }]}>
                  <Icon name="check" size={16} color={colors.greenDark} />
                  <Text style={[styles.feedbackText, { color: colors.greenDark }]}>Benar!</Text>
                </View>
              )}
              {session.feedback === "hint" && (
                <View style={[styles.feedbackPill, { backgroundColor: colors.orangeTint }]}>
                  <Text style={[styles.feedbackText, { color: colors.orangeDark }]}>Coba lagi, ya!</Text>
                </View>
              )}
              {session.feedback === "reveal" && (
                <View style={[styles.feedbackPill, { backgroundColor: colors.blueTint }]}>
                  <Text style={[styles.feedbackText, { color: colors.blue }]}>Ini jawabannya</Text>
                </View>
              )}
              {session.heard !== "" && (
                <View style={styles.heard}>
                  <Icon name="mic" size={16} color={colors.inkSoft} />
                  <Text style={styles.heardText}>Kamu bilang: “{session.heard}”</Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={[styles.picture, pictureBorderStyle]} accessibilityLabel={session.item?.visual}>
          {session.item && <PictureView picture={session.item.picture} compact={compact} />}
        </View>

        <View style={styles.controls}>
          <CircleButton
            label="Dengar lagi"
            onPress={session.replay}
            disabled={session.phase !== "your-turn"}
            style={[styles.replay, session.phase !== "your-turn" && styles.replayDisabled]}
          >
            <Icon name="speaker" size={28} color={colors.blue} />
          </CircleButton>

          <View style={[styles.micWrap, { width: micSize, height: micSize }]}>
            {listening && <MicPulseRing size={micSize} />}
            <CircleButton
              label={listening ? "Selesai bicara" : "Tekan untuk menjawab"}
              onPress={listening ? session.stopListening : session.startListening}
              disabled={!micEnabled}
              style={[
                styles.mic,
                { width: micSize, height: micSize },
                listening && styles.micListening,
                !micEnabled && styles.micDisabled,
              ]}
            >
              {checking ? (
                <ActivityIndicator color={colors.white} size="large" />
              ) : (
                <Icon name={listening ? "stop" : "mic"} size={compact ? 40 : 48} color={colors.white} />
              )}
            </CircleButton>
          </View>

          <View style={styles.replaySpacer} />
        </View>
        <Text style={styles.hint} accessibilityLiveRegion="polite">
          {hintText}
        </Text>
      </View>

      <Modal
        transparent
        visible={confirmExit}
        animationType="fade"
        onRequestClose={() => setConfirmExit(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Keluar dari pelajaran?</Text>
            <Text style={styles.modalBody}>Progres soal di sesi ini belum tersimpan.</Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setConfirmExit(false)}
                style={({ pressed }) => [
                  styles.modalBtnPrimary,
                  Platform.OS === "web" && styles.pointer,
                  pressed && styles.modalBtnPressed,
                ]}
                accessibilityRole="button"
              >
                <Text style={styles.modalBtnPrimaryText}>Lanjut belajar</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setConfirmExit(false);
                  router.back();
                }}
                style={({ pressed }) => [
                  styles.modalBtnSecondary,
                  Platform.OS === "web" && styles.pointer,
                  pressed && styles.modalBtnPressed,
                ]}
                accessibilityRole="button"
              >
                <Text style={styles.modalBtnSecondaryText}>Keluar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const Reward = ({
  lesson,
  childName,
  stars,
  passed,
  isNewSticker,
  onRetry,
}: {
  lesson: Lesson;
  childName: string;
  stars: number;
  passed: boolean;
  isNewSticker: boolean;
  onRetry: () => void;
}) => {
  const hasNext = passed && findLesson(lesson.subject, lesson.level + 1) !== undefined;
  return (
    <SafeAreaView style={[styles.screen, styles.rewardScreen]}>
      <ScrollView contentContainerStyle={styles.rewardScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.rewardInner}>
          <View style={styles.starRow} accessibilityLabel={`${stars} bintang`}>
            {Array.from({ length: 3 }, (_, index) => {
              const earned = index < stars;
              return (
                <View key={index} style={index === 1 ? styles.starMiddle : undefined}>
                  <Icon
                    name="star"
                    size={index === 1 ? 96 : 72}
                    color={earned ? colors.gold : colors.goldEmptyFill}
                    strokeColor={earned ? colors.goldStroke : colors.goldEmptyStroke}
                  />
                </View>
              );
            })}
          </View>
          <Text style={styles.rewardTitle}>{passed ? `Hebat, ${childName}!` : `Kerja bagus, ${childName}!`}</Text>
          <Text style={styles.rewardText}>
            {passed
              ? hasNext
                ? "Level berikutnya sudah terbuka."
                : "Kamu menyelesaikan level ini."
              : "Ayo coba lagi supaya level berikutnya terbuka."}
          </Text>
          {/* A pass gets the hop-and-flap celebration; a miss gets an encouraging nod instead. */}
          <KakPinta size={180} mood={passed ? "happy" : "talk"} reaction={passed ? undefined : "hint"} />
          {passed && (
            <View style={styles.sticker}>
              <View style={styles.stickerIcon}>
                <ObjectShape kind={lesson.sticker.object} size={32} />
              </View>
              <View>
                <Text style={styles.stickerLabel}>{isNewSticker ? "Stiker baru" : "Stiker terkumpul"}</Text>
                <Text style={styles.stickerName}>{lesson.sticker.name}</Text>
              </View>
            </View>
          )}
          <View style={styles.rewardFooter}>
            {passed && hasNext && (
              <>
                <BigButton
                  label={`Lanjut Level ${lesson.level + 1}`}
                  color={colors.green}
                  shadow={colors.greenDark}
                  onPress={() =>
                    router.replace({
                      pathname: "/lesson/[id]",
                      params: { id: lessonId(lesson.subject, lesson.level + 1) },
                    })
                  }
                />
                <BigButton label="Kembali ke pulau" variant="secondary" onPress={() => router.dismissTo("/island")} />
              </>
            )}
            {!passed && (
              <>
                <BigButton label="Coba lagi" color={colors.orange} shadow={colors.orangeDark} onPress={onRetry} />
                <BigButton label="Kembali ke pulau" variant="secondary" onPress={() => router.dismissTo("/island")} />
              </>
            )}
            {passed && !hasNext && (
              <BigButton
                label="Kembali ke pulau"
                color={colors.green}
                shadow={colors.greenDark}
                onPress={() => router.dismissTo("/island")}
              />
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const TimeUp = ({ childName }: { childName: string }) => (
  <SafeAreaView style={[styles.screen, styles.rewardScreen]}>
    <ScrollView contentContainerStyle={styles.rewardScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.rewardInner}>
        <Text style={styles.rewardTitle}>Waktunya istirahat</Text>
        <Text style={styles.rewardText}>{`Hari ini ${childName} sudah belajar banyak. Besok kita belajar lagi, ya!`}</Text>
        <KakPinta size={180} mood="calm" />
        <View style={styles.rewardFooter}>
          <BigButton label="Kembali ke pulau" color={colors.green} shadow={colors.greenDark} onPress={() => router.dismissTo("/island")} />
        </View>
      </View>
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream, paddingHorizontal: 20 },
  inner: { flex: 1, maxWidth: layout.maxWidth, width: "100%", alignSelf: "center", gap: 10 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: spacing.xs },
  counter: { width: 44, textAlign: "right", fontFamily: fonts.bodyHeavy, fontSize: 14, color: colors.inkSoft },
  tutor: { alignItems: "center", gap: 6 },
  bubble: {
    maxWidth: 340,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: colors.white,
    borderBottomWidth: 4,
    borderBottomColor: colors.bubbleShadow,
  },
  bubbleText: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, textAlign: "center", color: colors.ink },
  bubbleTextCompact: { fontSize: 19, lineHeight: 24 },
  statusPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  feedbackPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  feedbackText: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
  heard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.heardBg,
    maxWidth: "100%",
  },
  heardText: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.inkSoft, flexShrink: 1 },
  picture: {
    flex: 1,
    minHeight: 150,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    borderRadius: 32,
    borderWidth: 3,
    borderStyle: "dashed",
    borderColor: colors.pictureBorder,
    backgroundColor: colors.white,
  },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 },
  replay: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.blueTint,
  },
  replayDisabled: { opacity: 0.4 },
  replaySpacer: { width: 60, height: 60 },
  micWrap: { alignItems: "center", justifyContent: "center" },
  micPulse: {
    position: "absolute",
    backgroundColor: colors.red,
  },
  mic: {
    borderRadius: radius.full,
    backgroundColor: colors.orange,
    borderBottomWidth: 6,
    borderBottomColor: colors.orangeDark,
  },
  micListening: { backgroundColor: colors.red, borderBottomColor: colors.redDark },
  micDisabled: { opacity: 0.45 },
  hint: { textAlign: "center", fontFamily: fonts.bodyHeavy, fontSize: 16, color: colors.inkSoft, paddingBottom: spacing.sm },
  rewardScreen: { backgroundColor: colors.sunshine },
  rewardScroll: { flexGrow: 1, paddingTop: spacing.lg, paddingBottom: spacing.md },
  rewardInner: { flexGrow: 1, maxWidth: layout.maxWidth, width: "100%", alignSelf: "center", alignItems: "center", gap: 12 },
  starRow: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
  starMiddle: { marginBottom: 24 },
  rewardTitle: { fontFamily: fonts.display, fontSize: 36, lineHeight: 42, textAlign: "center", color: colors.ink },
  rewardText: { maxWidth: 320, textAlign: "center", fontFamily: fonts.bodyBold, fontSize: 18, lineHeight: 26, color: colors.inkBody },
  sticker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: colors.white,
  },
  stickerIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.orangeTint, alignItems: "center", justifyContent: "center" },
  stickerLabel: { fontFamily: fonts.bodyHeavy, fontSize: 13, color: colors.inkSoft },
  stickerName: { fontFamily: fonts.display, fontSize: 19, color: colors.ink },
  rewardFooter: { marginTop: "auto", alignSelf: "stretch", gap: 10, paddingTop: spacing.sm },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(31, 42, 68, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    padding: 20,
    borderRadius: 24,
    backgroundColor: colors.white,
    gap: 12,
  },
  modalTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  modalBody: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.inkBody },
  modalActions: { gap: 10, marginTop: 4 },
  modalBtnPrimary: {
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  modalBtnPrimaryText: { fontFamily: fonts.bodyHeavy, fontSize: 16, color: colors.white },
  modalBtnSecondary: {
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    borderWidth: 1.5,
    borderColor: colors.borderControl,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  modalBtnSecondaryText: { fontFamily: fonts.bodyHeavy, fontSize: 16, color: colors.inkBody },
  modalBtnPressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },
  fallbackWrap: { flex: 1, justifyContent: "center", maxWidth: layout.maxWidth, width: "100%", alignSelf: "center" },
  fallbackCard: { gap: 14, padding: 20, borderRadius: 24, backgroundColor: colors.white },
  fallbackTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  fallbackBody: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.inkBody },
  pointer: { cursor: "pointer" },
});
