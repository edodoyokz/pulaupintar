import { useEffect, useId } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from "react-native-svg";

export type KakPintaMood = "talk" | "listen" | "think" | "happy";

type KakPintaProps = { size?: number; mood?: KakPintaMood; animated?: boolean };

const VIEWBOX = 220;
const CENTER = VIEWBOX / 2;

const INK = "#1F2A44";
const IRIS_HIGHLIGHT = "#32456E";
const BODY_STROKE = "#D8C9AA";
const WING_STROKE = "#D6C6A6";
const CREST_STROKE = "#D49200";
const BEAK_STROKE = "#3A4354";
const FOOT_FILL = "#F5B727";
const FOOT_STROKE = "#C98A00";

// Kak Pinta, the little yellow-crested cockatoo tutor.
export const KakPinta = ({ size = 160, mood = "talk", animated = false }: KakPintaProps) => {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const reducedMotion = useReducedMotion();

  const breath = useSharedValue(0);
  const hop = useSharedValue(0);
  const tilt = useSharedValue(0);
  const crest = useSharedValue(0);
  const wingL = useSharedValue(0);
  const wingR = useSharedValue(0);
  const jaw = useSharedValue(0);
  const blink = useSharedValue(0);
  const accent = useSharedValue(0);

  useEffect(() => {
    const all = [breath, hop, tilt, crest, wingL, wingR, jaw, blink, accent];
    const stopAll = () => {
      for (const value of all) cancelAnimation(value);
    };
    stopAll();

    if (reducedMotion) {
      breath.value = 0;
      hop.value = 0;
      blink.value = 0;
      const snap = { duration: 150, reduceMotion: ReduceMotion.System };
      if (mood === "listen") {
        tilt.value = withTiming(-6, snap);
        crest.value = withTiming(4, snap);
        wingL.value = withTiming(2, snap);
        wingR.value = withTiming(-2, snap);
        jaw.value = withTiming(0, snap);
        accent.value = withTiming(0.85, snap);
      } else if (mood === "think") {
        tilt.value = withTiming(4, snap);
        crest.value = withTiming(-3, snap);
        wingL.value = withTiming(2, snap);
        wingR.value = withTiming(-20, snap);
        jaw.value = withTiming(0, snap);
        accent.value = withTiming(0.85, snap);
      } else if (mood === "happy") {
        tilt.value = withTiming(0, snap);
        crest.value = withTiming(4, snap);
        wingL.value = withTiming(-10, snap);
        wingR.value = withTiming(10, snap);
        jaw.value = withTiming(0.65, snap);
        accent.value = withTiming(animated ? 0.9 : 0, snap);
      } else {
        tilt.value = withTiming(0, snap);
        crest.value = withTiming(0, snap);
        wingL.value = withTiming(0, snap);
        wingR.value = withTiming(0, snap);
        jaw.value = withTiming(0, snap);
        accent.value = withTiming(0, snap);
      }
      return stopAll;
    }

    breath.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true);

    if (mood !== "happy") {
      blink.value = 0;
      blink.value = withRepeat(
        withSequence(
          withDelay(3200, withTiming(1, { duration: 75, easing: Easing.out(Easing.quad) })),
          withTiming(0, { duration: 95, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      );
    } else {
      blink.value = 0;
    }

    if (mood === "talk" && animated) {
      jaw.value = withRepeat(
        withSequence(
          withTiming(0.95, { duration: 115, easing: Easing.out(Easing.quad) }),
          withTiming(0.25, { duration: 90 }),
          withTiming(0.75, { duration: 110 }),
          withTiming(0.1, { duration: 130 }),
          withTiming(0.9, { duration: 105 }),
          withTiming(0, { duration: 150, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      );
      hop.value = withRepeat(withTiming(0.26, { duration: 280, easing: Easing.inOut(Easing.sin) }), -1, true);
      tilt.value = withRepeat(
        withSequence(
          withTiming(-3.2, { duration: 420, easing: Easing.inOut(Easing.sin) }),
          withTiming(3.2, { duration: 420, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
      crest.value = withDelay(
        90,
        withRepeat(
          withSequence(
            withTiming(5, { duration: 320, easing: Easing.inOut(Easing.sin) }),
            withTiming(-3, { duration: 320, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
          true,
        ),
      );
      wingL.value = withRepeat(
        withSequence(
          withTiming(-11, { duration: 260, easing: Easing.inOut(Easing.sin) }),
          withTiming(3, { duration: 260, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
      wingR.value = withDelay(
        110,
        withRepeat(
          withSequence(
            withTiming(11, { duration: 260, easing: Easing.inOut(Easing.sin) }),
            withTiming(-3, { duration: 260, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
          true,
        ),
      );
      accent.value = withTiming(0, { duration: 150 });
    } else if (mood === "listen") {
      jaw.value = withTiming(0, { duration: 140 });
      hop.value = withSpring(0, { damping: 14, stiffness: 180 });
      tilt.value = withSpring(-7, { damping: 14, stiffness: 160 });
      crest.value = animated
        ? withRepeat(
            withSequence(
              withTiming(5, { duration: 900, easing: Easing.inOut(Easing.sin) }),
              withTiming(2, { duration: 900, easing: Easing.inOut(Easing.sin) }),
            ),
            -1,
            true,
          )
        : withSpring(4);
      wingL.value = withSpring(3, { damping: 15 });
      wingR.value = withSpring(-3, { damping: 15 });
      accent.value = animated
        ? withRepeat(withTiming(1, { duration: 750, easing: Easing.inOut(Easing.sin) }), -1, true)
        : withTiming(0.6, { duration: 200 });
    } else if (mood === "think") {
      jaw.value = withTiming(0, { duration: 140 });
      hop.value = withSpring(0, { damping: 14, stiffness: 180 });
      tilt.value = animated
        ? withRepeat(
            withSequence(
              withTiming(5.5, { duration: 950, easing: Easing.inOut(Easing.sin) }),
              withTiming(2.5, { duration: 950, easing: Easing.inOut(Easing.sin) }),
            ),
            -1,
            true,
          )
        : withSpring(4.5);
      crest.value = animated
        ? withRepeat(
            withSequence(
              withTiming(-4, { duration: 950, easing: Easing.inOut(Easing.sin) }),
              withTiming(1, { duration: 950, easing: Easing.inOut(Easing.sin) }),
            ),
            -1,
            true,
          )
        : withSpring(-2);
      wingL.value = withSpring(3, { damping: 15 });
      wingR.value = withSpring(-24, { damping: 13, stiffness: 150 });
      accent.value = animated
        ? withRepeat(withTiming(1, { duration: 850, easing: Easing.inOut(Easing.sin) }), -1, true)
        : withTiming(0.7, { duration: 200 });
    } else if (mood === "happy") {
      jaw.value = animated
        ? withRepeat(
            withSequence(
              withTiming(0.85, { duration: 240, easing: Easing.inOut(Easing.sin) }),
              withTiming(0.6, { duration: 240, easing: Easing.inOut(Easing.sin) }),
            ),
            -1,
            true,
          )
        : withTiming(0.65, { duration: 200 });
      hop.value = animated
        ? withRepeat(
            withSequence(
              withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) }),
              withTiming(0, { duration: 260, easing: Easing.in(Easing.quad) }),
            ),
            -1,
            false,
          )
        : withSpring(0);
      tilt.value = animated
        ? withRepeat(
            withSequence(
              withTiming(-4, { duration: 360, easing: Easing.inOut(Easing.sin) }),
              withTiming(4, { duration: 360, easing: Easing.inOut(Easing.sin) }),
            ),
            -1,
            true,
          )
        : withSpring(0);
      crest.value = animated
        ? withRepeat(
            withSequence(
              withTiming(7, { duration: 260, easing: Easing.inOut(Easing.sin) }),
              withTiming(-4, { duration: 260, easing: Easing.inOut(Easing.sin) }),
            ),
            -1,
            true,
          )
        : withSpring(4);
      wingL.value = animated
        ? withRepeat(
            withSequence(
              withTiming(-28, { duration: 220, easing: Easing.out(Easing.quad) }),
              withTiming(-6, { duration: 220, easing: Easing.in(Easing.quad) }),
            ),
            -1,
            false,
          )
        : withSpring(-10);
      wingR.value = animated
        ? withRepeat(
            withSequence(
              withTiming(28, { duration: 220, easing: Easing.out(Easing.quad) }),
              withTiming(6, { duration: 220, easing: Easing.in(Easing.quad) }),
            ),
            -1,
            false,
          )
        : withSpring(10);
      accent.value = animated
        ? withRepeat(withTiming(1, { duration: 550, easing: Easing.inOut(Easing.sin) }), -1, true)
        : withTiming(0, { duration: 150 });
    } else {
      jaw.value = withTiming(0, { duration: 140 });
      hop.value = withSpring(0, { damping: 14, stiffness: 180 });
      tilt.value = withSpring(0, { damping: 15 });
      crest.value = withRepeat(
        withSequence(
          withTiming(2.5, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
          withTiming(-1.5, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
      wingL.value = withRepeat(
        withSequence(
          withTiming(-3, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
      wingR.value = withRepeat(
        withSequence(
          withTiming(3, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
          withTiming(-1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
      accent.value = withTiming(0, { duration: 150 });
    }

    return stopAll;
  }, [animated, mood, reducedMotion, breath, hop, tilt, crest, wingL, wingR, jaw, blink, accent]);

  const unit = size / VIEWBOX;

  const shadowStyle = useAnimatedStyle(() => ({
    opacity: 1 - hop.value * 0.35,
    transform: [{ scaleX: 1 - hop.value * 0.2 }, { scaleY: 1 - hop.value * 0.14 }],
  }));

  const feetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -hop.value * 9 * unit }],
  }));

  const bodyStyle = useAnimatedStyle(() => {
    const oy = (176 - CENTER) * unit;
    return {
      transform: [
        { translateY: -hop.value * 11 * unit },
        { translateY: oy },
        { rotate: `${tilt.value}deg` },
        { scaleX: 1 - breath.value * 0.012 },
        { scaleY: 1 + breath.value * 0.024 },
        { translateY: -oy },
      ],
    };
  });

  const crestStyle = useAnimatedStyle(() => {
    const oy = (62 - CENTER) * unit;
    return {
      transform: [{ translateY: oy }, { rotate: `${crest.value}deg` }, { translateY: -oy }],
    };
  });

  const leftWingStyle = useAnimatedStyle(() => {
    const ox = (48 - CENTER) * unit;
    const oy = (128 - CENTER) * unit;
    return {
      transform: [{ translateX: ox }, { translateY: oy }, { rotate: `${wingL.value}deg` }, { translateX: -ox }, { translateY: -oy }],
    };
  });

  const rightWingStyle = useAnimatedStyle(() => {
    const ox = (172 - CENTER) * unit;
    const oy = (128 - CENTER) * unit;
    return {
      transform: [{ translateX: ox }, { translateY: oy }, { rotate: `${wingR.value}deg` }, { translateX: -ox }, { translateY: -oy }],
    };
  });

  const blinkStyle = useAnimatedStyle(() => {
    const oy = (95 - CENTER) * unit;
    return {
      opacity: blink.value > 0.15 ? 1 : 0,
      transform: [{ translateY: oy }, { scaleY: Math.max(0.05, blink.value) }, { translateY: -oy }],
    };
  });

  const mouthStyle = useAnimatedStyle(() => {
    const oy = (121 - CENTER) * unit;
    return {
      opacity: jaw.value > 0.06 ? Math.min(1, jaw.value * 1.4) : 0,
      transform: [{ translateY: oy }, { scaleY: 0.2 + jaw.value * 0.85 }, { translateY: -oy }],
    };
  });

  const lowerBeakStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: jaw.value * 7 * unit }],
  }));

  const accentStyle = useAnimatedStyle(() => ({
    opacity: accent.value > 0.02 ? 0.35 + accent.value * 0.65 : 0,
    transform: [{ translateY: -accent.value * 3 * unit }, { scale: 0.92 + accent.value * 0.1 }],
  }));

  const bodyGradId = `body-${uid}`;
  const crestGradId = `crest-${uid}`;
  const wingLGradId = `wingL-${uid}`;
  const wingRGradId = `wingR-${uid}`;
  const beakGradId = `beak-${uid}`;

  const happy = mood === "happy";
  const listening = mood === "listen";
  const thinking = mood === "think";

  const eyeShiftX = thinking ? 2.5 : 0;
  const eyeShiftY = thinking ? -2.5 : 0;
  const eyeRx = listening ? 13.6 : 13;
  const eyeRy = listening ? 14.6 : 14;

  return (
    <View style={[styles.root, { width: size, height: size }]} accessible accessibilityRole="image" accessibilityLabel="Kak Pinta, si kakatua kecil">
      <Animated.View style={[StyleSheet.absoluteFill, shadowStyle]}>
        <Svg width={size} height={size} viewBox="0 0 220 220" accessibilityElementsHidden importantForAccessibility="no">
          <Ellipse cx={110} cy={205} rx={52} ry={8.5} fill={INK} opacity={0.11} />
          <Ellipse cx={110} cy={205} rx={33} ry={4.8} fill={INK} opacity={0.07} />
        </Svg>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, feetStyle]}>
        <Svg width={size} height={size} viewBox="0 0 220 220" accessibilityElementsHidden importantForAccessibility="no">
          <Path
            d="M84 184 L84 192 C78 193 73 196 74 200 C75 203 80 203 84 200 C85 204 91 204 92 200 C96 203 101 203 102 200 C103 196 98 193 92 192 L92 184 Z"
            fill={FOOT_FILL}
            stroke={FOOT_STROKE}
            strokeWidth={2.2}
            strokeLinejoin="round"
          />
          <Circle cx={78} cy={198} r={1.4} fill="#FFE38A" />
          <Circle cx={88} cy={199} r={1.5} fill="#FFE38A" />
          <Circle cx={98} cy={198} r={1.4} fill="#FFE38A" />

          <Path
            d="M128 184 L128 192 C122 193 117 196 118 200 C119 203 124 203 128 200 C129 204 135 204 136 200 C140 203 145 203 146 200 C147 196 142 193 136 192 L136 184 Z"
            fill={FOOT_FILL}
            stroke={FOOT_STROKE}
            strokeWidth={2.2}
            strokeLinejoin="round"
          />
          <Circle cx={122} cy={198} r={1.4} fill="#FFE38A" />
          <Circle cx={132} cy={199} r={1.5} fill="#FFE38A" />
          <Circle cx={142} cy={198} r={1.4} fill="#FFE38A" />
        </Svg>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, bodyStyle]}>
        <Animated.View style={[StyleSheet.absoluteFill, crestStyle]}>
          <Svg width={size} height={size} viewBox="0 0 220 220" accessibilityElementsHidden importantForAccessibility="no">
            <Defs>
              <LinearGradient id={crestGradId} x1="0%" y1="0%" x2="15%" y2="100%">
                <Stop offset="0%" stopColor="#FFE885" />
                <Stop offset="55%" stopColor="#FFC83D" />
                <Stop offset="100%" stopColor="#F2AC18" />
              </LinearGradient>
            </Defs>
            <Path
              d="M95 66 C78 44 74 28 84 26 C92 25 97 44 101 64 Z"
              fill={`url(#${crestGradId})`}
              stroke={CREST_STROKE}
              strokeWidth={2.2}
              strokeLinejoin="round"
            />
            <Path
              d="M103 63 C95 32 101 14 112 16 C121 18 117 42 110 63 Z"
              fill={`url(#${crestGradId})`}
              stroke={CREST_STROKE}
              strokeWidth={2.2}
              strokeLinejoin="round"
            />
            <Path
              d="M111 64 C113 38 124 22 134 27 C141 31 129 48 117 65 Z"
              fill={`url(#${crestGradId})`}
              stroke={CREST_STROKE}
              strokeWidth={2.2}
              strokeLinejoin="round"
            />
            <Path
              d="M117 67 C126 48 140 39 146 46 C150 51 136 60 122 68 Z"
              fill={`url(#${crestGradId})`}
              stroke={CREST_STROKE}
              strokeWidth={2.2}
              strokeLinejoin="round"
            />
            <Path d="M85 33 C89 41 92 50 94 58" stroke="#FFF5B8" strokeWidth={2} strokeLinecap="round" opacity={0.75} fill="none" />
            <Path d="M108 22 C108 34 107 46 106 57" stroke="#FFF5B8" strokeWidth={2.2} strokeLinecap="round" opacity={0.75} fill="none" />
            <Path d="M128 32 C125 41 121 50 116 58" stroke="#FFF5B8" strokeWidth={1.8} strokeLinecap="round" opacity={0.75} fill="none" />
          </Svg>
        </Animated.View>

        <Svg width={size} height={size} viewBox="0 0 220 220" accessibilityElementsHidden importantForAccessibility="no">
          <Defs>
            <RadialGradient id={bodyGradId} cx="42%" cy="32%" r="65%">
              <Stop offset="0%" stopColor="#FFFFFF" />
              <Stop offset="62%" stopColor="#FFFDF5" />
              <Stop offset="100%" stopColor="#F3E7CE" />
            </RadialGradient>
          </Defs>

          <Path
            d="M72 170 C62 182 64 191 74 191 C82 191 88 184 91 178 Z"
            fill="#EFE3C8"
            stroke="#D4C29E"
            strokeWidth={2.2}
            strokeLinejoin="round"
          />
          <Path
            d="M148 170 C158 182 156 191 146 191 C138 191 132 184 129 178 Z"
            fill="#EFE3C8"
            stroke="#D4C29E"
            strokeWidth={2.2}
            strokeLinejoin="round"
          />

          <Path
            d="M110 58 C144 58 168 78 172 108 C176 130 176 154 164 171 C152 186 132 190 110 190 C88 190 68 186 56 171 C44 154 44 130 48 108 C52 78 76 58 110 58 Z"
            fill={`url(#${bodyGradId})`}
            stroke={BODY_STROKE}
            strokeWidth={2.8}
          />

          <Ellipse cx={88} cy={74} rx={24} ry={9} fill="#FFFFFF" opacity={0.58} />
          <Path d="M62 169 C78 186 142 186 158 169 C144 180 76 180 62 169 Z" fill="#E6D5B4" opacity={0.38} />

          <Ellipse cx={110} cy={157} rx={41} ry={27} fill="#FFF4D9" />
          <Path
            d="M91 149 Q97 154 103 149 M107 154 Q113 159 119 154 M118 147 Q124 152 130 147"
            stroke="#E7D5B0"
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
          />

          <Ellipse cx={65} cy={126} rx={happy ? 14 : 12.5} ry={happy ? 10 : 9} fill="#FFAD9B" opacity={happy ? 0.85 : 0.72} />
          <Ellipse cx={155} cy={126} rx={happy ? 14 : 12.5} ry={happy ? 10 : 9} fill="#FFAD9B" opacity={happy ? 0.85 : 0.72} />
          <Ellipse cx={64} cy={124} rx={6} ry={4} fill="#FFC8BA" opacity={0.7} />
          <Ellipse cx={154} cy={124} rx={6} ry={4} fill="#FFC8BA" opacity={0.7} />

          {happy ? (
            <G>
              <Path d="M69 111 Q82 94 95 111" stroke={INK} strokeWidth={5.2} strokeLinecap="round" fill="none" />
              <Path d="M125 111 Q138 94 151 111" stroke={INK} strokeWidth={5.2} strokeLinecap="round" fill="none" />
              <Path d="M65 112 L61 110 M155 112 L159 110" stroke={INK} strokeWidth={2.4} strokeLinecap="round" opacity={0.45} />
            </G>
          ) : (
            <G>
              {listening && (
                <>
                  <Path d="M71 89 Q82 84 92 89" stroke="#8C97AD" strokeWidth={2.4} strokeLinecap="round" fill="none" />
                  <Path d="M128 89 Q138 84 149 89" stroke="#8C97AD" strokeWidth={2.4} strokeLinecap="round" fill="none" />
                </>
              )}
              {thinking && (
                <>
                  <Path d="M72 91 Q82 89 91 91" stroke="#8C97AD" strokeWidth={2.3} strokeLinecap="round" fill="none" />
                  <Path d="M127 87 Q138 80 150 86" stroke="#8C97AD" strokeWidth={2.5} strokeLinecap="round" fill="none" />
                </>
              )}

              <Ellipse cx={82} cy={108} rx={eyeRx} ry={eyeRy} fill={INK} />
              <Ellipse cx={138} cy={108} rx={eyeRx} ry={eyeRy} fill={INK} />

              <Path d="M73 114 Q82 120 91 114" stroke={IRIS_HIGHLIGHT} strokeWidth={3.2} strokeLinecap="round" fill="none" opacity={0.65} />
              <Path d="M129 114 Q138 120 147 114" stroke={IRIS_HIGHLIGHT} strokeWidth={3.2} strokeLinecap="round" fill="none" opacity={0.65} />

              <Circle cx={86 + eyeShiftX} cy={102 + eyeShiftY} r={4.6} fill="#FFFFFF" />
              <Circle cx={142 + eyeShiftX} cy={102 + eyeShiftY} r={4.6} fill="#FFFFFF" />
              <Circle cx={77 + eyeShiftX} cy={113 + eyeShiftY} r={2} fill="#FFFFFF" opacity={0.85} />
              <Circle cx={133 + eyeShiftX} cy={113 + eyeShiftY} r={2} fill="#FFFFFF" opacity={0.85} />
            </G>
          )}
        </Svg>

        {!happy && (
          <Animated.View style={[StyleSheet.absoluteFill, blinkStyle]}>
            <Svg width={size} height={size} viewBox="0 0 220 220" accessibilityElementsHidden importantForAccessibility="no">
              <Ellipse cx={82} cy={108} rx={14.5} ry={15} fill="#FFFBF0" />
              <Ellipse cx={138} cy={108} rx={14.5} ry={15} fill="#FFFBF0" />
              <Path d="M69 109 Q82 117 95 109" stroke={INK} strokeWidth={3.2} strokeLinecap="round" fill="none" />
              <Path d="M125 109 Q138 117 151 109" stroke={INK} strokeWidth={3.2} strokeLinecap="round" fill="none" />
            </Svg>
          </Animated.View>
        )}

        <Animated.View style={[StyleSheet.absoluteFill, mouthStyle]}>
          <Svg width={size} height={size} viewBox="0 0 220 220" accessibilityElementsHidden importantForAccessibility="no">
            <Ellipse cx={110} cy={124} rx={10.5} ry={7.5} fill="#B8443A" />
            <Ellipse cx={110} cy={126.5} rx={7} ry={4.2} fill="#F07B6E" />
            <Ellipse cx={108.5} cy={125.2} rx={3} ry={1.5} fill="#F9A89E" opacity={0.8} />
          </Svg>
        </Animated.View>

        <Animated.View style={[StyleSheet.absoluteFill, lowerBeakStyle]}>
          <Svg width={size} height={size} viewBox="0 0 220 220" accessibilityElementsHidden importantForAccessibility="no">
            <Path
              d="M99 121 L121 121 C120 132 115 137 110 137 C105 137 100 132 99 121 Z"
              fill="#4C566A"
              stroke={BEAK_STROKE}
              strokeWidth={2}
              strokeLinejoin="round"
            />
          </Svg>
        </Animated.View>

        <Svg width={size} height={size} viewBox="0 0 220 220" accessibilityElementsHidden importantForAccessibility="no">
          <Defs>
            <LinearGradient id={beakGradId} x1="20%" y1="0%" x2="80%" y2="100%">
              <Stop offset="0%" stopColor="#76829A" />
              <Stop offset="55%" stopColor="#556075" />
              <Stop offset="100%" stopColor="#454F62" />
            </LinearGradient>
          </Defs>
          <Path
            d="M93 116 C95 106 125 106 127 116 C127 121 119 122 115 123 C112 126 111 129 110 130 C109 129 108 126 105 123 C101 122 93 121 93 116 Z"
            fill={`url(#${beakGradId})`}
            stroke={BEAK_STROKE}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <Path d="M101 113 Q110 109 119 113" stroke="#A8B5CC" strokeWidth={2.2} strokeLinecap="round" fill="none" opacity={0.55} />
          <Circle cx={104} cy={115} r={1.3} fill={BEAK_STROKE} opacity={0.7} />
          <Circle cx={116} cy={115} r={1.3} fill={BEAK_STROKE} opacity={0.7} />
        </Svg>

        <Animated.View style={[StyleSheet.absoluteFill, leftWingStyle]}>
          <Svg width={size} height={size} viewBox="0 0 220 220" accessibilityElementsHidden importantForAccessibility="no">
            <Defs>
              <LinearGradient id={wingLGradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#FAF2E1" />
                <Stop offset="100%" stopColor="#EBE0C5" />
              </LinearGradient>
            </Defs>
            <Path
              d="M52 116 C35 120 29 144 37 161 C40 167 46 164 49 160 C52 164 58 161 59 154 C62 140 59 122 52 116 Z"
              fill={`url(#${wingLGradId})`}
              stroke={WING_STROKE}
              strokeWidth={2.6}
              strokeLinejoin="round"
            />
            <Path d="M48 128 C41 136 40 146 43 154" stroke="#E0D2B4" strokeWidth={2} strokeLinecap="round" fill="none" />
          </Svg>
        </Animated.View>

        <Animated.View style={[StyleSheet.absoluteFill, rightWingStyle]}>
          <Svg width={size} height={size} viewBox="0 0 220 220" accessibilityElementsHidden importantForAccessibility="no">
            <Defs>
              <LinearGradient id={wingRGradId} x1="100%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#FAF2E1" />
                <Stop offset="100%" stopColor="#EBE0C5" />
              </LinearGradient>
            </Defs>
            <Path
              d="M168 116 C185 120 191 144 183 161 C180 167 174 164 171 160 C168 164 162 161 161 154 C158 140 161 122 168 116 Z"
              fill={`url(#${wingRGradId})`}
              stroke={WING_STROKE}
              strokeWidth={2.6}
              strokeLinejoin="round"
            />
            <Path d="M172 128 C179 136 180 146 177 154" stroke="#E0D2B4" strokeWidth={2} strokeLinecap="round" fill="none" />
          </Svg>
        </Animated.View>

        {(listening || thinking || (happy && animated)) && (
          <Animated.View style={[StyleSheet.absoluteFill, accentStyle]}>
            <Svg width={size} height={size} viewBox="0 0 220 220" accessibilityElementsHidden importantForAccessibility="no">
              {listening && (
                <G>
                  <Path d="M40 72 Q33 81 37 91" stroke="#2E73D8" strokeWidth={3} strokeLinecap="round" fill="none" />
                  <Path d="M32 64 Q21 79 27 95" stroke="#2E73D8" strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.7} />
                </G>
              )}
              {thinking && (
                <G>
                  <Circle cx={167} cy={67} r={3.5} fill="#F2B01E" />
                  <Circle cx={176} cy={56} r={4.8} fill="#F2B01E" />
                  <Circle cx={187} cy={43} r={6.2} fill="#F2B01E" />
                </G>
              )}
              {happy && animated && (
                <G>
                  <Path
                    d="M44 42 L47 50 L55 53 L47 56 L44 64 L41 56 L33 53 L41 50 Z"
                    fill="#FFC83D"
                    stroke="#E5A800"
                    strokeWidth={1.2}
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M177 45 L179 51 L185 53 L179 55 L177 61 L175 55 L169 53 L175 51 Z"
                    fill="#FF8A5B"
                    stroke="#D9601A"
                    strokeWidth={1.2}
                    strokeLinejoin="round"
                  />
                </G>
              )}
            </Svg>
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { position: "relative" },
});
