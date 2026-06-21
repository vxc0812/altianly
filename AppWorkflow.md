# Altianly Fitness App Workflow

*Complete end-to-end user journey from first launch to results analysis*

---

## 1. First-Time User Experience (FTUE)

### 1.1 Welcome & Permissions
- **Welcome Screen**: Brief introduction with app value proposition
- **Permissions Request**:
  - Local notifications (optional, for reminders)
  - Health data access (optional, for step integration)
  - Camera (optional, for progress photos)
- **Privacy Assurance**: Clear statement that all data stays on-device

### 1.2 Quick Start Options
- **Continue as Guest**: Skip account creation (recommended for privacy-first approach)
- **Create Account**: Optional email/Google sign-in for cloud backup (future feature)

---

## 2. Profile Setup

### 2.1 Basic Information
- **Name** (optional)
- **Age Group** (not exact age for privacy)
- **Gender** (Male/Female/Other/Prefer not to say)
- **Height** (ft/in or cm toggle)
- **Current Weight** (lbs or kg toggle)

### 2.2 Unit System Preference
- Automatic detection or manual toggle (Imperial/Metric)
- Values converted internally for BMI calculation

### 2.3 BMI Calculation
- Auto-calculated from height/weight
- Displayed with visual indicator (Underweight/Normal/Overweight/Obese)
- Option to view calculation details

---

## 3. Comprehensive Questionnaire

### 3.1 Goals & Timeline
- **Primary Goal**: Fat Loss | Muscle Building | Strength | Endurance | Flexibility | Health | Event Training | Other
- **Secondary Goals** (multi-select)
- **Target Timeline**: 4 weeks | 8 weeks | 12 weeks | 3+ months | Flexible

### 3.2 Fitness Background
- **Current Fitness Level**: Beginner | Novice | Intermediate | Advanced | Elite
- **Training Experience**: Never | Occasionally | Consistent | Always Active
- **Years of Consistent Training**

### 3.3 Lifestyle Assessment
- **Daily Activity Level**: Sedentary | Lightly Active | Moderately Active | Very Active
- **Sleep Quality**: Poor | Fair | Good | Excellent
- **Stress Level**: Low | Moderate | High | Very High
- **Workouts Per Week**: 0 | 1-2 | 3-4 | 5-6 | 7
- **Preferred Workout Duration**: 15-20 min | 25-35 min | 35-45 min | 45-60 min | 60+ min

### 3.4 Health & Safety
- **Medical Conditions**: None | High BP | Heart Issues | Diabetes | Joint Problems | Other
- **Current Injuries**: None | Knee | Shoulder | Back | Other
- **Medications/Supplements** (optional)

### 3.5 Training Preferences
- **Workout Environment**: Home (bodyweight) | Home (equipment) | Gym | CrossFit | Outdoor
- **Available Equipment**: Multi-select (dumbbells, barbell, kettlebells, etc.)
- **Preferred Workout Types**: Multi-select
- **Training Split Preference**: Full Body | Upper/Lower | PPL | Bro Split | Flexible

### 3.6 Motivation & Constraints
- **What motivates you most?**: Physical changes | Performance | Health | Social | Milestones | Enjoyment
- **Biggest Challenge**: Time | Motivation | Knowledge | Boredom | Injuries
- **Exercises to Avoid**: Multi-select or custom entry
- **Favorite Exercises**: Optional preference list

---

## 4. Plan Generation

### 4.1 Generation Options
- **Instant Plan**: Pre-built science-backed template (immediate)
- **AI Plan**: LLM-generated personalized plan (requires Ollama/LLM backend)

### 4.2 Plan Preview
- **Plan Name** and overview
- **Weekly Schedule** visualization
- **Key Features** highlighted
- **Safety Notes** and modifications

### 4.3 Plan Saving
- Auto-saved to local history
- Option to rename or add notes
- Export/share capability (future)

---

## 5. Workout Execution

### 5.1 Daily Workout View
- **Day Title** and focus area
- **Warm-up Instructions**
- **Exercise List** with:
  - Exercise name and optional video/image
  - Sets, reps, rest time
  - Notes and form cues
- **Progress Tracker** per exercise

### 5.2 Workout Logging
- **Live Tracking**: Log actual sets/reps/weight in real-time
- **Rest Timer**: Auto-start timer between sets
- **Notes**: Add observations per exercise
- **Completion Status**: Mark exercises complete

