import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, typography, spacing, radius } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input } from '@/components/ui';

export default function LoginScreen() {
  const { c, isDark } = useTheme();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!email.includes('@')) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
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
      colors={isDark ? ['#0A0A1A', '#141428', '#1E1E3A'] : ['#EEF2FF', '#F8FAFC', '#FFFFFF']}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo / Branding */}
          <View style={styles.brandSection}>
            <View style={[styles.logoCircle, { backgroundColor: c.primaryLight }]}>
              <Ionicons name="diamond" size={40} color={c.primaryText} />
            </View>
            <Text style={[styles.brandTitle, { color: c.text }]}>Ace Digital</Text>
            <Text style={[styles.brandSubtitle, { color: c.textSecondary }]}>
              Sign in to your workspace
            </Text>
          </View>

          {/* Form */}
          <View style={[styles.formCard, { backgroundColor: c.surface, borderColor: c.border }]}>
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
            />

            <View>
              <Input
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: undefined })); }}
                error={errors.password}
                secureTextEntry={!showPassword}
                textContentType="password"
                autoCapitalize="none"
              />
            </View>

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              size="lg"
              style={{ marginTop: spacing[2] }}
            />
          </View>

          <Text style={[styles.footer, { color: c.textTertiary }]}>
            Ace Digital OS · Secure Workspace
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  flex: {
    flex: 1,
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
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  brandTitle: {
    ...typography.h2,
    marginBottom: spacing[1],
  },
  brandSubtitle: {
    ...typography.body,
  },
  formCard: {
    borderRadius: radius.xl,
    padding: spacing[6],
    borderWidth: 1,
  },
  footer: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing[8],
  },
});
