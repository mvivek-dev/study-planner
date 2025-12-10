// Utility Functions
const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
};

const formatTimeDetailed = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} minutes`;
    if (mins === 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${mins} ${mins === 1 ? 'minute' : 'minutes'}`;
};

const getToday = () => {
    return new Date().toISOString().split('T')[0];
};

const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

const getWeekDates = () => {
    const today = new Date();
    const dates = [];
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
};

const getWeekLabel = (dateString) => {
    const date = new Date(dateString);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return dayNames[date.getDay()];
};

// Storage Functions
const storage = {
    getSessions: () => {
        const data = localStorage.getItem('study_sessions');
        return data ? JSON.parse(data) : [];
    },
    saveSession: (session) => {
        const sessions = storage.getSessions();
        sessions.push(session);
        localStorage.setItem('study_sessions', JSON.stringify(sessions));
    },
    getPlans: () => {
        const data = localStorage.getItem('daily_plans');
        return data ? JSON.parse(data) : [];
    },
    getPlanByDate: (date) => {
        const plans = storage.getPlans();
        return plans.find(p => p.date === date) || null;
    },
    savePlan: (plan) => {
        const plans = storage.getPlans();
        const existingIndex = plans.findIndex(p => p.date === plan.date);
        if (existingIndex >= 0) {
            plans[existingIndex] = plan;
        } else {
            plans.push(plan);
        }
        localStorage.setItem('daily_plans', JSON.stringify(plans));
    },
    getPomodoroSettings: () => {
        const data = localStorage.getItem('pomodoro_settings');
        return data ? JSON.parse(data) : {
            workDuration: 25,
            shortBreak: 5,
            longBreak: 15,
            sessionsUntilLongBreak: 4,
        };
    },
    savePomodoroSettings: (settings) => {
        localStorage.setItem('pomodoro_settings', JSON.stringify(settings));
    },
    deleteSession: (id) => {
        const sessions = storage.getSessions();
        const filtered = sessions.filter(s => s.id !== id);
        localStorage.setItem('study_sessions', JSON.stringify(filtered));
    },
    // Events (Holidays, Birthdays, Anniversaries)
    getEvents: () => {
        const data = localStorage.getItem('calendar_events');
        return data ? JSON.parse(data) : [];
    },
    saveEvent: (event) => {
        const events = storage.getEvents();
        events.push(event);
        localStorage.setItem('calendar_events', JSON.stringify(events));
    },
    deleteEvent: (id) => {
        const events = storage.getEvents();
        const filtered = events.filter(e => e.id !== id);
        localStorage.setItem('calendar_events', JSON.stringify(filtered));
    },
    saveAllEvents: (events) => {
        localStorage.setItem('calendar_events', JSON.stringify(events));
    },
    // Google Calendar Sync Settings
    getSyncSettings: () => {
        const data = localStorage.getItem('google_calendar_sync');
        return data ? JSON.parse(data) : {
            enabled: false,
            interval: 30, // minutes
            calendarUrls: [],
            lastSync: null
        };
    },
    saveSyncSettings: (settings) => {
        localStorage.setItem('google_calendar_sync', JSON.stringify(settings));
    },
    getCalendarUrls: () => {
        const settings = storage.getSyncSettings();
        return settings.calendarUrls || [];
    },
    addCalendarUrl: (url, name) => {
        const settings = storage.getSyncSettings();
        if (!settings.calendarUrls) settings.calendarUrls = [];
        
        // Check if URL already exists
        if (!settings.calendarUrls.find(c => c.url === url)) {
            settings.calendarUrls.push({
                id: Date.now().toString(),
                url: url,
                name: name || 'Calendar'
            });
            storage.saveSyncSettings(settings);
        }
    },
    removeCalendarUrl: (id) => {
        const settings = storage.getSyncSettings();
        if (settings.calendarUrls) {
            settings.calendarUrls = settings.calendarUrls.filter(c => c.id !== id);
            storage.saveSyncSettings(settings);
        }
    }
};

// Tab Management
const initTabs = () => {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            
            // Refresh data when switching tabs
            if (targetTab === 'plan') {
                loadDailyPlan();
            } else if (targetTab === 'actual') {
                loadActualWork();
            } else if (targetTab === 'report') {
                loadWeeklyReport();
            } else if (targetTab === 'calendar') {
                loadMonthlyCalendar();
            }
        });
    });
};

// Pomodoro Timer
let pomodoroInterval = null;
let pomodoroState = {
    timeLeft: 25 * 60,
    isRunning: false,
    isPaused: false,
    isBreak: false,
    sessionCount: 0,
    settings: storage.getPomodoroSettings()
};

const initPomodoro = () => {
    const startBtn = document.getElementById('timer-start');
    const pauseBtn = document.getElementById('timer-pause');
    const resumeBtn = document.getElementById('timer-resume');
    const resetBtn = document.getElementById('timer-reset');
    const skipBtn = document.getElementById('timer-skip');
    const switchBtn = document.getElementById('switch-duration');

    pomodoroState.settings = storage.getPomodoroSettings();
    pomodoroState.timeLeft = pomodoroState.settings.workDuration * 60;
    updatePomodoroDisplay();

    startBtn.addEventListener('click', startPomodoro);
    pauseBtn.addEventListener('click', pausePomodoro);
    resumeBtn.addEventListener('click', resumePomodoro);
    resetBtn.addEventListener('click', resetPomodoro);
    skipBtn.addEventListener('click', skipBreak);
    switchBtn.addEventListener('click', switchDuration);

    // Load planned activities
    loadPomodoroActivities();
    
    // Add event listener for activity selection
    const activitySelect = document.getElementById('pomodoro-activity');
    const displayDiv = document.getElementById('selected-activity-display');
    const displayText = document.getElementById('selected-activity-text');
    
    activitySelect.addEventListener('change', (e) => {
        selectedPomodoroActivity = e.target.value;
        if (selectedPomodoroActivity) {
            displayText.textContent = selectedPomodoroActivity;
            displayDiv.style.display = 'block';
        } else {
            displayDiv.style.display = 'none';
        }
    });
    
    // Reload activities when switching to pomodoro tab
    const pomodoroTab = document.querySelector('[data-tab="pomodoro"]');
    if (pomodoroTab) {
        pomodoroTab.addEventListener('click', () => {
            loadPomodoroActivities();
        });
    }

    // Count completed sessions today
    const today = getToday();
    const todaySessions = storage.getSessions().filter(s => 
        s.date === today
    );
    pomodoroState.sessionCount = todaySessions.length;
    updateSessionInfo();
};

const startPomodoro = () => {
    pomodoroState.isRunning = true;
    pomodoroState.isPaused = false;
    updatePomodoroButtons();
    
    pomodoroInterval = setInterval(() => {
        pomodoroState.timeLeft--;
        updatePomodoroDisplay();
        
        if (pomodoroState.timeLeft <= 0) {
            handlePomodoroComplete();
        }
    }, 1000);
};

const pausePomodoro = () => {
    pomodoroState.isPaused = true;
    clearInterval(pomodoroInterval);
    updatePomodoroButtons();
};

const resumePomodoro = () => {
    pomodoroState.isPaused = false;
    updatePomodoroButtons();
    
    pomodoroInterval = setInterval(() => {
        pomodoroState.timeLeft--;
        updatePomodoroDisplay();
        
        if (pomodoroState.timeLeft <= 0) {
            handlePomodoroComplete();
        }
    }, 1000);
};

