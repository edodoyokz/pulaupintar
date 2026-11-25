import { useId } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Rect, Stop, LinearGradient } from "react-native-svg";
import type { Picture } from "@/lessons/catalog";
import { colors, fonts, radius, spacing } from "./theme";

export type ObjectKind = "apple" | "star" | "fish" | "ball";

export type IllustrationKind =
  | "cat"
  | "dog"
  | "bird"
  | "fish"
  | "cow"
  | "duck"
  | "eye"
  | "nose"
  | "mouth"
  | "hand"
  | "foot"
  | "ear"
  | "wave"
  | "sunrise"
  | "heart"
  | "goodbye"
  | "moon";

export const ObjectShape = ({ kind, size }: { kind: ObjectKind; size: number }) => {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const gradId = `obj-${kind}-${uid}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityElementsHidden importantForAccessibility="no">
      <Defs>
        {kind === "apple" && (
          <RadialGradient id={gradId} cx="36%" cy="30%" r="68%">
            <Stop offset="0%" stopColor="#FF7A6E" />
            <Stop offset="58%" stopColor="#E8483B" />
            <Stop offset="100%" stopColor="#BD2D22" />
          </RadialGradient>
        )}
        {kind === "star" && (
          <LinearGradient id={gradId} x1="20%" y1="0%" x2="80%" y2="100%">
            <Stop offset="0%" stopColor="#FFE885" />
            <Stop offset="55%" stopColor="#FFC83D" />
            <Stop offset="100%" stopColor="#F0A800" />
          </LinearGradient>
        )}
        {kind === "fish" && (
          <RadialGradient id={gradId} cx="38%" cy="35%" r="65%">
            <Stop offset="0%" stopColor="#84CAFF" />
            <Stop offset="62%" stopColor="#4DA3E8" />
            <Stop offset="100%" stopColor="#2673B8" />
          </RadialGradient>
        )}
        {kind === "ball" && (
          <RadialGradient id={gradId} cx="35%" cy="30%" r="68%">
            <Stop offset="0%" stopColor="#6EE3A5" />
            <Stop offset="60%" stopColor="#3DBE7A" />
            <Stop offset="100%" stopColor="#1E8A52" />
          </RadialGradient>
        )}
      </Defs>
      {kind === "apple" && (
        <G>
          <Ellipse cx={24} cy={43} rx={10} ry={2.4} fill="#1F2A44" opacity={0.1} />
          <Path
            d="M24 14c-6-4-16-2-16 10 0 10 7 18 12 18 2 0 3-1 4-1s2 1 4 1c5 0 12-8 12-18 0-12-10-14-16-10z"
            fill={`url(#${gradId})`}
            stroke="#A8241B"
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
          <Path d="M24 14c0-4 2-7 5-8" stroke="#6B4A2B" strokeWidth={3} strokeLinecap="round" fill="none" />
          <Path d="M26 10c3-4 8-4 10-2-3 3-7 4-10 2z" fill="#3DBE7A" stroke="#1E7A4C" strokeWidth={1.2} strokeLinejoin="round" />
          <Ellipse cx={16.5} cy={22} rx={3} ry={5.2} fill="#FFFFFF" opacity={0.55} />
          <Circle cx={18} cy={29} r={1.4} fill="#FFFFFF" opacity={0.45} />
        </G>
      )}
      {kind === "star" && (
        <G>
          <Path
            d="M24 4l5.8 12 13.2 1.6-9.8 9 2.6 13L24 33l-11.8 6.6 2.6-13-9.8-9L18.2 16z"
            fill={`url(#${gradId})`}
            stroke="#C98A00"
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <Path d="M24 9l3.2 7.2 7.5 1" stroke="#FFF6BF" strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.8} />
          <Circle cx={21} cy={22} r={1.8} fill="#1F2A44" />
          <Circle cx={27} cy={22} r={1.8} fill="#1F2A44" />
          <Path d="M21.5 26.5q2.5 2.4 5 0" stroke="#1F2A44" strokeWidth={1.8} strokeLinecap="round" fill="none" />
        </G>
      )}
      {kind === "fish" && (
        <G>
          <Path d="M35 24l10-9v18z" fill="#F59B35" stroke="#C96A12" strokeWidth={1.6} strokeLinejoin="round" />
          <Path d="M19 14c3-5 8-6 11-2" fill="#F59B35" stroke="#C96A12" strokeWidth={1.6} strokeLinejoin="round" />
          <Ellipse cx={22} cy={24} rx={15.5} ry={11} fill={`url(#${gradId})`} stroke="#21639E" strokeWidth={1.8} />
          <Ellipse cx={18} cy={18.5} rx={6} ry={2.4} fill="#FFFFFF" opacity={0.45} />
          <Circle cx={13.5} cy={21.5} r={3.2} fill="#FFFFFF" />
          <Circle cx={13.2} cy={21.5} r={1.9} fill="#1F2A44" />
          <Circle cx={12.5} cy={20.8} r={0.7} fill="#FFFFFF" />
          <Path d="M12 27.5q3 2 5.5 0" stroke="#1F2A44" strokeWidth={1.6} strokeLinecap="round" fill="none" />
          <Path d="M24 15.5c2.8 4.8 2.8 12.2 0 17" stroke="#246EB0" strokeWidth={2.2} fill="none" strokeLinecap="round" opacity={0.75} />
        </G>
      )}
      {kind === "ball" && (
        <G>
          <Ellipse cx={24} cy={43} rx={11} ry={2.4} fill="#1F2A44" opacity={0.1} />
          <Circle cx={24} cy={24} r={17.5} fill={`url(#${gradId})`} stroke="#17663E" strokeWidth={2} />
          <Path d="M8 19c10 4.5 22 4.5 32 0M8 29c10-4.5 22-4.5 32 0" stroke="#FFFFFF" strokeWidth={3.2} fill="none" strokeLinecap="round" />
          <Path d="M24 6.5v35" stroke="#FFC83D" strokeWidth={2.4} fill="none" opacity={0.85} />
          <Circle cx={24} cy={24} r={17.5} fill="none" stroke="#17663E" strokeWidth={2} />
          <Ellipse cx={17} cy={15} rx={4.5} ry={2.6} fill="#FFFFFF" opacity={0.5} />
        </G>
      )}
    </Svg>
  );
};

