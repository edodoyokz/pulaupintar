import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { findLesson, findLessonById, pickSessionItems, PLACES, type AppItem, type Lesson } from "@/lessons/catalog";
import { useProfile } from "@/profile/profile-context";
import type { ChildProfile } from "@/profile/storage";
import { useTutorSession } from "@/tutor/use-tutor-session";
import { Icon } from "@/ui/icons";
import { KakPinta, type KakPintaMood } from "@/ui/kak-pinta";
import { ObjectShape, PictureView } from "@/ui/picture";
import { BackButton, BigButton, CircleButton, ProgressDashes } from "@/ui/primitives";
import { colors, fonts, radius, spacing } from "@/ui/theme";

const LessonScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { child, limitReached } = useProfile();
  // Decided once on entry, so finishing a lesson right at the limit still shows the reward.
  const [blocked] = useState(limitReached);
  const lesson = findLessonById(id);
  if (!lesson || !child) return null;
  if (blocked) return <TimeUp childName={child.name} />;
  return <Session lesson={lesson} child={child} />;
};

export default LessonScreen;

const Session = ({ lesson, child }: { lesson: Lesson; child: ChildProfile }) => {
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
      />
    );
  }

  const listening = session.phase === "listening";
  const busy = session.phase === "checking" || session.phase === "speaking" || session.phase === "idle";
  const micEnabled = session.phase === "your-turn" || listening;
  const tutorMood: KakPintaMood =
    session.phase === "listening" ? "listen" : session.phase === "checking" ? "think" : "talk";
  const tutorAnimated =
    session.phase === "speaking" || session.phase === "listening" || session.phase === "checking";

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <BackButton icon="close" />
        <ProgressDashes done={session.itemNumber - 1} total={session.itemTotal} color={place.color} />
        <Text style={styles.counter}>
          {session.itemNumber}/{session.itemTotal}
        </Text>
      </View>

      <View style={styles.tutor}>
        <View style={styles.bubble}>
          {session.phase === "listening" ? (
            <Text style={styles.bubbleText}>Kak Pinta mendengarkan…</Text>
          ) : (
            <Text style={styles.bubbleText}>{session.caption || "Kak Pinta siap mengajar!"}</Text>
          )}
        </View>
        <KakPinta size={160} mood={tutorMood} animated={tutorAnimated} />
        {session.heard !== "" && (
          <View style={styles.heard}>
            <Icon name="mic" size={16} color={colors.inkSoft} />
            <Text style={styles.heardText}>Kamu bilang: “{session.heard}”</Text>
          </View>
        )}
      </View>

      <View style={styles.picture} accessibilityLabel={session.item?.visual}>
        {session.item && <PictureView picture={session.item.picture} />}
      </View>

      <View style={styles.controls}>
        <CircleButton label="Dengar lagi" onPress={session.replay} disabled={session.phase !== "your-turn"} style={styles.replay}>
          <Icon name="speaker" size={30} color={colors.blue} />
        </CircleButton>
        <CircleButton
          label={listening ? "Selesai bicara" : "Tekan untuk menjawab"}
          onPress={listening ? session.stopListening : session.startListening}
          disabled={!micEnabled}
          style={[
            styles.mic,
            listening && { backgroundColor: colors.red, borderBottomColor: colors.redDark },
            !micEnabled && styles.micDisabled,
          ]}
        >
          {busy && !listening ? (
            <ActivityIndicator color={colors.white} size="large" />
          ) : (
            <Icon name={listening ? "stop" : "mic"} size={48} color={colors.white} />
          )}
        </CircleButton>
        <View style={styles.replay} />
      </View>
      <Text style={styles.hint}>
        {listening ? "Bicara sekarang, lalu tekan lagi" : micEnabled ? "Tekan lalu jawab" : "Dengarkan Kak Pinta dulu, ya"}
      </Text>
    </SafeAreaView>
  );
};

