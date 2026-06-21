import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { STORAGE_KEYS } from '../constants'

export interface ReminderConfig {
  hour: number
  minute: number
  enabled: boolean
}

const NOTIFICATION_ID = 'altianly-daily-reminder'

export function setupNotificationHandler() {
  if (Platform.OS === 'web') return
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  })
}

async function ensureChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('altianly-reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    })
  }
}

export async function getReminderConfig(): Promise<ReminderConfig> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.REMINDER)
  if (json) return JSON.parse(json)
  return { hour: 8, minute: 0, enabled: false }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  return finalStatus === 'granted'
}

export async function scheduleDailyReminder(
  hour: number,
  minute: number,
): Promise<boolean> {
  if (Platform.OS === 'web') return false

  const granted = await requestNotificationPermission()
  if (!granted) return false

  await ensureChannel()

  await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID)

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_ID,
    content: {
      title: 'Altianly',
      body: "Time to check your BMI! Don't break your streak.",
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  })

  const config: ReminderConfig = { hour, minute, enabled: true }
  await AsyncStorage.setItem(STORAGE_KEYS.REMINDER, JSON.stringify(config))
  return true
}

export async function cancelDailyReminder(): Promise<void> {
  if (Platform.OS === 'web') return
  await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID)
  const config: ReminderConfig = { hour: 8, minute: 0, enabled: false }
  await AsyncStorage.setItem(STORAGE_KEYS.REMINDER, JSON.stringify(config))
}
