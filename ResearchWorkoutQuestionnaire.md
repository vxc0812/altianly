# Research: Workout Plan Questionnaire & App Workflow

*Research conducted for Altianly fitness app - June 19, 2026*

---

## Research Objective

Build a comprehensive questionnaire for a fitness app to generate personalized workout plans. The questionnaire must capture all relevant factors affecting workout personalization: age, BMI, height, weight, lifestyle, health situations, goals, and preferences.

---

## Research Methodology

### 1. Primary Source Analysis
- Read existing project documentation (REPORT.md)
- Reviewed Altianly app architecture and current implementation

### 2. Competitive Analysis
Researched popular goal-oriented fitness apps to identify industry-standard questionnaire elements:

| App | Key Questionnaire Elements | Source |
|-----|---------------------------|--------|
| **Fitbod** | Fitness experience, goals, equipment availability | [Fitbod Help Center](https://help.fitbod.me/hc/en-us/articles/30721771750039-Getting-Started-with-Fitbod-A-New-User-s-Guide) |
| **Compound Fitness** | Demographics, goals, training routine, equipment, health conditions, nutrition preferences | [Compound Fitness](https://compoundfitness.ai/build-your-plan/) |
| **ZenFit AI** | Body data, goals, schedule, equipment, limitations | [ZenFit AI Quiz](https://www.zenfit-ai.fit/quiz) |
| **JEFIT** | Workout plans, goal-specific programs, equipment tracking | [JEFIT Website](https://www.jefit.com/) |
| **Reps & Runs** | Height, gender, goal, weight, age, body type, fitness level, injuries, lifestyle | [Reps & Runs](https://repsandruns.com/questionnaire/) |
| **FitBudd** | Medical history, lifestyle, exercise history, coaching style | [FitBudd](https://www.fitbudd.com/post/personal-trainer-questionnaire-how-to-create-one-example-questions) |

### 3. Fitness App Research Guidelines
- [Cleverx Fitness App Research Guide](https://cleverx.com/blog/fitness-app-user-research-a-complete-guide-for-health-and-fitness-product-teams/)
- [Startquestion Fitness Survey](https://www.startquestion.com/survey-ideas/mobile-app-for-fitness-survey/)

---

## Key Factors Identified

### Essential Personalization Factors

1. **Demographics**
   - Age group (not exact age for privacy)
   - Gender identity
   - Height and weight (for BMI calculation)

2. **Body Composition**
   - BMI (calculated automatically)
   - BMI evaluation (underweight/normal/overweight/obese)

3. **Fitness Goals**
   - Primary goal (fat loss, muscle building, strength, endurance, flexibility, health, event training)
   - Timeline expectations
   - Secondary goals

4. **Experience Level**
   - Current fitness level (beginner to elite)
   - Training experience history
   - Years of consistent training

5. **Lifestyle Factors**
   - Daily activity level
   - Sleep quality
   - Stress levels
   - Available workout days/time

6. **Health Considerations**
   - Medical conditions
   - Current injuries
   - Medications/supplements

7. **Training Preferences**
   - Preferred workout environment
   - Available equipment
   - Workout types
   - Training split preference

8. **Motivation & Constraints**
   - What drives the user
   - Biggest challenges
   - Exercise preferences/exclusions

---

## Questionnaire Design

### Structure

The questionnaire is organized into 8 logical sections:

1. **Basic Information** (Required)
   - Age group, gender, height, weight

2. **Your Goals** (Required)
   - Primary goal, timeline

3. **Your Fitness Background** (Required)
   - Fitness level, experience, training history

4. **Lifestyle & Availability** (Required)
   - Activity level, sleep, stress, schedule

5. **Health & Safety** (Required)
   - Medical conditions, injuries

6. **Training Preferences** (Required)
   - Environment, equipment, workout types, split

7. **Motivation & Expectations** (Optional)
   - Motivation drivers, challenges

8. **Additional Context** (Optional)
   - Exercise preferences, notes

### Choice Format

All questions use multiple-choice or multi-select formats for simplicity:
- Single-select radio buttons for exclusive choices
- Multi-select checkboxes for inclusive choices
- Text input for custom responses
- Range sliders for measurements

---

## App Workflow Summary

### Complete User Journey

```
First Launch
    ↓
Welcome + Permissions
    ↓
Profile Setup → BMI Calculation
    ↓
Questionnaire (8 sections)
    ↓
Plan Generation (Instant or AI)
    ↓
Workout Execution (Daily)
    ↓
Progress Tracking
    ↓
Analysis & Recommendations
```

### Key Workflow Stages

1. **Onboarding (5-10 minutes)**
   - Welcome screen with value proposition
   - Permission requests (notifications, health data)
   - Privacy assurance (all data local)

2. **Profile Setup (2-3 minutes)**
   - Collect age, gender, height, weight
   - Auto-calculate BMI with visual indicator

3. **Questionnaire (5-8 minutes)**
   - 28 questions across 8 sections
   - Smart defaults based on fitness level
   - Progress indicator

4. **Plan Generation (Instant or AI)**
   - Instant: Pre-built template (< 1 second)
   - AI: LLM-generated plan (requires backend)
   - Plan preview before saving

5. **Workout Execution (Daily)**
   - Exercise-by-exercise guidance
   - Rest timer with auto-start
   - Live logging of sets/reps/weight
   - Form cues and notes

6. **Progress Tracking**
   - Calendar view of completed workouts
   - Performance metrics (strength, volume)
   - Streak counter and consistency rate
   - Body metrics trends

7. **Analysis & Iteration**
   - End-of-program summary
   - Performance analysis
   - Plan adjustments
   - New goal setup

---

## Implementation Notes

### Technical Considerations

1. **TypeScript Types** (`src/types/index.ts`)
   - Added new types: `AgeGroup`, `PrimaryGoal`, `TrainingExperience`, `WorkoutEnvironment`, `WorkoutType`, `ExcludeExercise`, `MotivationDriver`, `ProgressTracking`
   - Extended `QuestionnaireAnswers` interface

2. **LLM Prompt Enhancement** (`src/services/llm.ts`)
   - Updated `buildPrompt()` to include questionnaire details
   - Maps questionnaire values to readable strings
   - Includes health considerations and limitations

3. **UI Expansion** (`src/screens/QuestionnaireScreen.tsx`)
   - Added all new questionnaire fields
   - Maintained existing basic questions
   - Added text input fields for custom responses

### Privacy-First Design

- All data stored locally (AsyncStorage/SecureStore)
- No account required for core functionality
- Optional cloud sync for future backup
- Clear privacy messaging throughout

---

## Research Sources

1. Fitbod Help Center - Getting Started Guide
   https://help.fitbod.me/hc/en-us/articles/30721771750039-Getting-Started-with-Fitbod-A-New-User-s-Guide

2. Compound Fitness - Build Your Plan
   https://compoundfitness.ai/build-your-plan/

3. ZenFit AI - Fitness Quiz
   https://www.zenfit-ai.fit/quiz

4. JEFIT - Workout Tracker & Planner
   https://www.jefit.com/

5. Reps & Runs - Questionnaire
   https://repsandruns.com/questionnaire/

6. FitBudd - Personal Trainer Questionnaire
   https://www.fitbudd.com/post/personal-trainer-questionnaire-how-to-create-one-example-questions

7. Cleverx - Fitness App User Research Guide
   https://cleverx.com/blog/fitness-app-user-research-a-complete-guide-for-health-and-fitness-product-teams/

8. Startquestion - Fitness Survey Ideas
   https://www.startquestion.com/survey-ideas/mobile-app-for-fitness-survey/

---

## Deliverables

| File | Purpose |
|------|---------|
| `Questionnaire.md` | Complete questionnaire with 28 questions |
| `AppWorkflow.md` | End-to-end workflow documentation |
| `ResearchWorkoutQuestionnaire.md` | This research summary |

---

*Research completed by Feynman AI Assistant*
*Date: June 19, 2026*