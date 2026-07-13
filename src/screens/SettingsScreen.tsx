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
  Modal,
} from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList, LLMConfig } from '../types'
import { getLLMConfig, saveLLMConfig } from '../services/storage'
import { testConnection } from '../services/llm'
import { PROVIDER_INFO, DEFAULT_LLM_CONFIGS, RECOMMENDED_MODELS, API_KEY_HELP, FONT_MONO } from '../constants'
import { useTheme } from '../context/ThemeContext'
import { Theme } from '../constants/theme'

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'> }
type Provider = LLMConfig['provider']
type ModelEntry = { id: string; name: string }
type TestResult = { ok: boolean; message: string } | null

const PROVIDERS: Provider[] = ['ollama', 'openrouter', 'huggingface', 'cloudflare']

export default function SettingsScreen({ navigation }: Props) {
  const { theme } = useTheme()
  const s = styles(theme)
  const [provider, setProvider] = useState<Provider>('openrouter')
  const [baseUrl, setBaseUrl] = useState('')
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [freeModels, setFreeModels] = useState<ModelEntry[]>([])
  const [paidModels, setPaidModels] = useState<ModelEntry[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [testResult, setTestResult] = useState<TestResult>(null)

  useEffect(() => { loadConfig() }, [])

  // Fetch models once config is loaded and provider is openrouter
  useEffect(() => {
    if (loaded && provider === 'openrouter') fetchORModels()
  }, [loaded])

  // When user manually switches provider
  useEffect(() => {
    if (!loaded) return
    const defaults = DEFAULT_LLM_CONFIGS[provider]
    setBaseUrl(defaults.baseUrl)
    setModel(defaults.model)
    setApiKey('')
    setTestResult(null)
    if (provider === 'openrouter') fetchORModels()
  }, [provider])

  async function loadConfig() {
    const saved = await getLLMConfig()
    if (saved) {
      setProvider(saved.provider)
      setBaseUrl(saved.baseUrl)
      setModel(saved.model)
      setApiKey(saved.apiKey || '')
    } else {
      const d = DEFAULT_LLM_CONFIGS.cloudflare
      setProvider('cloudflare')
      setBaseUrl(d.baseUrl)
      setModel(d.model)
    }
    setLoaded(true)
  }

  async function fetchORModels() {
    setLoadingModels(true)
    try {
      const res = await fetch('https://openrouter.ai/api/v1/models')
      const json = await res.json()
      const all: { id: string; name?: string }[] = json.data || []
      const free = all
        .filter((m) => m.id.endsWith(':free'))
        .map((m) => ({ id: m.id, name: m.name || m.id }))
        .sort((a, b) => a.name.localeCompare(b.name))
      const paid = all
        .filter((m) => !m.id.endsWith(':free'))
        .map((m) => ({ id: m.id, name: m.name || m.id }))
        .sort((a, b) => a.name.localeCompare(b.name))
      setFreeModels(free)
      setPaidModels(paid)
    } catch {
      const fallback = RECOMMENDED_MODELS.openrouter.map((m) => ({ id: m.id, name: m.label }))
      setFreeModels(fallback)
      setPaidModels([])
    } finally {
      setLoadingModels(false)
    }
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
    setTestResult(null)
    try {
      const config: LLMConfig = { provider, baseUrl: baseUrl.trim(), model: model.trim(), apiKey: apiKey.trim() || undefined }
      const message = await testConnection(config)
      setTestResult({ ok: true, message })
    } catch (e) {
      setTestResult({ ok: false, message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setTesting(false)
    }
  }

  function selectModel(id: string) {
    setModel(id)
    setTestResult(null)
    setShowPicker(false)
  }

  const info = PROVIDER_INFO[provider]
  const selectedModelName =
    provider === 'openrouter'
      ? [...freeModels, ...paidModels].find((m) => m.id === model)?.name ?? model
      : model

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.backText}>{'< Back'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Main', { screen: 'Home' } as never)}>
          <Text style={s.homeText}>Home</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.heading}>Settings</Text>

      <Text style={s.sectionTitle}>LLM Provider</Text>
      <View style={s.providerRow}>
        {PROVIDERS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[s.providerCard, provider === p && s.providerCardSelected]}
            onPress={() => setProvider(p)}
          >
            {PROVIDER_INFO[p].recommended && (
              <View style={s.recommendedBadge}>
                <Text style={s.recommendedText}>Recommended</Text>
              </View>
            )}
            <Text style={[s.providerLabel, provider === p && s.providerLabelSelected]}>
              {PROVIDER_INFO[p].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={s.providerDesc}>{info.desc}</Text>

      {info.needsBaseUrl && (
        <View style={s.inputGroup}>
          <Text style={s.label}>Base URL</Text>
          <TextInput
            style={s.input}
            value={baseUrl}
            onChangeText={setBaseUrl}
            placeholder={info.defaultBaseUrl}
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      )}

      <View style={s.inputGroup}>
        <Text style={s.label}>Model</Text>
        {provider === 'openrouter' ? (
          <TouchableOpacity
            style={s.modelPickerBtn}
            onPress={() => { if (!loadingModels) setShowPicker(true) }}
          >
            <Text style={model ? s.modelPickerValue : s.modelPickerPlaceholder} numberOfLines={1}>
              {model ? selectedModelName : 'Select a model...'}
            </Text>
            {loadingModels
              ? <ActivityIndicator size="small" color={theme.accent} />
              : <Text style={s.modelPickerArrow}>▾</Text>
            }
          </TouchableOpacity>
        ) : (
          <>
            <TextInput
              style={s.input}
              value={model}
              onChangeText={(v) => { setModel(v); setTestResult(null) }}
              placeholder="e.g. llama3.2"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={s.chipRow}>
              {RECOMMENDED_MODELS[provider].map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[s.modelChip, model === m.id && s.modelChipSelected]}
                  onPress={() => { setModel(m.id); setTestResult(null) }}
                >
                  <Text style={[s.modelChipText, model === m.id && s.modelChipTextSelected]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
        {!!model && provider === 'openrouter' && (
          <Text style={s.modelIdHint} numberOfLines={1}>{model}</Text>
        )}
      </View>

      {info.needsApiKey && (
        <View style={s.inputGroup}>
          <Text style={s.label}>API Key</Text>
          <TextInput
            style={s.input}
            value={apiKey}
            onChangeText={(v) => { setApiKey(v); setTestResult(null) }}
            placeholder="sk-or-..."
            placeholderTextColor={theme.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={s.hint}>Stored securely on-device, never sent elsewhere.</Text>
          {API_KEY_HELP[provider] && <Text style={s.apiKeyHelp}>{API_KEY_HELP[provider]}</Text>}
        </View>
      )}

      <View style={s.actions}>
        <TouchableOpacity style={[s.button, s.testButton]} onPress={handleTest} disabled={testing}>
          {testing
            ? <ActivityIndicator color={theme.accent} size="small" />
            : <Text style={s.testButtonText}>Test Connection</Text>
          }
        </TouchableOpacity>
        {testResult && (
          <View style={[s.testResult, testResult.ok ? s.testResultOk : s.testResultFail]}>
            <Text style={[s.testResultText, testResult.ok ? s.testResultTextOk : s.testResultTextFail]}>
              {testResult.ok ? 'Connected successfully' : testResult.message}
            </Text>
          </View>
        )}
        <TouchableOpacity style={[s.button, s.saveButton]} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#FFF" size="small" />
            : <Text style={s.saveButtonText}>Save Settings</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Model Picker Modal (OpenRouter only) */}
      <Modal visible={showPicker} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Select Model</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={s.modalClose}>Done</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalScroll} showsVerticalScrollIndicator={false}>
              {loadingModels && (
                <View style={s.modalLoading}>
                  <ActivityIndicator color={theme.accent} />
                  <Text style={s.modalLoadingText}>Loading models...</Text>
                </View>
              )}
              <Text style={s.modelGroupLabel}>Free Models ({freeModels.length})</Text>
              <View style={s.modelGroup}>
                {freeModels.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[s.modelRow, model === m.id && s.modelRowSelected]}
                    onPress={() => selectModel(m.id)}
                  >
                    <View style={s.modelRowInner}>
                      <Text style={[s.modelRowName, model === m.id && s.modelRowNameSelected]} numberOfLines={1}>{m.name}</Text>
                      <Text style={s.modelRowId} numberOfLines={1}>{m.id}</Text>
                    </View>
                    {model === m.id && <Text style={s.modelRowCheck}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[s.modelGroupLabel, { marginTop: 16 }]}>Paid Models ({paidModels.length})</Text>
              <View style={s.modelGroup}>
                {paidModels.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[s.modelRow, model === m.id && s.modelRowSelected]}
                    onPress={() => selectModel(m.id)}
                  >
                    <View style={s.modelRowInner}>
                      <Text style={[s.modelRowName, model === m.id && s.modelRowNameSelected]} numberOfLines={1}>{m.name}</Text>
                      <Text style={s.modelRowId} numberOfLines={1}>{m.id}</Text>
                    </View>
                    {model === m.id && <Text style={s.modelRowCheck}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  backText: { color: t.accent, fontSize: 16 },
  homeText: { color: t.accent, fontSize: 16, fontWeight: '600' },
  heading: { fontSize: 28, fontWeight: '800', color: t.text },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: t.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1, marginTop: 24 },
  providerRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  providerCard: { flex: 1, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 14, alignItems: 'center', minHeight: 60, justifyContent: 'center' },
  providerCardSelected: { borderColor: t.accent, backgroundColor: t.selectedBg },
  providerLabel: { color: t.textSecondary, fontSize: 14, fontWeight: '600' },
  providerLabelSelected: { color: t.accent },
  recommendedBadge: { backgroundColor: t.accent, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, marginBottom: 4 },
  recommendedText: { color: '#fff', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  providerDesc: { color: t.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 20 },
  inputGroup: { marginBottom: 20 },
  label: { color: t.text, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.border, borderRadius: 8, padding: 14, color: t.text, fontSize: 15 },
  modelPickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.border, borderRadius: 8, padding: 14 },
  modelPickerValue: { flex: 1, color: t.text, fontSize: 15, marginRight: 8 },
  modelPickerPlaceholder: { flex: 1, color: t.textMuted, fontSize: 15, marginRight: 8 },
  modelPickerArrow: { color: t.textSecondary, fontSize: 16 },
  modelIdHint: { color: t.textMuted, fontSize: 11, marginTop: 5, fontFamily: FONT_MONO },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  modelChip: { borderWidth: 1, borderColor: t.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: t.surface },
  modelChipSelected: { borderColor: t.accent, backgroundColor: t.selectedBg },
  modelChipText: { color: t.textSecondary, fontSize: 12, fontWeight: '500' },
  modelChipTextSelected: { color: t.accent, fontWeight: '700' },
  hint: { color: t.textSecondary, fontSize: 12, marginTop: 6, lineHeight: 16 },
  apiKeyHelp: { color: t.accent, fontSize: 12, marginTop: 6 },
  actions: { gap: 10, marginTop: 12 },
  button: { padding: 15, borderRadius: 8, alignItems: 'center', minHeight: 50, justifyContent: 'center' },
  testButton: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
  testButtonText: { color: t.accent, fontSize: 15, fontWeight: '600' },
  testResult: { borderRadius: 8, padding: 12, borderWidth: 1 },
  testResultOk: { backgroundColor: t.success + '18', borderColor: t.success + '60' },
  testResultFail: { backgroundColor: t.danger + '18', borderColor: t.danger + '60' },
  testResultText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  testResultTextOk: { color: t.success },
  testResultTextFail: { color: t.danger },
  saveButton: { backgroundColor: t.success },
  saveButtonText: { color: t.successText, fontSize: 16, fontWeight: '700' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: t.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: t.border },
  modalTitle: { color: t.text, fontSize: 17, fontWeight: '700' },
  modalClose: { color: t.accent, fontSize: 16, fontWeight: '600' },
  modalScroll: { paddingHorizontal: 16 },
  modalLoading: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  modalLoadingText: { color: t.textSecondary, fontSize: 14 },
  modelGroupLabel: { color: t.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 16, marginBottom: 8 },
  modelGroup: { backgroundColor: t.surface, borderRadius: 10, borderWidth: 1, borderColor: t.border, overflow: 'hidden' },
  modelRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.border },
  modelRowSelected: { backgroundColor: t.selectedBg },
  modelRowInner: { flex: 1, marginRight: 8 },
  modelRowName: { color: t.text, fontSize: 14, fontWeight: '600' },
  modelRowNameSelected: { color: t.accent },
  modelRowId: { color: t.textMuted, fontSize: 11, marginTop: 2, fontFamily: FONT_MONO },
  modelRowCheck: { color: t.accent, fontSize: 16, fontWeight: '700' },
})