const resetPomodoro = () => {
    clearInterval(pomodoroInterval);
    pomodoroState.isRunning = false;
    pomodoroState.isPaused = false;
    pomodoroState.timeLeft = pomodoroState.isBreak 
        ? pomodoroState.settings.shortBreak * 60 
        : pomodoroState.settings.workDuration * 60;
    updatePomodoroDisplay();
    updatePomodoroButtons();
};

const skipBreak = () => {
    if (pomodoroState.isBreak) {
        clearInterval(pomodoroInterval);
        pomodoroState.isBreak = false;
        pomodoroState.isRunning = false;
        pomodoroState.timeLeft = pomodoroState.settings.workDuration * 60;
        updatePomodoroDisplay();
        updatePomodoroButtons();
    }
};

const switchDuration = () => {
    pomodoroState.settings.workDuration = pomodoroState.settings.workDuration === 25 ? 50 : 25;
    storage.savePomodoroSettings(pomodoroState.settings);
    if (!pomodoroState.isRunning) {
        pomodoroState.timeLeft = pomodoroState.settings.workDuration * 60;
        updatePomodoroDisplay();
    }
    document.getElementById('switch-duration').textContent = 
        pomodoroState.settings.workDuration === 25 ? 'Switch to 50min' : 'Switch to 25min';
};

let selectedPomodoroActivity = '';

const loadPomodoroActivities = () => {
    const today = getToday();
    const plan = storage.getPlanByDate(today);
    const activitySelect = document.getElementById('pomodoro-activity');
    const displayDiv = document.getElementById('selected-activity-display');
    const displayText = document.getElementById('selected-activity-text');
    
    // Clear existing options
    activitySelect.innerHTML = '<option value="">-- Select Activity --</option>';
    selectedPomodoroActivity = '';
    displayDiv.style.display = 'none';
    
    if (plan) {
        // Add slots
        if (plan.slot1) {
            const option = document.createElement('option');
            option.value = `Slot 1: ${plan.slot1}`;
            option.textContent = `Slot 1 (5AM-8AM): ${plan.slot1}`;
            activitySelect.appendChild(option);
        }
        if (plan.slot2) {
            const option = document.createElement('option');
            option.value = `Slot 2: ${plan.slot2}`;
            option.textContent = `Slot 2 (9AM-12PM): ${plan.slot2}`;
            activitySelect.appendChild(option);
        }
        if (plan.slot3) {
            const option = document.createElement('option');
            option.value = `Slot 3: ${plan.slot3}`;
            option.textContent = `Slot 3 (2PM-5PM): ${plan.slot3}`;
            activitySelect.appendChild(option);
        }
        if (plan.slot4) {
            const option = document.createElement('option');
            option.value = `Slot 4: ${plan.slot4}`;
            option.textContent = `Slot 4 (7PM-9PM): ${plan.slot4}`;
            activitySelect.appendChild(option);
        }
        
        // Add additional tasks
        if (plan.tasks && plan.tasks.length > 0) {
            plan.tasks.forEach(task => {
                if (!task.completed) {
                    const option = document.createElement('option');
                    option.value = `Task: ${task.text}`;
                    option.textContent = `Task: ${task.text}`;
                    activitySelect.appendChild(option);
                }
            });
        }
    }
};

const handlePomodoroComplete = () => {
    clearInterval(pomodoroInterval);
    
    if (!pomodoroState.isBreak) {
        // Work session completed
        const session = {
            id: Date.now().toString(),
            date: getToday(),
            duration: pomodoroState.settings.workDuration,
            subject: selectedPomodoroActivity || 'Pomodoro Session'
        };
        storage.saveSession(session);
        
        pomodoroState.sessionCount++;
        updateSessionInfo();
        
        // Start break
        const shouldLongBreak = pomodoroState.sessionCount % pomodoroState.settings.sessionsUntilLongBreak === 0;
        const breakDuration = shouldLongBreak ? pomodoroState.settings.longBreak : pomodoroState.settings.shortBreak;
        pomodoroState.isBreak = true;
        pomodoroState.timeLeft = breakDuration * 60;
        pomodoroState.isRunning = false;
        updatePomodoroDisplay();
        updatePomodoroButtons();
    } else {
        // Break completed
        pomodoroState.isBreak = false;
        pomodoroState.timeLeft = pomodoroState.settings.workDuration * 60;
        pomodoroState.isRunning = false;
        updatePomodoroDisplay();
        updatePomodoroButtons();
    }
};

const updatePomodoroDisplay = () => {
    const minutes = Math.floor(pomodoroState.timeLeft / 60);
    const seconds = pomodoroState.timeLeft % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    document.getElementById('timer-time').textContent = timeStr;
    document.getElementById('timer-label').textContent = pomodoroState.isBreak ? 'Break Time' : 'Focus Time';
    
    // Update progress circle
    const totalTime = pomodoroState.isBreak 
        ? pomodoroState.settings.shortBreak * 60 
        : pomodoroState.settings.workDuration * 60;
    const progress = 1 - (pomodoroState.timeLeft / totalTime);
    const circumference = 2 * Math.PI * 120;
    const offset = circumference * (1 - progress);
    
    const progressCircle = document.getElementById('timer-progress');
    progressCircle.style.strokeDashoffset = offset;
    
    if (pomodoroState.isBreak) {
        progressCircle.classList.add('break');
        document.getElementById('timer-time').classList.add('break');
    } else {
        progressCircle.classList.remove('break');
        document.getElementById('timer-time').classList.remove('break');
    }
};

const updatePomodoroButtons = () => {
    const startBtn = document.getElementById('timer-start');
    const pauseBtn = document.getElementById('timer-pause');
    const resumeBtn = document.getElementById('timer-resume');
    const resetBtn = document.getElementById('timer-reset');
    const skipBtn = document.getElementById('timer-skip');
    
    if (!pomodoroState.isRunning) {
        startBtn.style.display = 'inline-block';
        pauseBtn.style.display = 'none';
        resumeBtn.style.display = 'none';
        resetBtn.style.display = 'none';
    } else {
        startBtn.style.display = 'none';
        resetBtn.style.display = 'inline-block';
        if (pomodoroState.isPaused) {
            resumeBtn.style.display = 'inline-block';
            pauseBtn.style.display = 'none';
        } else {
            resumeBtn.style.display = 'none';
            pauseBtn.style.display = 'inline-block';
        }
    }
    
    skipBtn.style.display = pomodoroState.isBreak ? 'inline-block' : 'none';
};

const updateSessionInfo = () => {
    document.getElementById('session-info').textContent = 
        `Session ${pomodoroState.sessionCount + 1} • ${pomodoroState.sessionCount} completed today`;
};


// Daily Plan
let currentPlan = null;