const INK = "#1F2A44";

export const Illustration = ({ kind, size = 148 }: { kind: IllustrationKind; size?: number }) => {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const bgGrad = `bg-${uid}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160" accessibilityElementsHidden importantForAccessibility="no">
      <Defs>
        <RadialGradient id={bgGrad} cx="50%" cy="45%" r="55%">
          <Stop offset="0%" stopColor="#FFFDF7" />
          <Stop offset="100%" stopColor="#F2E9DA" />
        </RadialGradient>
      </Defs>
      <Circle cx={80} cy={80} r={72} fill={`url(#${bgGrad})`} />

      {kind === "cat" && (
        <G>
          <Path d="M44 64 L38 26 L68 46 Z" fill="#FFB36B" stroke="#C9732B" strokeWidth={3} strokeLinejoin="round" />
          <Path d="M116 64 L122 26 L92 46 Z" fill="#FFB36B" stroke="#C9732B" strokeWidth={3} strokeLinejoin="round" />
          <Path d="M47 56 L44 35 L62 47 Z" fill="#FF9AA2" />
          <Path d="M113 56 L116 35 L98 47 Z" fill="#FF9AA2" />
          <Ellipse cx={80} cy={88} rx={46} ry={40} fill="#FFC685" stroke="#C9732B" strokeWidth={3} />
          <Path d="M74 49v10M80 48v13M86 49v10" stroke="#D98338" strokeWidth={3} strokeLinecap="round" />
          <Ellipse cx={54} cy={96} rx={8} ry={5.5} fill="#FF9E9E" opacity={0.65} />
          <Ellipse cx={106} cy={96} rx={8} ry={5.5} fill="#FF9E9E" opacity={0.65} />
          <Circle cx={63} cy={82} r={7.5} fill={INK} />
          <Circle cx={97} cy={82} r={7.5} fill={INK} />
          <Circle cx={65} cy={79} r={2.5} fill="#FFFFFF" />
          <Circle cx={99} cy={79} r={2.5} fill="#FFFFFF" />
          <Path d="M74 92 L86 92 L80 99 Z" fill="#FF758F" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
          <Path d="M80 99v5M71 105q4.5 5 9 0q4.5 5 9 0" stroke={INK} strokeWidth={2.6} strokeLinecap="round" fill="none" />
          <Path d="M30 88l18 3M28 98l20-1M130 88l-18 3M132 98l-20-1" stroke={INK} strokeWidth={2.4} strokeLinecap="round" opacity={0.75} />
        </G>
      )}

      {kind === "dog" && (
        <G>
          <Path d="M40 58 C24 64 22 98 34 108 C42 114 50 100 50 82 Z" fill="#9E6236" stroke="#6B3E1D" strokeWidth={3} strokeLinejoin="round" />
          <Path d="M120 58 C136 64 138 98 126 108 C118 114 110 100 110 82 Z" fill="#9E6236" stroke="#6B3E1D" strokeWidth={3} strokeLinejoin="round" />
          <Ellipse cx={80} cy={84} rx={42} ry={39} fill="#D99B66" stroke="#8C5327" strokeWidth={3} />
          <Ellipse cx={62} cy={78} rx={13} ry={15} fill="#B3703C" />
          <Ellipse cx={80} cy={102} rx={24} ry={18} fill="#FFE9CF" />
          <Circle cx={63} cy={78} r={6.8} fill={INK} />
          <Circle cx={97} cy={78} r={6.8} fill={INK} />
          <Circle cx={65} cy={75.5} r={2.2} fill="#FFFFFF" />
          <Circle cx={99} cy={75.5} r={2.2} fill="#FFFFFF" />
          <Ellipse cx={80} cy={95} rx={8.5} ry={6} fill={INK} />
          <Ellipse cx={78} cy={93} rx={3} ry={1.5} fill="#FFFFFF" opacity={0.4} />
          <Path d="M80 101v5M70 108q5 6 10 0q5 6 10 0" stroke={INK} strokeWidth={2.6} strokeLinecap="round" fill="none" />
          <Path d="M74 110 C74 122 86 122 86 110 Z" fill="#FF758F" stroke="#C94A63" strokeWidth={1.8} />
        </G>
      )}

      {kind === "bird" && (
        <G>
          <Path d="M28 90 L52 84 L48 106 Z" fill="#2A7AC4" stroke="#1B558C" strokeWidth={2.5} strokeLinejoin="round" />
          <Ellipse cx={84} cy={90} rx={38} ry={32} fill="#52B2FF" stroke="#226EB0" strokeWidth={3} />
          <Circle cx={102} cy={62} r={22} fill="#52B2FF" stroke="#226EB0" strokeWidth={3} />
          <Ellipse cx={86} cy={100} rx={22} ry={16} fill="#D9F0FF" />
          <Path d="M62 84 C74 72 94 78 96 94 C82 104 64 98 62 84 Z" fill="#328CE0" stroke="#1E62A3" strokeWidth={2.5} />
          <Path d="M122 60 L138 66 L122 72 Z" fill="#FFC83D" stroke="#C98A00" strokeWidth={2.4} strokeLinejoin="round" />
          <Circle cx={108} cy={57} r={5.5} fill={INK} />
          <Circle cx={110} cy={55} r={2} fill="#FFFFFF" />
          <Path d="M74 120v12M70 132h10M94 120v12M90 132h10" stroke="#E88D1A" strokeWidth={3} strokeLinecap="round" />
        </G>
      )}

      {kind === "fish" && (
        <G>
          <Circle cx={44} cy={46} r={5} fill="#A3DCFF" stroke="#4DA3E8" strokeWidth={2} />
          <Circle cx={34} cy={62} r={3.5} fill="#A3DCFF" stroke="#4DA3E8" strokeWidth={1.8} />
          <Path d="M110 84 L138 56 L138 112 Z" fill="#FF9F43" stroke="#C96A12" strokeWidth={3} strokeLinejoin="round" />
          <Path d="M68 52 C78 32 98 34 102 54 Z" fill="#FF9F43" stroke="#C96A12" strokeWidth={3} strokeLinejoin="round" />
          <Ellipse cx={76} cy={84} rx={44} ry={32} fill="#4DA3E8" stroke="#1E5F9E" strokeWidth={3} />
          <Ellipse cx={66} cy={68} rx={16} ry={6} fill="#FFFFFF" opacity={0.35} />
          <Circle cx={50} cy={76} r={9} fill="#FFFFFF" stroke="#1E5F9E" strokeWidth={2} />
          <Circle cx={48.5} cy={76} r={5} fill={INK} />
          <Circle cx={46.8} cy={74} r={1.8} fill="#FFFFFF" />
          <Path d="M44 96 q10 7 18 0" stroke={INK} strokeWidth={2.8} strokeLinecap="round" fill="none" />
          <Path d="M84 62 c8 14 8 30 0 44M98 66 c6 11 6 25 0 36" stroke="#246EB0" strokeWidth={3} strokeLinecap="round" fill="none" />
        </G>
      )}

      {kind === "cow" && (
        <G>
          <Path d="M46 42 C38 30 48 22 56 36" fill="#FFE0A3" stroke="#B58338" strokeWidth={2.8} strokeLinecap="round" />
          <Path d="M114 42 C122 30 112 22 104 36" fill="#FFE0A3" stroke="#B58338" strokeWidth={2.8} strokeLinecap="round" />
          <Ellipse cx={38} cy={62} rx={14} ry={8} fill="#FFFFFF" stroke={INK} strokeWidth={2.8} />
          <Ellipse cx={122} cy={62} rx={14} ry={8} fill="#FFFFFF" stroke={INK} strokeWidth={2.8} />
          <Ellipse cx={80} cy={78} rx={40} ry={40} fill="#FFFFFF" stroke={INK} strokeWidth={3} />
          <Path d="M52 46 C68 48 72 64 56 72 C46 76 42 58 52 46 Z" fill="#2F3A4F" />
          <Ellipse cx={102} cy={68} rx={10} ry={12} fill="#2F3A4F" />
          <Circle cx={63} cy={74} r={6} fill={INK} />
          <Circle cx={97} cy={74} r={6} fill={INK} />
          <Circle cx={65} cy={72} r={2} fill="#FFFFFF" />
          <Circle cx={99} cy={72} r={2} fill="#FFFFFF" />
          <Ellipse cx={80} cy={104} rx={32} ry={21} fill="#FFB6C1" stroke="#C96B7D" strokeWidth={2.8} />
          <Circle cx={68} cy={101} r={4} fill="#A3485B" />
          <Circle cx={92} cy={101} r={4} fill="#A3485B" />
          <Path d="M71 113 q9 6 18 0" stroke="#7A3241" strokeWidth={2.6} strokeLinecap="round" fill="none" />
        </G>
      )}

      {kind === "duck" && (
        <G>
          <Path d="M74 36 C70 24 82 22 82 36" fill="#FFE066" stroke="#D49B00" strokeWidth={2.4} strokeLinecap="round" />
          <Ellipse cx={80} cy={88} rx={42} ry={40} fill="#FFD84D" stroke="#D49B00" strokeWidth={3} />
          <Ellipse cx={64} cy={66} rx={14} ry={7} fill="#FFF2A6" opacity={0.7} />
          <Ellipse cx={54} cy={86} rx={8} ry={5} fill="#FF9E80" opacity={0.65} />
          <Ellipse cx={106} cy={86} rx={8} ry={5} fill="#FF9E80" opacity={0.65} />
          <Circle cx={63} cy={74} r={6.8} fill={INK} />
          <Circle cx={97} cy={74} r={6.8} fill={INK} />
          <Circle cx={65} cy={71.5} r={2.2} fill="#FFFFFF" />
          <Circle cx={99} cy={71.5} r={2.2} fill="#FFFFFF" />
          <Ellipse cx={80} cy={96} rx={22} ry={12} fill="#FF8C24" stroke="#C75D00" strokeWidth={2.8} />
          <Path d="M64 96 q16 7 32 0" stroke="#A64B00" strokeWidth={2.2} strokeLinecap="round" fill="none" />
          <Circle cx={73} cy={91} r={1.8} fill="#A64B00" />
          <Circle cx={87} cy={91} r={1.8} fill="#A64B00" />
        </G>
      )}

      {kind === "eye" && (
        <G>
          <Path d="M38 56 L32 42M58 46 L55 30M80 42 L80 26M102 46 L105 30M122 56 L128 42" stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
          <Path d="M22 82 C44 48 116 48 138 82 C116 116 44 116 22 82 Z" fill="#FFFFFF" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
          <Circle cx={80} cy={82} r={24} fill="#4DA3E8" stroke="#1E5F9E" strokeWidth={2.8} />
          <Circle cx={80} cy={82} r={12} fill={INK} />
          <Circle cx={88} cy={73} r={5.5} fill="#FFFFFF" />
          <Circle cx={72} cy={89} r={2.5} fill="#FFFFFF" opacity={0.8} />
        </G>
      )}

      {kind === "nose" && (
        <G>
          <Path d="M80 34 C80 56 76 74 62 84 C50 92 52 108 66 110 C74 111 77 107 80 107 C83 107 86 111 94 110 C108 108 110 92 98 84 C84 74 80 56 80 34 Z" fill="#FFCA9E" stroke="#C97E4B" strokeWidth={3.5} strokeLinejoin="round" />
          <Path d="M74 48 C74 64 72 76 66 84" stroke="#FFF2E6" strokeWidth={3.5} strokeLinecap="round" fill="none" opacity={0.75} />
          <Ellipse cx={67} cy={101} rx={5.5} ry={3.5} fill="#9E562E" />
          <Ellipse cx={93} cy={101} rx={5.5} ry={3.5} fill="#9E562E" />
        </G>
      )}

      {kind === "mouth" && (
        <G>
          <Path d="M28 74 C44 54 68 56 80 64 C92 56 116 54 132 74 C118 114 42 114 28 74 Z" fill="#FF6B78" stroke="#BD3544" strokeWidth={3.2} strokeLinejoin="round" />
          <Path d="M36 74 C52 96 108 96 124 74 C104 70 56 70 36 74 Z" fill="#8C1D2A" />
          <Path d="M48 73 L112 73 C108 82 52 82 48 73 Z" fill="#FFFFFF" />
          <Path d="M62 94 C72 88 88 88 98 94 C92 102 68 102 62 94 Z" fill="#FF9AA2" />
        </G>
      )}

      {kind === "hand" && (
        <G>
          <Path
            d="M54 128 L52 94 L38 78 C33 72 41 64 48 70 L58 80 L56 44 C56 36 67 36 67 44 L69 72 L73 36 C73 28 84 28 84 36 L85 72 L91 40 C92 32 103 33 102 41 L98 76 L108 54 C111 47 121 51 118 59 L106 98 C103 114 96 124 94 128 Z"
            fill="#FFCCA3"
            stroke="#C97E4B"
            strokeWidth={3.2}
            strokeLinejoin="round"
          />
          <Ellipse cx={79} cy={98} rx={14} ry={10} fill="#FFE0C7" opacity={0.7} />
        </G>
      )}

      {kind === "foot" && (
        <G>
          <Path
            d="M58 46 C48 74 44 102 56 118 C68 134 102 132 106 114 C108 102 96 92 94 74 L94 44 Z"
            fill="#FFCCA3"
            stroke="#C97E4B"
            strokeWidth={3.2}
            strokeLinejoin="round"
          />
          <Circle cx={50} cy={112} r={8.5} fill="#FFCCA3" stroke="#C97E4B" strokeWidth={2.8} />
          <Circle cx={64} cy={123} r={6.5} fill="#FFCCA3" stroke="#C97E4B" strokeWidth={2.8} />
          <Circle cx={79} cy={125} r={6} fill="#FFCCA3" stroke="#C97E4B" strokeWidth={2.8} />
          <Circle cx={93} cy={122} r={5.5} fill="#FFCCA3" stroke="#C97E4B" strokeWidth={2.8} />
          <Circle cx={104} cy={114} r={5} fill="#FFCCA3" stroke="#C97E4B" strokeWidth={2.8} />
        </G>
      )}

      {kind === "ear" && (
        <G>
          <Path
            d="M56 54 C54 30 98 24 108 50 C116 70 100 84 96 98 C93 114 82 126 66 124 C54 122 50 110 56 98"
            fill="#FFCCA3"
            stroke="#C97E4B"
            strokeWidth={3.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M66 56 C66 42 92 40 94 56 C96 70 82 78 80 92 C78 102 70 108 64 104"
            fill="none"
            stroke="#C97E4B"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <Path d="M70 72 C78 72 82 80 74 86" fill="none" stroke="#C97E4B" strokeWidth={2.8} strokeLinecap="round" />
        </G>
      )}

      {kind === "wave" && (
        <G>
          <Path
            d="M56 126 L54 94 L40 78 C35 72 43 64 50 70 L60 80 L58 46 C58 38 69 38 69 46 L71 74 L75 38 C75 30 86 30 86 38 L87 74 L93 42 C94 34 105 35 104 43 L100 78 L110 56 C113 49 123 53 120 61 L108 100 C105 114 98 122 96 126 Z"
            fill="#FFCCA3"
            stroke="#C97E4B"
            strokeWidth={3.2}
            strokeLinejoin="round"
          />
          <Path d="M32 54 Q26 42 36 34M126 46 Q134 36 126 26" stroke="#2E73D8" strokeWidth={3.5} strokeLinecap="round" fill="none" />
        </G>
      )}

      {kind === "sunrise" && (
        <G>
          <Path d="M24 108 H136" stroke="#3DBE7A" strokeWidth={5} strokeLinecap="round" />
          <Path d="M38 108 A42 42 0 0 1 122 108 Z" fill="#FFC83D" stroke="#D98A00" strokeWidth={3} strokeLinejoin="round" />
          <Path d="M80 34 V52M42 48 L52 60M118 48 L108 60M24 80 L38 84M136 80 L122 84" stroke="#F59E0B" strokeWidth={4} strokeLinecap="round" />
          <Circle cx={68} cy={92} r={3.2} fill={INK} />
          <Circle cx={92} cy={92} r={3.2} fill={INK} />
          <Path d="M74 99 q6 5 12 0" stroke={INK} strokeWidth={2.4} strokeLinecap="round" fill="none" />
        </G>
      )}

      {kind === "heart" && (
        <G>
          <Path
            d="M80 126 C80 126 30 96 30 62 C30 44 45 34 60 36 C71 37 77 45 80 51 C83 45 89 37 100 36 C115 34 130 44 130 62 C130 96 80 126 80 126 Z"
            fill="#FF5C6C"
            stroke="#C92A3D"
            strokeWidth={3.2}
            strokeLinejoin="round"
          />
          <Ellipse cx={54} cy={56} rx={9} ry={5} fill="#FFFFFF" opacity={0.45} />
          <Path d="M124 30 L126 36 L132 38 L126 40 L124 46 L122 40 L116 38 L122 36 Z" fill="#FFC83D" />
        </G>
      )}

      {kind === "goodbye" && (
        <G>
          <Rect x={48} y={38} width={64} height={92} rx={8} fill="#FFE2A8" stroke="#9E6236" strokeWidth={3.2} />
          <Path d="M48 38 L92 48 L92 122 L48 130 Z" fill="#F2AE52" stroke="#9E6236" strokeWidth={2.8} strokeLinejoin="round" />
          <Circle cx={82} cy={86} r={4.5} fill="#FFE885" stroke="#9E6236" strokeWidth={2} />
          <Path d="M116 56 Q128 46 124 34M124 68 Q136 62 134 50" stroke="#2E73D8" strokeWidth={3.2} strokeLinecap="round" fill="none" />
        </G>
      )}

      {kind === "moon" && (
        <G>
          <Circle cx={80} cy={80} r={58} fill="#1F2A44" />
          <Path
            d="M88 38 C64 40 48 62 52 88 C56 112 78 126 102 120 C84 114 74 96 76 76 C78 58 84 46 88 38 Z"
            fill="#FFE066"
            stroke="#D9A800"
            strokeWidth={2.4}
            strokeLinejoin="round"
          />
          <Path d="M108 44 L111 51 L118 54 L111 57 L108 64 L105 57 L98 54 L105 51 Z" fill="#FFF3B0" />
          <Circle cx={116} cy={82} r={2.8} fill="#FFF3B0" />
          <Circle cx={52} cy={46} r={2.2} fill="#FFF3B0" />
        </G>
      )}
    </Svg>
  );
};

const ObjectRow = ({
  kind,
  count,
  size,
  wrap = false,
}: {
  kind: ObjectKind;
  count: number;
  size: number;
  /** Inside the compare card each side owns half the width and wraps instead of overflowing. */
  wrap?: boolean;
}) => (
  <View style={[styles.group, wrap && styles.groupWrap]}>
    {Array.from({ length: count }, (_, index) => (
      <ObjectShape key={index} kind={kind} size={size} />
    ))}
  </View>
);

const sizeFor = (count: number, compact = false) => {
  const base = count <= 5 ? 68 : count <= 10 ? 50 : 34;
  return compact ? Math.round(base * 0.8) : base;
};

// A letter or number fills the card; words and short sentences get smaller.
const textSizeFor = (text: string, compact = false) => {
  const base = text.length <= 2 ? 140 : text.length <= 6 ? 84 : 56;
  const fontSize = compact ? Math.round(base * 0.8) : base;
  return { fontSize, lineHeight: Math.round(fontSize * 1.15) };
};

const Sign = ({ children, compact = false }: { children: string; compact?: boolean }) => (
  <Text style={[styles.sign, compact && styles.signCompact]}>{children}</Text>
);

export const PictureView = ({ picture, compact = false }: { picture: Picture; compact?: boolean }) => {
  switch (picture.kind) {
    case "objects":
      return <ObjectRow kind={picture.object} count={picture.count} size={sizeFor(picture.count, compact)} />;
    case "compare":
      return (
        <View style={styles.compare}>
          <ObjectRow
            kind={picture.object}
            count={picture.left}
            size={sizeFor(Math.max(picture.left, picture.right) * 2, compact)}
            wrap
          />
          <View style={styles.divider} />
          <ObjectRow
            kind={picture.rightObject}
            count={picture.right}
            size={sizeFor(Math.max(picture.left, picture.right) * 2, compact)}
            wrap
          />
        </View>
      );
    case "sum":
      return (
        <View style={styles.sum}>
          <ObjectRow kind={picture.object} count={picture.a} size={compact ? 36 : 44} />
          <Sign compact={compact}>+</Sign>
          <ObjectRow kind={picture.object} count={picture.b} size={compact ? 36 : 44} />
        </View>
      );
    case "text":
      return (
        <Text style={[styles.bigText, textSizeFor(picture.text, compact)]} adjustsFontSizeToFit numberOfLines={2}>
          {picture.text}
        </Text>
      );
    case "swatch":
      return (
        <View style={[styles.swatchRing, compact && styles.swatchRingCompact]}>
          <View style={[styles.swatch, compact && styles.swatchCompact, { backgroundColor: picture.color }]}>
            <View style={styles.swatchGloss} />
          </View>
        </View>
      );
    case "illustration":
      return (
        <View style={styles.illustration}>
          <Illustration kind={picture.illustration} size={compact ? 116 : 146} />
          {picture.label && (
            <View style={styles.labelPill}>
              <Text style={styles.labelText}>{picture.label}</Text>
            </View>
          )}
        </View>
      );
  }
};

const styles = StyleSheet.create({
  group: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 6, maxWidth: 300 },
  groupWrap: { flex: 1, maxWidth: undefined, alignSelf: "stretch" },
  compare: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.md },
  divider: { width: 3, alignSelf: "stretch", borderRadius: 2, backgroundColor: colors.pictureBorder },
  sum: { alignItems: "center", gap: spacing.sm },
  sign: { fontFamily: fonts.display, fontSize: 40, color: colors.ink },
  signCompact: { fontSize: 32 },
  bigText: { fontFamily: fonts.display, textAlign: "center", color: colors.ink },
  swatchRing: {
    width: 164,
    height: 164,
    borderRadius: 82,
    borderWidth: 4,
    borderColor: colors.swatchRing,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  swatchRingCompact: {
    width: 132,
    height: 132,
    borderRadius: 66,
  },
  swatch: {
    width: 146,
    height: 146,
    borderRadius: 73,
    borderWidth: 4,
    borderColor: colors.ink,
    overflow: "hidden",
  },
  swatchCompact: {
    width: 116,
    height: 116,
    borderRadius: 58,
  },
  swatchGloss: {
    position: "absolute",
    top: 16,
    left: 22,
    width: 44,
    height: 22,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    opacity: 0.38,
    transform: [{ rotate: "-24deg" }],
  },
  illustration: { alignItems: "center", justifyContent: "center", gap: 8 },
  labelPill: {
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.sky,
  },
  labelText: { fontFamily: fonts.display, fontSize: 22, lineHeight: 26, color: colors.ink },
});
