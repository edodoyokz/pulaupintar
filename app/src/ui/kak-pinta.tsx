import { useEffect } from "react";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";

export type KakPintaMood = "talk" | "listen" | "happy";

type KakPintaProps = { size?: number; mood?: KakPintaMood; animated?: boolean };

const INK = "#1F2A44";
const BEAK = "#5C6577";

// Kak Pinta, the little cockatoo tutor. Same drawing as the design canvas.
export const KakPinta = ({ size = 160, mood = "talk", animated = false }: KakPintaProps) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (animated && mood === "talk") {
      scale.value = withRepeat(withTiming(1.06, { duration: 280 }), -1, true);
    } else {
      cancelAnimation(scale);
      scale.value = withSpring(1);
    }
  }, [animated, mood, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const listening = mood === "listen";
  const happy = mood === "happy";

  return (
    <Animated.View style={style}>
      <Svg width={size} height={size} viewBox="0 0 200 200" accessibilityLabel="Kak Pinta, si kakatua kecil">
        <G rotation={listening ? -8 : 0} origin="100, 120">
          <Path d="M86 52 C70 22 78 8 92 14 C96 30 96 42 94 52 Z" fill="#FFC83D" stroke="#E5A800" strokeWidth={2} />
          <Path d="M98 48 C96 16 108 4 118 12 C116 28 110 40 104 50 Z" fill="#FFD95A" stroke="#E5A800" strokeWidth={2} />
          <Path d="M108 54 C116 30 132 26 136 36 C128 44 120 52 112 58 Z" fill="#FFC83D" stroke="#E5A800" strokeWidth={2} />
          <Ellipse cx={100} cy={122} rx={72} ry={66} fill="#FFFDF7" stroke="#E3D7BD" strokeWidth={3} />
          <Ellipse cx={36} cy={134} rx={16} ry={30} fill="#F4EAD3" stroke="#E3D7BD" strokeWidth={3} rotation={14} origin="36, 134" />
          <Ellipse cx={164} cy={134} rx={16} ry={30} fill="#F4EAD3" stroke="#E3D7BD" strokeWidth={3} rotation={-14} origin="164, 134" />
          <Ellipse cx={100} cy={150} rx={40} ry={30} fill="#FFF6E2" />
          <Circle cx={60} cy={120} r={11} fill="#FFB4A2" opacity={0.85} />
          <Circle cx={140} cy={120} r={11} fill="#FFB4A2" opacity={0.85} />
          {happy ? (
            <>
              <Path d="M62 102 Q74 88 86 102" stroke={INK} strokeWidth={5} strokeLinecap="round" fill="none" />
              <Path d="M114 102 Q126 88 138 102" stroke={INK} strokeWidth={5} strokeLinecap="round" fill="none" />
            </>
          ) : (
            <>
              <Circle cx={74} cy={100} r={13} fill={INK} />
              <Circle cx={126} cy={100} r={13} fill={INK} />
              <Circle cx={79} cy={95} r={4.5} fill="#FFFFFF" />
              <Circle cx={131} cy={95} r={4.5} fill="#FFFFFF" />
            </>
          )}
          {listening ? (
            <Path d="M88 112 Q100 104 112 112 Q108 130 100 134 Q92 130 88 112 Z" fill={BEAK} />
          ) : (
            <>
              <Path d="M86 110 Q100 100 114 110 L108 120 L92 120 Z" fill={BEAK} />
              <Path d="M92 126 L108 126 Q104 138 100 140 Q96 138 92 126 Z" fill={BEAK} />
              <Path d="M93 121 L107 121 L106 125 L94 125 Z" fill="#E86A5A" />
            </>
          )}
          <Path d="M82 186 L82 194 M76 194 L88 194 M118 186 L118 194 M112 194 L124 194" stroke="#E5A800" strokeWidth={5} strokeLinecap="round" />
        </G>
      </Svg>
    </Animated.View>
  );
};