const formatTiming = (minutes) => {
    if (!minutes) return '00:00';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

const getTimingColor = (minutes) => {
    if (!minutes || minutes === 0) return '';
    if (minutes < 240) return 'orange';
    if (minutes < 480) return 'yellow';
    return 'green';
};

const calculateTiming = (plan) => {
    // Slot durations: 5-8am (3h), 9-12pm (3h), 2-5pm (3h), 7-9pm (2h) = 11h
    // Total plan is 14 hours when all slots are filled (11h slots + 3h buffer)
    const slotDurations = [3, 3, 3, 2]; // hours for each slot
    let totalMinutes = 0;
    const filledSlots = [plan.slot1, plan.slot2, plan.slot3, plan.slot4].filter(s => s).length;
    
    if (plan.slot1) totalMinutes += slotDurations[0] * 60;
    if (plan.slot2) totalMinutes += slotDurations[1] * 60;
    if (plan.slot3) totalMinutes += slotDurations[2] * 60;
    if (plan.slot4) totalMinutes += slotDurations[3] * 60;
    
    // Add 3 hour buffer only if all 4 slots are filled (total = 14 hours)
    if (filledSlots === 4) {
        totalMinutes += 3 * 60; // 3 hour buffer to reach 14 hours total
    }
    
    return totalMinutes;
};

let selectedPlanDate = getToday();

const loadDailyPlan = (date = null) => {
    const targetDate = date || selectedPlanDate || getToday();
    selectedPlanDate = targetDate;
    
    // Set date selector
    const dateSelector = document.getElementById('plan-date-selector');
    dateSelector.value = targetDate;
    document.getElementById('plan-date').textContent = formatDate(targetDate);
    
    currentPlan = storage.getPlanByDate(targetDate);
    if (!currentPlan) {
        currentPlan = {
            id: Date.now().toString(),
            date: targetDate,
            tasks: []
        };
    }
    
    // Load form fields
    document.getElementById('plan-focus').value = currentPlan.focus || '';
    document.getElementById('plan-slot1').value = currentPlan.slot1 || '';
    document.getElementById('plan-slot2').value = currentPlan.slot2 || '';
    document.getElementById('plan-slot3').value = currentPlan.slot3 || '';
    document.getElementById('plan-slot4').value = currentPlan.slot4 || '';
    document.getElementById('plan-comments').value = currentPlan.comments || '';
    
    updateTimingDisplay();
    renderTasks();
    updateProgress();
};

const updateTimingDisplay = () => {
    if (!currentPlan) return;
    const timing = calculateTiming(currentPlan);
    currentPlan.timing = timing;
    const timingEl = document.getElementById('plan-timing');
    timingEl.textContent = formatTiming(timing);
    timingEl.className = 'timing-display ' + getTimingColor(timing);
};

const updatePlanField = (field, value) => {
    if (!currentPlan) return;
    currentPlan.date = selectedPlanDate; // Ensure date is set
    currentPlan[field] = value || undefined;
    updateTimingDisplay();
    storage.savePlan(currentPlan);
};

const renderTasks = () => {
    const container = document.getElementById('tasks-container');
    
    if (!currentPlan || currentPlan.tasks.length === 0) {
        container.innerHTML = '<p class="empty-state">No tasks planned for today</p>';
        return;
    }
    
    container.innerHTML = currentPlan.tasks.map(task => `
        <div class="task-item ${task.completed ? 'completed' : ''}">
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
                   onchange="toggleTask('${task.id}')">
            <div class="task-content">
                <div class="task-text ${task.completed ? 'completed' : ''}">${task.text}</div>
                ${task.timeEstimate ? `<div class="task-time">Est. ${task.timeEstimate} minutes</div>` : ''}
            </div>
            <button class="delete-btn" onclick="deleteTask('${task.id}')">Delete</button>
        </div>
    `).join('');
};

const toggleTask = (id) => {
    const task = currentPlan.tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        storage.savePlan(currentPlan);
        renderTasks();
        updateProgress();
    }
};

const deleteTask = (id) => {
    currentPlan.tasks = currentPlan.tasks.filter(t => t.id !== id);
    storage.savePlan(currentPlan);
    renderTasks();
    updateProgress();
};

const updateProgress = () => {
    if (!currentPlan || currentPlan.tasks.length === 0) {
        document.getElementById('progress-text').textContent = '0 / 0 tasks';
        document.getElementById('progress-fill').style.width = '0%';
        return;
    }
    
    const completed = currentPlan.tasks.filter(t => t.completed).length;
    const total = currentPlan.tasks.length;
    const percentage = (completed / total) * 100;
    
    document.getElementById('progress-text').textContent = `${completed} / ${total} tasks`;
    document.getElementById('progress-fill').style.width = `${percentage}%`;
};

const initDailyPlan = () => {
    // Date selector
    document.getElementById('plan-date-selector').addEventListener('change', (e) => {
        selectedPlanDate = e.target.value;
        loadDailyPlan(selectedPlanDate);
    });
    
    // Focus field
    document.getElementById('plan-focus').addEventListener('input', (e) => {
        updatePlanField('focus', e.target.value);
    });
    
    // Time slot fields
    document.getElementById('plan-slot1').addEventListener('input', (e) => {
        updatePlanField('slot1', e.target.value);
    });
    
    document.getElementById('plan-slot2').addEventListener('input', (e) => {
        updatePlanField('slot2', e.target.value);
    });
    
    document.getElementById('plan-slot3').addEventListener('input', (e) => {
        updatePlanField('slot3', e.target.value);
    });
    
    document.getElementById('plan-slot4').addEventListener('input', (e) => {
        updatePlanField('slot4', e.target.value);
    });
    
    // Comments field
    document.getElementById('plan-comments').addEventListener('input', (e) => {
        updatePlanField('comments', e.target.value);
    });
    
    // Add task button
    const addBtn = document.getElementById('add-task-btn');
    addBtn.addEventListener('click', () => {
        const text = document.getElementById('task-text').value.trim();
        const timeEstimate = document.getElementById('task-time').value;
        
        if (!text) {
            alert('Please enter a task');
            return;
        }
        
        const task = {
            id: Date.now().toString(),
            text: text,
            completed: false,
            timeEstimate: timeEstimate ? parseInt(timeEstimate) : undefined
        };
        
        currentPlan.date = selectedPlanDate; // Ensure date is set
        currentPlan.tasks.push(task);
        storage.savePlan(currentPlan);
        document.getElementById('task-text').value = '';
        document.getElementById('task-time').value = '';
        renderTasks();
        updateProgress();
    });
    
    // Allow Enter key to add task
    document.getElementById('task-text').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addBtn.click();
        }
    });
    
    document.getElementById('task-time').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addBtn.click();
        }
    });
    
    loadDailyPlan();
};

// Weekly Report
const loadWeeklyReport = () => {
    const allSessions = storage.getSessions();
    const weekDates = getWeekDates();
    
    // Only use Pomodoro sessions for timing
    const days = weekDates.map(date => {
        const daySessions = allSessions.filter(s => s.date === date);
        const minutes = daySessions.reduce((sum, s) => sum + s.duration, 0);
        return { date, minutes };
    });
    
    const totalMinutes = days.reduce((sum, d) => sum + d.minutes, 0);
    const sessions = allSessions.filter(s => weekDates.includes(s.date)).length;
    const averagePerDay = days.length > 0 ? totalMinutes / days.length : 0;
    
    document.getElementById('weekly-total').textContent = formatTime(totalMinutes);
    document.getElementById('weekly-total-detail').textContent = formatTimeDetailed(totalMinutes);
    document.getElementById('weekly-sessions').textContent = sessions;
    document.getElementById('weekly-average').textContent = formatTime(Math.round(averagePerDay));
    
    renderChart(days);
    renderTimingChart(days, averagePerDay);
    renderDays(days);
};

