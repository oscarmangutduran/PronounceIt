import React, { useState } from 'react';
import { View, Image, StyleSheet, Text, Platform } from 'react-native';

interface CountryFlagProps {
  code: string;
  size?: number;
  width?: number;
  height?: number;
  style?: any;
}

const ISO_MAP: Record<string, string> = {
  es: 'es',
  en: 'gb',
  fr: 'fr',
  de: 'de',
  it: 'it',
  pt: 'pt',
  ru: 'ru',
  zh: 'cn',
  ja: 'jp',
  ar: 'sa',
};

const EMOJI_MAP: Record<string, string> = {
  es: '🇪🇸',
  en: '🇬🇧',
  fr: '🇫🇷',
  de: '🇩🇪',
  it: '🇮🇹',
  pt: '🇵🇹',
  ru: '🇷🇺',
  zh: '🇨🇳',
  ja: '🇯🇵',
  ar: '🇸🇦',
};

export const CountryFlag: React.FC<CountryFlagProps> = ({
  code,
  size = 20,
  width: customWidth,
  height: customHeight,
  style,
}) => {
  const [hasError, setHasError] = useState(false);
  const normalizedCode = (code || 'es').toLowerCase().trim();
  const iso = ISO_MAP[normalizedCode] || normalizedCode;

  // 4:3 standard flag ratio
  const h = customHeight || Math.round(size * 0.75);
  const w = customWidth || Math.round(h * 1.45);

  const flagUrl = `https://flagcdn.com/w80/${iso}.png`;

  if (hasError) {
    return (
      <View style={[styles.fallbackContainer, { width: w, height: h }, style]}>
        <Text style={[styles.fallbackEmoji, { fontSize: Math.round(h * 0.8) }]}>
          {EMOJI_MAP[normalizedCode] || '🌐'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width: w, height: h }, style]}>
      <Image
        source={{ uri: flagUrl }}
        style={{ width: w, height: h }}
        resizeMode="cover"
        onError={() => setHasError(true)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          display: 'inline-flex' as any,
          verticalAlign: 'middle',
        }
      : {
          elevation: 1,
        }),
  },
  fallbackContainer: {
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackEmoji: {
    textAlign: 'center',
    lineHeight: undefined,
  },
});
