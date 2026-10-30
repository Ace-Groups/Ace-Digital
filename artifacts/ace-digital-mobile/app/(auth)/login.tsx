import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
  TextInput,
  Linking
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, radius } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');
const CARD_PADDING = 24;
const CARD_WIDTH = width - 40; // width minus horizontal margins (20 * 2)
const SLIDE_WIDTH = CARD_WIDTH - CARD_PADDING * 2;

export default function LoginScreen() {
  const { c } = useTheme();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const passwordInputRef = useRef<TextInput>(null);

  // Card entrance animations
  const cardFadeAnim = useRef(new Animated.Value(0)).current;
  const cardSlideAnim = useRef(new Animated.Value(40)).current;
  
  // Horizontal slide transition between steps
  const slideTransition = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animations on mount
    Animated.parallel([
      Animated.timing(cardFadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(cardSlideAnim, { toValue: 0, tension: 25, friction: 8, useNativeDriver: true })
    ]).start();
  }, []);

  const validateEmailStep = (): boolean => {
    const e: typeof errors = {};
    const trimmed = email.trim();
    if (!trimmed) {
      e.email = 'Email is required';
    } else if (!trimmed.includes('@')) {
      e.email = 'Enter a valid email address';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validatePasswordStep = (): boolean => {
    const e: typeof errors = {};
    if (!password) {
      e.password = 'Password is required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = () => {
    if (!validateEmailStep()) return;
    
    // Slide form left to show password input
    Animated.timing(slideTransition, {
      toValue: -SLIDE_WIDTH - CARD_PADDING,
      duration: 350,
      useNativeDriver: true,
    }).start(() => {
      setStep('password');
      passwordInputRef.current?.focus();
    });
  };

  const handleBack = () => {
    // Slide form right to show email input
    Animated.timing(slideTransition, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
    }).start(() => {
      setStep('email');
    });
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!validatePasswordStep()) return;
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: any) {
      const msg = err?.message ?? 'Login failed';
      Alert.alert('Login Failed', msg.includes('401') ? 'Invalid email or password' : msg);
    } finally {
      setLoading(false);
    }
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  // Custom typography style using Georgia for serif and system for sans
  const serifFont = Platform.select({ ios: 'Georgia', android: 'serif' });

  return (
    <View style={styles.container}>
      {/* Primary Splash Background GIF */}
      <Image
        source={require('../../assets/splash_login.gif')}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        transition={400}
      />
      
      {/* Subtle overlay to enhance contrast */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(10, 25, 47, 0.25)' }]} />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Animated Floating Glassmorphism Card */}
            <Animated.View style={[
              styles.cardContainer,
              {
                opacity: cardFadeAnim,
                transform: [{ translateY: cardSlideAnim }]
              }
            ]}>
              <BlurView intensity={45} tint="light" style={styles.blurBackground} />
              
              {/* Actual content of the card */}
              <View style={styles.cardContent}>
                
                {/* Horizontal Paging Container */}
                <View style={styles.formViewPort}>
                  <Animated.View style={[
                    styles.slideTrack,
                    { transform: [{ translateX: slideTransition }] }
                  ]}>
                    
                    {/* --- STEP 1: EMAIL ENTRY --- */}
                    <View style={styles.slideView}>
                      <Text style={[styles.fieldLabel, { fontFamily: serifFont }]}>
                        YOUR EMAIL ADDRESS
                      </Text>
                      
                      <View style={[styles.inputBox, errors.email ? styles.inputError : null]}>
                        <Ionicons name="mail-outline" size={20} color="#475569" style={styles.inputIcon} />
                        <TextInput
                          style={[styles.textInput, { fontFamily: serifFont }]}
                          placeholder="Enter your email address"
                          placeholderTextColor="#94A3B8"
                          value={email}
                          onChangeText={(t) => {
                            setEmail(t);
                            setErrors((prev) => ({ ...prev, email: undefined }));
                          }}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                          editable={!loading}
                          returnKeyType="next"
                          onSubmitEditing={handleContinue}
                        />
                      </View>
                      {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={styles.actionButton}
                        onPress={handleContinue}
                      >
                        <Text style={[styles.actionButtonText, { fontFamily: serifFont }]}>
                          Continue
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* GAP BETWEEN SLIDES */}
                    <View style={{ width: CARD_PADDING }} />

                    {/* --- STEP 2: PASSWORD ENTRY --- */}
                    <View style={styles.slideView}>
                      <View style={styles.passwordHeader}>
                        <TouchableOpacity 
                          onPress={handleBack} 
                          style={styles.backLink} 
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons name="arrow-back-outline" size={16} color="#334155" />
                          <Text style={[styles.backText, { fontFamily: serifFont }]}>
                            {email.length > 22 ? `${email.substring(0, 19)}...` : email}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <Text style={[styles.fieldLabel, { fontFamily: serifFont }]}>
                        YOUR PASSWORD
                      </Text>
                      
                      <View style={[styles.inputBox, errors.password ? styles.inputError : null]}>
                        <Ionicons name="lock-closed-outline" size={20} color="#475569" style={styles.inputIcon} />
                        <TextInput
                          ref={passwordInputRef}
                          style={[styles.textInput, { fontFamily: serifFont }]}
                          placeholder="Enter your password"
                          placeholderTextColor="#94A3B8"
                          value={password}
                          onChangeText={(t) => {
                            setPassword(t);
                            setErrors((prev) => ({ ...prev, password: undefined }));
                          }}
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                          autoCorrect={false}
                          editable={!loading}
                          returnKeyType="done"
                          onSubmitEditing={handleLogin}
                        />
                        <TouchableOpacity
                          onPress={() => setShowPassword(!showPassword)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons
                            name={showPassword ? "eye-off-outline" : "eye-outline"}
                            size={20}
                            color="#475569"
                          />
                        </TouchableOpacity>
                      </View>
                      {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={styles.actionButton}
                        onPress={handleLogin}
                        disabled={loading}
                      >
                        <Text style={[styles.actionButtonText, { fontFamily: serifFont }]}>
                          {loading ? 'Signing In...' : 'Continue'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                  </Animated.View>
                </View>

                {/* Disclaimer Links */}
                <View style={styles.disclaimerContainer}>
                  <Text style={[styles.disclaimerText, { fontFamily: serifFont }]}>
                    by proceeding you agree to our{' '}
                    <Text style={[styles.linkText, { fontFamily: serifFont }]} onPress={() => openLink('https://acedigital.cc/terms')}>
                      terms of use
                    </Text>{' '}
                    &{' '}
                    <Text style={[styles.linkText, { fontFamily: serifFont }]} onPress={() => openLink('https://acedigital.cc/privacy')}>
                      privacy policy
                    </Text>
                  </Text>
                </View>

              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050B14',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingBottom: Platform.OS === 'ios' ? spacing[10] : spacing[6],
  },
  cardContainer: {
    width: CARD_WIDTH,
    marginHorizontal: 20,
    marginBottom: spacing[4],
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 10,
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContent: {
    padding: CARD_PADDING,
  },
  formViewPort: {
    width: SLIDE_WIDTH,
    overflow: 'hidden',
    minHeight: 180,
  },
  slideTrack: {
    flexDirection: 'row',
    width: SLIDE_WIDTH * 2 + CARD_PADDING,
  },
  slideView: {
    width: SLIDE_WIDTH,
  },
  passwordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  backText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
    marginLeft: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 2,
    marginBottom: spacing[3],
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    height: 54,
    paddingHorizontal: 16,
    shadowColor: 'rgba(0, 0, 0, 0.03)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
    height: '100%',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    fontWeight: '600',
    marginLeft: 4,
  },
  actionButton: {
    backgroundColor: '#334155', // Slate-700
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[5],
    shadowColor: '#334155',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  disclaimerContainer: {
    marginTop: spacing[5],
    alignItems: 'center',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },
  linkText: {
    color: '#0F172A',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