const renderChart = (days) => {
    const container = document.getElementById('chart-container');
    const chartData = days.map(day => ({
        day: getWeekLabel(day.date),
        minutes: day.minutes
    }));
    
    // Simple bar chart using divs
    container.innerHTML = `
        <div style="display: flex; align-items: flex-end; justify-content: space-around; height: 100%; padding: 1rem;">
            ${chartData.map(item => {
                const maxMinutes = Math.max(...chartData.map(d => d.minutes), 1);
                const height = maxMinutes > 0 ? (item.minutes / maxMinutes) * 100 : 0;
                return `
                    <div style="display: flex; flex-direction: column; align-items: center; flex: 1; margin: 0 0.25rem;">
                        <div style="background: #0ea5e9; width: 100%; border-radius: 0.5rem 0.5rem 0 0; min-height: 4px; height: ${height}%; margin-bottom: 0.5rem; transition: height 0.3s;"></div>
                        <div style="font-size: 0.75rem; color: #4b5563; font-weight: 500;">${item.day}</div>
                        <div style="font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem;">${formatTime(item.minutes)}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
};

const renderTimingChart = (days, averageMinutes) => {
    const container = document.getElementById('timing-chart-container');
    const averageHours = averageMinutes / 60;
    document.getElementById('average-hours-display').textContent = `${averageHours.toFixed(1)} hours`;
    
    const chartData = days.map(day => ({
        day: getWeekLabel(day.date),
        hours: day.minutes / 60,
        minutes: day.minutes
    }));
    
    const maxHours = Math.max(...chartData.map(d => d.hours), averageHours, 1);
    
    container.innerHTML = `
        <div style="display: flex; align-items: flex-end; justify-content: space-around; height: 250px; padding: 1rem; background: #f9fafb; border-radius: 0.5rem; position: relative;">
            ${chartData.map((item, index) => {
                const barHeight = maxHours > 0 ? (item.hours / maxHours) * 100 : 0;
                const avgHeight = maxHours > 0 ? (averageHours / maxHours) * 100 : 0;
                const isAboveAvg = item.hours >= averageHours;
                
                return `
                    <div style="display: flex; flex-direction: column; align-items: center; flex: 1; margin: 0 0.25rem; position: relative;">
                        <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: flex-end;">
                            <div style="background: ${isAboveAvg ? '#10b981' : '#f59e0b'}; width: 100%; border-radius: 0.5rem 0.5rem 0 0; min-height: 4px; height: ${barHeight}%; margin-bottom: 0.5rem; transition: height 0.3s; position: relative;" title="${item.hours.toFixed(1)}h">
                                <div style="position: absolute; top: -1.5rem; left: 50%; transform: translateX(-50%); font-size: 0.75rem; font-weight: 600; color: #374151; white-space: nowrap;">${item.hours.toFixed(1)}h</div>
                            </div>
                        </div>
                        <div style="font-size: 0.75rem; color: #4b5563; font-weight: 500; margin-top: 0.5rem;">${item.day}</div>
                    </div>
                `;
            }).join('')}
            <!-- Average line -->
            <div style="position: absolute; bottom: ${avgHeight}%; left: 0; right: 0; height: 2px; background: #0284c7; border-top: 2px dashed #0284c7; z-index: 10;">
                <div style="position: absolute; right: -3rem; top: -0.75rem; font-size: 0.75rem; color: #0284c7; font-weight: 600;">Avg: ${averageHours.toFixed(1)}h</div>
            </div>
        </div>
    `;
};

// Actual Work Tab
let selectedActualDate = getToday();
let actualWorkData = {};

const loadActualWork = (date = null) => {
    const targetDate = date || selectedActualDate || getToday();
    selectedActualDate = targetDate;
    
    const dateSelector = document.getElementById('actual-date-selector');
    dateSelector.value = targetDate;
    document.getElementById('actual-date').textContent = formatDate(targetDate);
    
    // Get plan for this date
    const plan = storage.getPlanByDate(targetDate);
    const plannedMinutes = plan?.timing || 0;
    
    // Get actual Pomodoro sessions for this date
    const allSessions = storage.getSessions();
    const daySessions = allSessions.filter(s => s.date === targetDate);
    const actualMinutes = daySessions.reduce((sum, s) => sum + s.duration, 0);
    
    // Calculate difference
    const diffMinutes = actualMinutes - plannedMinutes;
    const diffSign = diffMinutes >= 0 ? '+' : '';
    
    // Display times
    document.getElementById('planned-time').textContent = formatTiming(plannedMinutes);
    document.getElementById('actual-time').textContent = formatTiming(actualMinutes);
    const diffEl = document.getElementById('difference-time');
    diffEl.textContent = `${diffSign}${formatTiming(Math.abs(diffMinutes))}`;
    diffEl.style.color = diffMinutes >= 0 ? '#10b981' : '#ef4444';
    
    // Display planned slots with input fields for actual work
    const slotsContainer = document.getElementById('planned-slots-actual');
    const actualKey = `actual_work_${targetDate}`;
    const stored = localStorage.getItem(actualKey);
    actualWorkData = stored ? JSON.parse(stored) : { slotWork: {}, activities: [] };
    
    if (plan && (plan.slot1 || plan.slot2 || plan.slot3 || plan.slot4)) {
        const slots = [
            { id: 'slot1', label: 'Slot 1 (5AM-8AM)', value: plan.slot1, duration: 3 },
            { id: 'slot2', label: 'Slot 2 (9AM-12PM)', value: plan.slot2, duration: 3 },
            { id: 'slot3', label: 'Slot 3 (2PM-5PM)', value: plan.slot3, duration: 3 },
            { id: 'slot4', label: 'Slot 4 (7PM-9PM)', value: plan.slot4, duration: 2 }
        ].filter(s => s.value);
        
        slotsContainer.innerHTML = slots.map(s => {
            const slotWork = actualWorkData.slotWork?.[s.id] || { completed: false, notes: '', duration: 0 };
            return `
                <div style="padding: 1rem; background: #f9fafb; border-radius: 0.5rem; margin-bottom: 1rem; border: 1px solid #e5e7eb;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                        <div>
                            <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">${s.label}</div>
                            <div style="font-weight: 500; color: #1f2937;">${s.value}</div>
                        </div>
                        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                            <input type="checkbox" id="slot-${s.id}-completed" ${slotWork.completed ? 'checked' : ''} 
                                   onchange="updateSlotWork('${s.id}', 'completed', this.checked)">
                            <span style="font-size: 0.875rem; color: #374151;">Completed</span>
                        </label>
                    </div>
                    <div style="margin-bottom: 0.75rem;">
                        <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Actual Work Done</label>
                        <textarea id="slot-${s.id}-notes" rows="2" placeholder="What did you actually do in this slot?" 
                                  style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 0.875rem; resize: vertical;"
                                  onblur="updateSlotWork('${s.id}', 'notes', this.value)">${slotWork.notes || ''}</textarea>
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Time Spent (hours)</label>
                        <input type="number" id="slot-${s.id}-duration" step="0.5" min="0" max="${s.duration}" 
                               value="${slotWork.duration || 0}" placeholder="0"
                               style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 1rem;"
                               onblur="updateSlotWork('${s.id}', 'duration', parseFloat(this.value) || 0)">
                    </div>
                </div>
            `;
        }).join('');
    } else {
        slotsContainer.innerHTML = '<p class="empty-state">No plan for this date</p>';
    }
    
    renderActualActivities();
};

