import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Circle,
  Path,
  ClipPath,
  G,
} from 'react-native-svg';

interface PronounceItLogoProps {
  size?: number;
  style?: any;
}

export const PronounceItLogo: React.FC<PronounceItLogoProps> = ({ size = 64, style }) => {
  return (
    <Svg viewBox="0 0 64 64" width={size} height={size} style={style}>
      <Defs>
        {/* Background squircle clip path */}
        <ClipPath id="pi_uk_squircle">
          <Rect width={64} height={64} rx={16} />
        </ClipPath>

        {/* Subtle border highlight with neon glow */}
        <LinearGradient id="pi_uk_borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#ff4d6d" stopOpacity={0.9} />
          <Stop offset="50%" stopColor="#ffffff" stopOpacity={0.6} />
          <Stop offset="100%" stopColor="#e62e4c" stopOpacity={0.3} />
        </LinearGradient>

        {/* Vignette / dark overlay on top of flag to make P pop */}
        <RadialGradient id="pi_uk_flagVignette" cx="50%" cy="50%" rx="70%" ry="70%">
          <Stop offset="0%" stopColor="#0a0518" stopOpacity={0.25} />
          <Stop offset="60%" stopColor="#070312" stopOpacity={0.5} />
          <Stop offset="100%" stopColor="#020006" stopOpacity={0.75} />
        </RadialGradient>

        {/* Ambient glow behind the letter */}
        <RadialGradient id="pi_uk_ambientGlow" cx="45%" cy="38%" rx="52%" ry="52%">
          <Stop offset="0%" stopColor="#000000" stopOpacity={0.55} />
          <Stop offset="65%" stopColor="#000000" stopOpacity={0.25} />
          <Stop offset="100%" stopColor="#000000" stopOpacity={0} />
        </RadialGradient>

        {/* Main Letter P gradient */}
        <LinearGradient id="pi_uk_primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#ffffff" />
          <Stop offset="35%" stopColor="#ff5470" />
          <Stop offset="100%" stopColor="#e62e4c" />
        </LinearGradient>

        {/* Sound waves gradient */}
        <LinearGradient id="pi_uk_waveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#ffffff" />
          <Stop offset="30%" stopColor="#ff758c" />
          <Stop offset="100%" stopColor="#c084fc" />
        </LinearGradient>
      </Defs>

      {/* Container Squircle with UK Flag */}
      <G clipPath="url(#pi_uk_squircle)">
        {/* UK FLAG (Union Jack) Exact Official Geometry scaled to 64x64 */}
        {/* Blue field */}
        <Rect width={64} height={64} fill="#012169" />

        {/* White saltire diagonals (St Andrew) */}
        <Path d="M0,0 L64,64 M64,0 L0,64" stroke="#ffffff" strokeWidth={12.8} />

        {/* Red saltire diagonals counterchanged (St Patrick) */}
        <Path d="M0 -2.1 L32 29.9" stroke="#C8102E" strokeWidth={4.2} />
        <Path d="M32 34.1 L64 66.1" stroke="#C8102E" strokeWidth={4.2} />
        <Path d="M66.1 0 L34.1 32" stroke="#C8102E" strokeWidth={4.2} />
        <Path d="M29.9 32 L-2.1 64" stroke="#C8102E" strokeWidth={4.2} />

        {/* White St George cross */}
        <Path d="M32,0 V64 M0,32 H64" stroke="#ffffff" strokeWidth={12.8} />

        {/* Red St George cross */}
        <Path d="M32,0 V64 M0,32 H64" stroke="#C8102E" strokeWidth={7.6} />

        {/* Vignette overlay for depth and contrast */}
        <Rect width={64} height={64} fill="url(#pi_uk_flagVignette)" />

        {/* Ambient dark backing behind letter P */}
        <Circle cx={28} cy={26} r={22} fill="url(#pi_uk_ambientGlow)" />
      </G>

      {/* Border highlight squircle */}
      <Rect
        x={0.75}
        y={0.75}
        width={62.5}
        height={62.5}
        rx={15.25}
        fill="none"
        stroke="url(#pi_uk_borderGrad)"
        strokeWidth={1.5}
      />

      {/* Stylized 'P' Stem */}
      <Rect x={14} y={14} width={7} height={36} rx={3.5} fill="url(#pi_uk_primaryGrad)" />

      {/* Loop of the 'P' */}
      <Path
        d="M 17.5 14 H 28 C 35.5 14 39.5 18 39.5 24.5 C 39.5 31 35.5 35 28 35 H 17.5 Z"
        fill="url(#pi_uk_primaryGrad)"
      />

      {/* Hollow inner loop with crisp dark velvet backing */}
      <Path
        d="M 21 20 H 27.5 C 31.5 20 33 21.8 33 24.5 C 33 27.2 31.5 29 27.5 29 H 21 Z"
        fill="#0d081a"
      />

      {/* Sound Waves emanating from the 'P' (Phonetics & Pronunciation) */}
      {/* Inner Wave */}
      <Path
        d="M 43 18.5 C 46.5 22 46.5 27 43 30.5"
        fill="none"
        stroke="url(#pi_uk_waveGrad)"
        strokeWidth={3}
        strokeLinecap="round"
      />
      {/* Outer Wave */}
      <Path
        d="M 49.5 14 C 55 19.5 55 29.5 49.5 35"
        fill="none"
        stroke="url(#pi_uk_waveGrad)"
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.95}
      />
    </Svg>
  );
};

export default PronounceItLogo;
