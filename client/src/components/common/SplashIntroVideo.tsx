import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { PronounceItLogo } from './PronounceItLogo';
import { THEME } from '../../theme';

interface SplashIntroVideoProps {
  onFinish: () => void;
}

const IPA_PARTICLES = [
  { symbol: '/ˈɪŋ.ɡlɪʃ/', top: '18%', left: '12%' },
  { symbol: '/ə/', top: '24%', right: '14%' },
  { symbol: '/θ/', top: '68%', left: '15%' },
  { symbol: '/ʃ/', top: '72%', right: '16%' },
  { symbol: '/dʒ/', top: '44%', left: '8%' },
  { symbol: '/ɑː/', top: '46%', right: '10%' },
];

const EQ_HEIGHTS = [16, 28, 42, 24, 52, 36, 58, 34, 48, 26, 40, 22, 14];

export const SplashIntroVideo: React.FC<SplashIntroVideoProps> = ({ onFinish }) => {
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.35)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(22)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Sonar wave rings
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;

  // Equalizer bars
  const eqAnims = useRef(EQ_HEIGHTS.map(() => new Animated.Value(0.3))).current;
  const finishedRef = useRef(false);

  const completeIntro = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    Animated.timing(containerOpacity, {
      toValue: 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      onFinish();
    });
  };

  useEffect(() => {
    // 1. Logo zoom-in spring
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 65,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Title & subtitle slide up
    Animated.sequence([
      Animated.delay(260),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 3. Expanding sonar rings loop
    const createRingLoop = (val: Animated.Value, delayMs: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delayMs),
          Animated.timing(val, {
            toValue: 1,
            duration: 1650,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

    const r1 = createRingLoop(ring1, 0);
    const r2 = createRingLoop(ring2, 520);
    const r3 = createRingLoop(ring3, 1040);
    r1.start();
    r2.start();
    r3.start();

    // 4. Voice equalizer bars loop
    const eqLoops = eqAnims.map((anim, idx) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay((idx % 5) * 70),
          Animated.timing(anim, {
            toValue: 1,
            duration: 280 + (idx % 4) * 55,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.25,
            duration: 280 + (idx % 4) * 55,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      )
    );
    eqLoops.forEach((l) => l.start());

    // 5. Progress bar & auto-finish after 2.45s
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2300,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      completeIntro();
    }, 2400);

    return () => {
      clearTimeout(timer);
      r1.stop();
      r2.stop();
      r3.stop();
      eqLoops.forEach((l) => l.stop());
    };
  }, []);

  const renderSonarRing = (anim: Animated.Value, borderColor: string) => {
    const scale = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.85, 2.35],
    });
    const opacity = anim.interpolate({
      inputRange: [0, 0.2, 1],
      outputRange: [0, 0.55, 0],
    });
    return (
      <Animated.View
        pointerEvents="none"
        style={[
          styles.sonarRing,
          {
            borderColor,
            opacity,
            transform: [{ scale }],
          },
        ]}
      />
    );
  };

  return (
    <TouchableWithoutFeedback onPress={completeIntro}>
      <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
        <StatusBar style="light" />

        {/* Floating IPA Phonetic Symbols */}
        {IPA_PARTICLES.map((p, idx) => (
          <Animated.View
            key={idx}
            pointerEvents="none"
            style={[
              styles.ipaParticle,
              {
                top: p.top as any,
                left: p.left as any,
                right: p.right as any,
                opacity: textOpacity,
                transform: [{ translateY: textTranslateY }],
              },
            ]}
          >
            <Text style={styles.ipaParticleText}>{p.symbol}</Text>
          </Animated.View>
        ))}

        {/* Center Stage: Sonar Rings + Unstretched Square Logo */}
        <View style={styles.centerStage}>
          <View style={styles.logoHaloWrapper}>
            {renderSonarRing(ring1, 'rgba(230, 46, 76, 0.65)')}
            {renderSonarRing(ring2, 'rgba(56, 189, 248, 0.55)')}
            {renderSonarRing(ring3, 'rgba(168, 85, 247, 0.5)')}

            <Animated.View
              style={[
                styles.logoCard,
                {
                  opacity: logoOpacity,
                  transform: [{ scale: logoScale }],
                },
              ]}
            >
              <PronounceItLogo size={108} />
            </Animated.View>
          </View>

          {/* Animated Voice Frequency Equalizer */}
          <Animated.View style={[styles.eqRow, { opacity: textOpacity }]}>
            {EQ_HEIGHTS.map((maxH, idx) => (
              <Animated.View
                key={idx}
                style={[
                  styles.eqBar,
                  {
                    height: maxH,
                    backgroundColor:
                      idx % 3 === 0
                        ? '#e62e4c'
                        : idx % 3 === 1
                        ? '#38bdf8'
                        : '#a855f7',
                    transform: [{ scaleY: eqAnims[idx] }],
                  },
                ]}
              />
            ))}
          </Animated.View>

          {/* Brand Title & Subtitle */}
          <Animated.View
            style={[
              styles.textBlock,
              {
                opacity: textOpacity,
                transform: [{ translateY: textTranslateY }],
              },
            ]}
          >
            <Text style={styles.brandTitle}>PronounceIt</Text>
            <Text style={styles.brandSubtitle}>
              LÉXICO • FONÉTICA IPA • PRONUNCIACIÓN
            </Text>
            <View style={styles.versionPill}>
              <View style={styles.liveDot} />
              <Text style={styles.versionText}>v1.7.3</Text>
            </View>
          </Animated.View>
        </View>

        {/* Bottom Progress Bar */}
        <View style={styles.bottomArea}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  transform: [
                    {
                      scaleX: progressAnim,
                    },
                  ],
                },
              ]}
            />
          </View>
          <Text style={styles.skipHint}>Preparando tu espacio de estudio...</Text>
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#0b0814',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Platform.OS === 'android' ? 56 : 48,
    paddingHorizontal: 24,
    zIndex: 99999,
  },
  ipaParticle: {
    position: 'absolute',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  ipaParticleText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(148, 163, 184, 0.45)',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  centerStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  logoHaloWrapper: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sonarRing: {
    position: 'absolute',
    width: 124,
    height: 124,
    borderRadius: 34,
    borderWidth: 2,
  },
  logoCard: {
    width: 116,
    height: 116,
    borderRadius: 30,
    backgroundColor: '#161026',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#e62e4c',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 14,
  },
  eqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 58,
    gap: 5,
  },
  eqBar: {
    width: 4,
    borderRadius: 2,
  },
  textBlock: {
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.6,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1.8,
    textAlign: 'center',
  },
  versionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(230, 46, 76, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(230, 46, 76, 0.35)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e62e4c',
  },
  versionText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.crimsonLight,
  },
  bottomArea: {
    width: '100%',
    maxWidth: 260,
    alignItems: 'center',
    gap: 10,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e62e4c',
    borderRadius: 2,
  },
  skipHint: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
});
