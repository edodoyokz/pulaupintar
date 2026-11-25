import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ALL_LESSONS, completedCount, LEVELS_PER_SUBJECT, PLACES } from "@/lessons/catalog";
import { useProfile } from "@/profile/profile-context";
import { Icon } from "@/ui/icons";
import { ObjectShape } from "@/ui/picture";
import { BackButton, BigButton } from "@/ui/primitives";
import { colors, fonts, radius, spacing, type } from "@/ui/theme";

const LIMITS = [10, 15, 20];
const AGES = [4, 5, 6, 7];

// A small sum a young child can't solve keeps this area for the adults.
const makeGate = () => {
  const a = 4 + Math.floor(Math.random() * 6);
  const b = 4 + Math.floor(Math.random() * 6);
  return { question: `Berapa ${a} + ${b}?`, answer: String(a + b) };
};

const Parents = () => {
  const { child, children, dailyLimitMinutes, setDailyLimit, updateChild, addChild, switchChild, resetProgress } = useProfile();
  const [gate] = useState(makeGate);
  const [typed, setTyped] = useState("");
  const [wrong, setWrong] = useState(false);
  const [open, setOpen] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAge, setEditAge] = useState(5);

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAge, setNewAge] = useState(5);

  const [confirmReset, setConfirmReset] = useState(false);

  if (!child) return null;

  if (!open) {
    return (
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView contentContainerStyle={styles.gateScroll} keyboardShouldPersistTaps="handled">
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
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  const startEdit = () => {
    setEditName(child.name);
    setEditAge(child.age);
    setEditing(true);
    setAdding(false);
  };

  const saveEdit = async () => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    await updateChild(trimmed, editAge);
    setEditing(false);
  };

  const startAdd = () => {
    setNewName("");
    setNewAge(5);
    setAdding(true);
    setEditing(false);
  };

  const saveAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    await addChild(trimmed, newAge);
    setAdding(false);
  };

  const unlockedStickers = child.completedLessons.length;

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.header}>
          <BackButton />
          <Text style={styles.title}>Area orang tua</Text>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.childHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{child.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.childText}>
                <Text style={styles.childName}>{child.name}</Text>
                <Text style={styles.childMeta}>
                  {child.age} tahun · {child.stars} bintang
                </Text>
              </View>
              <Pressable onPress={startEdit} style={styles.pillButton} accessibilityRole="button">
                <Text style={styles.pillButtonText}>Ubah</Text>
              </Pressable>
            </View>

            {editing && (
              <View style={styles.subForm}>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Nama panggilan"
                  placeholderTextColor="#6B7488"
                  style={styles.smallInput}
                  maxLength={20}
                  accessibilityLabel="Nama panggilan anak"
                />
                <View style={styles.ageRow}>
                  {AGES.map((option) => (
                    <Pressable
                      key={option}
                      onPress={() => setEditAge(option)}
                      style={[styles.agePill, editAge === option && styles.limitSelected]}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.agePillText, editAge === option && styles.limitTextSelected]}>{option} thn</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.formActions}>
                  <Pressable onPress={() => setEditing(false)} style={styles.secondaryBtn} accessibilityRole="button">
                    <Text style={styles.secondaryBtnText}>Batal</Text>
                  </Pressable>
                  <Pressable
                    onPress={saveEdit}
                    disabled={editName.trim().length === 0}
                    style={[styles.primaryBtn, editName.trim().length === 0 && styles.btnDisabled]}
                    accessibilityRole="button"
                  >
                    <Text style={styles.primaryBtnText}>Simpan</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {children.length > 1 && (
              <View style={styles.switcher}>
                {children.map((candidate) => {
                  const active = candidate.id === child.id;
                  return (
                    <Pressable
                      key={candidate.id}
                      onPress={() => {
                        setEditing(false);
                        setConfirmReset(false);
                        void switchChild(candidate.id);
                      }}
                      style={[styles.switchChip, active && styles.switchChipActive]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[styles.switchChipText, active && styles.switchChipTextActive]}>{candidate.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {adding ? (
              <View style={styles.subForm}>
                <Text style={styles.subTitle}>Tambah profil anak</Text>
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="Contoh: Budi"
                  placeholderTextColor="#6B7488"
                  style={styles.smallInput}
                  maxLength={20}
                  accessibilityLabel="Nama panggilan anak baru"
                />
                <View style={styles.ageRow}>
                  {AGES.map((option) => (
                    <Pressable
                      key={option}
                      onPress={() => setNewAge(option)}
                      style={[styles.agePill, newAge === option && styles.limitSelected]}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.agePillText, newAge === option && styles.limitTextSelected]}>{option} thn</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.formActions}>
                  <Pressable onPress={() => setAdding(false)} style={styles.secondaryBtn} accessibilityRole="button">
                    <Text style={styles.secondaryBtnText}>Batal</Text>
                  </Pressable>
                  <Pressable
                    onPress={saveAdd}
                    disabled={newName.trim().length === 0}
                    style={[styles.primaryBtn, newName.trim().length === 0 && styles.btnDisabled]}
                    accessibilityRole="button"
                  >
                    <Text style={styles.primaryBtnText}>Tambah</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable onPress={startAdd} style={styles.addLink} accessibilityRole="button">
                <Text style={styles.addLinkText}>+ Tambah profil anak</Text>
              </Pressable>
            )}
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
            <View style={styles.progressLabels}>
              <Text style={styles.cardTitle}>Koleksi stiker</Text>
              <Text style={styles.progressValue}>
                {unlockedStickers}/{ALL_LESSONS.length}
              </Text>
            </View>
            <View style={styles.stickerGrid}>
              {ALL_LESSONS.map((lesson) => {
                const earned = child.completedLessons.includes(lesson.id);
                return (
                  <View key={lesson.id} style={[styles.stickerItem, !earned && styles.stickerLocked]}>
                    <View style={[styles.stickerBadge, earned ? styles.stickerBadgeEarned : styles.stickerBadgeLocked]}>
                      <ObjectShape kind={lesson.sticker.object} size={28} />
                    </View>
                    <Text style={styles.stickerItemName} numberOfLines={2}>
                      {lesson.sticker.name}
                    </Text>
                  </View>
                );
              })}
            </View>
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

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Atur ulang kemajuan</Text>
            <Text style={styles.small}>Menghapus bintang, stiker, dan level selesai milik {child.name}.</Text>
            {confirmReset ? (
              <View style={styles.formActions}>
                <Pressable onPress={() => setConfirmReset(false)} style={styles.secondaryBtn} accessibilityRole="button">
                  <Text style={styles.secondaryBtnText}>Batal</Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    await resetProgress();
                    setConfirmReset(false);
                  }}
                  style={styles.dangerBtn}
                  accessibilityRole="button"
                >
                  <Text style={styles.dangerBtnText}>Yakin reset?</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setConfirmReset(true)} style={styles.outlineDangerBtn} accessibilityRole="button">
                <Text style={styles.outlineDangerText}>Reset progres</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.privacy}>
            <Icon name="shield" size={22} color={colors.green} />
            <Text style={styles.privacyText}>
              Rekaman suara tidak disimpan. Data yang disimpan hanya nama panggilan, usia, dan kemajuan belajar.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Parents;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 20 },
  flex: { flex: 1 },
  gateScroll: { flexGrow: 1, gap: 14 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: spacing.xs },
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
  smallInput: {
    height: 46,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.line,
    paddingHorizontal: 14,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  warning: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.red },
  footer: { marginTop: "auto", paddingBottom: spacing.md },
  childHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: radius.full, backgroundColor: colors.orangeTint, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.display, fontSize: 22, color: colors.orangeDark },
  childText: { flex: 1 },
  childName: { fontFamily: fonts.bodyHeavy, fontSize: 18, color: colors.ink },
  childMeta: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkSoft },
  pillButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.blueTint },
  pillButtonText: { fontFamily: fonts.bodyHeavy, fontSize: 14, color: colors.blue },
  subForm: { gap: 10, padding: 12, borderRadius: 16, backgroundColor: colors.paper },
  subTitle: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.ink },
  ageRow: { flexDirection: "row", gap: 8 },
  agePill: { flex: 1, height: 38, borderRadius: 12, borderWidth: 2, borderColor: colors.line, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  agePillText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  formActions: { flexDirection: "row", gap: 10 },
  secondaryBtn: { flex: 1, height: 42, borderRadius: 12, borderWidth: 2, borderColor: colors.line, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  secondaryBtnText: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.inkBody },
  primaryBtn: { flex: 1, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.blue },
  primaryBtnText: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.white },
  btnDisabled: { opacity: 0.45 },
  switcher: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  switchChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.white },
  switchChipActive: { borderColor: colors.blue, backgroundColor: colors.blueTint },
  switchChipText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkBody },
  switchChipTextActive: { fontFamily: fonts.bodyHeavy, color: colors.blue },
  addLink: { alignSelf: "flex-start", paddingVertical: 4 },
  addLinkText: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.blue },
  progressRow: { gap: 6 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressName: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.ink },
  progressValue: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkSoft },
  track: { height: 12, borderRadius: 6 },
  fill: { height: 12, borderRadius: 6 },
  stickerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stickerItem: { width: "30.5%", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 14, backgroundColor: colors.paper },
  stickerLocked: { opacity: 0.35 },
  stickerBadge: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  stickerBadgeEarned: { backgroundColor: colors.orangeTint },
  stickerBadgeLocked: { backgroundColor: colors.line },
  stickerItemName: { fontFamily: fonts.bodyBold, fontSize: 12, textAlign: "center", color: colors.ink },
  limits: { flexDirection: "row", gap: 10 },
  limit: { flex: 1, height: 48, borderRadius: 14, borderWidth: 2, borderColor: colors.line, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  limitSelected: { backgroundColor: colors.blue, borderColor: colors.blue },
  limitText: { fontFamily: fonts.bodyHeavy, fontSize: 16, color: colors.ink },
  limitTextSelected: { color: colors.white },
  outlineDangerBtn: { height: 44, borderRadius: 12, borderWidth: 2, borderColor: colors.redTint, backgroundColor: colors.redTint, alignItems: "center", justifyContent: "center" },
  outlineDangerText: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.redDark },
  dangerBtn: { flex: 1, height: 42, borderRadius: 12, backgroundColor: colors.red, alignItems: "center", justifyContent: "center" },
  dangerBtnText: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.white },
  privacy: { flexDirection: "row", gap: 12, alignItems: "flex-start", padding: 16, borderRadius: 20, backgroundColor: colors.white },
  privacyText: { flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.inkBody },
});
