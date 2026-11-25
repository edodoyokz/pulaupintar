import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";
import type { Picture } from "@/lessons/catalog";
import { colors, fonts, spacing } from "./theme";

export type ObjectKind = "apple" | "star" | "fish" | "ball";

export const ObjectShape = ({ kind, size }: { kind: ObjectKind; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    {kind === "apple" && (
      <>
        <Path d="M24 14c-6-4-16-2-16 10 0 10 7 18 12 18 2 0 3-1 4-1s2 1 4 1c5 0 12-8 12-18 0-12-10-14-16-10z" fill="#E8483B" />
        <Path d="M24 14c0-4 2-7 5-8" stroke="#6B4A2B" strokeWidth={3} strokeLinecap="round" fill="none" />
        <Path d="M26 10c3-4 8-4 10-2-3 3-7 4-10 2z" fill="#3DBE7A" />
        <Ellipse cx={17} cy={22} rx={3} ry={5} fill="#FFFFFF" opacity={0.5} />
      </>
    )}
    {kind === "star" && (
      <Path
        d="M24 4l5.8 12 13.2 1.6-9.8 9 2.6 13L24 33l-11.8 6.6 2.6-13-9.8-9L18.2 16z"
        fill="#FFC83D"
        stroke="#C99700"
        strokeWidth={2}
        strokeLinejoin="round"
      />
    )}
    {kind === "fish" && (
      <>
        <Path d="M36 24l10-9v18z" fill="#F08A24" />
        <Ellipse cx={22} cy={24} rx={16} ry={11} fill="#4DA3E8" />
        <Circle cx={14} cy={21} r={2.6} fill="#1F2A44" />
        <Path d="M24 15c3 5 3 13 0 18" stroke="#2F7FC4" strokeWidth={2.4} fill="none" strokeLinecap="round" />
      </>
    )}
    {kind === "ball" && (
      <>
        <Circle cx={24} cy={24} r={18} fill="#3DBE7A" />
        <Path d="M8 20c10 4 22 4 32 0M8 30c10-4 22-4 32 0" stroke="#FFFFFF" strokeWidth={3} fill="none" strokeLinecap="round" />
        <Circle cx={24} cy={24} r={18} fill="none" stroke="#1E7A4C" strokeWidth={2} />
      </>
    )}
  </Svg>
);

const ObjectRow = ({ kind, count, size }: { kind: ObjectKind; count: number; size: number }) => (
  <View style={styles.group}>
    {Array.from({ length: count }, (_, index) => (
      <ObjectShape key={index} kind={kind} size={size} />
    ))}
  </View>
);

const sizeFor = (count: number) => (count <= 5 ? 68 : count <= 10 ? 50 : 34);

const Sign = ({ children }: { children: string }) => <Text style={styles.sign}>{children}</Text>;

export const PictureView = ({ picture }: { picture: Picture }) => {
  switch (picture.kind) {
    case "objects":
      return <ObjectRow kind={picture.object} count={picture.count} size={sizeFor(picture.count)} />;
    case "compare":
      return (
        <View style={styles.compare}>
          <ObjectRow kind={picture.object} count={picture.left} size={sizeFor(Math.max(picture.left, picture.right) * 2)} />
          <View style={styles.divider} />
          <ObjectRow kind={picture.object} count={picture.right} size={sizeFor(Math.max(picture.left, picture.right) * 2)} />
        </View>
      );
    case "sum":
      return (
        <View style={styles.sum}>
          <ObjectRow kind={picture.object} count={picture.a} size={44} />
          <Sign>+</Sign>
          <ObjectRow kind={picture.object} count={picture.b} size={44} />
        </View>
      );
    case "text":
      return <Text style={styles.bigText}>{picture.text}</Text>;
    case "swatch":
      return <View style={[styles.swatch, { backgroundColor: picture.color }]} />;
  }
};

const styles = StyleSheet.create({
  group: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 6, maxWidth: 300 },
  compare: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.md },
  divider: { width: 3, alignSelf: "stretch", borderRadius: 2, backgroundColor: "#F2C29B" },
  sum: { alignItems: "center", gap: spacing.sm },
  sign: { fontFamily: fonts.display, fontSize: 40, color: colors.ink },
  bigText: { fontFamily: fonts.display, fontSize: 140, lineHeight: 160, color: colors.ink },
  swatch: { width: 150, height: 150, borderRadius: 75, borderWidth: 4, borderColor: colors.ink },
});