const updateSlotWork = (slotId, field, value) => {
    if (!actualWorkData.slotWork) actualWorkData.slotWork = {};
    if (!actualWorkData.slotWork[slotId]) actualWorkData.slotWork[slotId] = {};
    actualWorkData.slotWork[slotId][field] = value;
    
    const actualKey = `actual_work_${selectedActualDate}`;
    localStorage.setItem(actualKey, JSON.stringify(actualWorkData));
};

const renderActualActivities = () => {
    const container = document.getElementById('actual-activities');
    if (!actualWorkData.activities || actualWorkData.activities.length === 0) {
        container.innerHTML = '<p class="empty-state">No activities recorded</p>';
        return;
    }
    
    container.innerHTML = actualWorkData.activities.map((activity, index) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: #f9fafb; border-radius: 0.5rem; margin-bottom: 0.5rem;">
            <div>
                <div style="font-weight: 500; color: #1f2937;">${activity.text}</div>
                <div style="font-size: 0.875rem; color: #6b7280; margin-top: 0.25rem;">${formatTime(activity.duration)}</div>
            </div>
            <button class="delete-btn" onclick="deleteActualActivity(${index})">Delete</button>
        </div>
    `).join('');
};

const addActualActivity = () => {
    const text = document.getElementById('actual-activity').value.trim();
    const duration = parseInt(document.getElementById('actual-duration').value);
    
    if (!text || isNaN(duration) || duration <= 0) {
        alert('Please enter activity and valid duration');
        return;
    }
    
    if (!actualWorkData.activities) actualWorkData.activities = [];
    actualWorkData.activities.push({
        id: Date.now().toString(),
        text: text,
        duration: duration
    });
    
    const actualKey = `actual_work_${selectedActualDate}`;
    localStorage.setItem(actualKey, JSON.stringify(actualWorkData));
    
    document.getElementById('actual-activity').value = '';
    document.getElementById('actual-duration').value = '';
    renderActualActivities();
    loadActualWork(selectedActualDate); // Refresh to update totals
};

const deleteActualActivity = (index) => {
    actualWorkData.activities.splice(index, 1);
    const actualKey = `actual_work_${selectedActualDate}`;
    localStorage.setItem(actualKey, JSON.stringify(actualWorkData));
    renderActualActivities();
};

const initActualWork = () => {
    document.getElementById('actual-date-selector').addEventListener('change', (e) => {
        selectedActualDate = e.target.value;
        loadActualWork(selectedActualDate);
    });
    
    document.getElementById('add-actual-btn').addEventListener('click', addActualActivity);
    loadActualWork();
};

// Monthly Calendar Tab
let selectedCalendarMonth = null;

const loadMonthlyCalendar = (monthYear = null) => {
    const today = new Date();
    let targetDate;

    if (monthYear) {
        const [year, month] = monthYear.split('-');
        targetDate = new Date(year, month - 1, 1);
    } else {
        targetDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    selectedCalendarMonth = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;

    const monthSelector = document.getElementById('calendar-month-selector');
    if (monthSelector) {
        monthSelector.value = selectedCalendarMonth;
    }

    const currentMonth = targetDate.getMonth();
    const currentYear = targetDate.getFullYear();

    // ---- STUDY DATA (Pomodoro sessions) ----
    const allSessions = storage.getSessions();
    const studyData = {};
    allSessions.forEach(session => {
        const date = session.date;
        if (!studyData[date]) studyData[date] = 0;
        studyData[date] += session.duration;
    });

    // Dates in this month
    const monthDates = [];
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        monthDates.push(dateStr);
    }

    const totalMinutes = monthDates.reduce((sum, date) => sum + (studyData[date] || 0), 0);
    const daysWithData = monthDates.filter(date => (studyData[date] || 0) > 0).length;
    const monthlyAverage = daysWithData > 0 ? totalMinutes / daysWithData : 0;

    const monthlyAverageEl = document.getElementById('monthly-average');
    if (monthlyAverageEl) {
        monthlyAverageEl.textContent = `${(monthlyAverage / 60).toFixed(1)} hours`;
    }

    // ---- CALENDAR GRID BASICS ----
    const firstDay = new Date(currentYear, currentMonth, 1);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const getDayStatus = (day) => {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const minutes = studyData[dateStr] || 0;
        const hours = minutes / 60;

        if (hours >= 12) return { class: 'productive' };
        if (hours >= 6) return { class: 'average' };
        return { class: 'poor' };
    };

    const isToday = (day) => {
        return (
            day === today.getDate() &&
            currentMonth === today.getMonth() &&
            currentYear === today.getFullYear()
        );
    };

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];      
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const container = document.getElementById('monthly-calendar-container');
    if (!container) return;

    // ---- EVENTS ----
    const allEvents = storage.getEvents();
    const eventIcons = {
        birthday: '🎂',
        anniversary: '💍',
        holiday: '🎉',
        other: '📅'
    };

    let calendarHTML = `
        <div class="calendar-card-inner">
            <div class="calendar-month-title">
                ${monthNames[currentMonth]} ${currentYear}
            </div>
            <div class="calendar-grid">
                ${dayNames
                    .map(
                        day => `
                    <div class="calendar-grid-head">
                        ${day}
                    </div>`
                    )
                    .join('')}
    `;

    // Empty cells before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
        calendarHTML += '<div class="calendar-grid-empty"></div>';
    }

    const maxEventsToShow = 3;

    for (let day = 1; day <= daysInMonth; day++) {
        const status = getDayStatus(day);
        const statusClass = status.class;
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const minutes = studyData[dateStr] || 0;
        const hours = (minutes / 60).toFixed(1);

        const todayClass = isToday(day) ? 'is-today' : '';

        const dayEvents = allEvents.filter(e => {
            const eventDate = new Date(e.date);
            return (
                eventDate.getDate() === day &&
                eventDate.getMonth() === currentMonth &&
                eventDate.getFullYear() === currentYear
            );
        });

        const eventTooltip =
            dayEvents.length > 0
                ? dayEvents.map(e => e.name).join(', ')
                : `${hours}h on ${new Date(dateStr).toLocaleDateString()}`;

        const visibleEvents = dayEvents.slice(0, maxEventsToShow);
        let eventsHtml = visibleEvents
            .map(e => {
                const shortName = e.name.length > 14 ? e.name.slice(0, 14) + '…' : e.name;
                return `
                    <div class="calendar-event" title="${e.name}">
                        <span class="calendar-event-icon">${eventIcons[e.type] || '📅'}</span>
                        <span class="calendar-event-text">${shortName}</span>
                    </div>
                `;
            })
            .join('');

        if (dayEvents.length > maxEventsToShow) {
            const remaining = dayEvents.length - maxEventsToShow;
            eventsHtml += `
                <div class="calendar-event calendar-event-more">
                    +${remaining} more
                </div>
            `;
        }

        if (!eventsHtml && minutes > 0) {
            eventsHtml = `
                <div class="calendar-event calendar-event-meta">
                    ${hours}h focus
                </div>
            `;
        }

        calendarHTML += `
            <div class="calendar-day ${statusClass} ${todayClass}" data-date="${dateStr}" title="${eventTooltip}">
                <div class="calendar-day-date">${day}</div>
                <div class="calendar-day-content">
                    ${eventsHtml || ''}
                </div>
            </div>
        `;
    }

    calendarHTML += `
            </div>
        </div>
    `;

    container.innerHTML = calendarHTML;
};


// Event Management
const addEvent = () => {
    const type = document.getElementById('event-type').value;
    const date = document.getElementById('event-date').value;
    const name = document.getElementById('event-name').value.trim();
    
    if (!date || !name) {
        alert('Please fill in all fields');
        return;
    }
    
    const event = {
        id: Date.now().toString(),
        type: type,
        date: date,
        name: name
    };
    
    storage.saveEvent(event);
    
    // Clear form
    document.getElementById('event-date').value = '';
    document.getElementById('event-name').value = '';
    
    renderEventsList();
    loadMonthlyCalendar(selectedCalendarMonth);
};

const deleteEvent = (id) => {
    if (confirm('Are you sure you want to delete this event?')) {
        storage.deleteEvent(id);
        renderEventsList();
        loadMonthlyCalendar(selectedCalendarMonth);
    }
};

const renderEventsList = () => {
    const events = storage.getEvents();
    const container = document.getElementById('events-list');
    
    // If the list is removed/hidden, just exit
    if (!container) return;
    
    if (events.length === 0) {
        container.innerHTML = '<p class="empty-state">No events added yet</p>';
        return;
    }
    
    // Sort events by date
    const sortedEvents = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const eventIcons = {
        birthday: '🎂',
        anniversary: '💍',
        holiday: '🎉',
        other: '📅'
    };
    
    container.innerHTML = sortedEvents.map(event => {
        const eventDate = new Date(event.date);
        const isRecurring = event.recurring || false;
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: #f9fafb; border-radius: 0.5rem; margin-bottom: 0.5rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <span style="font-size: 1.25rem;">${eventIcons[event.type] || '📅'}</span>
                    <div>
                        <div style="font-weight: 500; color: #1f2937;">${event.name}</div>
                        <div style="font-size: 0.875rem; color: #6b7280;">
                            ${eventDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            ${isRecurring ? ' (Recurring)' : ''}
                        </div>
                    </div>
                </div>
                <button class="delete-btn" onclick="deleteEvent('${event.id}')">Delete</button>
            </div>
        `;
    }).join('');
};

