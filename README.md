# Study Tracker - Standalone Version

A standalone web application to monitor your daily study time, plan your day, view weekly reports, and use a Pomodoro timer. **No Node.js or build tools required!**

## Features

- 🍅 **Pomodoro Timer**: Focus timer with customizable work/break durations
- 📊 **Daily Study Tracker**: Log and monitor your daily study sessions
- 📝 **Daily Planning**: Plan your day with tasks and time estimates
- 📈 **Weekly Report**: View statistics and visualizations of your study habits

## Getting Started

Simply open `index.html` in your web browser! That's it - no installation or setup required.

### Option 1: Direct File Opening
1. Navigate to the `study-tracker-standalone` folder
2. Double-click `index.html`
3. The app will open in your default browser

### Option 2: Using a Local Server (Recommended)
If you have Python installed:
```bash
cd study-tracker-standalone
python -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

## Usage

### Pomodoro Timer
- Click "Start" to begin a focus session
- The timer alternates between work sessions and breaks
- Complete sessions are automatically logged to your daily tracker
- Customize work duration (25 or 50 minutes)

### Daily Tracker
- Manually add study sessions with duration and optional subject
- View total study time for today
- See all sessions recorded today

### Daily Plan
- Add tasks for the day with optional time estimates
- Check off completed tasks
- Track your daily progress with a visual progress bar

### Weekly Report
- View total study time for the week
- See number of sessions and daily averages
- Visualize your study patterns with a bar chart
- Review day-by-day breakdown

## Data Storage

All data is stored locally in your browser using localStorage. Your data persists between sessions but is specific to the browser you use.

## Browser Compatibility

Works in all modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

## Differences from React Version

This standalone version provides the same functionality as the React version but:
- No build step required
- No Node.js needed
- Pure HTML, CSS, and JavaScript
- Can run directly from file system
- Smaller file size

## License

MIT

