import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PLACES } from "@/lessons/catalog";
import { useProfile } from "@/profile/profile-context";
import { prepareAudio, speak } from "@/tutor/voice";
import { colors, radius, spacing, type } from "@/ui/theme";

const Island = () => {
  const { child } = useProfile();

  useEffect(() => {
    if (!child) return;
    prepareAudio().then(() =>
      speak([{ lang: "id", text: `Halo ${child.name}! Mau belajar di mana hari ini?` }]),
    );
  }, [child]);

  if (!child) return null;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Pulau Pintar</Text>
        <Text style={styles.stars} accessibilityLabel={`${child.stars} bintang`}>
          ⭐ {child.stars}
        </Text>
      </View>
      <View style={styles.places}>
        {PLACES.map((place) => (
          <Pressable
            key={place.subject}
            onPress={() => router.push({ pathname: "/lesson/[subject]", params: { subject: place.subject } })}
            style={[styles.place, { backgroundColor: place.color }]}
            accessibilityRole="button"
            accessibilityLabel={place.name}
          >
            <Text style={styles.placeEmoji}>{place.emoji}</Text>
            <Text style={styles.placeName}>{place.name}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
};

export default Island;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.sky, padding: spacing.lg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { ...type.title, color: colors.ink },
  stars: { ...type.body, color: colors.ink },
  places: { flex: 1, justifyContent: "center", gap: spacing.lg },
  place: {
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
  placeEmoji: { fontSize: 56 },
  placeName: { ...type.body, color: colors.white, fontSize: 24 },
});