### 5.3 During Workout
- **Timer Display**: Rest countdown
- **Quick Log**: Swipe to log completed sets
- **Skip Exercise**: Option to skip with reason
- **Finish Workout**: End session and save

---

## 6. Progress Tracking

### 6.1 Workout History
- **Calendar View**: Visual indicator of completed days
- **Plan List**: All saved workout plans
- **Per-Plan Logs**: Detailed history for each plan

### 6.2 Performance Metrics
- **Strength Progress**: Weight lifted over time
- **Volume Tracking**: Total sets/reps per session
- **Consistency**: Streak counter and weekly completion rate
- **Body Metrics**: Weight/BMI trend (if logged)

### 6.3 Visual Dashboard
- **Progress Charts**: Line graphs for key metrics
- **Achievement Badges**: Milestone rewards
- **Comparison**: Before/after photos (optional)

---

## 7. Plan Iteration

### 7.1 Adaptive Planning
- **Performance Analysis**: Review last workout performance
- **Plan Adjustments**: Suggest modifications based on progress
- **Deload Weeks**: Automatic recovery periods
- **Progression**: Increase weight/reps based on consistency

### 7.2 New Plan Generation
- **Regeneration Option**: Create new plan from updated questionnaire
- **Goal Change**: Modify primary goal mid-program
- **Schedule Change**: Adjust for new availability

---

## 8. Results & Analysis

### 8.1 End-of-Program Summary
- **Achievements**: Completed workouts, streaks, PRs
- **Progress Report**: 
  - Strength gains
  - Consistency metrics
  - Goal alignment
- **Recommendations**: Next steps, continued focus areas

### 8.2 Data Export
- **PDF Report**: Shareable progress summary
- **CSV Export**: Raw data for external analysis
- **Social Sharing**: Progress photos and achievements

### 8.3 Long-term Insights
- **Trend Analysis**: 3-month+ progress visualization
- **Habit Formation**: Behavior change tracking
- **Seasonal Planning**: Annual fitness calendar

---

## 9. Settings & Personalization

### 9.1 Profile Management
- **Update Measurements**: Height, weight, body metrics
- **Change Preferences**: Goals, schedule, equipment
- **Privacy Controls**: Data export/delete options

### 9.2 App Settings
- **Theme**: Dark mode | Cream mode
- **Notifications**: Reminder settings
- **Unit Display**: lbs/kg, ft/in | cm
- **Voice Coach**: Audio cues during workouts (future)

### 9.3 LLM Configuration
- **Provider Selection**: Ollama | OpenRouter | HuggingFace
- **Connection Testing**: Verify backend connectivity
- **Model Selection**: Available models list

---

## 10. Error Handling & Edge Cases

### 10.1 Network Issues
- **Offline Mode**: Continue with cached plans
- **Retry Logic**: Auto-retry failed API calls
- **Fallback Plans**: Use instant plan if AI unavailable

### 10.2 Data Validation
- **Input Sanitization**: Prevent invalid entries
- **Range Checks**: Age, weight, height limits
- **Consistency Warnings**: Flag unusual patterns

### 10.3 User Guidance
- **Tooltips**: Contextual help for complex features
- **Empty States**: Guidance when no data exists
- **Error Messages**: Clear, actionable feedback

---

## Workflow Diagram

```
First Launch
    ↓
Welcome + Permissions
    ↓
Profile Setup (Height/Weight/Gender/Age)
    ↓
BMI Calculation
    ↓
Questionnaire (Goals → Lifestyle → Health → Preferences)
    ↓
Plan Generation (Instant or AI)
    ↓
Workout Execution Daily
    ↓
Progress Logging
    ↓
Analysis & Recommendations
    ↓
Iterate or Complete
```

---

## Key Design Principles

1. **Privacy-First**: All data stored locally, no account required
2. **Minimal Friction**: Quick onboarding, clear navigation
3. **Adaptive**: Plans evolve with user progress
4. **Motivating**: Gamification and progress visualization
5. **Inclusive**: Accessible to all fitness levels and body types
6. **Evidence-Based**: Science-backed workout recommendations

---

## Future Enhancements

- **Wearable Integration**: Sync with fitness trackers
- **Nutrition Tracking**: Calorie/macros integration
- **Social Features**: Community challenges
- **Video Library**: Form demonstration videos
- **AI Voice Coach**: Real-time workout guidance
- **Smart Reminders**: Adaptive notification timing

---

*Version: 1.0 | Last Updated: June 19, 2026*