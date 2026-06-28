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
import { getLLMConfig } from '../services/storage';
import { AITrainerAgent } from '../services/agent/AITrainerAgent';
import type { AITrainerResponse } from '../services/agent/AITrainerAgent';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: number;
}

export function ConversationalWorkoutScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const s = styles(theme);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agent, setAgent] = useState<AITrainerAgent | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    (async () => {
      const cfg = (await getLLMConfig()) || DEFAULT_LLM_CONFIG;
      setAgent(new AITrainerAgent({ llmConfig: cfg }));
    })();
  }, []);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isLoading || !agent) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await agent.generateWorkoutPlan(
        inputText.trim(),
        (_chunk) => {
          // Handle streaming progress (no-op for now)
        }
      );
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: formatAIResponse(response),
        isUser: false,
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `Sorry, I couldn't generate a workout plan. ${error instanceof Error ? error.message : 'Please try again.'}`,
        isUser: false,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, agent]);

  const renderMessage = ({ item }: { item: Message }) => (
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
    </View>
  );

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
          <View style={{ width: 50 }} />
        </View>
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