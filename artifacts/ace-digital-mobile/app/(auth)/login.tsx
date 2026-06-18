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
  TouchableWithoutFeedback
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, typography, spacing, radius } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input } from '@/components/ui';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const { c, isDark } = useTheme();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // Animation values
  const fadeAnimLogo = useRef(new Animated.Value(0)).current;
  const slideAnimLogo = useRef(new Animated.Value(30)).current;
  
  const fadeAnimForm = useRef(new Animated.Value(0)).current;
  const slideAnimForm = useRef(new Animated.Value(30)).current;
  
  const fadeAnimFooter = useRef(new Animated.Value(0)).current;
  const slideAnimFooter = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.stagger(200, [
      Animated.parallel([
        Animated.timing(fadeAnimLogo, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnimLogo, { toValue: 0, tension: 40, friction: 7, useNativeDriver: true })
      ]),
      Animated.parallel([
        Animated.timing(fadeAnimForm, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnimForm, { toValue: 0, tension: 40, friction: 7, useNativeDriver: true })
      ]),
      Animated.parallel([
        Animated.timing(fadeAnimFooter, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnimFooter, { toValue: 0, tension: 40, friction: 7, useNativeDriver: true })
      ])
    ]).start();
  }, []);

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!email.includes('@')) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!validate()) return;
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

  return (
    <LinearGradient
      colors={isDark ? ['#050B14', '#0A1930', '#102A4A'] : ['#E6F0FA', '#F5F9FF', '#FFFFFF']}
      style={styles.gradient}
    >
      {/* Background abstract shapes */}
      <View style={[styles.bgOrb, { backgroundColor: c.primary, opacity: 0.1, top: -height * 0.1, left: -width * 0.2 }]} />
      <View style={[styles.bgOrb, { backgroundColor: c.secondary, opacity: 0.08, bottom: -height * 0.1, right: -width * 0.2 }]} />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo / Branding */}
            <Animated.View style={[styles.brandSection, { opacity: fadeAnimLogo, transform: [{ translateY: slideAnimLogo }] }]}>
              <View style={[styles.logoOuterCircle, { backgroundColor: c.primaryLight }]}>
                <View style={[styles.logoCircle, { backgroundColor: c.primary }]}>
                  <Ionicons name="layers" size={44} color="#FFFFFF" />
                </View>
              </View>
              <Text style={[styles.brandTitle, { color: c.text }]}>Ace Digital</Text>
              <Text style={[styles.brandSubtitle, { color: c.textSecondary }]}>
                Secure Workspace Portal
              </Text>
            </Animated.View>

            {/* Form */}
            <Animated.View style={[
              styles.formCard, 
              { 
                backgroundColor: c.surfaceElevated, 
                borderColor: c.borderSubtle,
                opacity: fadeAnimForm,
                transform: [{ translateY: slideAnimForm }]
              }
            ]}>
              <Text style={[styles.formTitle, { color: c.text }]}>Sign In</Text>
              
              <Input
                label="Email"
                placeholder="you@acedigital.cc"
                value={email}
                onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: undefined })); }}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                editable={!loading}
              />

              <View style={styles.passwordContainer}>
                <Input
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: undefined })); }}
                  error={errors.password}
                  secureTextEntry={!showPassword}
                  textContentType="password"
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity 
                  style={[styles.eyeIcon, errors.password ? { top: 38 } : { top: 38 }]} 
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color={c.textTertiary} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={[styles.forgotText, { color: c.primary }]}>Forgot password?</Text>
              </TouchableOpacity>

              <Button
                title="Continue"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                size="lg"
                style={styles.submitBtn}
              />
            </Animated.View>

            <Animated.Text style={[
              styles.footer, 
              { 
                color: c.textTertiary,
                opacity: fadeAnimFooter,
                transform: [{ translateY: slideAnimFooter }]
              }
            ]}>
              Powered by Ace Digital OS v1.0
            </Animated.Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  bgOrb: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    filter: 'blur(40px)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[10],
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  logoOuterCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  brandTitle: { ...typography.h1, marginBottom: spacing[1] },
  brandSubtitle: { ...typography.bodyMedium },
  formCard: {
    borderRadius: radius.2xl,
    padding: spacing[6],
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 4,
  },
  formTitle: {
    ...typography.h3,
    marginBottom: spacing[6],
    fontWeight: '700',
  },
  passwordContainer: { position: 'relative' },
  eyeIcon: {
    position: 'absolute',
    right: spacing[4],
    zIndex: 10,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: spacing[6],
    marginTop: -spacing[2],
  },
  forgotText: { ...typography.captionMedium, fontWeight: '600' },
  submitBtn: {
    borderRadius: radius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  footer: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing[10],
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});