const parseICSFile = (content) => {
    const events = [];
    const lines = content.split(/\r?\n/);
    let currentEvent = null;
    let inEvent = false;
    let currentLine = '';
    
    // First pass: handle line continuations properly
    const normalizedLines = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(/^[A-Z-]+[;:]/) || line.trim() === '') {
            // New line starting with property
            if (currentLine) {
                normalizedLines.push(currentLine);
            }
            currentLine = line;
        } else if (line.startsWith(' ') || line.startsWith('\t')) {
            // Continuation line
            currentLine += line.substring(1);
        } else {
            // New line
            if (currentLine) {
                normalizedLines.push(currentLine);
            }
            currentLine = line;
        }
    }
    if (currentLine) {
        normalizedLines.push(currentLine);
    }
    
    // Parse events
    for (let i = 0; i < normalizedLines.length; i++) {
        const line = normalizedLines[i].trim();
        
        if (line.startsWith('BEGIN:VEVENT')) {
            inEvent = true;
            currentEvent = {};
        } else if (line.startsWith('END:VEVENT')) {
            if (currentEvent && currentEvent.date && currentEvent.name) {
                // Determine event type based on name
                const nameLower = currentEvent.name.toLowerCase();
                let type = 'other';
                if (nameLower.includes('birthday') || nameLower.includes('bday') || nameLower.includes('birth day')) {
                    type = 'birthday';
                } else if (nameLower.includes('anniversary') || nameLower.includes('wedding')) {
                    type = 'anniversary';
                } else if (nameLower.includes('holiday') || nameLower.includes('christmas') || 
                          nameLower.includes('new year') || nameLower.includes('easter') ||
                          nameLower.includes('thanksgiving') || nameLower.includes('independence') ||
                          nameLower.includes('diwali') || nameLower.includes('holi') ||
                          nameLower.includes('ramadan') || nameLower.includes('eid')) {
                    type = 'holiday';
                }
                
                events.push({
                    id: Date.now().toString() + Math.random() + i,
                    type: type,
                    date: currentEvent.date,
                    name: currentEvent.name.trim()
                });
            }
            inEvent = false;
            currentEvent = null;
        } else if (inEvent && currentEvent) {
            // Parse DTSTART
            if (line.startsWith('DTSTART')) {
                let dateStr = '';
                if (line.includes(':')) {
                    dateStr = line.split(':').slice(1).join(':');
                } else if (line.includes(';VALUE=DATE:')) {
                    dateStr = line.split(';VALUE=DATE:')[1];
                }
                
                if (dateStr && dateStr.length >= 8) {
                    // Remove timezone and time if present
                    dateStr = dateStr.replace(/T.*$/, '').replace(/Z$/, '');
                    if (dateStr.length >= 8) {
                        const year = dateStr.substring(0, 4);
                        const month = dateStr.substring(4, 6);
                        const day = dateStr.substring(6, 8);
                        currentEvent.date = `${year}-${month}-${day}`;
                    }
                }
            }
            // Parse SUMMARY
            else if (line.startsWith('SUMMARY')) {
                let summary = '';
                if (line.includes(':')) {
                    summary = line.split(':').slice(1).join(':');
                }
                // Unescape text (basic unescaping)
                summary = summary.replace(/\\n/g, ' ').replace(/\\,/g, ',').replace(/\\;/g, ';');
                currentEvent.name = summary || 'Untitled Event';
            }
            // Parse DESCRIPTION as fallback
            else if (line.startsWith('DESCRIPTION') && !currentEvent.name) {
                let desc = '';
                if (line.includes(':')) {
                    desc = line.split(':').slice(1).join(':');
                }
                desc = desc.replace(/\\n/g, ' ').replace(/\\,/g, ',').replace(/\\;/g, ';');
                if (desc) {
                    currentEvent.name = desc.substring(0, 100).trim();
                }
            }
        }
    }
    
    return events;
};

