import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { RootStackParamList, UserProfile } from '../types'
import {
  getUserProfile,
  saveUserProfile,
  updateLastActivity,
} from '../services/storage'
import { useTheme } from '../context/ThemeContext'
import { Theme } from '../constants/theme'
import { registerWithPassword, loginWithPassword, setSessionToken } from '../services/auth'

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Profile'> }

function isRootScreen(navigation: Props['navigation']): boolean {
  const state = navigation.getState()
  return state ? state.routes[0]?.name === 'Profile' && state.index === 0 : true
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.toLocaleString('default', { month: 'long' })} ${d.getDate()}, ${d.getFullYear()}`
}

const FEATURES = [
  { icon: '⚡', title: 'AI Workout Plans', desc: 'Generate personalized plans via OpenRouter, Ollama, or HuggingFace. Structured sets, reps, rest, and progression.' },
  { icon: '📊', title: 'BMI & Progress', desc: 'Track your BMI over time with line charts. Streaks, badges, and weight history to keep you motivated.' },
  { icon: '🏋️', title: 'Workout Logging', desc: 'Log actual sets, reps, and weight. Review past logs tied to saved plans.' },
]

export default function ProfileScreen({ navigation }: Props) {
  const { theme } = useTheme()
  const s = styles(theme)

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [showLogin, setShowLogin] = useState(false)

  useFocusEffect(useCallback(() => {
    ;(async () => {
      const p = await getUserProfile()
      setProfile(p)
      if (p && isRootScreen(navigation)) {
        navigation.replace('Home')
        return
      }
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        const qn = params.get('name')
        const qe = params.get('email')
        if (qn) setName(qn)
        if (qe) setEmail(qe)
      }
      setLoading(false)
    })()
  }, []))

  async function handleRegister() {
    if (!name.trim()) { Alert.alert('Error', 'Name is required'); return }
    if (!email.trim()) { Alert.alert('Error', 'Email is required'); return }
    if (!password) { Alert.alert('Error', 'Password is required'); return }
    if (password.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters'); return }
    if (password !== confirmPassword) { Alert.alert('Error', 'Passwords do not match'); return }

    setBusy(true)
    const result = await registerWithPassword(name.trim(), email.trim(), password)
    setBusy(false)
    if (result.ok) {
      navigation.replace('Home')
    } else {
      Alert.alert('Registration Failed', result.error || 'Unknown error')
    }
  }

  async function handleLogin() {
    if (!email.trim()) { Alert.alert('Error', 'Email is required'); return }
    if (!password) { Alert.alert('Error', 'Password is required'); return }

    setBusy(true)
    const result = await loginWithPassword(email.trim(), password)
    setBusy(false)
    if (result.ok) {
      navigation.replace('Home')
    } else {
      Alert.alert('Login Failed', result.error || 'Unknown error')
    }
  }

  function doLogout() {
    setSessionToken(null)
    setProfile(null)
  }

  function handleLogout() {
    if (Platform.OS === 'web') {
      const ok = window.confirm('Are you sure you want to logout?')
      if (ok) doLogout()
    } else {
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: doLogout },
      ])
    }
  }

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={s.loadingText}>Loading...</Text>
      </View>
    )
  }

  if (profile) {
    return (
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <View style={s.headerRow}>
          {isRootScreen(navigation) ? (
            <TouchableOpacity onPress={() => navigation.replace('Home')}>
              <Text style={s.backText}>Home</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={s.backText}>{'< Back'}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.avatarSection}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{getInitials(profile.name)}</Text>
          </View>
          <Text style={s.profileName}>{profile.name}</Text>
          <Text style={s.profileEmail}>{profile.email}</Text>
          <Text style={s.memberSince}>Member since {formatDate(profile.createdAt)}</Text>
        </View>

        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statValue}>{Math.max(1, Math.floor((Date.now() - profile.createdAt) / 86400000))}</Text>
            <Text style={s.statLabel}>Days Active</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statCard}>
            <Text style={s.statValue}>{profile.lastLoginAt > profile.createdAt ? 'Yes' : 'New'}</Text>
            <Text style={s.statLabel}>Logged In</Text>
          </View>
        </View>

        <TouchableOpacity style={s.logoutButton} onPress={handleLogout}>
          <Text style={s.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    )
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.landingContent} keyboardShouldPersistTaps="handled">
        <View style={s.landingHeaderRow}>
          <View />
          <TouchableOpacity style={s.loginPill} onPress={() => setShowLogin(true)}>
            <Text style={s.loginPillText}>Login</Text>
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroBadge}>
            <Text style={s.heroBadgeText}>⚡ AI-Powered Workout Plans</Text>
          </View>
          <Text style={s.heroTitle}>Your personal{"\n"}fitness AI</Text>
          <Text style={s.heroDesc}>
            AI-generated workout plans tailored to your body metrics, fitness goals, and lifestyle. Track progress and log workouts.
          </Text>
        </View>

        {/* Features */}
        <Text style={s.sectionLabel}>Features</Text>
        {FEATURES.map((f, i) => (
          <View key={i} style={s.featureCard}>
            <Text style={s.featureIcon}>{f.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.featureTitle}>{f.title}</Text>
              <Text style={s.featureDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}

        {/* Signup / Login Form */}
        <View style={s.formSection}>
          <Text style={s.formTitle}>{showLogin ? 'Welcome back' : 'Get started'}</Text>
          <Text style={s.formSubtitle}>
            {showLogin
              ? 'Enter your email and password to log in.'
              : 'Create an account with email and password. Works across all your devices.'
            }
          </Text>

          {!showLogin && (
            <View style={s.inputGroup}>
              <Text style={s.label}>Name</Text>
              <TextInput
                style={s.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
          )}

          <View style={s.inputGroup}>
            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={theme.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Password</Text>
            <TextInput
              style={s.input}
              value={password}
              onChangeText={setPassword}
              placeholder={showLogin ? 'Your password' : 'At least 6 characters'}
              placeholderTextColor={theme.textMuted}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          {!showLogin && (
            <View style={s.inputGroup}>
              <Text style={s.label}>Confirm password</Text>
              <TextInput
                style={s.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat password"
                placeholderTextColor={theme.textMuted}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          )}

          <TouchableOpacity
            style={s.primaryButton}
            onPress={showLogin ? handleLogin : handleRegister}
            disabled={busy}
          >
            {busy
              ? <ActivityIndicator color="#FFF" size="small" />
              : <Text style={s.primaryButtonText}>{showLogin ? 'Log In' : 'Create Account'}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={s.loginLink} onPress={() => setShowLogin(!showLogin)}>
            <Text style={s.loginLinkText}>
              {showLogin ? "Don't have an account? Register" : 'Already registered? Log in'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={s.footer}>
          Logging in stores your data on our server so you can access it from any device.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  landingContent: { padding: 24, paddingTop: 60, paddingBottom: 60 },
  loadingText: { color: t.textSecondary, fontSize: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  backText: { color: t.accent, fontSize: 16 },
  landingHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, minHeight: 36 },
  loginPill: {
    borderWidth: 1, borderColor: t.accent, borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 7, minWidth: 72, alignItems: 'center',
  },
  loginPillText: { color: t.accent, fontSize: 14, fontWeight: '600' },

  // Hero
  hero: { alignItems: 'center', paddingVertical: 32 },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: t.accent + '18', borderWidth: 1, borderColor: t.accent + '30',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 20,
  },
  heroBadgeText: { color: t.accent, fontSize: 13, fontWeight: '600' },
  heroTitle: {
    fontSize: 36, fontWeight: '800', color: t.text, textAlign: 'center',
    letterSpacing: -0.5, marginBottom: 16,
  },
  heroDesc: {
    color: t.textSecondary, fontSize: 15, lineHeight: 22,
    textAlign: 'center', maxWidth: 340, marginBottom: 8,
  },

  // Features
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: t.textSecondary,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 8,
  },
  featureCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: t.surface, borderWidth: 1, borderColor: t.border,
    borderRadius: 12, padding: 16, marginBottom: 10,
  },
  featureIcon: { fontSize: 22, marginTop: 2 },
  featureTitle: { color: t.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  featureDesc: { color: t.textSecondary, fontSize: 13, lineHeight: 18 },

  // Logged-in
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatar: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: t.accent,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  avatarText: { color: '#FFF', fontSize: 32, fontWeight: '700' },
  profileName: { color: t.text, fontSize: 24, fontWeight: '700', marginBottom: 4 },
  profileEmail: { color: t.textSecondary, fontSize: 15, marginBottom: 8 },
  memberSince: { color: t.textMuted, fontSize: 13 },
  statsRow: {
    flexDirection: 'row', backgroundColor: t.surface, borderRadius: 12,
    borderWidth: 1, borderColor: t.border, marginBottom: 32,
  },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16 },
  statDivider: { width: 1, backgroundColor: t.border, alignSelf: 'stretch' },
  statValue: { color: t.text, fontSize: 20, fontWeight: '700', marginBottom: 4 },
  statLabel: { color: t.textSecondary, fontSize: 13 },
  logoutButton: {
    backgroundColor: t.surface, borderWidth: 1, borderColor: t.danger,
    borderRadius: 8, padding: 15, alignItems: 'center', minHeight: 50, justifyContent: 'center',
  },
  logoutText: { color: t.danger, fontSize: 16, fontWeight: '600' },

  // Form
  formSection: { marginTop: 24 },
  formTitle: { color: t.text, fontSize: 24, fontWeight: '800', marginBottom: 8 },
  formSubtitle: { color: t.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 24 },
  inputGroup: { marginBottom: 20 },
  label: { color: t.text, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.border,
    borderRadius: 8, padding: 14, color: t.text, fontSize: 15,
  },
  primaryButton: {
    backgroundColor: t.accent, borderRadius: 8, padding: 15,
    alignItems: 'center', minHeight: 50, justifyContent: 'center', marginTop: 8,
  },
  primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: t.surface, borderWidth: 1, borderColor: t.accent,
    borderRadius: 8, padding: 15, alignItems: 'center', minHeight: 50,
    justifyContent: 'center', marginTop: 8,
  },
  secondaryButtonText: { color: t.accent, fontSize: 15, fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: t.border },
  dividerText: { color: t.textSecondary, fontSize: 13 },

  loginLink: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  loginLinkText: { color: t.textSecondary, fontSize: 14, textDecorationLine: 'underline' },

  // Footer
  footer: { color: t.textMuted, fontSize: 12, textAlign: 'center', marginTop: 32 },

  // Disclaimer
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  disclaimerModal: {
    backgroundColor: t.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: '90%', paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  disclaimerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: t.border,
  },
  disclaimerHeaderText: { fontSize: 16, fontWeight: '700', color: t.text },
  disclaimerDismiss: { color: t.accent, fontSize: 15, fontWeight: '600' },
  disclaimerBody: { padding: 20 },
  disclaimerSectionLabel: {
    fontSize: 11, fontWeight: '700', color: t.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, marginTop: 16,
  },
  disclaimerSectionText: {
    fontSize: 13, color: t.textSecondary, lineHeight: 20, marginBottom: 4,
  },
  disclaimerDangerBox: {
    backgroundColor: t.danger + '18', borderWidth: 1, borderColor: t.danger + '50',
    borderRadius: 8, padding: 12, marginTop: 20, marginBottom: 20,
  },
  disclaimerDangerText: { fontSize: 13, color: t.danger, lineHeight: 20 },
  disclaimerCheckRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginBottom: 20, paddingRight: 4,
  },
  disclaimerCheckbox: {
    width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: t.accent,
    alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0,
  },
  disclaimerCheckboxChecked: { backgroundColor: t.accent },
  disclaimerCheckmark: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  disclaimerCheckLabel: {
    flex: 1, fontSize: 13, color: t.textSecondary, lineHeight: 19,
  },
  disclaimerCta: {
    backgroundColor: t.accent, borderRadius: 8, padding: 14,
    alignItems: 'center', minHeight: 48, justifyContent: 'center',
  },
  disclaimerCtaDisabled: { opacity: 0.4 },
  disclaimerCtaText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  disclaimerCtaTextDisabled: { color: '#FFF' },
})
