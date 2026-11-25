import { useId } from "react";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from "react-native-svg";
import type { Subject } from "@/api/types";

export const PlaceIcon = ({ subject, color }: { subject: Subject; color: string }) => {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const gradA = `placeA-${uid}`;
  const gradB = `placeB-${uid}`;

  if (subject === "berhitung") {
    return (
      <Svg width={56} height={56} viewBox="0 0 56 56" accessibilityElementsHidden importantForAccessibility="no">
        <Defs>
          <LinearGradient id={gradA} x1="20%" y1="0%" x2="80%" y2="100%">
            <Stop offset="0%" stopColor="#FF7A6E" />
            <Stop offset="100%" stopColor="#D63327" />
          </LinearGradient>
        </Defs>
        <Ellipse cx={28} cy={50} rx={12} ry={2.6} fill="#D9601A" opacity={0.18} />
        <Path
          d="M28 16c-7-4.5-18-2-18 11.5 0 11 7.5 20.5 13.5 20.5 2.2 0 3.3-1 4.5-1s2.3 1 4.5 1C38.5 48 46 38.5 46 27.5 46 14 35 11.5 28 16z"
          fill={`url(#${gradA})`}
          stroke="#A32319"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <Path d="M28 16c0-5 2.4-8.5 6-10" stroke="#6B4A2B" strokeWidth={3.2} strokeLinecap="round" fill="none" />
        <Path d="M30 11c3.5-4.5 9.5-4.5 12-2-3.5 3.8-8.2 4.8-12 2z" fill="#3DBE7A" stroke="#1E7A4C" strokeWidth={1.6} strokeLinejoin="round" />
        <Ellipse cx={18.5} cy={24.5} rx={3} ry={5.5} fill="#FFFFFF" opacity={0.45} />
        <SvgText x={28} y={36} textAnchor="middle" fill="#FFFFFF" fontSize={14} fontWeight="bold">
          123
        </SvgText>
      </Svg>
    );
  }

  if (subject === "membaca") {
    return (
      <Svg width={56} height={56} viewBox="0 0 56 56" accessibilityElementsHidden importantForAccessibility="no">
        <Defs>
          <LinearGradient id={gradA} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#48C987" />
            <Stop offset="100%" stopColor="#1E7A4C" />
          </LinearGradient>
        </Defs>
        <Ellipse cx={28} cy={50} rx={17} ry={2.8} fill="#1E7A4C" opacity={0.18} />
        <Path
          d="M8 14 C16 10 24 12 28 17 C32 12 40 10 48 14 V44 C40 40 32 42 28 46 C24 42 16 40 8 44 Z"
          fill="#FFFFFF"
          stroke="#1E7A4C"
          strokeWidth={2.4}
          strokeLinejoin="round"
        />
        <Path d="M28 17 V46" stroke="#1E7A4C" strokeWidth={2.2} />
        <Rect x={11} y={42} width={34} height={4} rx={2} fill={`url(#${gradA})`} />
        <SvgText x={18} y={33} textAnchor="middle" fill={color} fontSize={16} fontWeight="bold">
          A
        </SvgText>
        <SvgText x={38} y={33} textAnchor="middle" fill="#D9601A" fontSize={15} fontWeight="bold">
          a
        </SvgText>
      </Svg>
    );
  }

  return (
    <Svg width={56} height={56} viewBox="0 0 56 56" accessibilityElementsHidden importantForAccessibility="no">
      <Defs>
        <LinearGradient id={gradA} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFE885" />
          <Stop offset="100%" stopColor="#FFC83D" />
        </LinearGradient>
        <LinearGradient id={gradB} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FF7A6E" />
          <Stop offset="100%" stopColor="#E8483B" />
        </LinearGradient>
      </Defs>
      <Circle cx={42} cy={14} r={7.5} fill={`url(#${gradA})`} stroke="#D99B00" strokeWidth={1.8} />
      <Path d="M22 47 V28" stroke="#7A5230" strokeWidth={3.2} strokeLinecap="round" />
      <Path d="M7 29 C11 16 30 14 37 29 Z" fill={`url(#${gradB})`} stroke="#B82C21" strokeWidth={2} strokeLinejoin="round" />
      <Path d="M16 29 C18 19 25 18 28 29 Z" fill="#FFFFFF" opacity={0.85} />
      <Path d="M5 47 C12 43 18 50 26 47 C34 44 40 50 51 47" stroke={color} strokeWidth={3.2} fill="none" strokeLinecap="round" />
    </Svg>
  );
};
