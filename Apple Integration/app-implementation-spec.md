# Belly Fat Sleep Tracker - App Implementation Spec

## Core Features

### 1. Daily Flow

#### Morning (7:00 AM default)
```
┌─────────────────────────────────────────┐
│ Good morning!                           │
│                                         │
│ Last night's bedtime: ___:___           │
│ Hit 10pm-2am window?  ☐ Yes  ☐ No       │
│ Energy level (1-10): ___                │
│                                         │
│ [Log Today's Data]                      │
└─────────────────────────────────────────┘
```

#### Evening (9:45 PM default)
```
┌─────────────────────────────────────────┐
│ ⏰ LAMP SWITCH TIME                     │
│                                         │
│ ✓ Switch to lamp lighting               │
│ ✓ Phone to charging station             │
│ ✓ Prepare for 10:15pm screen cutoff     │
│                                         │
│ [Mark Complete]  [Snooze 15 min]        │
└─────────────────────────────────────────┘
```

### 2. Data Models

#### DailyLog
```typescript
interface DailyLog {
  date: string;           // ISO date
  bedtime: string;        // HH:MM
  windowHit: boolean;     // 10pm-2am achieved
  phoneOutOfRoom: boolean;
  windDownSteps: {
    lightsOff: boolean;   // 90 min before
    screenCutoff: boolean; // 45 min before
    coolEmptyOut: boolean; // 15 min before
  };
  dinner: {
    time: string;
    protein: boolean;
    slowCarb: boolean;
    alcohol: boolean;
  };
  caffeineAfter2pm: boolean;
  sleepQuality: number;   // 1-10
  energyLevel: number;    // 1-10
  cravings: boolean;
}
```

#### WeeklySummary
```typescript
interface WeeklySummary {
  weekStart: string;
  adherenceRate: number;  // % wind-down steps completed
  avgBedtime: string;
  avgEnergy: number;
  waistTrend: number;     // change from baseline
  notes: string;
}
```

### 3. UI Components

#### Progress Dashboard
- **Bedtime trend line chart** (last 30 days)
- **Adherence heatmap** (daily wind-down completion)
- **Energy vs. bedtime scatter plot**
- **Current streak counter**

#### Quick Actions Panel
- [ ] Log bedtime
- [ ] Mark wind-down step
- [ ] Log dinner
- [ ] Log energy level

### 4. Notification System

#### Default Schedule
```
18:00 - Dinner reminder (before 8pm)
20:00 - Food cutoff reminder (no snacks after)
20:30 - Light transition reminder
21:45 - Lamp switch reminder
22:15 - Screen cutoff reminder
07:00 - Morning check-in
```

#### Smart Notifications
- **After late bedtime**: "Missed the window - quick walk tonight?"
- **After good week**: "4 days of wind-down! Ready for next level?"
- **Low energy**: "Yesterday's bedtime was late - prioritize 10pm tonight"

### 5. Gamification

#### Streak System
- **Wind-down streak**: Consecutive days completing all 3 steps
- **Window streak**: Consecutive days hitting 10pm-2am
- **Reset streak**: 7-day completion streak

#### Achievements
- 🛏️ "Early Bird" - 7 days hitting bedtime ≤10pm
- 📵 "Phone-Free" - 5 days phone out of room
- 🍽️ "Dinner Hero" - 7 days dinner before 8pm
- 📈 "Energy Rising" - 5 days energy ≥7

### 6. Data Export

#### Weekly Email Report
```
📊 WEEKLY SLEEP RESET REPORT
Week of: [date]

✅ Adherence: 85% (12/14 steps)
⏰ Avg Bedtime: 22:07
⚡ Avg Energy: 7.2/10
📏 Waist: -0.5" from last week

Top Tips:
• You're crushing the lamp switch!
• Screens still on after 10:15pm twice - try the book alternative

[View Full Report] | [Log Measurements]
```

### 7. Settings

#### Personalization
- Wake up time (default: 6:00 AM)
- Work schedule (weekday/weekend)
- Shift work mode
- Custom reminder times

#### Privacy
- Local-only storage option
- Encrypted backup toggle
- Data export/import
- Reset all data option

---

## Technical Requirements

### Minimum Viable Product
1. Daily logging (bedtime, wind-down steps, dinner)
2. Morning check-in flow
3. Evening reminder
4. Simple streak counter
5. Weekly summary view

### Tech Stack Suggestions
- **Frontend**: React Native / Flutter / Swift/Kotlin
- **Storage**: SQLite / Realm / AsyncStorage
- **Notifications**: Firebase / OneSignal / native APIs
- **Charts**: Victory Charts / MPAndroidChart / ChartsFlutter
- **Backup**: iCloud/Google Drive (optional)

---

## Edge Cases to Handle

1. **Travel**: Different time zones, new bedtime routines
2. **Illness**: Recovery protocols for sick days
3. **Family schedule**: Partner/kids disrupting routine
4. **Shift work**: Rotating schedules
5. **New baby**: Sleep interruptions
6. **Weekend drift**: Preventing late weekend wake-ups

---

## Success Metrics (for app analytics)

- Daily active users (DAU)
- Wind-down completion rate
- 7-day streak achievement rate
- User retention (D7, D30)
- Feature adoption (food tracking vs. sleep only)