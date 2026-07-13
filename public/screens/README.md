# App screenshots for the homepage

The homepage "App Screens" section shows these images in phone mockup frames.
Until a file exists, its frame shows a labeled placeholder (no broken image).

Drop these PNGs in this folder (exact filenames):

| File | Screen | How to reach it |
|------|--------|-----------------|
| `home.png` | Home dashboard | Launch app → Home tab (log a meal first so the calorie ring is populated) |
| `workout-plan.png` | AI workout plan | Home → Quick Workout / Start a Split, or open a saved plan |
| `nutrition.png` | Nutrition | Nutrition tab with a meal logged (e.g. quick-add "scrambled eggs, oatmeal, latte") |
| `bmi.png` | BMI result | Enter weight/height on Home's Health Snapshot → BMI result screen |
| `graphs.png` | Progress graphs | Workouts tab → graph (needs ≥2 BMI check-ins) |
| `workout-log.png` | Workout log | Open a plan → log a day (shows sets/reps/weight + rest timer) |

## Capture tips

- **Mobile aspect ratio.** The frames expect a tall phone shape (~390×844 / 9:19.5).
  Use your browser's device toolbar (⌘/Ctrl+Shift+M) set to an iPhone, or a real phone.
- **Cream/light theme** to match the homepage (toggle is the moon/sun on Home).
- Crop to just the app screen (no browser chrome). The frame rounds the corners for you.
- PNG, roughly 2× (e.g. ~780×1690) keeps them crisp on retina displays.

The frames render fine at any reasonable size — `object-fit: cover` from the top,
so slightly different dimensions still look right.
