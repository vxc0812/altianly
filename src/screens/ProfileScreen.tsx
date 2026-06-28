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
  Modal,
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
import { isWebAuthnAvailable } from '../services/webauthn'
import { registerWithPasskey, loginWithPasskey, setSessionToken } from '../services/auth'

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

export default function ProfileScreen({ navigation }: Props) {
  const { theme } = useTheme()
  const s = styles(theme)

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  const [passkeyBusy, setPasskeyBusy] = useState(false)
  const passkeyWebAvailable = Platform.OS === 'web' && isWebAuthnAvailable()

  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [disclaimerChecked, setDisclaimerChecked] = useState(false)

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

  async function handleNativeRegister() {
    if (!name.trim()) { Alert.alert('Error', 'Name is required'); return }
    if (!email.trim()) { Alert.alert('Error', 'Email is required'); return }

    const newProfile: UserProfile = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    }
    await saveUserProfile(newProfile)
    await updateLastActivity()
    navigation.replace('Home')
  }

  async function handleWebRegister() {
    if (!name.trim()) { Alert.alert('Error', 'Name is required'); return }
    if (!email.trim()) { Alert.alert('Error', 'Email is required'); return }
    setDisclaimerChecked(false)
    setShowDisclaimer(true)
  }

  async function completeWebRegister() {
    setShowDisclaimer(false)
    setPasskeyBusy(true)
    const result = await registerWithPasskey(name.trim(), email.trim())
    setPasskeyBusy(false)
    if (result.ok) {
      navigation.replace('Home')
    } else if (result.error) {
      Alert.alert('Registration Failed', result.error)
    }
  }

  async function handleWebLogin() {
    setPasskeyBusy(true)
    const result = await loginWithPasskey()
    setPasskeyBusy(false)
    if (result.ok) {
      navigation.replace('Home')
    } else if (result.error) {
      Alert.alert('Login Failed', result.error)
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
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {!isRootScreen(navigation) && (
          <View style={s.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={s.backText}>{'< Back'}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={s.formSection}>
          <Text style={s.formTitle}>Create your account</Text>
          <Text style={s.formSubtitle}>
            Enter your name and email to begin your fitness journey. No password needed — we use passkeys for secure login.
          </Text>

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

          {passkeyWebAvailable ? (
            <TouchableOpacity
              style={s.primaryButton}
              onPress={handleWebRegister}
              disabled={passkeyBusy}
            >
              {passkeyBusy
                ? <ActivityIndicator color="#FFF" size="small" />
                : <Text style={s.primaryButtonText}>Register with Passkey</Text>
              }
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.primaryButton} onPress={handleNativeRegister}>
              <Text style={s.primaryButtonText}>Create Account</Text>
            </TouchableOpacity>
          )}

          {passkeyWebAvailable && (
            <>
              <View style={s.dividerRow}>
                <View style={s.dividerLine} />
                <Text style={s.dividerText}>or</Text>
                <View style={s.dividerLine} />
              </View>

              <TouchableOpacity
                style={s.secondaryButton}
                onPress={handleWebLogin}
                disabled={passkeyBusy}
              >
                {passkeyBusy
                  ? <ActivityIndicator color={theme.accent} size="small" />
                  : <Text style={s.secondaryButtonText}>Login with Passkey</Text>
                }
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      <Modal visible={showDisclaimer} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.disclaimerModal}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={s.disclaimerHeader}>
                <Text style={s.disclaimerHeaderText}>Before you begin — read this</Text>
                <TouchableOpacity onPress={() => setShowDisclaimer(false)}>
                  <Text style={s.disclaimerDismiss}>Cancel</Text>
                </TouchableOpacity>
              </View>

              <View style={s.disclaimerBody}>
                <Text style={s.disclaimerSectionLabel}>Medical disclaimer</Text>
                <Text style={s.disclaimerSectionText}>
                  This app provides general fitness content for informational purposes only. Nothing here constitutes medical advice, diagnosis, or treatment. Consult a licensed physician or qualified healthcare professional before starting any exercise program, especially if you have a pre-existing medical condition, injury, disability, or have been physically inactive.
                </Text>

                <Text style={s.disclaimerSectionLabel}>Assumption of risk</Text>
                <Text style={s.disclaimerSectionText}>
                  Physical exercise carries inherent risk of injury or harm. By using this app, you voluntarily assume full responsibility for any injury, loss, or damage that may result from participating in these workouts. This app and its creators are not liable for any harm arising from your use of this content.
                </Text>

                <Text style={s.disclaimerSectionLabel}>No guarantee of results</Text>
                <Text style={s.disclaimerSectionText}>
                  Results vary by individual based on factors including fitness level, diet, consistency, and genetics. We make no guarantee that any workout will help you achieve a specific goal. Any results shown or described are illustrative and not typical.
                </Text>

                <View style={s.disclaimerDangerBox}>
                  <Text style={s.disclaimerDangerText}>
                    <Text style={{ fontWeight: '700' }}>Stop exercising immediately</Text> if you experience chest pain, dizziness, shortness of breath, or severe discomfort. Seek emergency medical attention if needed.
                  </Text>
                </View>

                <TouchableOpacity
                  style={s.disclaimerCheckRow}
                  onPress={() => setDisclaimerChecked(!disclaimerChecked)}
                  activeOpacity={0.7}
                >
                  <View style={[s.disclaimerCheckbox, disclaimerChecked && s.disclaimerCheckboxChecked]}>
                    {disclaimerChecked && <Text style={s.disclaimerCheckmark}>✓</Text>}
                  </View>
                  <Text style={s.disclaimerCheckLabel}>
                    I have read and understood this disclaimer. I accept full responsibility for my participation and acknowledge that results are not guaranteed.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.disclaimerCta, !disclaimerChecked && s.disclaimerCtaDisabled]}
                  disabled={!disclaimerChecked}
                  onPress={completeWebRegister}
                >
                  <Text style={[s.disclaimerCtaText, !disclaimerChecked && s.disclaimerCtaTextDisabled]}>
                    I understand, let's start
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  loadingText: { color: t.textSecondary, fontSize: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  backText: { color: t.accent, fontSize: 16 },
  // Avatar section
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatar: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: t.accent,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  avatarText: { color: '#FFF', fontSize: 32, fontWeight: '700' },
  profileName: { color: t.text, fontSize: 24, fontWeight: '700', marginBottom: 4 },
  profileEmail: { color: t.textSecondary, fontSize: 15, marginBottom: 8 },
  memberSince: { color: t.textMuted, fontSize: 13 },
  // Stats
  statsRow: {
    flexDirection: 'row', backgroundColor: t.surface, borderRadius: 12,
    borderWidth: 1, borderColor: t.border, marginBottom: 32,
  },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16 },
  statDivider: { width: 1, backgroundColor: t.border, alignSelf: 'stretch' },
  statValue: { color: t.text, fontSize: 20, fontWeight: '700', marginBottom: 4 },
  statLabel: { color: t.textSecondary, fontSize: 13 },
  // Logout
  logoutButton: {
    backgroundColor: t.surface, borderWidth: 1, borderColor: t.danger,
    borderRadius: 8, padding: 15, alignItems: 'center', minHeight: 50, justifyContent: 'center',
  },
  logoutText: { color: t.danger, fontSize: 16, fontWeight: '600' },
  // Form
  formSection: { paddingTop: 40 },
  formTitle: { color: t.text, fontSize: 28, fontWeight: '800', marginBottom: 8 },
  formSubtitle: { color: t.textSecondary, fontSize: 15, lineHeight: 22, marginBottom: 28 },
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
