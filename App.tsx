import { StatusBar } from 'expo-status-bar'
import React, { useEffect } from 'react'
import { AppState } from 'react-native'
import { NavigationContainer, useNavigation } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { RootStackParamList } from './src/types'
import { ThemeProvider, useTheme } from './src/context/ThemeContext'
import { AuthProvider, useAuth } from './src/context/AuthContext'
import { isSessionExpired, deleteUserProfile, updateLastActivity } from './src/services/storage'
import { setSessionToken } from './src/services/auth'

import HomeScreen from './src/screens/HomeScreen'
import ResultScreen from './src/screens/ResultScreen'
import QuestionnaireScreen from './src/screens/QuestionnaireScreen'
import WorkoutPlanScreen from './src/screens/WorkoutPlanScreen'
import SettingsScreen from './src/screens/SettingsScreen'
import HistoryScreen from './src/screens/HistoryScreen'
import TimerScreen from './src/screens/TimerScreen'
import WorkoutLogScreen from './src/screens/WorkoutLogScreen'
import PlanLogsScreen from './src/screens/PlanLogsScreen'
import ProfileScreen from './src/screens/ProfileScreen'
import { ConversationalWorkoutScreen } from './src/screens/ConversationalWorkoutScreen'
import HistoryGraphScreen from './src/screens/HistoryGraphScreen'

const Stack = createNativeStackNavigator<RootStackParamList>()

function SessionManager() {
  const navigation = useNavigation<any>()

  useEffect(() => {
    ;(async () => {
      if (await isSessionExpired()) {
        setSessionToken(null)
        await deleteUserProfile()
      } else {
        await updateLastActivity()
      }
    })()

    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        if (await isSessionExpired()) {
          setSessionToken(null)
          await deleteUserProfile()
          navigation.reset({ index: 0, routes: [{ name: 'Profile' }] })
        }
      }
    })
    return () => sub.remove()
  }, [])

  return null
}

function AppContent() {
  const { theme } = useTheme()
  return (
    <NavigationContainer>
      <SessionManager />
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack.Navigator
        initialRouteName="Profile"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Result" component={ResultScreen} />
        <Stack.Screen name="Questionnaire" component={QuestionnaireScreen} />
        <Stack.Screen name="WorkoutPlan" component={WorkoutPlanScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="Timer" component={TimerScreen} />
        <Stack.Screen name="WorkoutLog" component={WorkoutLogScreen} />
        <Stack.Screen name="PlanLogs" component={PlanLogsScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="ConversationalWorkout" component={ConversationalWorkoutScreen} />
        <Stack.Screen name="HistoryGraph" component={HistoryGraphScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  )
}
