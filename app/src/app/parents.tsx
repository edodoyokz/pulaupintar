import { Redirect } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ALL_LESSONS, completedCount, LEVELS_PER_SUBJECT, PLACES } from "@/lessons/catalog";
import { useProfile } from "@/profile/profile-context";
import { Icon } from "@/ui/icons";
import { ObjectShape } from "@/ui/picture";
import { BackButton, BigButton } from "@/ui/primitives";
import { colors, fonts, layout, radius, spacing, type } from "@/ui/theme";

const LIMITS = [10, 15, 20];
const AGES = [4, 5, 6, 7];

// A two-digit sum with a carry, too hard for a 6-7 year old, still typed on a number pad. The sum stays below 100.
const makeGate = () => {
  const randomInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
  const unitsA = randomInt(2, 9);
  const unitsB = randomInt(10 - unitsA, 9);
  const a = randomInt(1, 4) * 10 + unitsA;
  const b = randomInt(1, 4) * 10 + unitsB;
  return { question: `Berapa ${a} + ${b}?`, answer: String(a + b) };
};

const formatUsedToday = (seconds: number): string => {
  if (seconds <= 0) return "0 menit";
  if (seconds < 60) return "< 1 menit";
  return `${Math.round(seconds / 60)} menit`;
};

const Parents = () => {
  const {
    child,
    children,
    dailyLimitMinutes,
    usedTodaySeconds,
    setDailyLimit,
    updateChild,
    addChild,
    removeChild,
    switchChild,
    resetProgress,
  } = useProfile();
  const [gate] = useState(makeGate);
  const [typed, setTyped] = useState("");
  const [wrong, setWrong] = useState(false);
  const [open, setOpen] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAge, setEditAge] = useState(5);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAge, setNewAge] = useState(5);

  const [confirmReset, setConfirmReset] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  if (!child) return <Redirect href="/onboarding" />;

  const tryUnlock = () => (typed.trim() === gate.answer ? setOpen(true) : setWrong(true));

  if (!open) {
    return (
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView contentContainerStyle={styles.gateScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.inner}>
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
                  returnKeyType="done"
                  onSubmitEditing={tryUnlock}
                  style={styles.input}
                  maxLength={2}
                  accessibilityLabel={gate.question}
                />
                {wrong && (
                  <Text style={styles.warning} accessibilityLiveRegion="polite">
                    Belum tepat, coba lagi.
                  </Text>
                )}
              </View>
              <View style={styles.footer}>
                <BigButton label="Masuk" color={colors.blue} shadow={colors.blueDark} onPress={tryUnlock} />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  const startEdit = () => {
    setEditName(child.name);
    setEditAge(child.age);
    setConfirmDelete(false);
    setEditing(true);
    setAdding(false);
    setNotice("");
  };

  const saveEdit = async () => {
    const trimmed = editName.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await updateChild(trimmed, editAge);
      setEditing(false);
      setConfirmDelete(false);
      setNotice("Perubahan tersimpan.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChild = async () => {
    if (saving || children.length <= 1) return;
    setSaving(true);
    try {
      await removeChild(child.id);
      setEditing(false);
      setConfirmDelete(false);
      setNotice("Profil dihapus.");
    } finally {
      setSaving(false);
    }
  };

  const startAdd = () => {
    setNewName("");
    setNewAge(5);
    setAdding(true);
    setEditing(false);
    setConfirmDelete(false);
    setNotice("");
  };

  const saveAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await addChild(trimmed, newAge);
      setAdding(false);
      setNotice("Profil baru ditambahkan.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await resetProgress();
      setConfirmReset(false);
      setNotice("Progres berhasil diatur ulang.");
    } finally {
      setSaving(false);
    }
  };

  const unlockedStickers = child.completedLessons.length;

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.headerWrap}>
          <View style={styles.header}>
            <BackButton />
            <Text style={styles.title}>Area orang tua</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.inner}>
            {notice !== "" && (
              <View style={styles.noticeBanner} accessibilityLiveRegion="polite">
                <Icon name="check" size={18} color={colors.greenDark} />
                <Text style={styles.noticeText}>{notice}</Text>
              </View>
            )}

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
                <Pressable
                  onPress={startEdit}
                  style={({ pressed }) => [styles.pillButton, Platform.OS === "web" && styles.pointer, pressed && styles.pressedSoft]}
                  accessibilityRole="button"
                >
                  <Text style={styles.pillButtonText}>Ubah</Text>
                </Pressable>
              </View>

              {editing && (
                <View style={styles.subForm}>
                  <TextInput
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Nama panggilan"
                    placeholderTextColor={colors.placeholder}
                    style={styles.smallInput}
                    maxLength={20}
                    returnKeyType="done"
                    accessibilityLabel="Nama panggilan anak"
                  />
                  <View style={styles.ageRow}>
                    {AGES.map((option) => (
                      <Pressable
                        key={option}
                        onPress={() => setEditAge(option)}
                        style={({ pressed }) => [
                          styles.agePill,
                          editAge === option && styles.limitSelected,
                          Platform.OS === "web" && styles.pointer,
                          pressed && styles.pressedSoft,
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: editAge === option }}
                      >
                        <Text style={[styles.agePillText, editAge === option && styles.limitTextSelected]}>{option} thn</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.formActions}>
                    <Pressable
                      onPress={() => {
                        setEditing(false);
                        setConfirmDelete(false);
                      }}
                      style={({ pressed }) => [styles.secondaryBtn, Platform.OS === "web" && styles.pointer, pressed && styles.pressedSoft]}
                      accessibilityRole="button"
                    >
                      <Text style={styles.secondaryBtnText}>Batal</Text>
                    </Pressable>
                    <Pressable
                      onPress={saveEdit}
                      disabled={editName.trim().length === 0 || saving}
                      style={({ pressed }) => [
                        styles.primaryBtn,
                        (editName.trim().length === 0 || saving) && styles.btnDisabled,
                        Platform.OS === "web" && styles.pointer,
                        pressed && editName.trim().length > 0 && !saving && styles.pressedSoft,
                      ]}
                      accessibilityRole="button"
                    >
                      <Text style={styles.primaryBtnText}>Simpan</Text>
                    </Pressable>
                  </View>
                  {children.length > 1 && (
                    confirmDelete ? (
                      <View style={styles.formActions}>
                        <Pressable
                          onPress={() => setConfirmDelete(false)}
                          style={({ pressed }) => [styles.secondaryBtn, Platform.OS === "web" && styles.pointer, pressed && styles.pressedSoft]}
                          accessibilityRole="button"
                        >
                          <Text style={styles.secondaryBtnText}>Batal hapus</Text>
                        </Pressable>
                        <Pressable
                          onPress={handleDeleteChild}
                          disabled={saving}
                          style={({ pressed }) => [styles.dangerBtn, saving && styles.btnDisabled, Platform.OS === "web" && styles.pointer, pressed && !saving && styles.pressedSoft]}
                          accessibilityRole="button"
                        >
                          <Text style={styles.dangerBtnText}>Yakin hapus {child.name}?</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => setConfirmDelete(true)}
                        style={({ pressed }) => [styles.deleteLink, Platform.OS === "web" && styles.pointer, pressed && styles.pressedSoft]}
                        accessibilityRole="button"
                      >
                        <Text style={styles.deleteLinkText}>Hapus profil anak</Text>
                      </Pressable>
                    )
                  )}
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
                          setConfirmDelete(false);
                          setConfirmReset(false);
                          setNotice("");
                          void switchChild(candidate.id);
                        }}
                        style={({ pressed }) => [
                          styles.switchChip,
                          active && styles.switchChipActive,
                          Platform.OS === "web" && styles.pointer,
                          pressed && styles.pressedSoft,
                        ]}
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
                    placeholderTextColor={colors.placeholder}
                    style={styles.smallInput}
                    maxLength={20}
                    returnKeyType="done"
                    accessibilityLabel="Nama panggilan anak baru"
                  />
                  <View style={styles.ageRow}>
                    {AGES.map((option) => (
                      <Pressable
                        key={option}
                        onPress={() => setNewAge(option)}
                        style={({ pressed }) => [
                          styles.agePill,
                          newAge === option && styles.limitSelected,
                          Platform.OS === "web" && styles.pointer,
                          pressed && styles.pressedSoft,
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: newAge === option }}
                      >
                        <Text style={[styles.agePillText, newAge === option && styles.limitTextSelected]}>{option} thn</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.formActions}>
                    <Pressable
                      onPress={() => setAdding(false)}
                      style={({ pressed }) => [styles.secondaryBtn, Platform.OS === "web" && styles.pointer, pressed && styles.pressedSoft]}
                      accessibilityRole="button"
                    >
                      <Text style={styles.secondaryBtnText}>Batal</Text>
                    </Pressable>
                    <Pressable
                      onPress={saveAdd}
                      disabled={newName.trim().length === 0 || saving}
                      style={({ pressed }) => [
                        styles.primaryBtn,
                        (newName.trim().length === 0 || saving) && styles.btnDisabled,
                        Platform.OS === "web" && styles.pointer,
                        pressed && newName.trim().length > 0 && !saving && styles.pressedSoft,
                      ]}
                      accessibilityRole="button"
                    >
                      <Text style={styles.primaryBtnText}>Tambah</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={startAdd}
                  style={({ pressed }) => [styles.addLink, Platform.OS === "web" && styles.pointer, pressed && styles.pressedSoft]}
                  accessibilityRole="button"
                >
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
                        {done >= LEVELS_PER_SUBJECT
                          ? `Semua ${LEVELS_PER_SUBJECT} level selesai`
                          : `${done} dari ${LEVELS_PER_SUBJECT} level selesai`}
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
              <Text style={styles.usageSummary}>
                Terpakai hari ini: {formatUsedToday(usedTodaySeconds)} dari {dailyLimitMinutes} menit
              </Text>
              <View style={styles.limits}>
                {LIMITS.map((minutes) => {
                  const selected = dailyLimitMinutes === minutes;
                  return (
                    <Pressable
                      key={minutes}
                      onPress={() => setDailyLimit(minutes)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={({ pressed }) => [
                        styles.limit,
                        selected && styles.limitSelected,
                        Platform.OS === "web" && styles.pointer,
                        pressed && styles.pressedSoft,
                      ]}
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
              <Text style={styles.small}>
                Menghapus bintang, stiker, dan level selesai milik {child.name}. Waktu belajar hari ini tidak ikut diatur ulang.
              </Text>
              {confirmReset ? (
                <View style={styles.formActions}>
                  <Pressable
                    onPress={() => setConfirmReset(false)}
                    style={({ pressed }) => [styles.secondaryBtn, Platform.OS === "web" && styles.pointer, pressed && styles.pressedSoft]}
                    accessibilityRole="button"
                  >
                    <Text style={styles.secondaryBtnText}>Batal</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleReset}
                    disabled={saving}
                    style={({ pressed }) => [styles.dangerBtn, saving && styles.btnDisabled, Platform.OS === "web" && styles.pointer, pressed && !saving && styles.pressedSoft]}
                    accessibilityRole="button"
                  >
                    <Text style={styles.dangerBtnText}>Yakin reset?</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => setConfirmReset(true)}
                  style={({ pressed }) => [styles.outlineDangerBtn, Platform.OS === "web" && styles.pointer, pressed && styles.pressedSoft]}
                  accessibilityRole="button"
                >
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
  gateScroll: { flexGrow: 1 },
  headerWrap: { maxWidth: layout.maxWidth, width: "100%", alignSelf: "center" },
  inner: { flexGrow: 1, maxWidth: layout.maxWidth, width: "100%", alignSelf: "center", gap: 14 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: spacing.xs },
  title: { ...type.title, fontSize: 26, color: colors.ink },
  content: { paddingBottom: spacing.lg },
  noticeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.greenTint,
  },
  noticeText: { fontFamily: fonts.bodyHeavy, fontSize: 14, color: colors.greenDark },
  card: { gap: 12, padding: 16, borderRadius: 20, backgroundColor: colors.white },
  cardTitle: { fontFamily: fonts.bodyHeavy, fontSize: 17, color: colors.ink },
  body: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.inkBody },
  small: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.inkSoft },
  usageSummary: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.inkBody },
  input: {
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.borderControl,
    paddingHorizontal: 16,
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.ink,
  },
  smallInput: {
    height: 46,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.borderControl,
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
  pillButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    backgroundColor: colors.blueTint,
    justifyContent: "center",
    alignItems: "center",
  },
  pillButtonText: { fontFamily: fonts.bodyHeavy, fontSize: 14, color: colors.blue },
  subForm: { gap: 10, padding: 12, borderRadius: 16, backgroundColor: colors.paper },
  subTitle: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.ink },
  ageRow: { flexDirection: "row", gap: 8 },
  agePill: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.borderControl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  agePillText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  formActions: { flexDirection: "row", gap: 10 },
  secondaryBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.borderControl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    paddingHorizontal: 10,
  },
  secondaryBtnText: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.inkBody },
  primaryBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.blue,
    paddingHorizontal: 10,
  },
  primaryBtnText: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.white },
  btnDisabled: { opacity: 0.45 },
  deleteLink: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  deleteLinkText: { fontFamily: fonts.bodyHeavy, fontSize: 14, color: colors.redDark },
  switcher: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  switchChip: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.borderControl,
    backgroundColor: colors.white,
    justifyContent: "center",
  },
  switchChipActive: { borderColor: colors.blue, backgroundColor: colors.blueTint },
  switchChipText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkBody },
  switchChipTextActive: { fontFamily: fonts.bodyHeavy, color: colors.blue },
  addLink: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center", paddingHorizontal: 4 },
  addLinkText: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.blue },
  progressRow: { gap: 6 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressName: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.ink },
  progressValue: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkSoft },
  track: { height: 12, borderRadius: 6 },
  fill: { height: 12, borderRadius: 6 },
  stickerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stickerItem: {
    flexBasis: "30%",
    flexGrow: 1,
    maxWidth: "33%",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 14,
    backgroundColor: colors.paper,
  },
  stickerLocked: { opacity: 0.45 },
  stickerBadge: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  stickerBadgeEarned: { backgroundColor: colors.orangeTint },
  stickerBadgeLocked: { backgroundColor: colors.line },
  stickerItemName: { fontFamily: fonts.bodyBold, fontSize: 12, textAlign: "center", color: colors.ink },
  limits: { flexDirection: "row", gap: 10 },
  limit: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.borderControl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  limitSelected: { backgroundColor: colors.blue, borderColor: colors.blue },
  limitText: { fontFamily: fonts.bodyHeavy, fontSize: 16, color: colors.ink },
  limitTextSelected: { color: colors.white },
  outlineDangerBtn: {
    minHeight: 44,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.redDark,
    backgroundColor: colors.redTint,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineDangerText: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.redDark },
  dangerBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  dangerBtnText: { fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.white },
  privacy: { flexDirection: "row", gap: 12, alignItems: "flex-start", padding: 16, borderRadius: 20, backgroundColor: colors.white },
  privacyText: { flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.inkBody },
  pressedSoft: { opacity: 0.84, transform: [{ scale: 0.98 }] },
  pointer: { cursor: "pointer" },
});