const importFromGoogleCalendarURL = async (url) => {
    // Handle Google Calendar public iCal URL
    let fetchUrl = url.trim();
    
    // Normalize Google Calendar URLs
    if (fetchUrl.includes('calendar.google.com')) {
        // If it's already an iCal URL, use it as is
        if (fetchUrl.includes('/ical/')) {
            // Already in correct format
        } else if (fetchUrl.includes('/calendar/')) {
            // Extract calendar ID from various Google Calendar URL formats
            let calendarId = null;
            
            // Try to extract from URL patterns
            const patterns = [
                /calendar\/ical\/([^\/]+)/,
                /cid=([^&]+)/,
                /src=([^&]+)/,
                /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
            ];
            
            for (const pattern of patterns) {
                const match = fetchUrl.match(pattern);
                if (match) {
                    calendarId = decodeURIComponent(match[1]);
                    break;
                }
            }
            
            if (calendarId) {
                // Handle special calendars like holidays
                if (calendarId.includes('#holiday')) {
                    calendarId = calendarId.replace('#', '%23');
                }
                fetchUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(calendarId)}/public/basic.ics`;
            }
        }
    }
    
    // Try multiple CORS proxy options
    const proxies = [
        `https://api.allorigins.win/get?url=${encodeURIComponent(fetchUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(fetchUrl)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(fetchUrl)}`
    ];
    
    let lastError = null;
    
    for (const proxyUrl of proxies) {
        try {
            const response = await fetch(proxyUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'text/calendar, text/plain, */*'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            let icsContent;
            
            // Handle different proxy response formats
            if (proxyUrl.includes('allorigins.win')) {
                const data = await response.json();
                icsContent = data.contents;
            } else if (proxyUrl.includes('corsproxy.io') || proxyUrl.includes('codetabs.com')) {
                icsContent = await response.text();
            } else {
                icsContent = await response.text();
            }
            
            if (!icsContent || icsContent.trim().length === 0) {
                throw new Error('Empty response');
            }
            
            // Validate it's an ICS file
            if (!icsContent.includes('BEGIN:VCALENDAR') && !icsContent.includes('BEGIN:VEVENT')) {
                throw new Error('Invalid ICS format');
            }
            
            const events = parseICSFile(icsContent);
            
            if (events.length === 0) {
                console.warn('Parsed ICS but found no events');
            }
            
            return events;
        } catch (error) {
            lastError = error;
            console.warn(`Proxy failed, trying next:`, error.message);
            continue;
        }
    }
    
    // If all proxies fail, throw detailed error
    throw new Error(`Failed to fetch calendar: ${lastError?.message || 'All proxy methods failed'}. Please check if the calendar URL is correct and the calendar is set to public.`);
};

const importEventsFromFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target.result;
            let events = [];
            
            if (file.name.endsWith('.json')) {
                events = JSON.parse(content);
            } else if (file.name.endsWith('.csv')) {
                // Parse CSV
                const lines = content.split('\n');
                const headers = lines[0].split(',').map(h => h.trim());
                
                for (let i = 1; i < lines.length; i++) {
                    if (lines[i].trim()) {
                        const values = lines[i].split(',').map(v => v.trim());
                        const eventObj = {};
                        headers.forEach((header, index) => {
                            eventObj[header.toLowerCase()] = values[index];
                        });
                        
                        // Convert to our format
                        if (eventObj.date && eventObj.name) {
                            events.push({
                                id: Date.now().toString() + i,
                                type: eventObj.type || 'other',
                                date: eventObj.date,
                                name: eventObj.name
                            });
                        }
                    }
                }
            } else if (file.name.endsWith('.ics')) {
                // Parse ICS file
                events = parseICSFile(content);
            }
            
            // Validate and add events
            const validEvents = events.filter(e => e.date && e.name);
            if (validEvents.length > 0) {
                const existingEvents = storage.getEvents();
                const newEvents = validEvents.map(e => ({
                    ...e,
                    id: e.id || Date.now().toString() + Math.random()
                }));
                storage.saveAllEvents([...existingEvents, ...newEvents]);
                alert(`Successfully imported ${validEvents.length} events`);
                renderEventsList();
                loadMonthlyCalendar(selectedCalendarMonth);
            } else {
                alert('No valid events found in file');
            }
        } catch (error) {
            alert('Error importing file: ' + error.message);
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
};

let syncIntervalId = null;

const syncFromGoogleCalendar = async (showProgress = true) => {
    const settings = storage.getSyncSettings();
    const calendarUrls = settings.calendarUrls || [];
    
    if (calendarUrls.length === 0) {
        if (showProgress) {
            updateSyncStatus('No calendars configured', false);
        }
        return;
    }
    
    if (showProgress) {
        updateSyncStatus('Syncing...', true);
    }
    
    let allEvents = [];
    let successCount = 0;
    let errorCount = 0;
    const errorMessages = [];
    
    for (const calendar of calendarUrls) {
        try {
            const events = await importFromGoogleCalendarURL(calendar.url);
            if (events && events.length > 0) {
                allEvents = allEvents.concat(events);
                successCount++;
            } else {
                errorMessages.push(`${calendar.name}: No events found`);
            }
        } catch (error) {
            console.error(`Error syncing calendar ${calendar.name}:`, error);
            errorCount++;
            errorMessages.push(`${calendar.name}: ${error.message}`);
        }
    }
    
    // Update last sync time regardless of success/failure
    settings.lastSync = new Date().toISOString();
    storage.saveSyncSettings(settings);
    
    if (allEvents.length > 0) {
        // Merge with existing events, avoiding duplicates
        const existingEvents = storage.getEvents();
        const existingEventKeys = new Set(existingEvents.map(e => `${e.date}-${e.name}`));
        
        const newEvents = allEvents
            .filter(e => {
                const key = `${e.date}-${e.name}`;
                return !existingEventKeys.has(key);
            })
            .map(e => ({
                ...e,
                id: e.id || Date.now().toString() + Math.random(),
                source: 'google_calendar'
            }));
        
        if (newEvents.length > 0) {
            storage.saveAllEvents([...existingEvents, ...newEvents]);
        }
        
        if (showProgress) {
            let statusMsg = `Synced ${newEvents.length} new event(s) from ${successCount} calendar(s)`;
            if (errorCount > 0) {
                statusMsg += ` (${errorCount} error(s))`;
            }
            updateSyncStatus(statusMsg, false);
            renderEventsList();
            loadMonthlyCalendar(selectedCalendarMonth);
        }
    } else {
        if (showProgress) {
            if (errorCount > 0) {
                const errorMsg = errorMessages.length > 0 
                    ? `Errors: ${errorMessages.join('; ')}` 
                    : 'Sync failed. Check calendar URLs.';
                updateSyncStatus(errorMsg, false);
            } else {
                updateSyncStatus('No new events found', false);
            }
        }
    }
    
    updateLastSyncTime();
};

const updateSyncStatus = (message, isSyncing) => {
    const statusText = document.getElementById('sync-status-text');
    if (statusText) {
        statusText.textContent = message;
        statusText.style.color = isSyncing ? '#f59e0b' : '#10b981';
    }
};

const updateLastSyncTime = () => {
    const settings = storage.getSyncSettings();
    const lastSyncEl = document.getElementById('last-sync-time');
    if (lastSyncEl) {
        if (settings.lastSync) {
            const lastSyncDate = new Date(settings.lastSync);
            const now = new Date();
            const diffMs = now - lastSyncDate;
            const diffMins = Math.floor(diffMs / 60000);
            
            if (diffMins < 1) {
                lastSyncEl.textContent = 'Just now';
            } else if (diffMins < 60) {
                lastSyncEl.textContent = `${diffMins} minute(s) ago`;
            } else if (diffMins < 1440) {
                const hours = Math.floor(diffMins / 60);
                lastSyncEl.textContent = `${hours} hour(s) ago`;
            } else {
                lastSyncEl.textContent = lastSyncDate.toLocaleString();
            }
        } else {
            lastSyncEl.textContent = 'Never';
        }
    }
};

const startAutoSync = () => {
    const settings = storage.getSyncSettings();
    
    if (syncIntervalId) {
        clearInterval(syncIntervalId);
    }
    
    if (settings.enabled && settings.calendarUrls && settings.calendarUrls.length > 0) {
        // Sync immediately
        syncFromGoogleCalendar(true);
        
        // Then sync at intervals
        const intervalMs = (settings.interval || 30) * 60 * 1000;
        syncIntervalId = setInterval(() => {
            syncFromGoogleCalendar(true);
        }, intervalMs);
    }
};

const stopAutoSync = () => {
    if (syncIntervalId) {
        clearInterval(syncIntervalId);
        syncIntervalId = null;
    }
    updateSyncStatus('Auto-sync disabled', false);
};

const renderCalendarUrls = () => {
    const calendarUrls = storage.getCalendarUrls();
    const container = document.getElementById('calendar-urls-container');
    
    if (calendarUrls.length === 0) {
        container.innerHTML = '<div style="font-size: 0.875rem; color: #6b7280; padding: 0.5rem;">No calendars added. Click "Add Calendar URL" to add one.</div>';
        return;
    }
    
    container.innerHTML = calendarUrls.map(calendar => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: white; border-radius: 0.5rem; margin-bottom: 0.5rem; border: 1px solid #e5e7eb;">
            <div style="flex: 1;">
                <div style="font-weight: 500; color: #1f2937; font-size: 0.875rem;">${calendar.name}</div>
                <div style="font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem; word-break: break-all;">${calendar.url.substring(0, 60)}${calendar.url.length > 60 ? '...' : ''}</div>
            </div>
            <button class="delete-btn" onclick="removeCalendarUrl('${calendar.id}')" style="margin-left: 1rem;">Remove</button>
        </div>
    `).join('');
};

const addCalendarUrlDialog = () => {
    const url = prompt('Enter Google Calendar iCal URL:\n\n' +
        'You can find this in Google Calendar:\n' +
        'Settings → Your Calendar → Integrate calendar → Public URL to iCal format');
    
    if (!url || !url.trim()) return;
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        alert('Please enter a valid URL starting with http:// or https://');
        return;
    }
    
    const name = prompt('Enter a name for this calendar (optional):') || 'Calendar';
    
    storage.addCalendarUrl(url.trim(), name);
    renderCalendarUrls();
    
    // If auto-sync is enabled, restart it
    const settings = storage.getSyncSettings();
    if (settings.enabled) {
        startAutoSync();
    }
};

const removeCalendarUrl = (id) => {
    if (confirm('Are you sure you want to remove this calendar?')) {
        storage.removeCalendarUrl(id);
        renderCalendarUrls();
        
        // Restart sync if enabled
        const settings = storage.getSyncSettings();
        if (settings.enabled) {
            startAutoSync();
        }
    }
};

const handleGoogleCalendarImport = () => {
    const url = prompt('Enter Google Calendar iCal URL or paste the public calendar URL:\n\n' +
        'You can find this in Google Calendar:\n' +
        'Settings → Your Calendar → Integrate calendar → Public URL to iCal format\n\n' +
        'Or upload the .ics file using "Import from File" button.');
    
    if (!url) return;
    
    // Check if it's a URL or suggest file upload
    if (url.startsWith('http://') || url.startsWith('https://')) {
        // Try to fetch from URL
        importFromGoogleCalendarURL(url)
            .then(events => {
                if (events.length > 0) {
                    const existingEvents = storage.getEvents();
                    const newEvents = events.map(e => ({
                        ...e,
                        id: e.id || Date.now().toString() + Math.random()
                    }));
                    storage.saveAllEvents([...existingEvents, ...newEvents]);
                    alert(`Successfully imported ${events.length} events from Google Calendar`);
                    renderEventsList();
                    loadMonthlyCalendar(selectedCalendarMonth);
                } else {
                    alert('No events found in the calendar. Please try downloading the .ics file and importing it manually.');
                }
            })
            .catch(error => {
                alert('Error: ' + error.message + '\n\nPlease download the .ics file from Google Calendar and use "Import from File" instead.');
            });
    } else {
        alert('Please enter a valid URL or use "Import from File" to upload the .ics file directly.');
    }
};

const exportEvents = () => {
    const events = storage.getEvents();
    if (events.length === 0) {
        alert('No events to export');
        return;
    }
    
    const dataStr = JSON.stringify(events, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `calendar-events-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
};

const initMonthlyCalendar = () => {
    document.getElementById('calendar-month-selector').addEventListener('change', (e) => {
        loadMonthlyCalendar(e.target.value);
        const autoSyncVisibility = document.getElementById('auto-sync-visibility');
        const autoSyncSettingsCard = document.getElementById('auto-sync-settings-card');
        
        if (autoSyncVisibility && autoSyncSettingsCard) {
            // set initial state
            autoSyncSettingsCard.style.display =
                autoSyncVisibility.value === 'visible' ? 'block' : 'none';
        
            autoSyncVisibility.addEventListener('change', (e) => {
                autoSyncSettingsCard.style.display =
                    e.target.value === 'visible' ? 'block' : 'none';
            });
        }        
    });
    
    document.getElementById('add-event-btn').addEventListener('click', addEvent);
    
    // Auto-sync controls
    const autoSyncEnabled = document.getElementById('auto-sync-enabled');
    const syncNowBtn = document.getElementById('sync-now-btn');
    const addCalendarUrlBtn = document.getElementById('add-calendar-url-btn');
    const syncIntervalSelect = document.getElementById('sync-interval');
    
    // Load sync settings
    const settings = storage.getSyncSettings();
    autoSyncEnabled.checked = settings.enabled;
    syncIntervalSelect.value = settings.interval || 30;
    updateLastSyncTime();
    renderCalendarUrls();
    
    // Auto-sync toggle
    autoSyncEnabled.addEventListener('change', (e) => {
        settings.enabled = e.target.checked;
        storage.saveSyncSettings(settings);
        
        if (settings.enabled) {
            startAutoSync();
        } else {
            stopAutoSync();
        }
    });
    
    // Sync interval change
    syncIntervalSelect.addEventListener('change', (e) => {
        settings.interval = parseInt(e.target.value);
        storage.saveSyncSettings(settings);
        
        if (settings.enabled) {
            startAutoSync();
        }
    });
    
    // Manual sync button
    syncNowBtn.addEventListener('click', () => {
        syncFromGoogleCalendar(true);
    });
    
    // Add calendar URL button
    addCalendarUrlBtn.addEventListener('click', addCalendarUrlDialog);
    
    // Start auto-sync if enabled
    if (settings.enabled) {
        startAutoSync();
    }
    
    renderEventsList();
    loadMonthlyCalendar();
};

const renderDays = (days) => {
    const container = document.getElementById('days-container');
    container.innerHTML = days.map(day => `
        <div class="day-item">
            <div>
                <div class="day-label">${getWeekLabel(day.date)}</div>
                <div class="day-date">${new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
            </div>
            <div class="day-time">${formatTime(day.minutes)}</div>
        </div>
    `).join('');
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initPomodoro();
    initDailyPlan();
    initActualWork();
    initMonthlyCalendar();
    loadWeeklyReport();
    
    // Make functions globally available
    window.toggleTask = toggleTask;
    window.deleteTask = deleteTask;
    window.deleteActualActivity = deleteActualActivity;
    window.updateSlotWork = updateSlotWork;
    window.deleteEvent = deleteEvent;
    window.importEventsFromFile = importEventsFromFile;
    window.removeCalendarUrl = removeCalendarUrl;
    
    // Auto-sync on page load if enabled
    const settings = storage.getSyncSettings();
    if (settings.enabled && settings.calendarUrls && settings.calendarUrls.length > 0) {
        // Wait a bit for UI to load, then sync
        setTimeout(() => {
            syncFromGoogleCalendar(true);
        }, 2000);
    }
});

