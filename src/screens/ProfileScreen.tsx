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
} from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { RootStackParamList, UserProfile } from '../types'
import {
  getUserProfile,
  saveUserProfile,
  deleteUserProfile,
} from '../services/storage'
import { useTheme } from '../context/ThemeContext'
import { Theme } from '../constants/theme'

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Profile'> }

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

  const [isRegister, setIsRegister] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useFocusEffect(useCallback(() => {
    ;(async () => {
      const p = await getUserProfile()
      setProfile(p)
      setLoading(false)
    })()
  }, []))

  function resetForm() {
    setName('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
  }

  function switchMode() {
    resetForm()
    setIsRegister((prev) => !prev)
  }

  async function handleLogin() {
    if (!email.trim()) { Alert.alert('Error', 'Email is required'); return }
    if (!password.trim()) { Alert.alert('Error', 'Password is required'); return }

    const saved = await getUserProfile()
    if (!saved) {
      Alert.alert('Error', 'No account found. Please register first.')
      return
    }
    if (saved.email.toLowerCase() !== email.trim().toLowerCase()) {
      Alert.alert('Error', 'No account found with that email.')
      return
    }
    if (saved.password !== password) {
      Alert.alert('Error', 'Incorrect password.')
      return
    }

    const updated: UserProfile = { ...saved, lastLoginAt: Date.now() }
    await saveUserProfile(updated)
    setProfile(updated)
    resetForm()
  }

  async function handleRegister() {
    if (!name.trim()) { Alert.alert('Error', 'Name is required'); return }
    if (!email.trim()) { Alert.alert('Error', 'Email is required'); return }
    if (!password.trim()) { Alert.alert('Error', 'Password is required'); return }
    if (password.length < 4) { Alert.alert('Error', 'Password must be at least 4 characters'); return }
    if (password !== confirmPassword) { Alert.alert('Error', 'Passwords do not match'); return }

    const existing = await getUserProfile()
    if (existing) {
      Alert.alert('Error', 'An account already exists on this device.')
      return
    }

    const newProfile: UserProfile = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    }
    await saveUserProfile(newProfile)
    setProfile(newProfile)
    resetForm()
  }

  async function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await deleteUserProfile()
          setProfile(null)
          resetForm()
        },
      },
    ])
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
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={s.backText}>{'< Back'}</Text>
          </TouchableOpacity>
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
            <Text style={s.statValue}>1</Text>
            <Text style={s.statLabel}>Profile</Text>
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
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={s.backText}>{'< Back'}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.formSection}>
          <Text style={s.formTitle}>{isRegister ? 'Create Account' : 'Login'}</Text>
          <Text style={s.formSubtitle}>
            {isRegister
              ? 'Create your profile to personalize your experience'
              : 'Sign in to your account'}
          </Text>

          {isRegister && (
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
              placeholder={isRegister ? 'Create a password' : 'Your password'}
              placeholderTextColor={theme.textMuted}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          {isRegister && (
            <View style={s.inputGroup}>
              <Text style={s.label}>Confirm Password</Text>
              <TextInput
                style={s.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter password"
                placeholderTextColor={theme.textMuted}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          )}

          <TouchableOpacity
            style={s.primaryButton}
            onPress={isRegister ? handleRegister : handleLogin}
          >
            <Text style={s.primaryButtonText}>{isRegister ? 'Create Account' : 'Login'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.switchButton} onPress={switchMode}>
            <Text style={s.switchText}>
              {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  switchButton: { alignItems: 'center', marginTop: 20, padding: 8 },
  switchText: { color: t.accent, fontSize: 14, fontWeight: '500' },
})