const Reward = ({
  lesson,
  childName,
  stars,
  passed,
  isNewSticker,
}: {
  lesson: Lesson;
  childName: string;
  stars: number;
  passed: boolean;
  isNewSticker: boolean;
}) => {
  const hasNext = passed && findLesson(lesson.subject, lesson.level + 1) !== undefined;
  return (
    <SafeAreaView style={[styles.screen, styles.rewardScreen]}>
      <View style={styles.starRow} accessibilityLabel={`${stars} bintang`}>
        {Array.from({ length: 3 }, (_, index) => (
          <View key={index} style={index === 1 ? styles.starMiddle : undefined}>
            <Icon name="star" size={index === 1 ? 96 : 72} color={index < stars ? colors.gold : "#EBDDB0"} />
          </View>
        ))}
      </View>
      <Text style={styles.rewardTitle}>{passed ? `Hebat, ${childName}!` : `Kerja bagus, ${childName}!`}</Text>
      <Text style={styles.rewardText}>
        {passed
          ? hasNext
            ? "Level berikutnya sudah terbuka."
            : "Kamu menyelesaikan level ini."
          : "Ayo coba lagi supaya level berikutnya terbuka."}
      </Text>
      <KakPinta size={190} mood="happy" animated />
      {passed && (
        <View style={styles.sticker}>
          <View style={styles.stickerIcon}>
            <ObjectShape kind={lesson.sticker.object} size={32} />
          </View>
          <View>
            <Text style={styles.stickerLabel}>{isNewSticker ? "STIKER BARU" : "STIKER TERKUMPUL"}</Text>
            <Text style={styles.stickerName}>{lesson.sticker.name}</Text>
          </View>
        </View>
      )}
      <View style={styles.rewardFooter}>
        <BigButton label="Kembali ke pulau" color={colors.green} shadow={colors.greenDark} onPress={() => router.dismissTo("/island")} />
      </View>
    </SafeAreaView>
  );
};

const TimeUp = ({ childName }: { childName: string }) => (
  <SafeAreaView style={[styles.screen, styles.rewardScreen]}>
    <Text style={styles.rewardTitle}>Waktunya istirahat</Text>
    <Text style={styles.rewardText}>{`Hari ini ${childName} sudah belajar banyak. Besok kita belajar lagi, ya!`}</Text>
    <KakPinta size={190} mood="happy" />
    <View style={styles.rewardFooter}>
      <BigButton label="Kembali ke pulau" color={colors.green} shadow={colors.greenDark} onPress={() => router.dismissTo("/island")} />
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream, paddingHorizontal: 20, gap: 12 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  counter: { width: 44, textAlign: "right", fontFamily: fonts.bodyHeavy, fontSize: 14, color: colors.inkSoft },
  tutor: { alignItems: "center", gap: 6 },
  bubble: {
    maxWidth: 320,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: colors.white,
    borderBottomWidth: 4,
    borderBottomColor: "#F2D9BF",
  },
  bubbleText: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, textAlign: "center", color: colors.ink },
  heard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: "#F1E4D4",
  },
  heardText: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.inkSoft },
  picture: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    borderRadius: 32,
    borderWidth: 3,
    borderStyle: "dashed",
    borderColor: "#F2C29B",
    backgroundColor: colors.white,
  },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 28 },
  replay: { width: 64, height: 64, borderRadius: radius.full, backgroundColor: "transparent" },
  mic: {
    width: 112,
    height: 112,
    borderRadius: radius.full,
    backgroundColor: colors.orange,
    borderBottomWidth: 6,
    borderBottomColor: colors.orangeDark,
  },
  micDisabled: { opacity: 0.5 },
  hint: { textAlign: "center", fontFamily: fonts.bodyHeavy, fontSize: 17, color: colors.inkSoft, paddingBottom: spacing.sm },
  rewardScreen: { backgroundColor: colors.sunshine, alignItems: "center", paddingTop: spacing.xl },
  starRow: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
  starMiddle: { marginBottom: 24 },
  rewardTitle: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, color: colors.ink },
  rewardText: { maxWidth: 300, textAlign: "center", fontFamily: fonts.bodyBold, fontSize: 19, lineHeight: 27, color: colors.inkBody },
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
  stickerLabel: { fontFamily: fonts.bodyHeavy, fontSize: 12, letterSpacing: 1, color: colors.inkSoft },
  stickerName: { fontFamily: fonts.display, fontSize: 19, color: colors.ink },
  rewardFooter: { marginTop: "auto", alignSelf: "stretch", paddingBottom: spacing.md },
});
