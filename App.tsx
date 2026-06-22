import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { RootStackParamList } from './src/types'
import { ThemeProvider, useTheme } from './src/context/ThemeContext'
import { setupNotificationHandler } from './src/services/notifications'

setupNotificationHandler()

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

const Stack = createNativeStackNavigator<RootStackParamList>()

function AppContent() {
  const { theme } = useTheme()
  return (
    <NavigationContainer>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack.Navigator
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
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}
