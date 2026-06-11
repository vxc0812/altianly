import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList, LLMConfig } from '../types'
import { getLLMConfig, saveLLMConfig } from '../services/storage'
import { testConnection } from '../services/llm'
import { PROVIDER_INFO, DEFAULT_LLM_CONFIGS } from '../constants'
import { useTheme } from '../context/ThemeContext'
import { Theme } from '../constants/theme'

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'> }
type Provider = LLMConfig['provider']
const PROVIDERS: Provider[] = ['ollama', 'openrouter', 'huggingface']

export default function SettingsScreen({ navigation }: Props) {
  const { theme, mode, toggleTheme } = useTheme()
  const s = styles(theme)
  const [provider, setProvider] = useState<Provider>('ollama')
  const [baseUrl, setBaseUrl] = useState('')
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => { loadConfig() }, [])
  useEffect(() => {
    if (!loaded) return
    const defaults = DEFAULT_LLM_CONFIGS[provider]
    setBaseUrl(defaults.baseUrl)
    setModel(defaults.model)
    setApiKey('')
  }, [provider])

  async function loadConfig() {
    const saved = await getLLMConfig()
    if (saved) { setProvider(saved.provider); setBaseUrl(saved.baseUrl); setModel(saved.model); setApiKey(saved.apiKey || '') }
    else { const d = DEFAULT_LLM_CONFIGS.ollama; setBaseUrl(d.baseUrl); setModel(d.model) }
    setLoaded(true)
  }

  async function handleSave() {
    if (!model.trim()) { Alert.alert('Error', 'Model name is required'); return }
    if (PROVIDER_INFO[provider].needsApiKey && !apiKey.trim()) { Alert.alert('Error', 'API key is required'); return }
    if (PROVIDER_INFO[provider].needsBaseUrl && !baseUrl.trim()) { Alert.alert('Error', 'Base URL is required'); return }

    setSaving(true)
    const config: LLMConfig = { provider, baseUrl: baseUrl.trim(), model: model.trim(), apiKey: apiKey.trim() || undefined }
    await saveLLMConfig(config)
    setSaving(false)
    Alert.alert('Saved', 'LLM configuration saved successfully')
  }

  async function handleTest() {
    if (!model.trim()) { Alert.alert('Error', 'Enter a model name first'); return }
    setTesting(true)
    try {
      const config: LLMConfig = { provider, baseUrl: baseUrl.trim(), model: model.trim(), apiKey: apiKey.trim() || undefined }
      const result = await testConnection(config)
      Alert.alert('Connection Successful', result)
    } catch (e) {
      Alert.alert('Connection Failed', e instanceof Error ? e.message : 'Unknown error')
    } finally { setTesting(false) }
  }

  const info = PROVIDER_INFO[provider]

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TouchableOpacity style={s.backButton} onPress={() => navigation.goBack()}>
        <Text style={s.backText}>{'< Back'}</Text>
      </TouchableOpacity>

      <Text style={s.heading}>Settings</Text>

      <Text style={s.sectionTitle}>Appearance</Text>
      <TouchableOpacity style={s.themeCard} onPress={toggleTheme}>
        <View>
          <Text style={s.themeLabel}>
            Theme: {mode === 'dark' ? 'Dark' : 'Cream'}
          </Text>
          <Text style={s.themeDesc}>Switch between dark and cream background</Text>
        </View>
        <Text style={s.themeToggle}>{mode === 'dark' ? '☀️' : '🌙'}</Text>
      </TouchableOpacity>

      <Text style={[s.sectionTitle, { marginTop: 28 }]}>LLM Provider</Text>
      <View style={s.providerRow}>
        {PROVIDERS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[s.providerCard, provider === p && s.providerCardSelected]}
            onPress={() => setProvider(p)}
          >
            <Text style={[s.providerLabel, provider === p && s.providerLabelSelected]}>
              {PROVIDER_INFO[p].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {info.needsBaseUrl && (
        <View style={s.inputGroup}>
          <Text style={s.label}>Base URL</Text>
          <TextInput style={s.input} value={baseUrl} onChangeText={setBaseUrl} placeholder={info.defaultBaseUrl} placeholderTextColor={theme.textMuted} autoCapitalize="none" autoCorrect={false} />
        </View>
      )}

      <View style={s.inputGroup}>
        <Text style={s.label}>Model</Text>
        <TextInput style={s.input} value={model} onChangeText={setModel} placeholder={`e.g. llama3.2`} placeholderTextColor={theme.textMuted} autoCapitalize="none" autoCorrect={false} />
      </View>

      {info.needsApiKey && (
        <View style={s.inputGroup}>
          <Text style={s.label}>API Key</Text>
          <TextInput style={s.input} value={apiKey} onChangeText={setApiKey} placeholder="sk-..." placeholderTextColor={theme.textMuted} secureTextEntry autoCapitalize="none" autoCorrect={false} />
          <Text style={s.hint}>Stored securely on-device, never sent elsewhere.</Text>
        </View>
      )}

      <View style={s.actions}>
        <TouchableOpacity style={[s.button, s.testButton]} onPress={handleTest} disabled={testing}>
          {testing ? <ActivityIndicator color={theme.accent} size="small" /> : <Text style={s.testButtonText}>Test Connection</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={[s.button, s.saveButton]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={s.saveButtonText}>Save Settings</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  backButton: { marginBottom: 20 },
  backText: { color: t.accent, fontSize: 16 },
  heading: { fontSize: 28, fontWeight: '800', color: t.text },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: t.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1, marginTop: 24 },
  themeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 10,
    padding: 16,
  },
  themeLabel: { color: t.text, fontSize: 16, fontWeight: '600' },
  themeDesc: { color: t.textSecondary, fontSize: 13, marginTop: 2 },
  themeToggle: { fontSize: 24 },
  providerRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  providerCard: { flex: 1, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 14, alignItems: 'center' },
  providerCardSelected: { borderColor: t.accent, backgroundColor: t.isDark ? '#1C2533' : '#F3EDFF' },
  providerLabel: { color: t.textSecondary, fontSize: 14, fontWeight: '600' },
  providerLabelSelected: { color: t.accent },
  inputGroup: { marginBottom: 20 },
  label: { color: t.text, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.border, borderRadius: 8, padding: 14, color: t.text, fontSize: 15 },
  hint: { color: t.textSecondary, fontSize: 12, marginTop: 6, lineHeight: 16 },
  actions: { gap: 12, marginTop: 12 },
  button: { padding: 15, borderRadius: 8, alignItems: 'center', minHeight: 50, justifyContent: 'center' },
  testButton: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
  testButtonText: { color: t.accent, fontSize: 15, fontWeight: '600' },
  saveButton: { backgroundColor: t.success },
  saveButtonText: { color: t.successText, fontSize: 16, fontWeight: '700' },
})
