import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Circle,
  Path,
} from 'react-native-svg';

interface PronounceItLogoProps {
  size?: number;
}

export const PronounceItLogo: React.FC<PronounceItLogoProps> = ({ size = 64 }) => {
  return (
    <Svg viewBox="0 0 64 64" width={size} height={size}>
      <Defs>
        {/* Background dark velvet gradient */}
        <LinearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#1d1330" />
          <Stop offset="50%" stopColor="#120c1e" />
          <Stop offset="100%" stopColor="#0a0612" />
        </LinearGradient>

        {/* Subtle border highlight with neon glow */}
        <LinearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#ff4d6d" stopOpacity={0.85} />
          <Stop offset="50%" stopColor="#a855f7" stopOpacity={0.5} />
          <Stop offset="100%" stopColor="#e62e4c" stopOpacity={0.25} />
        </LinearGradient>

        {/* Ambient glow behind the letter */}
        <RadialGradient id="ambientGlow" cx="45%" cy="38%" rx="52%" ry="52%">
          <Stop offset="0%" stopColor="#e62e4c" stopOpacity={0.45} />
          <Stop offset="65%" stopColor="#9333ea" stopOpacity={0.2} />
          <Stop offset="100%" stopColor="#000000" stopOpacity={0} />
        </RadialGradient>

        {/* Main Letter P gradient */}
        <LinearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#ffffff" />
          <Stop offset="35%" stopColor="#ff5470" />
          <Stop offset="100%" stopColor="#e62e4c" />
        </LinearGradient>

        {/* Sound waves gradient */}
        <LinearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#ff758c" />
          <Stop offset="100%" stopColor="#c084fc" />
        </LinearGradient>
      </Defs>

      {/* Container Squircle with subtle border */}
      <Rect width={64} height={64} rx={16} fill="url(#bgGrad)" />
      <Rect
        x={0.75}
        y={0.75}
        width={62.5}
        height={62.5}
        rx={15.25}
        fill="none"
        stroke="url(#borderGrad)"
        strokeWidth={1.5}
      />
      <Circle cx={28} cy={26} r={22} fill="url(#ambientGlow)" />

      {/* Stylized 'P' Stem */}
      <Rect x={14} y={14} width={7} height={36} rx={3.5} fill="url(#primaryGrad)" />

      {/* Loop of the 'P' */}
      <Path
        d="M 17.5 14 H 28 C 35.5 14 39.5 18 39.5 24.5 C 39.5 31 35.5 35 28 35 H 17.5 Z"
        fill="url(#primaryGrad)"
      />
      {/* Hollow inner loop */}
      <Path
        d="M 21 20 H 27.5 C 31.5 20 33 21.8 33 24.5 C 33 27.2 31.5 29 27.5 29 H 21 Z"
        fill="#140d23"
      />

      {/* Sound Waves emanating from the 'P' (Phonetics & Pronunciation) */}
      {/* Inner Wave */}
      <Path
        d="M 43 18.5 C 46.5 22 46.5 27 43 30.5"
        fill="none"
        stroke="url(#waveGrad)"
        strokeWidth={3}
        strokeLinecap="round"
      />
      {/* Outer Wave */}
      <Path
        d="M 49.5 14 C 55 19.5 55 29.5 49.5 35"
        fill="none"
        stroke="url(#waveGrad)"
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.95}
      />
    </Svg>
  );
};
export default PronounceItLogo;
