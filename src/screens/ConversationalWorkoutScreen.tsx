/**
 * Conversational Workout Generator Screen
 * 
 * This screen provides a chat-like interface for generating workout plans
 * based on natural language queries and health data.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../constants/theme';
import { DEFAULT_LLM_CONFIG } from '../constants';
import { getLLMConfig, saveWorkoutPlan, getBMIHistory } from '../services/storage';
import { AITrainerAgent } from '../services/agent/AITrainerAgent';
import type { AITrainerResponse, ChatTurn } from '../services/agent/AITrainerAgent';
import { buildCoachContext } from '../services/coachContext';
import type { StructuredWorkoutPlan, WorkoutPlan } from '../types';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: number;
  /** Present when the AI produced a structured plan — enables "Save Plan" */
  plan?: StructuredWorkoutPlan;
  /** A session wrap-up summary — rendered as a distinct card. */
  summary?: boolean;
}

export function ConversationalWorkoutScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const s = styles(theme);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agent, setAgent] = useState<AITrainerAgent | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [knowsClient, setKnowsClient] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    (async () => {
      const cfg = (await getLLMConfig()) || DEFAULT_LLM_CONFIG;
      // Ground the coach in the client's real data before the first message.
      const coachContext = await buildCoachContext();
      setAgent(new AITrainerAgent({ llmConfig: cfg, coachContext: coachContext ?? undefined }));
      setKnowsClient(!!coachContext);
    })();
  }, []);

  const historyFor = (msgs: Message[]): ChatTurn[] =>
    msgs.filter(m => !m.summary).map(m => ({ role: m.isUser ? 'user' : 'assistant', text: m.text }));

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isLoading || !agent) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: Date.now(),
    };

    const history = historyFor(messages);
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const result = await agent.chat(inputText.trim(), history);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: result.kind === 'plan' ? formatAIResponse(result.response) : result.message,
        isUser: false,
        timestamp: Date.now(),
        plan: result.kind === 'plan' ? result.response.plan : undefined,
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `Sorry, something went wrong. ${error instanceof Error ? error.message : 'Please try again.'}`,
        isUser: false,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, agent, messages]);

  const handleWrapUp = useCallback(async () => {
    if (!agent || summarizing) return;
    const history = historyFor(messages);
    if (history.length === 0) return;
    setSummarizing(true);
    try {
      const summary = await agent.summarize(history);
      setMessages(prev => [...prev, {
        id: `sum_${Date.now()}`,
        text: summary,
        isUser: false,
        timestamp: Date.now(),
        summary: true,
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: `sum_${Date.now()}`,
        text: `Couldn't build a summary. ${error instanceof Error ? error.message : ''}`.trim(),
        isUser: false,
        timestamp: Date.now(),
      }]);
    } finally {
      setSummarizing(false);
    }
  }, [agent, summarizing, messages]);

  const handleSavePlan = useCallback(async (message: Message) => {
    if (!message.plan || savedIds.includes(message.id)) return;
    const entries = await getBMIHistory();
    const latest = entries[0];
    const ageVal = latest?.age ?? 30;

    const record: WorkoutPlan = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      timestamp: Date.now(),
      userInput: { age: ageVal, gender: latest?.gender ?? 'male', unitSystem: 'imperial', heightFeet: 5, heightInches: 9, weightLbs: latest?.weightLbs ?? 160 },
      bmiResult: latest ? { bmi: latest.bmi, evaluation: latest.evaluation } : { bmi: 22, evaluation: 'normal' },
      answers: { lifestyle: 'moderate', exerciseLevel: 'medium', trainingSplit: 'full_body' },
      plan: message.plan.name,
      structuredPlan: message.plan,
    };
    await saveWorkoutPlan(record);
    setSavedIds(prev => [...prev, message.id]);
  }, [savedIds]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isSaved = savedIds.includes(item.id);
    if (item.summary) {
      return (
        <View style={s.summaryCard}>
          <Text style={s.summaryLabel}>📋 Session summary</Text>
          <Text style={[s.messageText, { color: theme.text }]}>{item.text}</Text>
        </View>
      );
    }
    return (
      <View style={[
        s.messageBubble,
        item.isUser ? s.userBubble : s.aiBubble,
        { backgroundColor: item.isUser ? theme.accent : theme.surface }
      ]}>
        <Text style={[
          s.messageText,
          { color: item.isUser ? '#FFF' : theme.text }
        ]}>
          {item.text}
        </Text>
        {!item.isUser && item.plan && (
          <TouchableOpacity
            style={[s.savePlanButton, { borderColor: theme.accent }, isSaved && s.savePlanButtonSaved]}
            onPress={() => handleSavePlan(item)}
            disabled={isSaved}
            accessibilityRole="button"
            accessibilityLabel={isSaved ? 'Plan saved to your workouts' : 'Save this plan to your workouts'}
          >
            <Text style={[s.savePlanText, { color: theme.accent }]}>
              {isSaved ? '✓ Saved to Workouts' : 'Save Plan'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView
        style={[s.container, { backgroundColor: theme.bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back">
            <Text style={s.backText}>{'< Back'}</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>AI Trainer</Text>
          {messages.length > 0 ? (
            <TouchableOpacity
              onPress={handleWrapUp}
              disabled={summarizing}
              accessibilityRole="button"
              accessibilityLabel="Wrap up and summarize this session"
            >
              {summarizing
                ? <ActivityIndicator size="small" color={theme.accent} />
                : <Text style={s.wrapUpText}>Wrap up</Text>}
            </TouchableOpacity>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>

        {knowsClient && messages.length === 0 && (
          <View style={s.knowsHint}>
            <Text style={s.knowsHintText}>
              ✓ Your coach can see your latest BMI, workouts, check-ins and nutrition — ask anything.
            </Text>
          </View>
        )}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={s.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />

        <View style={[s.inputContainer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          <TextInput
            style={[s.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask me anything about your fitness..."
            placeholderTextColor={theme.textSecondary}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[s.sendButton, isLoading && s.sendButtonDisabled, { backgroundColor: theme.accent }]}
            onPress={handleSend}
            disabled={isLoading || !agent}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={s.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function formatAIResponse(response: AITrainerResponse): string {
  const { plan, insights } = response;
  
  let output = `💪 ${plan.name}\n\n`;
  output += `📅 ${plan.days.length} Days Planned\n`;
  
  plan.days.forEach(day => {
    output += `\n** Day ${day.day}: ${day.focus} **\n`;
    day.exercises.forEach(ex => {
      output += `• ${ex.name}: ${ex.sets} sets × ${ex.reps} (${ex.restSeconds}s rest)\n`;
    });
  });
  
  if (plan.warmup) {
    output += `\n🔥 Warmup: ${plan.warmup}\n`;
  }
  if (plan.cooldown) {
    output += `\n🧘 Cooldown: ${plan.cooldown}\n`;
  }
  
  if (insights.length > 0) {
    output += `\n📊 Insights:\n`;
    insights.forEach(i => output += `• ${i}\n`);
  }
  
  return output.trim();
}

const styles = (t: Theme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
  },
  backText: {
    color: t.accent,
    fontSize: 16,
  },
  headerTitle: {
    color: t.text,
    fontSize: 17,
    fontWeight: '700',
  },
  wrapUpText: {
    color: t.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  knowsHint: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: t.accent + '14',
    borderWidth: 1,
    borderColor: t.accent + '33',
  },
  knowsHintText: {
    color: t.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  summaryCard: {
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.accent,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  summaryLabel: {
    color: t.accent,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  messagesList: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  savePlanButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  savePlanButtonSaved: {
    opacity: 0.6,
  },
  savePlanText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    padding: 12,
    borderRadius: 20,
    fontSize: 16,
    maxHeight: 100,
    borderWidth: 1,
  },
  sendButton: {
    padding: 12,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
});