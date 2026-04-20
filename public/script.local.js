/* =====================
   STATE MANAGEMENT & AUTH
===================== */
const STORAGE_KEY_GUEST = 'habitify_data';
const STORAGE_KEY_USERS = 'habitify_users';
const STORAGE_KEY_SESSION = 'habitify_session';
const STORAGE_KEY_SOCIAL = 'habitify_social';

// Default Initial State
const defaultState = {
    user: {
        username: "Guest",
        bio: "",
        photoDataUrl: null,
        privacy: "public",
        joinedDate: new Date().toISOString(),
        xp: 0,
        level: 1,
        totalPoints: 0
    },
    habits: [], 
    fitness: {
        setupComplete: false,
        profile: {},
        plan: {},
        logs: {},
        stats: {
            workoutsCompleted: 0,
            streak: 0,
            caloriesBurned: 0
        },
        health: {
            bmiHistory: [],
            weightHistory: [],
            lastMetrics: {
                heightCm: null,
                weightKg: null,
                age: null,
                gender: "male",
                waistCm: null,
                neckCm: null,
                hipCm: null,
                activityFactor: 1.2
            }
        },
        goals: {
            goalType: "general_fitness",
            targetWeightKg: null,
            weeklyTargetKg: null,
            deadline: null,
            createdAt: null
        },
        nutrition: {
            dietPreference: "non_veg",
            waterTargetMl: 2500,
            dailyCaloriesTarget: null,
            macros: { proteinG: null, carbsG: null, fatsG: null },
            checklistByDate: {}
        },
        reminders: {
            enabled: { workout: false, water: false, sleep: false, inactivity: false },
            workoutTime: "18:00",
            waterIntervalMin: 60,
            sleepTime: "23:00",
            inactivityMinutes: 60,
            lastNotified: {}
        },
        workout: {
            dailyLogs: {},
            progressive: {},
            disclaimerAccepted: false
        }
    },
    settings: {
        theme: "light"
    }
};

let appData = null;
let currentUser = null; // Username string or null
let socialStore = null;

// Initialize
function initApp() {
    currentUser = sessionStorage.getItem(STORAGE_KEY_SESSION);
    appData = normalizeAppData(loadData());
    socialStore = loadSocialStore();
    syncSelfToSocialStore();
    applyTheme(appData.settings.theme);
    switchTab('dashboard');
    setupEventListeners();
}

function loadData() {
    if (currentUser) {
        // Load User Data
        const users = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '{}');
        if (users[currentUser]) {
            return users[currentUser].data;
        } else {
            // Session invalid?
            sessionStorage.removeItem(STORAGE_KEY_SESSION);
            currentUser = null;
            return loadGuestData();
        }
    } else {
        return loadGuestData();
    }
}

function loadGuestData() {
    const raw = localStorage.getItem(STORAGE_KEY_GUEST);
    if (raw) {
        try {
            return JSON.parse(raw);
        } catch (e) {
            console.error("Failed to parse guest data.");
            return JSON.parse(JSON.stringify(defaultState));
        }
    }
    return JSON.parse(JSON.stringify(defaultState));
}

function normalizeAppData(data) {
    const base = JSON.parse(JSON.stringify(defaultState));
    const src = data && typeof data === 'object' ? data : {};

    base.user = { ...base.user, ...(src.user && typeof src.user === 'object' ? src.user : {}) };
    base.habits = Array.isArray(src.habits) ? src.habits : [];
    base.fitness = { ...base.fitness, ...(src.fitness && typeof src.fitness === 'object' ? src.fitness : {}) };
    base.settings = { ...base.settings, ...(src.settings && typeof src.settings === 'object' ? src.settings : {}) };

    base.user.username = (base.user.username || 'Guest').toString();
    base.user.bio = (base.user.bio || '').toString();
    base.user.photoDataUrl = base.user.photoDataUrl || null;
    base.user.privacy = base.user.privacy === 'private' ? 'private' : 'public';
    base.user.joinedDate = base.user.joinedDate || new Date().toISOString();
    base.user.xp = Number(base.user.xp) || 0;
    base.user.level = Number(base.user.level) || 1;
    base.user.totalPoints = Number(base.user.totalPoints) || 0;

    base.habits = base.habits
        .filter(h => h && typeof h === 'object')
        .map(h => {
            const id = h.id || (crypto.randomUUID ? crypto.randomUUID() : 'h-' + Date.now() + Math.random().toString(36).substr(2, 9));
            const logs = h.logs && typeof h.logs === 'object' ? h.logs : {};
            return {
                id,
                name: (h.name || '').toString(),
                category: (h.category || 'Personal').toString(),
                createdDate: h.createdDate || new Date().toISOString(),
                logs
            };
        });

    if (!base.fitness || typeof base.fitness !== 'object') base.fitness = JSON.parse(JSON.stringify(defaultState.fitness));
    if (!base.fitness.stats || typeof base.fitness.stats !== 'object') {
        base.fitness.stats = { workoutsCompleted: 0, streak: 0, caloriesBurned: 0 };
    }
    if (!base.fitness.logs || typeof base.fitness.logs !== 'object') base.fitness.logs = {};
    base.fitness.stats.workoutsCompleted = Number(base.fitness.stats.workoutsCompleted) || 0;
    base.fitness.stats.streak = Number(base.fitness.stats.streak) || 0;
    base.fitness.stats.caloriesBurned = Number(base.fitness.stats.caloriesBurned) || 0;

    if (!base.fitness.health || typeof base.fitness.health !== 'object') base.fitness.health = JSON.parse(JSON.stringify(defaultState.fitness.health));
    if (!Array.isArray(base.fitness.health.bmiHistory)) base.fitness.health.bmiHistory = [];
    if (!Array.isArray(base.fitness.health.weightHistory)) base.fitness.health.weightHistory = [];
    if (!base.fitness.health.lastMetrics || typeof base.fitness.health.lastMetrics !== 'object') {
        base.fitness.health.lastMetrics = JSON.parse(JSON.stringify(defaultState.fitness.health.lastMetrics));
    } else {
        base.fitness.health.lastMetrics = { ...JSON.parse(JSON.stringify(defaultState.fitness.health.lastMetrics)), ...base.fitness.health.lastMetrics };
    }

    if (!base.fitness.goals || typeof base.fitness.goals !== 'object') base.fitness.goals = JSON.parse(JSON.stringify(defaultState.fitness.goals));
    base.fitness.goals.goalType = base.fitness.goals.goalType || 'general_fitness';
    if (!base.fitness.nutrition || typeof base.fitness.nutrition !== 'object') base.fitness.nutrition = JSON.parse(JSON.stringify(defaultState.fitness.nutrition));
    base.fitness.nutrition.dietPreference = base.fitness.nutrition.dietPreference || 'non_veg';
    base.fitness.nutrition.waterTargetMl = Number(base.fitness.nutrition.waterTargetMl) || 2500;
    if (!base.fitness.nutrition.macros || typeof base.fitness.nutrition.macros !== 'object') base.fitness.nutrition.macros = { proteinG: null, carbsG: null, fatsG: null };
    if (!base.fitness.nutrition.checklistByDate || typeof base.fitness.nutrition.checklistByDate !== 'object') base.fitness.nutrition.checklistByDate = {};

    if (!base.fitness.reminders || typeof base.fitness.reminders !== 'object') base.fitness.reminders = JSON.parse(JSON.stringify(defaultState.fitness.reminders));
    if (!base.fitness.reminders.enabled || typeof base.fitness.reminders.enabled !== 'object') {
        base.fitness.reminders.enabled = JSON.parse(JSON.stringify(defaultState.fitness.reminders.enabled));
    } else {
        base.fitness.reminders.enabled = { ...JSON.parse(JSON.stringify(defaultState.fitness.reminders.enabled)), ...base.fitness.reminders.enabled };
    }
    base.fitness.reminders.workoutTime = base.fitness.reminders.workoutTime || '18:00';
    base.fitness.reminders.waterIntervalMin = Number(base.fitness.reminders.waterIntervalMin) || 60;
    base.fitness.reminders.sleepTime = base.fitness.reminders.sleepTime || '23:00';
    base.fitness.reminders.inactivityMinutes = Number(base.fitness.reminders.inactivityMinutes) || 60;
    if (!base.fitness.reminders.lastNotified || typeof base.fitness.reminders.lastNotified !== 'object') base.fitness.reminders.lastNotified = {};

    if (!base.fitness.workout || typeof base.fitness.workout !== 'object') base.fitness.workout = JSON.parse(JSON.stringify(defaultState.fitness.workout));
    if (!base.fitness.workout.dailyLogs || typeof base.fitness.workout.dailyLogs !== 'object') base.fitness.workout.dailyLogs = {};
    if (!base.fitness.workout.progressive || typeof base.fitness.workout.progressive !== 'object') base.fitness.workout.progressive = {};
    if (typeof base.fitness.workout.disclaimerAccepted !== 'boolean') base.fitness.workout.disclaimerAccepted = false;

    base.settings.theme = base.settings.theme === 'dark' ? 'dark' : 'light';

    return base;
}

function loadSocialStore() {
    const raw = localStorage.getItem(STORAGE_KEY_SOCIAL);
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            const base = {
                users: {},
                feed: [],
                challenges: {}
            };
            if (parsed && typeof parsed === 'object') {
                base.users = parsed.users && typeof parsed.users === 'object' ? parsed.users : {};
                base.feed = Array.isArray(parsed.feed) ? parsed.feed : [];
                base.challenges = parsed.challenges && typeof parsed.challenges === 'object' ? parsed.challenges : {};
            }
            return base;
        } catch {
            return { users: {}, feed: [], challenges: {} };
        }
    }
    return { users: {}, feed: [], challenges: {} };
}

function saveSocialStore() {
    if (!socialStore) return;
    localStorage.setItem(STORAGE_KEY_SOCIAL, JSON.stringify(socialStore));
}

function todayKey() {
    return new Date().toISOString().split('T')[0];
}

function ensureSocialUser(username) {
    if (!socialStore) socialStore = loadSocialStore();
    if (!username) return null;
    if (!socialStore.users[username]) {
        socialStore.users[username] = {
            profile: {
                username,
                bio: "",
                photoDataUrl: null,
                privacy: "public",
                fitnessGoal: null,
                categories: []
            },
            follow: {
                followers: [],
                following: [],
                requestsIn: [],
                requestsOut: []
            },
            notifications: {
                items: [],
                prefs: { follow: true, challenges: true, rank: true, messages: true },
                lastReadAt: null
            },
            safety: {
                blocked: [],
                reports: []
            },
            rate: {
                day: todayKey(),
                followRequestsSent: 0,
                messagesSent: 0,
                nudgesSent: 0,
                reportsSent: 0
            },
            milestones: {
                streak: {},
                rank: null,
                challengesCompleted: {}
            },
            rank: {
                points: 0,
                tier: "Bronze",
                updatedAt: null
            }
        };
        saveSocialStore();
    }
    const su = socialStore.users[username];
    if (!su.profile || typeof su.profile !== 'object') {
        su.profile = { username, bio: "", photoDataUrl: null, privacy: "public", fitnessGoal: null, categories: [] };
    }
    su.profile.username = (su.profile.username || username).toString();
    su.profile.bio = (su.profile.bio || '').toString();
    su.profile.photoDataUrl = su.profile.photoDataUrl || null;
    su.profile.privacy = su.profile.privacy === 'private' ? 'private' : 'public';
    if (!Array.isArray(su.profile.categories)) su.profile.categories = [];

    if (!su.follow || typeof su.follow !== 'object') su.follow = { followers: [], following: [], requestsIn: [], requestsOut: [] };
    if (!Array.isArray(su.follow.followers)) su.follow.followers = [];
    if (!Array.isArray(su.follow.following)) su.follow.following = [];
    if (!Array.isArray(su.follow.requestsIn)) su.follow.requestsIn = [];
    if (!Array.isArray(su.follow.requestsOut)) su.follow.requestsOut = [];

    if (!su.notifications || typeof su.notifications !== 'object') su.notifications = { items: [], prefs: { follow: true, challenges: true, rank: true, messages: true }, lastReadAt: null };
    if (!Array.isArray(su.notifications.items)) su.notifications.items = [];
    if (!su.notifications.prefs || typeof su.notifications.prefs !== 'object') su.notifications.prefs = { follow: true, challenges: true, rank: true, messages: true };
    if (typeof su.notifications.lastReadAt !== 'string' && su.notifications.lastReadAt !== null) su.notifications.lastReadAt = null;

    if (!su.safety || typeof su.safety !== 'object') su.safety = { blocked: [], reports: [] };
    if (!Array.isArray(su.safety.blocked)) su.safety.blocked = [];
    if (!Array.isArray(su.safety.reports)) su.safety.reports = [];

    if (!su.rate || typeof su.rate !== 'object') su.rate = { day: todayKey(), followRequestsSent: 0, messagesSent: 0, nudgesSent: 0, reportsSent: 0 };
    if (typeof su.rate.day !== 'string') su.rate.day = todayKey();
    su.rate.followRequestsSent = Number(su.rate.followRequestsSent) || 0;
    su.rate.messagesSent = Number(su.rate.messagesSent) || 0;
    su.rate.nudgesSent = Number(su.rate.nudgesSent) || 0;
    su.rate.reportsSent = Number(su.rate.reportsSent) || 0;

    if (!su.milestones || typeof su.milestones !== 'object') su.milestones = { streak: {}, rank: null, challengesCompleted: {} };
    if (!su.milestones.streak || typeof su.milestones.streak !== 'object') su.milestones.streak = {};
    if (!su.milestones.challengesCompleted || typeof su.milestones.challengesCompleted !== 'object') su.milestones.challengesCompleted = {};

    if (!su.rank || typeof su.rank !== 'object') su.rank = { points: 0, tier: "Bronze", updatedAt: null };
    su.rank.points = Number(su.rank.points) || 0;
    su.rank.tier = (su.rank.tier || 'Bronze').toString();
    if (typeof su.rank.updatedAt !== 'string' && su.rank.updatedAt !== null) su.rank.updatedAt = null;

    return su;
}

function syncSelfToSocialStore() {
    if (!currentUser || !appData) return;
    const su = ensureSocialUser(currentUser);
    if (!su) return;
    const categories = [...new Set((appData.habits || []).map(h => (h?.category || '').toString()).filter(Boolean))];
    const fitnessGoal = appData.fitness?.profile?.goal || null;
    su.profile.username = currentUser;
    su.profile.bio = (appData.user.bio || '').toString();
    su.profile.photoDataUrl = appData.user.photoDataUrl || null;
    su.profile.privacy = appData.user.privacy === 'private' ? 'private' : 'public';
    su.profile.categories = categories;
    su.profile.fitnessGoal = fitnessGoal;
    ensureRateReset(su);
    saveSocialStore();
}

function ensureRateReset(su) {
    const d = todayKey();
    if (su.rate?.day !== d) {
        su.rate = { day: d, followRequestsSent: 0, messagesSent: 0, nudgesSent: 0, reportsSent: 0 };
    }
}

function saveData() {
    if (currentUser) {
        const users = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '{}');
        if (users[currentUser]) {
            users[currentUser].data = appData;
            localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
        }
    } else {
        localStorage.setItem(STORAGE_KEY_GUEST, JSON.stringify(appData));
    }
    const dashboardEl = document.getElementById('dashboardSection');
    const fitnessEl = document.getElementById('fitnessSection');
    const friendsEl = document.getElementById('friendsSection');
    const isDashboardVisible = dashboardEl ? dashboardEl.style.display !== 'none' : true;
    const isFitnessVisible = fitnessEl ? fitnessEl.style.display !== 'none' : false;
    const isFriendsVisible = friendsEl ? friendsEl.style.display !== 'none' : false;

    if (currentUser) syncSelfToSocialStore();

    if (isFriendsVisible && !isDashboardVisible && !isFitnessVisible) {
        renderFriends();
    } else if (isFitnessVisible && !isDashboardVisible) {
        renderFitness();
    } else {
        updateUI();
    }
}

function switchTab(tab) {
    const dashboardEl = document.getElementById('dashboardSection');
    const fitnessEl = document.getElementById('fitnessSection');
    const friendsEl = document.getElementById('friendsSection');

    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    if (dashboardEl) dashboardEl.style.display = tab === 'dashboard' ? 'block' : 'none';
    if (fitnessEl) fitnessEl.style.display = tab === 'fitness' ? 'block' : 'none';
    if (friendsEl) friendsEl.style.display = tab === 'friends' ? 'block' : 'none';

    if (tab === 'fitness') {
        renderFitness();
        return;
    }
    if (tab === 'friends') {
        renderFriends();
        return;
    }

    updateUI();
}

function ensureFitnessState() {
    if (!appData.fitness) {
        appData.fitness = JSON.parse(JSON.stringify(defaultState.fitness));
    }
    if (!appData.fitness.logs) appData.fitness.logs = {};
    if (!appData.fitness.stats) {
        appData.fitness.stats = { workoutsCompleted: 0, streak: 0, caloriesBurned: 0 };
    }
    if (!appData.fitness.health) appData.fitness.health = JSON.parse(JSON.stringify(defaultState.fitness.health));
    if (!Array.isArray(appData.fitness.health.bmiHistory)) appData.fitness.health.bmiHistory = [];
    if (!Array.isArray(appData.fitness.health.weightHistory)) appData.fitness.health.weightHistory = [];
    if (!appData.fitness.health.lastMetrics) appData.fitness.health.lastMetrics = JSON.parse(JSON.stringify(defaultState.fitness.health.lastMetrics));

    if (!appData.fitness.goals) appData.fitness.goals = JSON.parse(JSON.stringify(defaultState.fitness.goals));
    if (!appData.fitness.nutrition) appData.fitness.nutrition = JSON.parse(JSON.stringify(defaultState.fitness.nutrition));
    if (!appData.fitness.nutrition.checklistByDate) appData.fitness.nutrition.checklistByDate = {};
    if (!appData.fitness.reminders) appData.fitness.reminders = JSON.parse(JSON.stringify(defaultState.fitness.reminders));
    if (!appData.fitness.reminders.enabled) appData.fitness.reminders.enabled = JSON.parse(JSON.stringify(defaultState.fitness.reminders.enabled));
    if (!appData.fitness.reminders.lastNotified) appData.fitness.reminders.lastNotified = {};
    if (!appData.fitness.workout) appData.fitness.workout = JSON.parse(JSON.stringify(defaultState.fitness.workout));
    if (!appData.fitness.workout.dailyLogs) appData.fitness.workout.dailyLogs = {};
    if (!appData.fitness.workout.progressive) appData.fitness.workout.progressive = {};
    if (typeof appData.fitness.workout.disclaimerAccepted !== 'boolean') appData.fitness.workout.disclaimerAccepted = false;
}

const EXERCISE_DB = {
    push: {
        gym: ["Bench Press", "Overhead Press", "Incline Dumbbell Press", "Tricep Pushdowns", "Lateral Raises"],
        home_dumbbells: ["Dumbbell Floor Press", "Dumbbell Overhead Press", "Dumbbell Flyes", "Tricep Kickbacks"],
        bodyweight: ["Push-ups", "Pike Push-ups", "Dips (Chair)", "Diamond Push-ups"]
    },
    pull: {
        gym: ["Lat Pulldowns", "Barbell Rows", "Face Pulls", "Bicep Curls", "Deadlifts"],
        home_dumbbells: ["Dumbbell Rows", "Dumbbell Curls", "Renegade Rows"],
        bodyweight: ["Pull-ups", "Inverted Rows", "Superman", "Doorframe Rows"]
    },
    legs: {
        gym: ["Barbell Squats", "Leg Press", "Romanian Deadlifts", "Leg Extensions", "Calf Raises"],
        home_dumbbells: ["Goblet Squats", "Dumbbell Lunges", "Dumbbell RDL", "Calf Raises"],
        bodyweight: ["Air Squats", "Lunges", "Glute Bridges", "Step-ups", "Wall Sit"]
    },
    cardio: {
        any: ["Jumping Jacks", "Burpees", "Mountain Climbers", "High Knees", "Jump Rope"]
    },
    core: {
        any: ["Plank", "Crunches", "Leg Raises", "Russian Twists", "Bicycle Crunches"]
    }
};

function renderFitness() {
    ensureFitnessState();

    const setupEl = document.getElementById('fitnessSetup');
    const dashboardEl = document.getElementById('fitnessDashboard');
    if (!setupEl || !dashboardEl) return;

    if (!appData.fitness.setupComplete) {
        setupEl.style.display = 'flex';
        dashboardEl.style.display = 'none';
        toggleEquipmentOptions();
        return;
    }

    setupEl.style.display = 'none';
    dashboardEl.style.display = 'block';
    renderFitnessDashboard();
}

function toggleEquipmentOptions() {
    const locEl = document.getElementById('fitLocation');
    const eqGroup = document.getElementById('equipmentGroup');
    if (!locEl || !eqGroup) return;

    const loc = locEl.value;
    eqGroup.style.display = loc === 'gym' ? 'none' : 'block';
}

function handleFitnessSetup() {
    ensureFitnessState();

    const goalEl = document.querySelector('input[name="fitGoal"]:checked');
    if (!goalEl) return;

    const goal = goalEl.value;
    const level = document.getElementById('fitLevel')?.value || 'beginner';
    const location = document.getElementById('fitLocation')?.value || 'home';
    const days = parseInt(document.getElementById('fitDays')?.value || '3', 10);
    const duration = parseInt(document.getElementById('fitDuration')?.value || '30', 10);

    let equipment = [];
    if (location === 'gym') {
        equipment = ['gym'];
    } else {
        document.querySelectorAll('input[name="fitEquip"]:checked').forEach(cb => equipment.push(cb.value));
        if (equipment.includes('none') || equipment.length === 0) equipment = ['bodyweight'];
    }

    const profile = { goal, level, location, days, duration, equipment };
    const plan = generateWorkoutPlan(profile);

    appData.fitness.profile = profile;
    appData.fitness.plan = plan;
    appData.fitness.setupComplete = true;
    saveData();
}

function generateWorkoutPlan(profile) {
    const plan = {};
    const week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    let template = Array(7).fill('Rest');
    if (profile.goal === 'muscle_gain') {
        if (profile.days === 3) template = ['Full Body', 'Rest', 'Full Body', 'Rest', 'Full Body', 'Rest', 'Rest'];
        else if (profile.days === 4) template = ['Upper', 'Lower', 'Rest', 'Upper', 'Lower', 'Rest', 'Rest'];
        else template = ['Push', 'Pull', 'Legs', 'Rest', 'Upper', 'Lower', 'Rest'];
    } else if (profile.goal === 'weight_loss') {
        template = Array(7).fill('Rest');
        const picks = ['HIIT Cardio', 'Full Body Circuit', 'Cardio + Core'];
        for (let i = 0; i < Math.min(profile.days, 7); i++) template[(i * 2) % 7] = picks[i % picks.length];
    } else {
        template = Array(7).fill('Rest');
        const picks = ['Mixed Routine', 'Full Body', 'Cardio + Core'];
        for (let i = 0; i < Math.min(profile.days, 7); i++) template[(i * 2) % 7] = picks[i % picks.length];
    }

    week.forEach((day, idx) => {
        const type = template[idx] || 'Rest';
        plan[day] = type === 'Rest'
            ? { type: 'Rest', exercises: [] }
            : { type, exercises: generateExercisesForType(type, profile) };
    });

    return plan;
}

function generateExercisesForType(type, profile) {
    const exercises = [];

    const equipKey = profile.location === 'gym'
        ? 'gym'
        : (profile.equipment.includes('dumbbells') ? 'home_dumbbells' : 'bodyweight');

    const pick = (group) => {
        const groupMap = EXERCISE_DB[group];
        const list = groupMap[equipKey] || groupMap.any || groupMap.bodyweight || [];
        return list[Math.floor(Math.random() * list.length)];
    };

    let sets = 3;
    let reps = 10;
    if (profile.goal === 'muscle_gain') { sets = 4; reps = 8; }
    if (profile.goal === 'weight_loss') { sets = 3; reps = 15; }

    const add = (name, s, r) => exercises.push({ name, sets: s, reps: r });

    if (type.includes('Push')) {
        add(pick('push'), sets, reps);
        add(pick('push'), sets, reps);
        add(pick('push'), sets, reps);
        add(pick('core'), 3, 15);
    } else if (type.includes('Pull')) {
        add(pick('pull'), sets, reps);
        add(pick('pull'), sets, reps);
        add(pick('core'), 3, 15);
        add(pick('core'), 3, 15);
    } else if (type.includes('Legs') || type.includes('Lower')) {
        add(pick('legs'), sets, reps);
        add(pick('legs'), sets, reps);
        add(pick('legs'), sets, reps);
        add(pick('cardio'), 1, '10 min');
    } else if (type.includes('Upper')) {
        add(pick('push'), sets, reps);
        add(pick('pull'), sets, reps);
        add(pick('push'), sets, reps);
        add(pick('core'), 3, 15);
    } else if (type.includes('Full Body') || type.includes('Mixed') || type.includes('Circuit')) {
        add(pick('legs'), sets, reps);
        add(pick('push'), sets, reps);
        add(pick('pull'), sets, reps);
        add(pick('core'), 3, 15);
    } else if (type.includes('Cardio') || type.includes('HIIT')) {
        add(pick('cardio'), 4, '45 sec');
        add(pick('cardio'), 4, '45 sec');
        add(pick('core'), 3, 20);
        add(pick('cardio'), 4, '45 sec');
    } else {
        add(pick('legs'), sets, reps);
        add(pick('push'), sets, reps);
        add(pick('pull'), sets, reps);
        add(pick('core'), 3, 15);
    }

    return exercises.filter(e => e.name);
}

function renderFitnessDashboard() {
    ensureFitnessState();

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = days[new Date().getDay()];

    const welcomeEl = document.getElementById('fitWelcome');
    const summaryEl = document.getElementById('fitPlanSummary');
    if (welcomeEl) welcomeEl.innerText = `Keep it up, ${appData.user.username}!`;
    if (summaryEl && appData.fitness.profile?.goal) {
        summaryEl.innerText = `${appData.fitness.profile.goal.replaceAll('_', ' ').toUpperCase()} • ${appData.fitness.profile.days} Days/Week`;
    }

    const routine = appData.fitness.plan?.[todayName];
    if (!routine) {
        appData.fitness.setupComplete = false;
        saveData();
        return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const todayLog = appData.fitness.logs[todayStr];
    const todayStatus = todayLog?.status || (todayLog?.completed ? 'completed' : null);

    const dayNameEl = document.getElementById('workoutDayName');
    if (dayNameEl) dayNameEl.innerText = `${todayName} - ${routine.type}`;

    const exercisesEl = document.getElementById('todayExercises');
    if (exercisesEl) exercisesEl.innerHTML = '';

    const completeBtn = document.querySelector('.workout-footer .btn-success');
    if (completeBtn) completeBtn.style.display = routine.type === 'Rest' || todayStatus === 'completed' ? 'none' : 'block';

    if (exercisesEl) {
        if (routine.type === 'Rest') {
            exercisesEl.innerHTML = `<div class="exercise-item" style="justify-content:center;"><h4>Rest day</h4></div>`;
        } else if (todayStatus === 'completed') {
            exercisesEl.innerHTML = `<div class="exercise-item" style="justify-content:center; color: var(--primary-color);"><h4><i class="fas fa-check-circle"></i> Workout completed</h4></div>`;
        } else if (todayStatus === 'partial') {
            exercisesEl.innerHTML = `<div class="exercise-item" style="justify-content:center; color: var(--warning-color);"><h4><i class="fas fa-adjust"></i> Workout partially done</h4></div>`;
        } else if (todayStatus === 'skipped') {
            exercisesEl.innerHTML = `<div class="exercise-item" style="justify-content:center; color: var(--danger-color);"><h4><i class="fas fa-ban"></i> Workout skipped</h4></div>`;
        } else {
            routine.exercises.forEach(ex => {
                const div = document.createElement('div');
                div.className = 'exercise-item';
                div.innerHTML = `
                    <div class="ex-icon"><i class="fas fa-dumbbell"></i></div>
                    <div class="ex-info">
                        <h4>${ex.name}</h4>
                        <span class="ex-details">${ex.sets} Sets x ${ex.reps} Reps</span>
                    </div>
                `;
                exercisesEl.appendChild(div);
            });
        }
    }

    const scheduleEl = document.getElementById('weeklySchedule');
    if (scheduleEl) {
        scheduleEl.innerHTML = '';
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].forEach(day => {
            const isActive = day === todayName;
            const r = appData.fitness.plan[day];
            const div = document.createElement('div');
            div.className = `mini-day ${isActive ? 'active' : ''}`;
            div.innerHTML = `<span>${day.slice(0, 3)}</span> <span>${r?.type || 'Rest'}</span>`;
            scheduleEl.appendChild(div);
        });
    }

    const totalEl = document.getElementById('fitTotalWorkouts');
    const streakEl = document.getElementById('fitStreak');
    const calEl = document.getElementById('fitCalories');
    if (totalEl) totalEl.innerText = appData.fitness.stats.workoutsCompleted;
    if (streakEl) streakEl.innerText = appData.fitness.stats.streak;
    if (calEl) calEl.innerText = appData.fitness.stats.caloriesBurned;

    renderFitnessTools({ todayStr, todayName, routine, todayStatus });
}

function completeWorkout() {
    markWorkoutStatus('completed');
}

function resetFitnessPlan() {
    ensureFitnessState();
    appData.fitness.setupComplete = false;
    appData.fitness.profile = {};
    appData.fitness.plan = {};
    saveData();
}

function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

function upsertByDate(list, entry) {
    const idx = list.findIndex(e => e && e.date === entry.date);
    if (idx >= 0) list[idx] = { ...list[idx], ...entry };
    else list.push(entry);
    list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}

function calcBMI(heightCm, weightKg) {
    const h = Number(heightCm);
    const w = Number(weightKg);
    if (!h || !w) return null;
    const m = h / 100;
    if (!m) return null;
    return w / (m * m);
}

function bmiCategory(bmi) {
    if (bmi == null) return null;
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
}

function bmiSuggestionText(category) {
    if (!category) return '';
    if (category === 'Underweight') return 'Focus on strength training, calorie surplus, and protein-rich meals.';
    if (category === 'Normal') return 'Maintain consistency with balanced nutrition, sleep, and progressive workouts.';
    if (category === 'Overweight') return 'Prioritize daily steps, strength training, and a moderate calorie deficit.';
    return 'Start with low-impact cardio, strength basics, and steady calorie control; consider professional guidance.';
}

function calcBMR({ weightKg, heightCm, age, gender }) {
    const w = Number(weightKg);
    const h = Number(heightCm);
    const a = Number(age);
    if (!w || !h || !a) return null;
    const g = gender === 'female' ? 'female' : 'male';
    const base = 10 * w + 6.25 * h - 5 * a;
    return g === 'female' ? base - 161 : base + 5;
}

function idealWeightRangeKg(heightCm) {
    const h = Number(heightCm);
    if (!h) return null;
    const m = h / 100;
    const min = 18.5 * m * m;
    const max = 24.9 * m * m;
    return { min, max };
}

function waistToHeightRatio(waistCm, heightCm) {
    const w = Number(waistCm);
    const h = Number(heightCm);
    if (!w || !h) return null;
    return w / h;
}

function estimateBodyFatPercent({ gender, heightCm, waistCm, neckCm, hipCm }) {
    const g = gender === 'female' ? 'female' : 'male';
    const h = Number(heightCm);
    const w = Number(waistCm);
    const n = Number(neckCm);
    const hip = Number(hipCm);
    if (!h || !w || !n) return null;
    const toIn = (cm) => cm / 2.54;
    const hi = toIn(h);
    const wi = toIn(w);
    const ni = toIn(n);
    if (g === 'male') {
        if (wi - ni <= 0) return null;
        const bf = 86.010 * Math.log10(wi - ni) - 70.041 * Math.log10(hi) + 36.76;
        return Number.isFinite(bf) ? bf : null;
    }
    if (!hip) return null;
    const hipi = toIn(hip);
    if (wi + hipi - ni <= 0) return null;
    const bf = 163.205 * Math.log10(wi + hipi - ni) - 97.684 * Math.log10(hi) - 78.387;
    return Number.isFinite(bf) ? bf : null;
}

function recomputeFitnessStats() {
    ensureFitnessState();
    const entries = Object.entries(appData.fitness.logs || {});
    let workoutsCompleted = 0;
    let calories = 0;
    entries.forEach(([_, l]) => {
        const status = l?.status || (l?.completed ? 'completed' : null);
        if (status === 'completed') workoutsCompleted += 1;
        calories += Number(l?.caloriesBurned) || 0;
    });

    let streak = 0;
    for (let i = 0; i < 366; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        const status = appData.fitness.logs?.[key]?.status || (appData.fitness.logs?.[key]?.completed ? 'completed' : null);
        if (status === 'completed') streak += 1;
        else break;
    }

    appData.fitness.stats.workoutsCompleted = workoutsCompleted;
    appData.fitness.stats.caloriesBurned = calories;
    appData.fitness.stats.streak = streak;
}

function markWorkoutStatus(status) {
    ensureFitnessState();
    const todayStr = getTodayStr();
    const prev = appData.fitness.logs[todayStr];
    const prevStatus = prev?.status || (prev?.completed ? 'completed' : null);
    if (prevStatus === status) {
        return;
    }

    if ((status === 'completed' || status === 'partial') && !appData.fitness.workout.disclaimerAccepted) {
        const ok = confirm('Safety reminder: stop if you feel sharp pain, keep good form, and warm up first. Continue?');
        if (!ok) return;
        appData.fitness.workout.disclaimerAccepted = true;
    }

    const caloriesBurned = status === 'completed' ? 300 : status === 'partial' ? 150 : 0;
    appData.fitness.logs[todayStr] = { status, timestamp: new Date().toISOString(), caloriesBurned };

    if (status === 'completed') {
        addXP(50);
        const workoutHabit = appData.habits.find(h => {
            const n = (h.name || '').toLowerCase();
            return n.includes('workout') || n.includes('exercise') || n.includes('gym');
        });
        if (workoutHabit) toggleHabitStatus(workoutHabit.id, todayStr, 'completed', { suppressFeed: true });
    }

    recomputeFitnessStats();
    if (currentUser) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayName = days[new Date().getDay()];
        const routine = appData.fitness.plan?.[todayName];
        if (status === 'completed') addFeedEvent(currentUser, 'workout_completed', { date: todayStr, type: routine?.type || null }, ensureSocialUser(currentUser)?.profile?.privacy === 'private' ? 'followers' : 'public');
        if (status === 'partial') addFeedEvent(currentUser, 'workout_partial', { date: todayStr, type: routine?.type || null }, ensureSocialUser(currentUser)?.profile?.privacy === 'private' ? 'followers' : 'public');
        milestonesFromStreak(currentUser, appData);
        updateRankForUser(currentUser, appData, false);
        checkChallengeCompletionsForUser(currentUser);
    }
    saveData();
    renderFitnessDashboard();
}

let lastUserActionAt = Date.now();
let fitnessRemindersIntervalId = null;

function recordUserAction() {
    lastUserActionAt = Date.now();
}

function fmt(n, digits = 0) {
    const v = Number(n);
    if (!Number.isFinite(v)) return '—';
    return v.toFixed(digits);
}

function renderFitnessTools(ctx) {
    ensureFitnessState();
    renderBMISection();
    renderMetricsSection();
    renderGoalSection();
    renderNutritionSection();
    renderWorkoutTrackingSection(ctx);
    renderFitnessProgressSection();
    renderRemindersSection();
}

function hydrateLastMetricsFromInputs() {
    ensureFitnessState();
    const m = appData.fitness.health.lastMetrics;
    const height = document.getElementById('bmiHeightCm')?.value;
    const weight = document.getElementById('bmiWeightKg')?.value;
    const age = document.getElementById('bmiAge')?.value;
    const gender = document.getElementById('bmiGender')?.value;
    const waist = document.getElementById('waistCm')?.value;
    const neck = document.getElementById('neckCm')?.value;
    const hip = document.getElementById('hipCm')?.value;
    const af = document.getElementById('activityLevel')?.value;

    m.heightCm = height !== '' ? Number(height) : m.heightCm;
    m.weightKg = weight !== '' ? Number(weight) : m.weightKg;
    m.age = age !== '' ? Number(age) : m.age;
    m.gender = gender || m.gender || 'male';
    m.waistCm = waist !== '' ? Number(waist) : m.waistCm;
    m.neckCm = neck !== '' ? Number(neck) : m.neckCm;
    m.hipCm = hip !== '' ? Number(hip) : m.hipCm;
    m.activityFactor = af !== '' ? Number(af) : m.activityFactor;
}

function renderBMISection() {
    const heightEl = document.getElementById('bmiHeightCm');
    const weightEl = document.getElementById('bmiWeightKg');
    const ageEl = document.getElementById('bmiAge');
    const genderEl = document.getElementById('bmiGender');
    if (!heightEl || !weightEl || !ageEl || !genderEl) return;

    const m = appData.fitness.health.lastMetrics;
    if (heightEl.value === '' && m.heightCm != null) heightEl.value = m.heightCm;
    if (weightEl.value === '' && m.weightKg != null) weightEl.value = m.weightKg;
    if (ageEl.value === '' && m.age != null) ageEl.value = m.age;
    if (genderEl.value === '' && m.gender) genderEl.value = m.gender;

    const latest = appData.fitness.health.bmiHistory.at(-1);
    const bmiValueEl = document.getElementById('bmiValue');
    const bmiCatEl = document.getElementById('bmiCategory');
    const bmiSugEl = document.getElementById('bmiSuggestion');
    if (bmiValueEl) bmiValueEl.innerText = latest?.bmi ? fmt(latest.bmi, 1) : '—';
    if (bmiCatEl) bmiCatEl.innerText = latest?.category || '—';
    if (bmiSugEl) bmiSugEl.innerText = latest?.category ? bmiSuggestionText(latest.category) : '';

    const listEl = document.getElementById('bmiHistoryList');
    if (listEl) {
        const rows = [...appData.fitness.health.bmiHistory].slice(-10).reverse();
        listEl.innerHTML = rows.length
            ? rows.map(r => `<div class="row"><span>${r.date}</span><span>${fmt(r.bmi, 1)} (${r.category})</span></div>`).join('')
            : '<div class="row"><span>—</span><span>No history yet</span></div>';
    }

    renderBMITrendChart();
}

function renderBMITrendChart() {
    if (typeof Chart === 'undefined') return;
    const canvas = document.getElementById('bmiTrendChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rows = appData.fitness.health.bmiHistory || [];
    const labels = rows.map(r => r.date);
    const data = rows.map(r => Number(r.bmi));
    if (bmiTrendChartInstance) bmiTrendChartInstance.destroy();
    bmiTrendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'BMI',
                data,
                borderColor: '#2196f3',
                backgroundColor: 'rgba(33,150,243,0.15)',
                tension: 0.3,
                fill: true,
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: false } },
            plugins: { legend: { display: false } }
        }
    });
}

function renderMetricsSection() {
    const afEl = document.getElementById('activityLevel');
    const waistEl = document.getElementById('waistCm');
    const neckEl = document.getElementById('neckCm');
    const hipEl = document.getElementById('hipCm');
    if (!afEl || !waistEl || !neckEl || !hipEl) return;

    const m = appData.fitness.health.lastMetrics;
    if (afEl.value === '' && m.activityFactor != null) afEl.value = String(m.activityFactor);
    if (waistEl.value === '' && m.waistCm != null) waistEl.value = m.waistCm;
    if (neckEl.value === '' && m.neckCm != null) neckEl.value = m.neckCm;
    if (hipEl.value === '' && m.hipCm != null) hipEl.value = m.hipCm;

    const height = m.heightCm;
    const weight = m.weightKg;
    const age = m.age;
    const gender = m.gender;

    const bmr = calcBMR({ weightKg: weight, heightCm: height, age, gender });
    const tdee = bmr != null ? bmr * (Number(m.activityFactor) || 1.2) : null;
    const ideal = idealWeightRangeKg(height);
    const wthr = waistToHeightRatio(m.waistCm, height);
    const bf = estimateBodyFatPercent({ gender, heightCm: height, waistCm: m.waistCm, neckCm: m.neckCm, hipCm: m.hipCm });

    const bmrEl = document.getElementById('bmrValue');
    const tdeeEl = document.getElementById('tdeeValue');
    const idealEl = document.getElementById('idealWeightRange');
    const bfEl = document.getElementById('bodyFatValue');
    const wthrEl = document.getElementById('waistHeightRatioValue');
    if (bmrEl) bmrEl.innerText = bmr != null ? `${fmt(bmr)} kcal` : '—';
    if (tdeeEl) tdeeEl.innerText = tdee != null ? `${fmt(tdee)} kcal` : '—';
    if (idealEl) idealEl.innerText = ideal ? `${fmt(ideal.min, 1)}–${fmt(ideal.max, 1)} kg` : '—';
    if (bfEl) bfEl.innerText = bf != null ? `${fmt(bf, 1)}%` : '—';
    if (wthrEl) wthrEl.innerText = wthr != null ? fmt(wthr, 2) : '—';

    const hintEl = document.getElementById('metricsHint');
    if (hintEl) {
        const hints = [];
        if (wthr != null) {
            if (wthr < 0.5) hints.push('Waist-to-height ratio looks healthy (< 0.5).');
            else hints.push('Waist-to-height ratio suggests higher risk (aim < 0.5).');
        }
        if (bf != null) hints.push('Body fat is an estimate; use consistent measurements.');
        hintEl.innerText = hints.join(' ');
    }
}

function renderGoalSection() {
    const goalTypeEl = document.getElementById('goalType');
    const targetEl = document.getElementById('goalTargetWeightKg');
    const weeklyEl = document.getElementById('goalWeeklyTargetKg');
    const deadlineEl = document.getElementById('goalDeadline');
    if (!goalTypeEl || !targetEl || !weeklyEl || !deadlineEl) return;

    const g = appData.fitness.goals;
    if (goalTypeEl.value === '' && g.goalType) goalTypeEl.value = g.goalType;
    if (targetEl.value === '' && g.targetWeightKg != null) targetEl.value = g.targetWeightKg;
    if (weeklyEl.value === '' && g.weeklyTargetKg != null) weeklyEl.value = g.weeklyTargetKg;
    if (deadlineEl.value === '' && g.deadline) deadlineEl.value = g.deadline;

    const summaryEl = document.getElementById('goalSummary');
    if (summaryEl) {
        const parts = [];
        parts.push(`Goal: ${g.goalType?.replaceAll('_', ' ') || '—'}`);
        if (g.targetWeightKg != null) parts.push(`Target: ${fmt(g.targetWeightKg, 1)} kg`);
        if (g.weeklyTargetKg != null) parts.push(`Weekly: ${fmt(g.weeklyTargetKg, 1)} kg/week`);
        if (g.deadline) parts.push(`Deadline: ${g.deadline}`);
        summaryEl.innerText = parts.join(' • ');
    }

    const gpEl = document.getElementById('goalProgress');
    if (gpEl) gpEl.innerText = computeGoalProgressText();

    const adjEl = document.getElementById('planAdjustments');
    if (adjEl) adjEl.innerText = computePlanAdjustmentText();

    populatePlanEditor();
    renderSafetySuggestions();
}

function computeGoalProgressText() {
    const g = appData.fitness.goals;
    const weights = appData.fitness.health.weightHistory || [];
    if (!weights.length || g.targetWeightKg == null) return '—';
    const start = weights.find(w => !g.createdAt || w.date >= g.createdAt) || weights[0];
    const last = weights.at(-1);
    if (!start || !last) return '—';

    const startW = Number(start.weightKg);
    const nowW = Number(last.weightKg);
    const targetW = Number(g.targetWeightKg);
    if (!Number.isFinite(startW) || !Number.isFinite(nowW) || !Number.isFinite(targetW)) return '—';

    const total = Math.abs(targetW - startW);
    const done = Math.abs(nowW - startW);
    const pct = total > 0 ? Math.min(100, Math.max(0, (done / total) * 100)) : 0;
    return `${fmt(pct)}%`;
}

function computePlanAdjustmentText() {
    const g = appData.fitness.goals;
    const weights = appData.fitness.health.weightHistory || [];
    if (!weights.length || g.weeklyTargetKg == null) return '—';
    const last7 = weights.slice(-8);
    if (last7.length < 2) return '—';
    const first = Number(last7[0].weightKg);
    const last = Number(last7.at(-1).weightKg);
    if (!Number.isFinite(first) || !Number.isFinite(last)) return '—';
    const delta = last - first;
    const target = Number(g.weeklyTargetKg);
    if (!Number.isFinite(target) || target <= 0) return '—';

    if (g.goalType === 'weight_loss') {
        if (-delta >= target) return 'On track';
        return 'Consider +1 cardio day or +2k daily steps';
    }
    if (g.goalType === 'muscle_gain') {
        if (delta >= target) return 'On track';
        return 'Consider +150–250 kcal and progressive overload';
    }
    return 'Maintain consistency';
}

function populatePlanEditor() {
    const dayEl = document.getElementById('planEditDay');
    const typeEl = document.getElementById('planEditType');
    if (!dayEl || !typeEl) return;
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const types = ['Rest', 'Full Body', 'Upper', 'Lower', 'Push', 'Pull', 'Legs', 'HIIT Cardio', 'Full Body Circuit', 'Cardio + Core', 'Mixed Routine'];
    if (!dayEl.options.length) dayEl.innerHTML = days.map(d => `<option value="${d}">${d}</option>`).join('');
    if (!typeEl.options.length) typeEl.innerHTML = types.map(t => `<option value="${t}">${t}</option>`).join('');
}

function renderSafetySuggestions() {
    const el = document.getElementById('safetySuggestions');
    if (!el) return;
    const items = [
        ['Warm-up', '5–8 min light cardio + mobility'],
        ['Before sets', '1–2 ramp-up sets with easy weight'],
        ['Cooldown', '3–5 min easy walk + stretching'],
        ['Recovery', 'Sleep 7–9h, hydrate, protein daily']
    ];
    el.innerHTML = items.map(([a, b]) => `<div class="row"><span>${a}</span><span>${b}</span></div>`).join('');
}

function renderNutritionSection() {
    const dietEl = document.getElementById('dietPreference');
    const waterEl = document.getElementById('waterTargetMl');
    if (!dietEl || !waterEl) return;

    const n = appData.fitness.nutrition;
    if (dietEl.value === '' && n.dietPreference) dietEl.value = n.dietPreference;
    if (waterEl.value === '' && n.waterTargetMl != null) waterEl.value = n.waterTargetMl;

    const calEl = document.getElementById('nutritionCalories');
    const pEl = document.getElementById('macroProtein');
    const cEl = document.getElementById('macroCarbs');
    const fEl = document.getElementById('macroFats');
    if (calEl) calEl.innerText = n.dailyCaloriesTarget != null ? `${fmt(n.dailyCaloriesTarget)} kcal` : '—';
    if (pEl) pEl.innerText = n.macros?.proteinG != null ? fmt(n.macros.proteinG) : '—';
    if (cEl) cEl.innerText = n.macros?.carbsG != null ? fmt(n.macros.carbsG) : '—';
    if (fEl) fEl.innerText = n.macros?.fatsG != null ? fmt(n.macros.fatsG) : '—';

    renderMealPlan();
    renderNutritionChecklist();
}

function renderMealPlan() {
    const el = document.getElementById('mealPlanList');
    if (!el) return;
    const pref = appData.fitness.nutrition.dietPreference || 'non_veg';
    const plans = {
        non_veg: ['Breakfast: Eggs + oats + fruit', 'Lunch: Chicken/rice + salad', 'Snack: Greek yogurt + nuts', 'Dinner: Fish/veg + potatoes'],
        vegetarian: ['Breakfast: Paneer/tofu scramble + fruit', 'Lunch: Lentils + rice + salad', 'Snack: Yogurt + seeds', 'Dinner: Chickpeas + veggies + roti'],
        vegan: ['Breakfast: Tofu scramble + oats', 'Lunch: Beans + quinoa + salad', 'Snack: Hummus + fruit', 'Dinner: Lentil curry + veggies']
    };
    const items = plans[pref] || plans.non_veg;
    el.innerHTML = items.map(t => `<div class="row"><span>${t}</span><span></span></div>`).join('');
}

function renderNutritionChecklist() {
    const el = document.getElementById('nutritionChecklist');
    if (!el) return;
    const today = getTodayStr();
    const map = appData.fitness.nutrition.checklistByDate[today] || {};
    const items = [
        { key: 'calories', label: 'Hit calorie target' },
        { key: 'protein', label: 'Hit protein target' },
        { key: 'water', label: 'Hit water target' }
    ];
    el.innerHTML = items.map(i => {
        const checked = map[i.key] ? 'checked' : '';
        return `<label><input type="checkbox" data-nkey="${i.key}" ${checked}> ${i.label}</label>`;
    }).join('');

    el.querySelectorAll('input[type="checkbox"][data-nkey]').forEach(cb => {
        if (cb.dataset.bound === '1') return;
        cb.dataset.bound = '1';
        cb.addEventListener('change', (e) => {
            ensureFitnessState();
            const k = e.target.dataset.nkey;
            if (!appData.fitness.nutrition.checklistByDate[today]) appData.fitness.nutrition.checklistByDate[today] = {};
            appData.fitness.nutrition.checklistByDate[today][k] = e.target.checked;
            saveData();
        });
    });
}

function renderWorkoutTrackingSection(ctx) {
    const statusEl = document.getElementById('todayWorkoutStatus');
    const calEl = document.getElementById('todayWorkoutCalories');
    if (statusEl) statusEl.innerText = ctx?.todayStatus ? ctx.todayStatus : '—';
    const today = getTodayStr();
    const burned = Number(appData.fitness.logs?.[today]?.caloriesBurned) || 0;
    if (calEl) calEl.innerText = burned ? `${fmt(burned)} kcal` : '—';

    renderRecoverySuggestion(ctx);
    renderWorkoutLogEditor(ctx);
    setWorkoutActionButtonsState(ctx);
}

function renderRecoverySuggestion(ctx) {
    const el = document.getElementById('recoverySuggestion');
    if (!el) return;
    const routineType = ctx?.routine?.type || 'Rest';
    const last7 = Object.keys(appData.fitness.logs || {}).sort().slice(-7);
    const completed = last7.filter(d => (appData.fitness.logs[d]?.status || (appData.fitness.logs[d]?.completed ? 'completed' : null)) === 'completed').length;
    if (routineType === 'Rest') {
        el.innerText = 'Recovery day: light walk, mobility, hydration, and sleep focus.';
        return;
    }
    if (completed >= 6) {
        el.innerText = 'High training load detected. Consider a lighter session and extra sleep.';
        return;
    }
    el.innerText = 'Warm up well and keep form strict. Stop if pain feels sharp.';
}

function renderWorkoutLogEditor(ctx) {
    const listEl = document.getElementById('workoutLogList');
    if (!listEl) return;
    const today = getTodayStr();
    const routine = ctx?.routine;
    if (!routine || routine.type === 'Rest') {
        listEl.innerHTML = `<div class="row"><span>—</span><span>No workout log for rest day</span></div>`;
        return;
    }

    const planned = routine.exercises || [];
    const saved = appData.fitness.workout.dailyLogs?.[today]?.exercises || [];
    const savedMap = new Map(saved.map(x => [x.name, x]));

    listEl.innerHTML = planned.map(ex => {
        const s = savedMap.get(ex.name) || {};
        const w = s.weightKg != null ? s.weightKg : '';
        const d = s.durationMin != null ? s.durationMin : '';
        return `
            <div class="workout-log-item" data-ex="${ex.name}">
                <div class="title">${ex.name} <span class="ex-details">${ex.sets}x${ex.reps}</span></div>
                <input type="number" step="0.5" min="0" placeholder="Weight kg" value="${w}">
                <input type="number" step="1" min="0" placeholder="Duration min" value="${d}">
            </div>
        `;
    }).join('');
}

function estimateWorkoutCalories(exercises) {
    let total = 0;
    exercises.forEach(ex => {
        const duration = Number(ex.durationMin);
        if (Number.isFinite(duration) && duration > 0) total += duration * 8;
        else {
            const sets = Number(ex.sets) || 0;
            const reps = Number(ex.reps) || 0;
            total += sets * reps * 0.3;
        }
    });
    return Math.round(total);
}

function saveWorkoutLogFromUI() {
    ensureFitnessState();
    const today = getTodayStr();
    const listEl = document.getElementById('workoutLogList');
    if (!listEl) return;

    const items = [...listEl.querySelectorAll('.workout-log-item[data-ex]')];
    const exercises = items.map(item => {
        const name = item.dataset.ex;
        const inputs = item.querySelectorAll('input');
        const weightKg = inputs[0]?.value !== '' ? Number(inputs[0].value) : null;
        const durationMin = inputs[1]?.value !== '' ? Number(inputs[1].value) : null;

        const routine = appData.fitness.plan?.[new Date().toLocaleDateString('en-US', { weekday: 'long' })];
        const planned = routine?.exercises?.find(e => e.name === name);
        const sets = planned?.sets ?? null;
        const reps = planned?.reps ?? null;
        return { name, sets, reps, weightKg, durationMin };
    });

    appData.fitness.workout.dailyLogs[today] = {
        date: today,
        exercises,
        updatedAt: new Date().toISOString()
    };

    exercises.forEach(ex => {
        if (!ex.name) return;
        const p = appData.fitness.workout.progressive[ex.name] || { bestWeightKg: null, bestReps: null, lastWeightKg: null, lastReps: null };
        if (ex.weightKg != null) {
            p.lastWeightKg = ex.weightKg;
            if (p.bestWeightKg == null || ex.weightKg > p.bestWeightKg) p.bestWeightKg = ex.weightKg;
        }
        if (ex.reps != null) {
            p.lastReps = ex.reps;
            if (p.bestReps == null || ex.reps > p.bestReps) p.bestReps = ex.reps;
        }
        appData.fitness.workout.progressive[ex.name] = p;
    });

    const calories = estimateWorkoutCalories(exercises);
    const existing = appData.fitness.logs[today];
    if (existing) {
        appData.fitness.logs[today] = { ...existing, caloriesBurned: Math.max(Number(existing.caloriesBurned) || 0, calories) };
    }
    recomputeFitnessStats();
    saveData();
    renderFitnessDashboard();
}

function setWorkoutActionButtonsState(ctx) {
    const c = document.getElementById('markWorkoutCompletedBtn');
    const p = document.getElementById('markWorkoutPartialBtn');
    const s = document.getElementById('markWorkoutSkippedBtn');
    if (!c || !p || !s) return;
    const isRest = ctx?.routine?.type === 'Rest';
    c.disabled = isRest;
    p.disabled = isRest;
    s.disabled = isRest;
}

function renderFitnessProgressSection() {
    renderWeightTrendChart();
    renderWorkoutConsistencyChart();
    renderFitnessCaloriesChart();
    renderFitnessBadges();
    renderMonthlyFitnessSummary();
}

function renderWeightTrendChart() {
    if (typeof Chart === 'undefined') return;
    const canvas = document.getElementById('weightTrendChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rows = appData.fitness.health.weightHistory || [];
    const labels = rows.map(r => r.date);
    const data = rows.map(r => Number(r.weightKg));
    if (weightTrendChartInstance) weightTrendChartInstance.destroy();
    weightTrendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Weight (kg)',
                data,
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76,175,80,0.15)',
                tension: 0.3,
                fill: true,
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}

function renderWorkoutConsistencyChart() {
    if (typeof Chart === 'undefined') return;
    const canvas = document.getElementById('workoutConsistencyChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const labels = [];
    const completed = [];
    const partial = [];
    const skipped = [];
    for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        const st = appData.fitness.logs?.[key]?.status || (appData.fitness.logs?.[key]?.completed ? 'completed' : null);
        completed.push(st === 'completed' ? 1 : 0);
        partial.push(st === 'partial' ? 1 : 0);
        skipped.push(st === 'skipped' ? 1 : 0);
    }

    if (workoutConsistencyChartInstance) workoutConsistencyChartInstance.destroy();
    workoutConsistencyChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Completed', data: completed, backgroundColor: '#4CAF50', borderRadius: 4 },
                { label: 'Partial', data: partial, backgroundColor: '#ffc107', borderRadius: 4 },
                { label: 'Skipped', data: skipped, backgroundColor: '#ff5252', borderRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

function renderFitnessCaloriesChart() {
    if (typeof Chart === 'undefined') return;
    const canvas = document.getElementById('fitnessCaloriesChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const labels = [];
    const data = [];
    for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
        data.push(Number(appData.fitness.logs?.[key]?.caloriesBurned) || 0);
    }

    if (fitnessCaloriesChartInstance) fitnessCaloriesChartInstance.destroy();
    fitnessCaloriesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Calories', data, backgroundColor: '#2196f3', borderRadius: 4 }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { display: false } }
        }
    });
}

function renderFitnessBadges() {
    const grid = document.getElementById('fitnessBadgesGrid');
    if (!grid) return;

    const streak = Number(appData.fitness.stats.streak) || 0;
    const total = Number(appData.fitness.stats.workoutsCompleted) || 0;
    const calories = Number(appData.fitness.stats.caloriesBurned) || 0;

    const badges = [
        { icon: '🏁', title: 'First Workout', ok: total >= 1 },
        { icon: '🔥', title: 'Streak 7', ok: streak >= 7 },
        { icon: '💪', title: 'Workouts 25', ok: total >= 25 },
        { icon: '🏋️', title: 'Workouts 50', ok: total >= 50 },
        { icon: '⚡', title: '10k Calories', ok: calories >= 10000 }
    ];

    grid.innerHTML = '';
    badges.forEach(b => {
        const el = document.createElement('div');
        el.className = `badge ${b.ok ? 'unlocked' : ''}`;
        el.innerText = b.icon;
        el.title = b.title;
        grid.appendChild(el);
    });
}

function renderMonthlyFitnessSummary() {
    const el = document.getElementById('monthlyFitnessSummary');
    if (!el) return;
    const now = new Date();
    const prefix = now.toISOString().slice(0, 7);
    const logs = Object.entries(appData.fitness.logs || {}).filter(([d]) => d.startsWith(prefix));
    const completed = logs.filter(([_, l]) => (l?.status || (l?.completed ? 'completed' : null)) === 'completed').length;
    const partial = logs.filter(([_, l]) => (l?.status || null) === 'partial').length;
    const calories = logs.reduce((sum, [_, l]) => sum + (Number(l?.caloriesBurned) || 0), 0);
    el.innerText = `This month: ${completed} completed, ${partial} partial • ${fmt(calories)} kcal burned`;
}

function renderRemindersSection() {
    const wEn = document.getElementById('remWorkoutEnabled');
    const wTime = document.getElementById('remWorkoutTime');
    const waEn = document.getElementById('remWaterEnabled');
    const waInt = document.getElementById('remWaterInterval');
    const sEn = document.getElementById('remSleepEnabled');
    const sTime = document.getElementById('remSleepTime');
    const iEn = document.getElementById('remInactivityEnabled');
    const iMin = document.getElementById('remInactivityMinutes');
    if (!wEn || !wTime || !waEn || !waInt || !sEn || !sTime || !iEn || !iMin) return;

    const r = appData.fitness.reminders;
    wEn.checked = !!r.enabled.workout;
    waEn.checked = !!r.enabled.water;
    sEn.checked = !!r.enabled.sleep;
    iEn.checked = !!r.enabled.inactivity;
    if (wTime.value === '' && r.workoutTime) wTime.value = r.workoutTime;
    if (sTime.value === '' && r.sleepTime) sTime.value = r.sleepTime;
    if (waInt.value === '' && r.waterIntervalMin != null) waInt.value = r.waterIntervalMin;
    if (iMin.value === '' && r.inactivityMinutes != null) iMin.value = r.inactivityMinutes;

    const hint = document.getElementById('remindersHint');
    if (hint) {
        const supported = typeof Notification !== 'undefined';
        hint.innerText = supported ? 'Reminders run while this page is open.' : 'Notifications not supported in this browser.';
    }
}

function startFitnessReminders() {
    if (fitnessRemindersIntervalId) return;
    fitnessRemindersIntervalId = setInterval(() => {
        if (typeof Notification === 'undefined') return;
        if (Notification.permission !== 'granted') return;
        ensureFitnessState();
        const r = appData.fitness.reminders;
        const now = new Date();
        const hm = now.toTimeString().slice(0, 5);
        const today = getTodayStr();

        const notifyOnce = (key, title, body) => {
            const k = `${today}:${key}`;
            if (r.lastNotified[k]) return;
            r.lastNotified[k] = true;
            new Notification(title, { body });
            saveData();
        };

        if (r.enabled.workout && hm === (r.workoutTime || '18:00')) {
            notifyOnce('workout', 'Workout time', 'Your scheduled workout reminder.');
        }

        if (r.enabled.sleep && hm === (r.sleepTime || '23:00')) {
            notifyOnce('sleep', 'Sleep reminder', 'Aim for 7–9 hours for recovery.');
        }

        if (r.enabled.water) {
            const min = Number(r.waterIntervalMin) || 60;
            const stamp = Math.floor(now.getTime() / (min * 60 * 1000));
            const key = `water:${stamp}`;
            if (!r.lastNotified[key]) {
                r.lastNotified[key] = true;
                new Notification('Water reminder', `Drink water to hit ${appData.fitness.nutrition.waterTargetMl || 2500} ml/day.`);
                saveData();
            }
        }

        if (r.enabled.inactivity) {
            const mins = Number(r.inactivityMinutes) || 60;
            const idleMs = Date.now() - lastUserActionAt;
            if (idleMs > mins * 60 * 1000) {
                const key = `inactive:${today}`;
                if (!r.lastNotified[key]) {
                    r.lastNotified[key] = true;
                    new Notification('Inactivity alert', { body: 'Take a short walk or stretch break.' });
                    saveData();
                }
            }
        }
    }, 60 * 1000);
}

function requestReminderPermission() {
    if (typeof Notification === 'undefined') return Promise.resolve(false);
    if (Notification.permission === 'granted') return Promise.resolve(true);
    if (Notification.permission === 'denied') return Promise.resolve(false);
    return Notification.requestPermission().then(p => p === 'granted');
}

function calculateAndStoreBMI() {
    ensureFitnessState();
    hydrateLastMetricsFromInputs();
    const m = appData.fitness.health.lastMetrics;
    const bmi = calcBMI(m.heightCm, m.weightKg);
    if (bmi == null) return;
    const date = getTodayStr();
    const category = bmiCategory(bmi);
    upsertByDate(appData.fitness.health.bmiHistory, {
        date,
        heightCm: m.heightCm,
        weightKg: m.weightKg,
        bmi,
        category
    });
    if (m.weightKg != null) upsertByDate(appData.fitness.health.weightHistory, { date, weightKg: m.weightKg });
    saveData();
    renderFitnessDashboard();
}

function calculateAndStoreMetrics() {
    ensureFitnessState();
    hydrateLastMetricsFromInputs();
    saveData();
    renderFitnessDashboard();
}

function saveGoalFromInputs() {
    ensureFitnessState();
    const g = appData.fitness.goals;
    const type = document.getElementById('goalType')?.value;
    const target = document.getElementById('goalTargetWeightKg')?.value;
    const weekly = document.getElementById('goalWeeklyTargetKg')?.value;
    const deadline = document.getElementById('goalDeadline')?.value;
    g.goalType = type || g.goalType || 'general_fitness';
    g.targetWeightKg = target !== '' ? Number(target) : null;
    g.weeklyTargetKg = weekly !== '' ? Number(weekly) : null;
    g.deadline = deadline || null;
    g.createdAt = g.createdAt || getTodayStr();
    saveData();
    renderFitnessDashboard();
}

function generateNutritionPlan() {
    ensureFitnessState();
    hydrateLastMetricsFromInputs();
    const m = appData.fitness.health.lastMetrics;
    const goalType = (document.getElementById('goalType')?.value || appData.fitness.goals.goalType || 'general_fitness');
    const diet = document.getElementById('dietPreference')?.value || appData.fitness.nutrition.dietPreference || 'non_veg';
    const water = document.getElementById('waterTargetMl')?.value;

    appData.fitness.nutrition.dietPreference = diet;
    appData.fitness.nutrition.waterTargetMl = water !== '' ? Number(water) : (appData.fitness.nutrition.waterTargetMl || 2500);

    const bmr = calcBMR({ weightKg: m.weightKg, heightCm: m.heightCm, age: m.age, gender: m.gender });
    const tdee = bmr != null ? bmr * (Number(m.activityFactor) || 1.2) : null;
    if (tdee == null) {
        saveData();
        renderFitnessDashboard();
        return;
    }

    let cal = tdee;
    if (goalType === 'weight_loss') cal = tdee - 500;
    if (goalType === 'muscle_gain') cal = tdee + 300;
    const min = m.gender === 'female' ? 1200 : 1500;
    cal = Math.max(min, Math.round(cal));
    appData.fitness.nutrition.dailyCaloriesTarget = cal;

    const w = Number(m.weightKg) || 0;
    const proteinPerKg = goalType === 'muscle_gain' ? 1.8 : goalType === 'maintenance' ? 1.4 : 1.6;
    const proteinG = w ? Math.round(w * proteinPerKg) : null;
    const fatsG = Math.round((cal * 0.25) / 9);
    const carbsG = proteinG != null ? Math.round((cal - proteinG * 4 - fatsG * 9) / 4) : null;
    appData.fitness.nutrition.macros = { proteinG, carbsG, fatsG };

    saveData();
    renderFitnessDashboard();
}

function applyManualPlanEdit() {
    ensureFitnessState();
    const day = document.getElementById('planEditDay')?.value;
    const type = document.getElementById('planEditType')?.value;
    if (!day || !type) return;
    const profile = appData.fitness.profile || { goal: 'general_fitness', level: 'beginner', location: 'home', equipment: ['bodyweight'] };
    appData.fitness.plan[day] = type === 'Rest' ? { type: 'Rest', exercises: [] } : { type, exercises: generateExercisesForType(type, profile) };
    saveData();
    renderFitnessDashboard();
}

function exportFitnessCSV() {
    ensureFitnessState();
    const bmi = appData.fitness.health.bmiHistory || [];
    const weights = appData.fitness.health.weightHistory || [];
    const logs = Object.entries(appData.fitness.logs || {}).map(([date, l]) => ({
        date,
        status: l?.status || (l?.completed ? 'completed' : ''),
        caloriesBurned: Number(l?.caloriesBurned) || 0
    }));

    const join = (rows, headers) => {
        const esc = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
        return [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\n');
    };

    const out = [
        'BMI History',
        join(bmi.map(x => ({ date: x.date, heightCm: x.heightCm, weightKg: x.weightKg, bmi: fmt(x.bmi, 2), category: x.category })), ['date', 'heightCm', 'weightKg', 'bmi', 'category']),
        '',
        'Weight History',
        join(weights.map(x => ({ date: x.date, weightKg: x.weightKg })), ['date', 'weightKg']),
        '',
        'Workout Logs',
        join(logs, ['date', 'status', 'caloriesBurned'])
    ].join('\n');

    const blob = new Blob([out], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitness_export_${getTodayStr()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function exportFitnessPDF() {
    ensureFitnessState();
    const w = window.open('', '_blank');
    if (!w) return;
    const g = appData.fitness.goals;
    const lastBMI = appData.fitness.health.bmiHistory.at(-1);
    const lastW = appData.fitness.health.weightHistory.at(-1);
    const html = `
        <html>
            <head><title>Fitness Export</title></head>
            <body>
                <h1>Fitness Summary</h1>
                <p>User: ${appData.user.username}</p>
                <h2>Latest Metrics</h2>
                <p>Weight: ${lastW?.weightKg != null ? fmt(lastW.weightKg, 1) + ' kg' : '—'}</p>
                <p>BMI: ${lastBMI?.bmi != null ? fmt(lastBMI.bmi, 1) + ' (' + lastBMI.category + ')' : '—'}</p>
                <h2>Goal</h2>
                <p>${g.goalType?.replaceAll('_', ' ') || '—'} • Target: ${g.targetWeightKg != null ? fmt(g.targetWeightKg, 1) + ' kg' : '—'} • Deadline: ${g.deadline || '—'}</p>
                <h2>Monthly Summary</h2>
                <p>${document.getElementById('monthlyFitnessSummary')?.innerText || ''}</p>
                <p>Exported on ${new Date().toLocaleString()}</p>
                <script>window.print();</script>
            </body>
        </html>
    `;
    w.document.open();
    w.document.write(html);
    w.document.close();
}

function resetFitnessJourney() {
    ensureFitnessState();
    if (!confirm('Reset fitness journey data?')) return;
    appData.fitness = JSON.parse(JSON.stringify(defaultState.fitness));
    saveData();
    renderFitness();
}

function setupFitnessToolsEventListeners() {
    const root = document.body;
    if (root?.dataset?.fitnessToolsBound === '1') return;
    if (root?.dataset) root.dataset.fitnessToolsBound = '1';

    document.addEventListener('click', recordUserAction, true);
    document.addEventListener('keydown', recordUserAction, true);

    const bindClick = (id, fn) => {
        const el = document.getElementById(id);
        if (!el || el.dataset.bound === '1') return;
        el.dataset.bound = '1';
        el.addEventListener('click', fn);
    };

    bindClick('bmiCalcBtn', calculateAndStoreBMI);
    bindClick('metricsCalcBtn', calculateAndStoreMetrics);
    bindClick('saveGoalBtn', saveGoalFromInputs);
    bindClick('nutritionCalcBtn', generateNutritionPlan);
    bindClick('saveWorkoutLogBtn', saveWorkoutLogFromUI);
    bindClick('markWorkoutCompletedBtn', () => markWorkoutStatus('completed'));
    bindClick('markWorkoutPartialBtn', () => markWorkoutStatus('partial'));
    bindClick('markWorkoutSkippedBtn', () => markWorkoutStatus('skipped'));
    bindClick('applyPlanEditBtn', applyManualPlanEdit);
    bindClick('exportFitnessCSV', exportFitnessCSV);
    bindClick('exportFitnessPDF', exportFitnessPDF);
    bindClick('resetFitnessJourney', resetFitnessJourney);

    bindClick('enableRemindersBtn', async () => {
        ensureFitnessState();
        const ok = await requestReminderPermission();
        if (!ok) {
            const hint = document.getElementById('remindersHint');
            if (hint) hint.innerText = 'Notification permission not granted.';
            return;
        }
        startFitnessReminders();
        const hint = document.getElementById('remindersHint');
        if (hint) hint.innerText = 'Reminders enabled while this page is open.';
    });

    const bindChange = (id, fn) => {
        const el = document.getElementById(id);
        if (!el || el.dataset.boundChange === '1') return;
        el.dataset.boundChange = '1';
        el.addEventListener('change', fn);
    };

    const saveReminderSettings = () => {
        ensureFitnessState();
        appData.fitness.reminders.enabled.workout = !!document.getElementById('remWorkoutEnabled')?.checked;
        appData.fitness.reminders.enabled.water = !!document.getElementById('remWaterEnabled')?.checked;
        appData.fitness.reminders.enabled.sleep = !!document.getElementById('remSleepEnabled')?.checked;
        appData.fitness.reminders.enabled.inactivity = !!document.getElementById('remInactivityEnabled')?.checked;
        const wt = document.getElementById('remWorkoutTime')?.value;
        const st = document.getElementById('remSleepTime')?.value;
        const wi = document.getElementById('remWaterInterval')?.value;
        const im = document.getElementById('remInactivityMinutes')?.value;
        if (wt) appData.fitness.reminders.workoutTime = wt;
        if (st) appData.fitness.reminders.sleepTime = st;
        if (wi !== '') appData.fitness.reminders.waterIntervalMin = Number(wi) || 60;
        if (im !== '') appData.fitness.reminders.inactivityMinutes = Number(im) || 60;
        saveData();
    };

    ['remWorkoutEnabled', 'remWaterEnabled', 'remSleepEnabled', 'remInactivityEnabled', 'remWorkoutTime', 'remWaterInterval', 'remSleepTime', 'remInactivityMinutes']
        .forEach(id => bindChange(id, saveReminderSettings));

    startFitnessReminders();
}

let friendsFeedOffset = 0;
const FRIENDS_FEED_PAGE_SIZE = 20;
const FRIENDS_MAX_FEED_ITEMS = 600;

function safeParseUsersIndex() {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

function getUserData(username) {
    if (!username) return null;
    if (currentUser && username === currentUser) return appData;
    const users = safeParseUsersIndex();
    const d = users?.[username]?.data;
    if (!d) return null;
    return normalizeAppData(d);
}

function listAllUsernames() {
    const users = safeParseUsersIndex();
    return Object.keys(users || {}).filter(Boolean);
}

function asSet(arr) {
    return new Set(Array.isArray(arr) ? arr : []);
}

function uniq(arr) {
    return [...new Set(Array.isArray(arr) ? arr : [])];
}

function rankTier(points) {
    const p = Number(points) || 0;
    if (p >= 3000) return 'Diamond';
    if (p >= 1500) return 'Platinum';
    if (p >= 750) return 'Gold';
    if (p >= 250) return 'Silver';
    return 'Bronze';
}

function computeRankPointsFromData(d) {
    if (!d) return 0;
    const workouts = Number(d.fitness?.stats?.workoutsCompleted) || 0;
    const fitnessStreak = Number(d.fitness?.stats?.streak) || 0;
    const xp = Number(d.user?.xp) || 0;
    return Math.max(0, Math.round(xp + workouts * 25 + fitnessStreak * 10));
}

function computeHabitCompletions(d, days = 7, filterFn = null) {
    const habits = Array.isArray(d?.habits) ? d.habits : [];
    let completed = 0;
    let totalSlots = 0;
    for (let i = 0; i < days; i++) {
        const dt = new Date();
        dt.setDate(dt.getDate() - i);
        const k = dt.toISOString().split('T')[0];
        habits.forEach(h => {
            if (!h) return;
            if (filterFn && !filterFn(h)) return;
            totalSlots += 1;
            if ((h.logs || {})[k]?.status === 'completed') completed += 1;
        });
    }
    return { completed, totalSlots };
}

function computeDailyHabitCompletions(d, categoryFilter = 'all') {
    const key = todayKey();
    const habits = Array.isArray(d?.habits) ? d.habits : [];
    const okCat = (h) => mapHabitCategory(h?.category) === categoryFilter;
    let c = 0;
    habits.forEach(h => {
        if (!h) return;
        if (categoryFilter !== 'all' && !okCat(h)) return;
        if ((h.logs || {})[key]?.status === 'completed') c += 1;
    });
    return c;
}

function computeOverallStreak(d, categoryFilter = 'all') {
    const habits = Array.isArray(d?.habits) ? d.habits : [];
    let best = 0;
    habits.forEach(h => {
        if (!h) return;
        if (categoryFilter !== 'all' && mapHabitCategory(h?.category) !== categoryFilter) return;
        const s = calculateStreak(h);
        best = Math.max(best, Number(s.currentStreak) || 0);
    });
    const fit = Number(d?.fitness?.stats?.streak) || 0;
    if (categoryFilter === 'fitness') best = Math.max(best, fit);
    else best = Math.max(best, fit);
    return best;
}

function mapHabitCategory(cat) {
    const c = (cat || '').toString().toLowerCase();
    if (c.includes('study')) return 'study';
    if (c.includes('health') || c.includes('fitness')) return 'fitness';
    if (c.includes('work') || c.includes('personal') || c.includes('product')) return 'productivity';
    return 'productivity';
}

function formatAgo(iso) {
    if (!iso) return '';
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return '';
    const s = Math.floor((Date.now() - t) / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    return `${d}d`;
}

function isBlocked(a, b) {
    if (!a || !b) return false;
    const ua = ensureSocialUser(a);
    const ub = ensureSocialUser(b);
    if (!ua || !ub) return false;
    return ua.safety.blocked.includes(b) || ub.safety.blocked.includes(a);
}

function isFollower(viewer, target) {
    const ut = ensureSocialUser(target);
    if (!ut) return false;
    return ut.follow.followers.includes(viewer);
}

function canViewProfile(viewer, target) {
    if (!target) return false;
    if (!viewer) return false;
    if (viewer === target) return true;
    if (isBlocked(viewer, target)) return false;
    const ut = ensureSocialUser(target);
    if (!ut) return false;
    if (ut.profile.privacy === 'public') return true;
    return isFollower(viewer, target);
}

function friendsSet(username) {
    const u = ensureSocialUser(username);
    if (!u) return new Set();
    const a = asSet(u.follow.following);
    const b = asSet(u.follow.followers);
    const out = new Set();
    a.forEach(x => { if (b.has(x)) out.add(x); });
    return out;
}

function pushNotification(toUser, item) {
    if (!toUser) return;
    const su = ensureSocialUser(toUser);
    if (!su) return;
    ensureRateReset(su);
    const prefs = su.notifications?.prefs || {};
    const t = item?.type || '';
    if (t === 'follow' && prefs.follow === false) return;
    if (t === 'challenge' && prefs.challenges === false) return;
    if (t === 'rank' && prefs.rank === false) return;
    if (t === 'message' && prefs.messages === false) return;
    const entry = {
        id: (crypto.randomUUID ? crypto.randomUUID() : 'n-' + Date.now() + Math.random().toString(36).slice(2)),
        type: t,
        text: (item?.text || '').toString(),
        from: item?.from || null,
        createdAt: new Date().toISOString()
    };
    su.notifications.items.unshift(entry);
    su.notifications.items = su.notifications.items.slice(0, 200);
    saveSocialStore();
}

function shouldDedupeFeedEvent(actor, type, payload, withinMs = 120000) {
    if (!actor || !type) return false;
    const feed = socialStore?.feed || [];
    const now = Date.now();
    const sig = JSON.stringify({ type, payload: payload && typeof payload === 'object' ? payload : {} });
    for (let i = 0; i < Math.min(30, feed.length); i++) {
        const e = feed[i];
        if (!e || e.actor !== actor || e.type !== type) continue;
        const t = new Date(e.createdAt).getTime();
        if (!Number.isFinite(t)) continue;
        if (now - t > withinMs) continue;
        const esig = JSON.stringify({ type: e.type, payload: e.payload || {} });
        if (esig === sig) return true;
    }
    return false;
}

function addFeedEvent(actor, type, payload, visibility) {
    if (!actor || !type) return;
    if (!socialStore) socialStore = loadSocialStore();
    if (shouldDedupeFeedEvent(actor, type, payload)) return;
    const v = visibility || (ensureSocialUser(actor)?.profile?.privacy === 'private' ? 'followers' : 'public');
    const entry = {
        id: (crypto.randomUUID ? crypto.randomUUID() : 'e-' + Date.now() + Math.random().toString(36).slice(2)),
        actor,
        type,
        payload: payload && typeof payload === 'object' ? payload : {},
        visibility: v,
        createdAt: new Date().toISOString(),
        reactions: { likes: [], encourages: {} }
    };
    socialStore.feed.unshift(entry);
    socialStore.feed = socialStore.feed.slice(0, FRIENDS_MAX_FEED_ITEMS);
    saveSocialStore();
}

function checkChallengeCompletionsForUser(username) {
    if (!username) return;
    if (!socialStore) socialStore = loadSocialStore();
    const su = ensureSocialUser(username);
    if (!su) return;
    const all = Object.values(socialStore.challenges || {});
    all.forEach(c => {
        if (!c || !c.id) return;
        const p = c.participants?.[username];
        if (!p || p.status !== 'accepted') return;
        if (su.milestones.challengesCompleted?.[c.id]) return;
        const score = challengeScoreForUser(c, username);
        const target = Number(c.durationDays) || 7;
        if (score < target) return;
        su.milestones.challengesCompleted[c.id] = true;
        addFeedEvent(username, 'challenge_completed', { challengeId: c.id }, su.profile.privacy === 'private' ? 'followers' : 'public');
        pushNotification(username, { type: 'challenge', text: `Challenge completed: ${c.name}`, from: 'Habitify' });
    });
    saveSocialStore();
}

function updateRankForUser(username, d, silent = false) {
    const su = ensureSocialUser(username);
    if (!su) return;
    const points = computeRankPointsFromData(d);
    const tier = rankTier(points);
    const prevTier = su.rank?.tier || 'Bronze';
    su.rank = { points, tier, updatedAt: new Date().toISOString() };
    if (!silent && tier !== prevTier) {
        su.milestones.rank = tier;
        addFeedEvent(username, 'rank_upgraded', { from: prevTier, to: tier }, su.profile.privacy === 'private' ? 'followers' : 'public');
        pushNotification(username, { type: 'rank', text: `Rank upgraded: ${prevTier} → ${tier}`, from: 'Habitify' });
    }
    saveSocialStore();
}

function milestonesFromStreak(username, d) {
    const su = ensureSocialUser(username);
    if (!su) return;
    const milestones = [3, 7, 14, 30, 60, 100];
    const s = computeOverallStreak(d);
    milestones.forEach(m => {
        const k = String(m);
        if (s >= m && !su.milestones.streak[k]) {
            su.milestones.streak[k] = true;
            addFeedEvent(username, 'streak_milestone', { days: m }, su.profile.privacy === 'private' ? 'followers' : 'public');
            pushNotification(username, { type: 'rank', text: `Streak milestone: ${m} days`, from: 'Habitify' });
        }
    });
    saveSocialStore();
}

function followStatus(viewer, target) {
    const uv = ensureSocialUser(viewer);
    const ut = ensureSocialUser(target);
    if (!uv || !ut) return { state: 'none' };
    if (uv.safety.blocked.includes(target)) return { state: 'blocked' };
    if (uv.follow.following.includes(target)) {
        const mutual = ut.follow.following.includes(viewer);
        return { state: mutual ? 'friends' : 'following' };
    }
    if (uv.follow.requestsOut.includes(target)) return { state: 'requested' };
    if (uv.follow.requestsIn.includes(target)) return { state: 'incoming' };
    return { state: 'none' };
}

function sendFollowRequest(viewer, target) {
    if (!viewer || !target || viewer === target) return;
    if (isBlocked(viewer, target)) return;
    const uv = ensureSocialUser(viewer);
    const ut = ensureSocialUser(target);
    if (!uv || !ut) return;
    ensureRateReset(uv);
    if ((uv.rate.followRequestsSent || 0) >= 5) return;
    if (uv.follow.following.includes(target)) return;
    if (uv.follow.requestsOut.includes(target)) return;
    if (ut.profile.privacy === 'public') {
        uv.follow.following = uniq([...uv.follow.following, target]);
        ut.follow.followers = uniq([...ut.follow.followers, viewer]);
        pushNotification(target, { type: 'follow', text: `${viewer} followed you`, from: viewer });
        addFeedEvent(viewer, 'followed_user', { target }, 'followers');
    } else {
        uv.follow.requestsOut = uniq([...uv.follow.requestsOut, target]);
        ut.follow.requestsIn = uniq([...ut.follow.requestsIn, viewer]);
        pushNotification(target, { type: 'follow', text: `${viewer} sent a follow request`, from: viewer });
    }
    uv.rate.followRequestsSent = (uv.rate.followRequestsSent || 0) + 1;
    saveSocialStore();
}

function acceptFollowRequest(target, fromUser) {
    const ut = ensureSocialUser(target);
    const uf = ensureSocialUser(fromUser);
    if (!ut || !uf) return;
    ut.follow.requestsIn = ut.follow.requestsIn.filter(x => x !== fromUser);
    uf.follow.requestsOut = uf.follow.requestsOut.filter(x => x !== target);
    ut.follow.followers = uniq([...ut.follow.followers, fromUser]);
    uf.follow.following = uniq([...uf.follow.following, target]);
    pushNotification(fromUser, { type: 'follow', text: `${target} accepted your request`, from: target });
    saveSocialStore();
}

function rejectFollowRequest(target, fromUser) {
    const ut = ensureSocialUser(target);
    const uf = ensureSocialUser(fromUser);
    if (!ut || !uf) return;
    ut.follow.requestsIn = ut.follow.requestsIn.filter(x => x !== fromUser);
    uf.follow.requestsOut = uf.follow.requestsOut.filter(x => x !== target);
    saveSocialStore();
}

function unfollow(viewer, target) {
    const uv = ensureSocialUser(viewer);
    const ut = ensureSocialUser(target);
    if (!uv || !ut) return;
    uv.follow.following = uv.follow.following.filter(x => x !== target);
    ut.follow.followers = ut.follow.followers.filter(x => x !== viewer);
    saveSocialStore();
}

function blockUser(viewer, target) {
    if (!viewer || !target || viewer === target) return;
    const uv = ensureSocialUser(viewer);
    const ut = ensureSocialUser(target);
    if (!uv || !ut) return;
    uv.safety.blocked = uniq([...uv.safety.blocked, target]);
    unfollow(viewer, target);
    unfollow(target, viewer);
    uv.follow.requestsOut = uv.follow.requestsOut.filter(x => x !== target);
    uv.follow.requestsIn = uv.follow.requestsIn.filter(x => x !== target);
    ut.follow.requestsOut = ut.follow.requestsOut.filter(x => x !== viewer);
    ut.follow.requestsIn = ut.follow.requestsIn.filter(x => x !== viewer);
    saveSocialStore();
}

function unblockUser(viewer, target) {
    const uv = ensureSocialUser(viewer);
    if (!uv) return;
    uv.safety.blocked = uv.safety.blocked.filter(x => x !== target);
    saveSocialStore();
}

function reportUser(viewer, target) {
    if (!viewer || !target || viewer === target) return;
    const uv = ensureSocialUser(viewer);
    if (!uv) return;
    ensureRateReset(uv);
    if ((uv.rate.reportsSent || 0) >= 5) return;
    const reason = prompt('Report reason (optional):') || '';
    uv.safety.reports.unshift({ target, reason: reason.toString().slice(0, 200), createdAt: new Date().toISOString() });
    uv.safety.reports = uv.safety.reports.slice(0, 50);
    uv.rate.reportsSent = (uv.rate.reportsSent || 0) + 1;
    saveSocialStore();
}

function sendMotivationMessage(fromUser, toUser) {
    if (!fromUser || !toUser || fromUser === toUser) return;
    if (isBlocked(fromUser, toUser)) return;
    const su = ensureSocialUser(fromUser);
    if (!su) return;
    ensureRateReset(su);
    if ((su.rate.messagesSent || 0) >= 10) return;
    const msg = prompt('Motivation message:');
    if (!msg) return;
    const text = msg.toString().trim();
    if (!text) return;
    su.rate.messagesSent = (su.rate.messagesSent || 0) + 1;
    pushNotification(toUser, { type: 'message', text: `${fromUser}: ${text.slice(0, 200)}`, from: fromUser });
    saveSocialStore();
}

function nudgeFriend(fromUser, toUser) {
    if (!fromUser || !toUser || fromUser === toUser) return;
    if (isBlocked(fromUser, toUser)) return;
    const su = ensureSocialUser(fromUser);
    if (!su) return;
    ensureRateReset(su);
    if ((su.rate.nudgesSent || 0) >= 10) return;
    su.rate.nudgesSent = (su.rate.nudgesSent || 0) + 1;
    pushNotification(toUser, { type: 'message', text: `${fromUser} nudged you: quick check-in 👊`, from: fromUser });
    saveSocialStore();
}

function visibleFeedFor(viewer, scope, offset, limit) {
    if (!viewer) return [];
    const uv = ensureSocialUser(viewer);
    if (!uv) return [];
    const following = asSet(uv.follow.following);
    const friends = friendsSet(viewer);
    const allowedActors = scope === 'friends' ? new Set([...following, ...friends, viewer]) : null;
    const out = [];
    for (let i = 0; i < (socialStore?.feed?.length || 0); i++) {
        const e = socialStore.feed[i];
        if (!e || !e.actor) continue;
        if (isBlocked(viewer, e.actor)) continue;
        if (allowedActors && !allowedActors.has(e.actor)) continue;
        const actorUser = ensureSocialUser(e.actor);
        if (!actorUser) continue;
        if (e.visibility === 'followers' && !isFollower(viewer, e.actor) && viewer !== e.actor) continue;
        if (scope === 'global' && e.visibility !== 'public') continue;
        out.push(e);
    }
    return out.slice(offset, offset + limit);
}

function toggleFeedLike(viewer, eventId) {
    if (!viewer || !eventId) return;
    const e = (socialStore?.feed || []).find(x => x?.id === eventId);
    if (!e) return;
    e.reactions = e.reactions || { likes: [], encourages: {} };
    const likes = asSet(e.reactions.likes);
    if (likes.has(viewer)) likes.delete(viewer);
    else likes.add(viewer);
    e.reactions.likes = [...likes];
    saveSocialStore();
}

function addFeedEncourage(viewer, eventId, kind) {
    if (!viewer || !eventId || !kind) return;
    const e = (socialStore?.feed || []).find(x => x?.id === eventId);
    if (!e) return;
    e.reactions = e.reactions || { likes: [], encourages: {} };
    const k = kind.toString();
    e.reactions.encourages[k] = uniq([...(e.reactions.encourages[k] || []), viewer]);
    saveSocialStore();
}

function renderUserRow(username, viewer) {
    const su = ensureSocialUser(username);
    const photo = su?.profile?.photoDataUrl;
    const privacy = su?.profile?.privacy || 'public';
    const st = followStatus(viewer, username);
    const canView = canViewProfile(viewer, username);
    const sub = canView ? `${privacy} • ${su?.rank?.tier || 'Bronze'}` : `${privacy}`;
    const btns = [];
    if (viewer && viewer !== username) {
        if (st.state === 'friends' || st.state === 'following') btns.push(`<button class="btn-secondary" type="button" data-action="unfollow" data-user="${username}">Unfollow</button>`);
        else if (st.state === 'requested') btns.push(`<button class="btn-secondary" type="button" disabled>Requested</button>`);
        else if (st.state === 'incoming') {
            btns.push(`<button class="btn-success" type="button" data-action="accept" data-user="${username}">Accept</button>`);
            btns.push(`<button class="btn-danger" type="button" data-action="reject" data-user="${username}">Reject</button>`);
        } else if (st.state === 'blocked') {
            btns.push(`<button class="btn-secondary" type="button" data-action="unblock" data-user="${username}">Unblock</button>`);
        } else {
            btns.push(`<button class="btn-primary" type="button" data-action="follow" data-user="${username}">Follow</button>`);
        }
        btns.push(`<button class="btn-secondary" type="button" data-action="message" data-user="${username}">Message</button>`);
        btns.push(`<button class="btn-secondary" type="button" data-action="nudge" data-user="${username}">Nudge</button>`);
        btns.push(`<button class="btn-danger" type="button" data-action="block" data-user="${username}">Block</button>`);
        btns.push(`<button class="btn-secondary" type="button" data-action="report" data-user="${username}">Report</button>`);
    }
    return `
        <div class="friends-user-row">
            <div class="left" data-action="view" data-user="${username}">
                <div class="friends-mini-avatar">${photo ? `<img src="${photo}" alt="">` : `<i class="fas fa-user"></i>`}</div>
                <div style="min-width:0;">
                    <div class="name">${username}</div>
                    <div class="sub">${sub}</div>
                </div>
            </div>
            <div class="right">${btns.join('')}</div>
        </div>
    `;
}

function renderFriends() {
    if (!socialStore) socialStore = loadSocialStore();
    const gate = document.getElementById('friendsLoginGate');
    const badge = document.getElementById('friendsNotifBadge');
    const canUse = !!currentUser;
    if (gate) {
        gate.innerText = canUse ? '' : 'Login to use Friends features.';
    }
    if (!canUse) {
        if (badge) badge.style.display = 'none';
        const feed = document.getElementById('friendsFeedList');
        if (feed) feed.innerHTML = '';
        const results = document.getElementById('friendsSearchResults');
        if (results) results.innerHTML = '';
        const sugg = document.getElementById('friendsSuggestions');
        if (sugg) sugg.innerHTML = '';
        const req = document.getElementById('friendsRequestsIn');
        if (req) req.innerHTML = '';
        const notifs = document.getElementById('friendsNotifList');
        if (notifs) notifs.innerHTML = '';
        const blocked = document.getElementById('friendsBlockedList');
        if (blocked) blocked.innerHTML = '';
        const lb = document.getElementById('leaderboardList');
        if (lb) lb.innerHTML = '';
        const challenges = document.getElementById('challengesList');
        if (challenges) challenges.innerHTML = '';
        const invite = document.getElementById('challengeInviteList');
        if (invite) invite.innerHTML = '';
        return;
    }

    syncSelfToSocialStore();
    const d = getUserData(currentUser);
    updateRankForUser(currentUser, d, true);
    milestonesFromStreak(currentUser, d);
    updateRankForUser(currentUser, d, false);

    setupFriendsEventListeners();
    renderFriendsProfile();
    renderFriendsRequests();
    renderFriendsBlocked();
    renderFriendsNotifications();
    renderFriendsSuggestions();
    renderFriendsFeed(true);
    renderLeaderboards();
    renderChallengeInviteList();
    renderChallenges();
    updateFriendsBadge();
}

function updateFriendsBadge() {
    const badge = document.getElementById('friendsNotifBadge');
    if (!badge || !currentUser) return;
    const su = ensureSocialUser(currentUser);
    if (!su) return;
    const last = su.notifications.lastReadAt ? new Date(su.notifications.lastReadAt).getTime() : 0;
    const unread = (su.notifications.items || []).filter(n => new Date(n.createdAt).getTime() > last).length;
    if (unread > 0) {
        badge.style.display = 'inline-flex';
        badge.innerText = String(Math.min(99, unread));
    } else {
        badge.style.display = 'none';
    }
}

function renderFriendsProfile() {
    const su = ensureSocialUser(currentUser);
    if (!su) return;

    const bioEl = document.getElementById('friendsBio');
    const privEl = document.getElementById('friendsPrivacy');
    const imgEl = document.getElementById('friendsProfilePhotoPreview');
    const fallEl = document.getElementById('friendsAvatarFallback');

    if (bioEl && bioEl.value === '') bioEl.value = su.profile.bio || '';
    if (privEl) privEl.value = su.profile.privacy === 'private' ? 'private' : 'public';

    if (imgEl && fallEl) {
        const photo = su.profile.photoDataUrl;
        if (photo) {
            imgEl.src = photo;
            imgEl.style.display = 'block';
            fallEl.style.display = 'none';
        } else {
            imgEl.style.display = 'none';
            fallEl.style.display = 'flex';
        }
    }

    const d = getUserData(currentUser);
    const statsEl = document.getElementById('friendsSelfStats');
    const rankEl = document.getElementById('friendsRankCard');
    if (statsEl && d) {
        const habitsTotal = (d.habits || []).length;
        const { completed, totalSlots } = computeHabitCompletions(d, 7);
        const weeklyRate = totalSlots ? Math.round((completed / totalSlots) * 100) : 0;
        const workouts = Number(d.fitness?.stats?.workoutsCompleted) || 0;
        const streak = computeOverallStreak(d);
        statsEl.innerHTML = `
            <div class="friends-stat"><div class="k">Habits</div><div class="v">${habitsTotal}</div></div>
            <div class="friends-stat"><div class="k">Weekly consistency</div><div class="v">${weeklyRate}%</div></div>
            <div class="friends-stat"><div class="k">Fitness workouts</div><div class="v">${workouts}</div></div>
            <div class="friends-stat"><div class="k">Current streak</div><div class="v">${streak}</div></div>
        `;
    }
    if (rankEl && su.rank) {
        const points = Number(su.rank.points) || 0;
        const tier = su.rank.tier || 'Bronze';
        const next = tier === 'Bronze' ? 250 : tier === 'Silver' ? 750 : tier === 'Gold' ? 1500 : tier === 'Platinum' ? 3000 : null;
        const pct = next ? Math.min(100, Math.round((points / next) * 100)) : 100;
        rankEl.innerHTML = `
            <div style="display:flex; justify-content:space-between; gap:1rem; align-items:center;">
                <div><div style="font-weight:900;">${tier}</div><div style="color:var(--text-secondary); font-size:0.9rem;">${points} points</div></div>
                <div style="flex:1;">
                    <div class="progress-bar-sm"><div class="fill" style="width:${pct}%"></div></div>
                </div>
            </div>
        `;
    }
}

function renderFriendsRequests() {
    const el = document.getElementById('friendsRequestsIn');
    if (!el || !currentUser) return;
    const su = ensureSocialUser(currentUser);
    const list = (su?.follow?.requestsIn || []).filter(u => u && !isBlocked(currentUser, u));
    el.innerHTML = list.length ? list.map(u => renderUserRow(u, currentUser)).join('') : '<div class="hint">No requests</div>';
}

function renderFriendsBlocked() {
    const el = document.getElementById('friendsBlockedList');
    if (!el || !currentUser) return;
    const su = ensureSocialUser(currentUser);
    const list = (su?.safety?.blocked || []).filter(Boolean);
    el.innerHTML = list.length
        ? list.map(u => `<div class="friends-user-row"><div class="left"><div class="friends-mini-avatar"><i class="fas fa-user-slash"></i></div><div><div class="name">${u}</div><div class="sub">Blocked</div></div></div><div class="right"><button class="btn-secondary" type="button" data-action="unblock" data-user="${u}">Unblock</button></div></div>`).join('')
        : '<div class="hint">No blocked users</div>';
}

function renderFriendsNotifications() {
    const el = document.getElementById('friendsNotifList');
    if (!el || !currentUser) return;
    const su = ensureSocialUser(currentUser);
    const prefs = su.notifications?.prefs || {};
    const last = su.notifications.lastReadAt ? new Date(su.notifications.lastReadAt).getTime() : 0;
    const items = (su.notifications.items || []).slice(0, 30);
    el.innerHTML = items.length
        ? items.map(n => {
            const unread = new Date(n.createdAt).getTime() > last;
            const from = n.from ? `<div class="sub">from ${n.from}</div>` : '';
            return `<div class="friends-notif ${unread ? 'unread' : ''}"><div style="display:flex; justify-content:space-between; gap:1rem;"><div style="font-weight:800;">${n.text}</div><div class="time">${formatAgo(n.createdAt)}</div></div>${from}</div>`;
        }).join('')
        : '<div class="hint">No notifications</div>';

    const p1 = document.getElementById('prefNotifyFollow');
    const p2 = document.getElementById('prefNotifyChallenges');
    const p3 = document.getElementById('prefNotifyRank');
    const p4 = document.getElementById('prefNotifyMessages');
    if (p1) p1.checked = prefs.follow !== false;
    if (p2) p2.checked = prefs.challenges !== false;
    if (p3) p3.checked = prefs.rank !== false;
    if (p4) p4.checked = prefs.messages !== false;
}

function suggestedUsers(viewer, limit = 8) {
    const viewerData = getUserData(viewer);
    const viewerSU = ensureSocialUser(viewer);
    const all = listAllUsernames().filter(u => u !== viewer);
    const scored = [];
    all.forEach(u => {
        if (!u) return;
        if (isBlocked(viewer, u)) return;
        const su = ensureSocialUser(u);
        if (!su) return;
        if (viewerSU.follow.following.includes(u)) return;
        if (viewerSU.follow.requestsOut.includes(u)) return;
        let score = 0;
        const ud = getUserData(u);
        if (viewerData?.fitness?.profile?.goal && ud?.fitness?.profile?.goal && viewerData.fitness.profile.goal === ud.fitness.profile.goal) score += 3;
        const vCats = new Set((viewerData?.habits || []).map(h => mapHabitCategory(h?.category)));
        const uCats = new Set((ud?.habits || []).map(h => mapHabitCategory(h?.category)));
        vCats.forEach(c => { if (uCats.has(c)) score += 2; });
        const mutual = friendsSet(viewer);
        const otherFriends = friendsSet(u);
        let m = 0;
        mutual.forEach(x => { if (otherFriends.has(x)) m += 1; });
        score += Math.min(3, m);
        scored.push({ u, score });
    });
    scored.sort((a, b) => b.score - a.score || a.u.localeCompare(b.u));
    return scored.filter(x => x.score > 0).slice(0, limit).map(x => x.u);
}

function renderFriendsSuggestions() {
    const el = document.getElementById('friendsSuggestions');
    if (!el || !currentUser) return;
    const list = suggestedUsers(currentUser, 10);
    el.innerHTML = list.length ? list.map(u => renderUserRow(u, currentUser)).join('') : '<div class="hint">No suggestions yet</div>';
}

function renderFriendsSearchResults(query) {
    const el = document.getElementById('friendsSearchResults');
    if (!el || !currentUser) return;
    const q = (query || '').toString().trim().toLowerCase();
    if (!q) {
        el.innerHTML = '<div class="hint">Search by username</div>';
        return;
    }
    const list = listAllUsernames().filter(u => u.toLowerCase().includes(q) && u !== currentUser && !isBlocked(currentUser, u)).slice(0, 20);
    el.innerHTML = list.length ? list.map(u => renderUserRow(u, currentUser)).join('') : '<div class="hint">No users found</div>';
}

function feedText(e) {
    const actor = e.actor;
    const p = e.payload || {};
    if (e.type === 'habit_completed') return `${actor} completed a habit`;
    if (e.type === 'habit_missed') return `${actor} could use a boost today`;
    if (e.type === 'workout_completed') return `${actor} completed a workout`;
    if (e.type === 'workout_partial') return `${actor} got a partial workout in`;
    if (e.type === 'streak_milestone') return `${actor} reached a ${p.days}-day streak`;
    if (e.type === 'rank_upgraded') return `${actor} ranked up to ${p.to}`;
    if (e.type === 'challenge_created') return `${actor} created a challenge`;
    if (e.type === 'challenge_completed') return `${actor} completed a challenge`;
    if (e.type === 'followed_user') return `${actor} followed ${p.target}`;
    return `${actor} posted an update`;
}

function renderFeedItem(viewer, e) {
    const su = ensureSocialUser(e.actor);
    const photo = su?.profile?.photoDataUrl;
    const likes = asSet(e.reactions?.likes || []);
    const likeCount = likes.size;
    const liked = likes.has(viewer);
    const encourages = e.reactions?.encourages || {};
    const totalEnc = Object.values(encourages).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);
    const encKinds = ['👏', '🔥', '💪', '🌟'];
    return `
        <div class="friends-feed-item" data-event="${e.id}">
            <div class="meta">
                <div class="actor">
                    <div class="friends-mini-avatar">${photo ? `<img src="${photo}" alt="">` : `<i class="fas fa-user"></i>`}</div>
                    <span>${e.actor}</span>
                </div>
                <div class="time">${formatAgo(e.createdAt)}</div>
            </div>
            <div>${feedText(e)}</div>
            <div class="friends-feed-actions">
                <button class="btn-secondary" type="button" data-action="like" data-event="${e.id}">${liked ? 'Liked' : 'Like'} (${likeCount})</button>
                ${encKinds.map(k => `<button class="btn-secondary" type="button" data-action="encourage" data-kind="${k}" data-event="${e.id}">Encourage ${k}</button>`).join('')}
                <span style="color:var(--text-secondary); font-size:0.9rem;">Encouragements: ${totalEnc}</span>
            </div>
        </div>
    `;
}

function renderFriendsFeed(reset) {
    const listEl = document.getElementById('friendsFeedList');
    if (!listEl || !currentUser) return;
    if (reset) friendsFeedOffset = 0;
    const scope = document.getElementById('friendsFeedScope')?.value || 'friends';
    const items = visibleFeedFor(currentUser, scope, friendsFeedOffset, FRIENDS_FEED_PAGE_SIZE);
    if (reset) listEl.innerHTML = '';
    if (!items.length && friendsFeedOffset === 0) {
        listEl.innerHTML = '<div class="hint">No activity yet</div>';
        return;
    }
    const html = items.map(e => renderFeedItem(currentUser, e)).join('');
    listEl.insertAdjacentHTML('beforeend', html);
    friendsFeedOffset += items.length;
}

function leaderboardRows(scope, metric, category) {
    const viewer = currentUser;
    const names = listAllUsernames().filter(Boolean);
    const allowed = new Set();
    if (scope === 'friends') {
        const f = friendsSet(viewer);
        f.forEach(x => allowed.add(x));
        const u = ensureSocialUser(viewer);
        (u?.follow?.following || []).forEach(x => allowed.add(x));
        allowed.add(viewer);
    }
    const rows = [];
    names.forEach(u => {
        if (!u) return;
        if (scope === 'friends' && !allowed.has(u)) return;
        if (isBlocked(viewer, u)) return;
        if (!canViewProfile(viewer, u) && u !== viewer) return;
        const d = getUserData(u);
        if (!d) return;
        const score = metric === 'daily_habits'
            ? computeDailyHabitCompletions(d, category)
            : metric === 'weekly_consistency'
                ? (() => {
                    const { completed, totalSlots } = computeHabitCompletions(d, 7, category === 'all' ? null : (h) => mapHabitCategory(h?.category) === category);
                    return totalSlots ? Math.round((completed / totalSlots) * 100) : 0;
                })()
                : metric === 'fitness_workouts'
                    ? Number(d.fitness?.stats?.workoutsCompleted) || 0
                    : metric === 'overall_streak'
                        ? computeOverallStreak(d, category)
                        : (() => {
                            const points = computeRankPointsFromData(d);
                            return points;
                        })();
        rows.push({ u, score });
    });
    rows.sort((a, b) => b.score - a.score || a.u.localeCompare(b.u));
    return rows.slice(0, 20);
}

function renderLeaderboards() {
    const el = document.getElementById('leaderboardList');
    if (!el || !currentUser) return;
    const scope = document.getElementById('lbScope')?.value || 'global';
    const metric = document.getElementById('lbMetric')?.value || 'daily_habits';
    const category = document.getElementById('lbCategory')?.value || 'all';
    const rows = leaderboardRows(scope, metric, category);
    const suffix = metric === 'weekly_consistency' ? '%' : '';
    el.innerHTML = rows.length
        ? rows.map((r, idx) => `<div class="friends-leaderboard-row"><div style="display:flex; gap:0.8rem; align-items:center;"><div class="rank">#${idx + 1}</div><div style="font-weight:900;">${r.u}</div></div><div class="score">${r.score}${suffix}</div></div>`).join('')
        : '<div class="hint">No data</div>';
}

function listInvitableFriends(viewer) {
    const f = friendsSet(viewer);
    return [...f].filter(u => !isBlocked(viewer, u)).sort();
}

function renderChallengeInviteList() {
    const el = document.getElementById('challengeInviteList');
    if (!el || !currentUser) return;
    const list = listInvitableFriends(currentUser);
    el.innerHTML = list.length
        ? list.map(u => `<label class="friends-toggle"><input type="checkbox" data-invite="${u}"> ${u}</label>`).join('')
        : '<div class="hint">No mutual friends to invite yet</div>';
}

function createChallenge() {
    if (!currentUser) return;
    const name = (document.getElementById('challengeName')?.value || '').toString().trim() || 'Challenge';
    const durationDays = Number(document.getElementById('challengeDuration')?.value || 7) || 7;
    const type = (document.getElementById('challengeType')?.value || 'habits').toString();
    const inviteEls = [...(document.getElementById('challengeInviteList')?.querySelectorAll('input[type="checkbox"][data-invite]') || [])];
    const invites = inviteEls.filter(x => x.checked).map(x => x.dataset.invite).filter(Boolean);
    const id = (crypto.randomUUID ? crypto.randomUUID() : 'c-' + Date.now() + Math.random().toString(36).slice(2));
    const start = todayKey();
    const ends = new Date();
    ends.setDate(ends.getDate() + durationDays);
    const endsAt = ends.toISOString().split('T')[0];
    socialStore.challenges[id] = {
        id,
        name,
        type,
        durationDays,
        createdAt: new Date().toISOString(),
        startDate: start,
        endDate: endsAt,
        creator: currentUser,
        participants: {}
    };
    socialStore.challenges[id].participants[currentUser] = { status: 'accepted', joinedAt: new Date().toISOString() };
    invites.forEach(u => {
        socialStore.challenges[id].participants[u] = { status: 'invited', joinedAt: null };
        pushNotification(u, { type: 'challenge', text: `${currentUser} invited you to "${name}"`, from: currentUser });
    });
    saveSocialStore();
    addFeedEvent(currentUser, 'challenge_created', { challengeId: id }, ensureSocialUser(currentUser)?.profile?.privacy === 'private' ? 'followers' : 'public');
    renderChallenges();
}

function acceptChallenge(user, challengeId) {
    const c = socialStore.challenges?.[challengeId];
    if (!c) return;
    if (!c.participants[user]) c.participants[user] = { status: 'accepted', joinedAt: new Date().toISOString() };
    c.participants[user].status = 'accepted';
    c.participants[user].joinedAt = new Date().toISOString();
    saveSocialStore();
}

function declineChallenge(user, challengeId) {
    const c = socialStore.challenges?.[challengeId];
    if (!c) return;
    if (!c.participants[user]) c.participants[user] = { status: 'declined', joinedAt: null };
    c.participants[user].status = 'declined';
    saveSocialStore();
}

function dateRangeKeys(startDate, endDate) {
    const out = [];
    const s = new Date(startDate + 'T00:00:00');
    const e = new Date(endDate + 'T00:00:00');
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        out.push(d.toISOString().split('T')[0]);
    }
    return out;
}

function challengeScoreForUser(challenge, username) {
    const d = getUserData(username);
    if (!d) return 0;
    const end = todayKey() < challenge.endDate ? todayKey() : challenge.endDate;
    const keys = dateRangeKeys(challenge.startDate, end);
    let score = 0;
    if (challenge.type === 'workouts') {
        keys.forEach(k => {
            const status = d.fitness?.logs?.[k]?.status || (d.fitness?.logs?.[k]?.completed ? 'completed' : null);
            if (status === 'completed') score += 1;
        });
        return score;
    }
    keys.forEach(k => {
        (d.habits || []).forEach(h => {
            if ((h.logs || {})[k]?.status === 'completed') score += 1;
        });
    });
    return score;
}

function renderChallenges() {
    const el = document.getElementById('challengesList');
    if (!el || !currentUser) return;
    const all = Object.values(socialStore.challenges || {});
    all.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    const mine = all.filter(c => c?.participants?.[currentUser]);
    if (!mine.length) {
        el.innerHTML = '<div class="hint">No challenges yet</div>';
        return;
    }
    el.innerHTML = mine.map(c => {
        const me = c.participants[currentUser];
        const status = me?.status || 'invited';
        const acceptedUsers = Object.entries(c.participants || {}).filter(([_, p]) => p?.status === 'accepted').map(([u]) => u);
        const lb = acceptedUsers
            .map(u => ({ u, s: challengeScoreForUser(c, u) }))
            .sort((a, b) => b.s - a.s || a.u.localeCompare(b.u))
            .slice(0, 10);
        const controls = status === 'invited'
            ? `<div class="friends-feed-actions">
                    <button class="btn-success" type="button" data-action="challenge_accept" data-challenge="${c.id}">Accept</button>
                    <button class="btn-danger" type="button" data-action="challenge_decline" data-challenge="${c.id}">Decline</button>
               </div>`
            : '';
        const rows = lb.length
            ? lb.map((r, idx) => `<div class="friends-leaderboard-row"><div style="display:flex; gap:0.8rem; align-items:center;"><div class="rank">#${idx + 1}</div><div style="font-weight:900;">${r.u}</div></div><div class="score">${r.s}</div></div>`).join('')
            : '<div class="hint">No participants yet</div>';
        return `
            <div class="friends-challenge">
                <div style="display:flex; justify-content:space-between; gap:1rem;">
                    <div>
                        <div style="font-weight:900;">${c.name}</div>
                        <div class="sub">${c.type} • ${c.startDate} → ${c.endDate}</div>
                    </div>
                    <div class="time">${status}</div>
                </div>
                ${controls}
                <div style="margin-top:0.8rem;">${rows}</div>
            </div>
        `;
    }).join('');
}

function saveFriendsProfile() {
    if (!currentUser) return;
    const bio = document.getElementById('friendsBio')?.value ?? '';
    const priv = document.getElementById('friendsPrivacy')?.value || 'public';
    appData.user.bio = bio.toString().slice(0, 120);
    appData.user.privacy = priv === 'private' ? 'private' : 'public';
    saveData();
    renderFriendsProfile();
}

function handlePhotoUpload(file) {
    if (!file || !currentUser) return;
    const reader = new FileReader();
    reader.onload = () => {
        const url = typeof reader.result === 'string' ? reader.result : null;
        if (!url) return;
        appData.user.photoDataUrl = url;
        saveData();
        renderFriendsProfile();
    };
    reader.readAsDataURL(file);
}

function setupFriendsEventListeners() {
    const root = document.body;
    if (root?.dataset?.friendsBound === '1') return;
    if (root?.dataset) root.dataset.friendsBound = '1';

    const bindClick = (id, fn) => {
        const el = document.getElementById(id);
        if (!el || el.dataset.bound === '1') return;
        el.dataset.bound = '1';
        el.addEventListener('click', fn);
    };
    const bindChange = (id, fn) => {
        const el = document.getElementById(id);
        if (!el || el.dataset.boundChange === '1') return;
        el.dataset.boundChange = '1';
        el.addEventListener('change', fn);
    };

    bindClick('saveFriendsProfileBtn', saveFriendsProfile);
    bindClick('friendsSearchBtn', () => renderFriendsSearchResults(document.getElementById('friendsSearchInput')?.value || ''));
    bindClick('friendsFeedLoadMore', () => renderFriendsFeed(false));
    bindClick('createChallengeBtn', createChallenge);
    bindClick('markFriendsNotifRead', () => {
        const su = ensureSocialUser(currentUser);
        if (!su) return;
        su.notifications.lastReadAt = new Date().toISOString();
        saveSocialStore();
        renderFriendsNotifications();
        updateFriendsBadge();
    });

    bindChange('friendsFeedScope', () => renderFriendsFeed(true));
    ['lbScope', 'lbMetric', 'lbCategory'].forEach(id => bindChange(id, renderLeaderboards));

    const photoInput = document.getElementById('friendsProfilePhoto');
    if (photoInput && photoInput.dataset.boundChange !== '1') {
        photoInput.dataset.boundChange = '1';
        photoInput.addEventListener('change', (e) => {
            const f = e.target?.files?.[0];
            if (f) handlePhotoUpload(f);
        });
    }

    ['prefNotifyFollow', 'prefNotifyChallenges', 'prefNotifyRank', 'prefNotifyMessages'].forEach(id => bindChange(id, () => {
        const su = ensureSocialUser(currentUser);
        if (!su) return;
        su.notifications.prefs.follow = !!document.getElementById('prefNotifyFollow')?.checked;
        su.notifications.prefs.challenges = !!document.getElementById('prefNotifyChallenges')?.checked;
        su.notifications.prefs.rank = !!document.getElementById('prefNotifyRank')?.checked;
        su.notifications.prefs.messages = !!document.getElementById('prefNotifyMessages')?.checked;
        saveSocialStore();
        updateFriendsBadge();
    }));

    const searchInput = document.getElementById('friendsSearchInput');
    if (searchInput && searchInput.dataset.boundKey !== '1') {
        searchInput.dataset.boundKey = '1';
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') renderFriendsSearchResults(searchInput.value);
        });
    }

    const friendsSection = document.getElementById('friendsSection');
    if (friendsSection && friendsSection.dataset.boundDelegation !== '1') {
        friendsSection.dataset.boundDelegation = '1';
        friendsSection.addEventListener('click', (e) => {
            const btn = e.target?.closest?.('[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            const u = btn.dataset.user;
            const ev = btn.dataset.event;
            const kind = btn.dataset.kind;
            const cid = btn.dataset.challenge;

            if (action === 'follow') sendFollowRequest(currentUser, u);
            if (action === 'unfollow') unfollow(currentUser, u);
            if (action === 'accept') acceptFollowRequest(currentUser, u);
            if (action === 'reject') rejectFollowRequest(currentUser, u);
            if (action === 'block') blockUser(currentUser, u);
            if (action === 'unblock') unblockUser(currentUser, u);
            if (action === 'report') reportUser(currentUser, u);
            if (action === 'message') sendMotivationMessage(currentUser, u);
            if (action === 'nudge') nudgeFriend(currentUser, u);
            if (action === 'like') toggleFeedLike(currentUser, ev);
            if (action === 'encourage') addFeedEncourage(currentUser, ev, kind);
            if (action === 'challenge_accept') acceptChallenge(currentUser, cid);
            if (action === 'challenge_decline') declineChallenge(currentUser, cid);

            saveSocialStore();
            renderFriends();
        });
    }
}

/* =====================
   AUTH FUNCTIONS
===================== */
function handleLogin() {
    const u = document.getElementById('loginUsername').value.trim();
    const p = document.getElementById('loginPassword').value.trim();
    const err = document.getElementById('loginError');

    if (!u || !p) {
        err.innerText = "Please fill in all fields";
        return;
    }

    const users = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '{}');
    if (users[u] && users[u].password === p) {
        sessionStorage.setItem(STORAGE_KEY_SESSION, u);
        location.reload();
    } else {
        err.innerText = "Invalid username or password";
    }
}

function handleRegister() {
    const u = document.getElementById('registerUsername').value.trim();
    const p = document.getElementById('registerPassword').value.trim();
    const cp = document.getElementById('registerConfirmPassword').value.trim();
    const err = document.getElementById('registerError');

    if (!u || !p || !cp) {
        err.innerText = "Please fill in all fields";
        return;
    }
    if (p !== cp) {
        err.innerText = "Passwords do not match";
        return;
    }

    const users = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '{}');
    if (users[u]) {
        err.innerText = "Username already exists";
        return;
    }

    // Create User
    const newState = JSON.parse(JSON.stringify(defaultState));
    newState.user.username = u;

    users[u] = {
        password: p,
        data: newState
    };

    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    sessionStorage.setItem(STORAGE_KEY_SESSION, u);
    alert("Account created successfully!");
    location.reload();
}

function handleLogout() {
    sessionStorage.removeItem(STORAGE_KEY_SESSION);
    location.reload();
}

/* =====================
   CORE LOGIC (HABITS)
===================== */
function addHabit(name, category) {
    const newHabit = {
        id: (crypto.randomUUID ? crypto.randomUUID() : 'h-' + Date.now() + Math.random().toString(36).substr(2, 9)),
        name: name,
        category: category,
        createdDate: new Date().toISOString(),
        logs: {}
    };
    appData.habits.push(newHabit);
    saveData();
}

function deleteHabit(id) {
    if (confirm("Delete this habit?")) {
        appData.habits = appData.habits.filter(h => h.id !== id);
        saveData();
    }
}

function toggleHabitStatus(habitId, dateStr, status, opts) {
    const habit = appData.habits.find(h => h.id === habitId);
    if (!habit) return;

    if (!habit.logs) habit.logs = {};
    const options = opts && typeof opts === 'object' ? opts : {};
    const suppressFeed = options.suppressFeed === true;
    const prevStatus = habit.logs[dateStr]?.status || null;

    // If clicking same status, remove it (toggle off)
    if (habit.logs[dateStr] && habit.logs[dateStr].status === status) {
        delete habit.logs[dateStr];
        // Remove points if removing completion
        if (status === 'completed') addXP(-10); 
    } else {
        // Changing status
        const oldStatus = prevStatus;
        
        habit.logs[dateStr] = { 
            status: status, 
            note: habit.logs[dateStr]?.note || "" 
        };

        // Gamification Logic
        if (status === 'completed' && oldStatus !== 'completed') {
            addXP(10);
            checkAchievements();
        } else if (status !== 'completed' && oldStatus === 'completed') {
            addXP(-10);
        }
    }
    if (currentUser) {
        if (!suppressFeed && status === 'completed' && prevStatus !== 'completed') {
            addFeedEvent(currentUser, 'habit_completed', { habitId: habit.id, name: habit.name, category: mapHabitCategory(habit.category), date: dateStr }, ensureSocialUser(currentUser)?.profile?.privacy === 'private' ? 'followers' : 'public');
        }
        milestonesFromStreak(currentUser, appData);
        updateRankForUser(currentUser, appData, false);
        checkChallengeCompletionsForUser(currentUser);
    }
    saveData();
}

function saveHabitNote(habitId, dateStr, note) {
    const habit = appData.habits.find(h => h.id === habitId);
    if (habit && habit.logs[dateStr]) {
        habit.logs[dateStr].note = note;
        saveData();
    }
}

/* =====================
   GAMIFICATION
===================== */
const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 5000];

function addXP(amount) {
    appData.user.xp += amount;
    if (appData.user.xp < 0) appData.user.xp = 0;
    
    appData.user.totalPoints += amount;
    if (appData.user.totalPoints < 0) appData.user.totalPoints = 0;

    // Check Level Up
    const currentLevel = appData.user.level;
    let newLevel = currentLevel;
    
    for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
        if (appData.user.xp >= LEVEL_THRESHOLDS[i]) {
            newLevel = i + 1;
        }
    }

    if (newLevel > currentLevel) {
        appData.user.level = newLevel;
        alert(`🎉 Level Up! You are now Level ${newLevel}!`);
    }
}

function calculateStreak(habit) {
    const logs = habit?.logs && typeof habit.logs === 'object' ? habit.logs : {};
    let currentStreak = 0;
    let longestStreak = 0;
    const today = new Date();
    
    // Check backwards from today
    let tempStreak = 0;
    for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        if (logs[dateStr]?.status === 'completed') {
            tempStreak++;
        } else {
            // If it's today and not marked yet, don't break streak yet
            if (i === 0) continue; 
            break;
        }
    }
    currentStreak = tempStreak;

    // Longest Streak Calculation (Simplified)
    // iterate all keys, sort dates, find max sequence
    const dates = Object.keys(logs)
        .filter(d => logs[d].status === 'completed')
        .sort();
        
    let maxS = 0;
    let curS = 0;
    let prevDate = null;

    dates.forEach(d => {
        const currentDate = new Date(d);
        if (prevDate) {
            const diff = (currentDate - prevDate) / (1000 * 60 * 60 * 24);
            if (diff === 1) {
                curS++;
            } else {
                curS = 1;
            }
        } else {
            curS = 1;
        }
        if (curS > maxS) maxS = curS;
        prevDate = currentDate;
    });
    longestStreak = maxS;

    return { currentStreak, longestStreak };
}

function checkAchievements() {
    // Placeholder for badges logic
    // e.g. if total completions > 100, unlock badge
}

/* =====================
   UI RENDERING
===================== */
// --- Selectors ---
const habitsGrid = document.getElementById('habitsGrid');
const themeToggle = document.getElementById('themeToggle');
const userLevelEl = document.getElementById('userLevel');
const userXPEl = document.getElementById('userXP');
const nextLevelXPEl = document.getElementById('nextLevelXP');
const xpBar = document.getElementById('xpBar');
const totalPointsEl = document.getElementById('totalPoints');
const longestStreakEl = document.getElementById('longestStreak');
const completionRateEl = document.getElementById('completionRate');

let chartInstance = null;
let pieChartInstance = null;
let bmiTrendChartInstance = null;
let weightTrendChartInstance = null;
let workoutConsistencyChartInstance = null;
let fitnessCaloriesChartInstance = null;

// --- Init ---
document.addEventListener('DOMContentLoaded', initApp);

function updateUI() {
    renderHeaderStats();
    renderHabits();
    renderCharts();
    renderCalendar();
    renderBadges();
    
    // Update Nav Name
    const navUsernameEl = document.getElementById('navUsername');
    if (navUsernameEl) navUsernameEl.innerText = currentUser ? appData.user.username : "Guest";
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    appData.settings.theme = theme;
    if (!themeToggle) return;
    const icon = themeToggle.querySelector('i');
    if (!icon) return;
    if (theme === 'dark') {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
}

function renderHeaderStats() {
    userLevelEl.innerText = appData.user.level;
    userXPEl.innerText = appData.user.xp;
    
    const nextLevel = LEVEL_THRESHOLDS[appData.user.level] || (appData.user.level * 1000);
    const prevLevel = LEVEL_THRESHOLDS[appData.user.level - 1] || 0;
    const levelRange = nextLevel - prevLevel;
    const currentProgress = appData.user.xp - prevLevel;
    const percentage = Math.min(100, Math.max(0, (currentProgress / levelRange) * 100));
    
    nextLevelXPEl.innerText = nextLevel;
    xpBar.style.width = `${percentage}%`;
    totalPointsEl.innerText = appData.user.totalPoints;

    // Global Stats
    let maxStreak = 0;
    let totalHabitDays = 0;
    let completedDays = 0;

    appData.habits.forEach(h => {
        const s = calculateStreak(h);
        if (s.longestStreak > maxStreak) maxStreak = s.longestStreak;
        
        // Completion Rate
        const keys = Object.keys(h.logs || {});
        totalHabitDays += keys.length; // Approximate, ideally counts days since creation
        completedDays += keys.filter(k => (h.logs || {})[k].status === 'completed').length;
    });

    longestStreakEl.innerText = `${maxStreak} Days`;
    const rate = totalHabitDays > 0 ? Math.round((completedDays / totalHabitDays) * 100) : 0;
    completionRateEl.innerText = `${rate}%`;
}

function renderHabits() {
    habitsGrid.innerHTML = '';
    
    // Filter
    const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
    const filteredHabits = activeFilter === 'all' 
        ? appData.habits 
        : appData.habits.filter(h => h.category === activeFilter);

    if (filteredHabits.length === 0) {
        habitsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 2rem;">
            No habits found. Start by adding one!
        </div>`;
        return;
    }

    filteredHabits.forEach(habit => {
        const { currentStreak } = calculateStreak(habit);
        const todayStr = new Date().toISOString().split('T')[0];
        const status = (habit.logs || {})[todayStr]?.status;
        
        const card = document.createElement('div');
        card.className = 'habit-card';
        card.innerHTML = `
            <div class="habit-header">
                <div>
                    <div class="habit-title">${habit.name}</div>
                    <span class="habit-category">${habit.category}</span>
                </div>
                <div class="habit-streak">
                    <i class="fas fa-fire"></i> ${currentStreak}
                </div>
            </div>
            
            <div class="habit-progress">
                <div class="progress-label">
                    <span>Monthly Progress</span>
                    <span>${getMonthlyCompletion(habit)}%</span>
                </div>
                <div class="progress-bar">
                    <div class="fill" style="width: ${getMonthlyCompletion(habit)}%"></div>
                </div>
            </div>

            <div class="habit-actions">
                <button class="check-btn missed ${status === 'missed' ? 'active' : ''}" 
                    onclick="handleHabitClick('${habit.id}', 'missed')" title="Mark Missed">
                    <i class="fas fa-times"></i>
                </button>
                <button class="check-btn completed ${status === 'completed' ? 'active' : ''}" 
                    onclick="handleHabitClick('${habit.id}', 'completed')" title="Mark Complete">
                    <i class="fas fa-check"></i>
                </button>
                <div style="flex-grow:1"></div>
                <button class="habit-menu-btn" onclick="deleteHabit('${habit.id}')"><i class="fas fa-trash"></i></button>
            </div>
        `;
        
        // Highlight active buttons properly
        if (status === 'missed') {
            card.querySelector('.check-btn.missed').style.opacity = '1';
            card.querySelector('.check-btn.completed').style.opacity = '0.3';
        } else if (status === 'completed') {
            card.querySelector('.check-btn.completed').style.opacity = '1';
            card.querySelector('.check-btn.missed').style.opacity = '0.3';
        }

        habitsGrid.appendChild(card);
    });
}

function getMonthlyCompletion(habit) {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
    const logs = Object.keys(habit.logs || {}).filter(d => d.startsWith(currentMonth));
    if (logs.length === 0) return 0;
    const completed = logs.filter(d => (habit.logs || {})[d].status === 'completed').length;
    // Assuming denominator is days passed in month or total logs? 
    // Let's use days passed in month for accuracy
    const daysInMonth = now.getDate();
    return Math.round((completed / daysInMonth) * 100);
}

function handleHabitClick(id, status) {
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (status === 'missed') {
        openNoteModal(id, todayStr, status);
    } else {
        toggleHabitStatus(id, todayStr, status);
    }
}

/* =====================
   ANALYTICS & CHARTS
===================== */
function renderCharts(viewMode = 'weekly') {
    // Determine view mode if called without arg (e.g. from updateUI)
    if (typeof viewMode !== 'string') {
        const activeBtn = document.querySelector('.chart-toggle.active');
        viewMode = activeBtn ? activeBtn.dataset.view : 'weekly';
    }

    if (typeof Chart === 'undefined') return;
    const mainCanvas = document.getElementById('mainChart');
    const pieCanvas = document.getElementById('pieChart');
    if (!mainCanvas || !pieCanvas) return;
    const ctx = mainCanvas.getContext('2d');
    const pieCtx = pieCanvas.getContext('2d');
    if (!ctx || !pieCtx) return;
    
    // Prepare Data
    const labels = [];
    const dataCompleted = [];
    const dataMissed = [];

    const daysCount = viewMode === 'monthly' ? 30 : 7;

    for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        
        if (viewMode === 'monthly') {
            labels.push(d.getDate());
        } else {
            labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
        }

        let c = 0;
        let m = 0;
        appData.habits.forEach(h => {
            if ((h.logs || {})[dStr]?.status === 'completed') c++;
            if ((h.logs || {})[dStr]?.status === 'missed') m++;
        });
        dataCompleted.push(c);
        dataMissed.push(m);
    }

    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Completed',
                    data: dataCompleted,
                    backgroundColor: '#4CAF50',
                    borderRadius: 4
                },
                {
                    label: 'Missed',
                    data: dataMissed,
                    backgroundColor: '#ff5252',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });

    // Pie Chart
    let totalC = 0, totalM = 0;
    appData.habits.forEach(h => {
        Object.values(h.logs || {}).forEach(l => {
            if (l.status === 'completed') totalC++;
            if (l.status === 'missed') totalM++;
        });
    });

    if (pieChartInstance) pieChartInstance.destroy();
    pieChartInstance = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Missed'],
            datasets: [{
                data: [totalC, totalM],
                backgroundColor: ['#4CAF50', '#ff5252'],
                borderWidth: 0
            }]
        },
        options: {
            cutout: '70%',
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

function renderCalendar() {
    const calendarEl = document.getElementById('calendarView');
    if (!calendarEl) return;
    calendarEl.innerHTML = '';
    
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); 
    
    // Update Header with Month/Year
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const headerEl = calendarEl.parentElement.querySelector('h3');
    if (headerEl) headerEl.innerText = `Calendar - ${monthNames[month]} ${year}`;

    // Add Day Headers (Sun, Mon, Tue...)
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    days.forEach(d => {
        const h = document.createElement('div');
        h.className = 'calendar-day header';
        h.innerText = d;
        h.style.fontWeight = 'bold';
        h.style.background = 'transparent';
        h.style.color = 'var(--text-secondary)';
        calendarEl.appendChild(h);
    });

    // Days in current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // First day of the month (0 = Sunday)
    const firstDayIndex = new Date(year, month, 1).getDay();
    
    // Add empty placeholders
    for (let i = 0; i < firstDayIndex; i++) {
        const emptyEl = document.createElement('div');
        emptyEl.className = 'calendar-day empty';
        calendarEl.appendChild(emptyEl);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        // Construct date string matching the storage format (YYYY-MM-DD)
        // Using UTC to ensure strict YYYY-MM-DD generation regardless of local time
        const d = new Date(Date.UTC(year, month, day));
        const dStr = d.toISOString().split('T')[0];
        
        let statusClass = '';
        let c = 0, total = appData.habits.length;
        
        if (total > 0) {
            appData.habits.forEach(h => {
                if ((h.logs || {})[dStr]?.status === 'completed') c++;
            });
            if (c === total && total > 0) statusClass = 'active'; 
            else if (c > 0) statusClass = 'partial'; 
        }

        const dayEl = document.createElement('div');
        dayEl.className = `calendar-day ${statusClass}`;
        dayEl.innerText = day;
        
        // Highlight today
        if (day === now.getDate() && month === now.getMonth() && year === now.getFullYear()) {
             dayEl.style.border = "2px solid var(--text-primary)";
             dayEl.style.fontWeight = "bold";
        }
        
        // Partial indicator
        if (statusClass === 'partial') {
             dayEl.style.border = "1px solid var(--primary-color)";
             dayEl.style.color = "var(--primary-color)";
             dayEl.style.background = "transparent";
        }

        calendarEl.appendChild(dayEl);
    }
}

function renderBadges() {
    const grid = document.getElementById('badgesGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const badges = [
        { id: 'first_step', icon: '🦶', title: 'First Step', desc: 'Complete 1 habit', condition: (d) => d.user.totalPoints > 0 },
        { id: 'streak_7', icon: '🔥', title: 'On Fire', desc: '7 Day Streak', condition: (d) => d.habits.some(h => calculateStreak(h).currentStreak >= 7) },
        { id: 'level_5', icon: '👑', title: 'Pro', desc: 'Reach Level 5', condition: (d) => d.user.level >= 5 },
        { id: 'perfect_day', icon: '🌟', title: 'Perfectionist', desc: 'Complete all habits in a day', condition: (d) => false } // dynamic check hard to store without history
    ];

    badges.forEach(b => {
        const unlocked = b.condition(appData);
        const el = document.createElement('div');
        el.className = `badge ${unlocked ? 'unlocked' : ''}`;
        el.innerText = b.icon;
        el.title = `${b.title}: ${b.desc}`;
        grid.appendChild(el);
    });
}

/* =====================
   EVENT LISTENERS & MODALS
===================== */
function setupEventListeners() {
    // Filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderHabits();
        });
    });

    // Chart Toggles
    document.querySelectorAll('.chart-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.chart-toggle').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderCharts(e.target.dataset.view);
        });
    });

    // Theme
    if (themeToggle && themeToggle.dataset.bound !== '1') {
        themeToggle.dataset.bound = '1';
        themeToggle.addEventListener('click', () => {
            const newTheme = appData.settings.theme === 'dark' ? 'light' : 'dark';
            applyTheme(newTheme);
            saveData();
        });
    }

    setupFitnessToolsEventListeners();
}

// Modal Logic
function openAddHabitModal() {
    document.getElementById('habitModalTitle').innerText = "Add New Habit";
    document.getElementById('habitNameInput').value = "";
    document.getElementById('habitModal').classList.add('open');
}

function closeHabitModal() {
    document.getElementById('habitModal').classList.remove('open');
}

function saveHabit() {
    const name = document.getElementById('habitNameInput').value;
    const cat = document.getElementById('habitCategoryInput').value;
    if (name.trim()) {
        addHabit(name, cat);
        closeHabitModal();
    }
}

function openNoteModal(habitId, dateStr, status) {
    document.getElementById('noteHabitId').value = habitId;
    document.getElementById('noteDate').value = dateStr;
    document.getElementById('noteStatus').value = status;
    document.getElementById('noteInput').value = "";
    document.getElementById('noteModal').classList.add('open');
}

function closeNoteModal() {
    document.getElementById('noteModal').classList.remove('open');
}

function saveNote() {
    const id = document.getElementById('noteHabitId').value;
    const date = document.getElementById('noteDate').value;
    const status = document.getElementById('noteStatus').value;
    const note = document.getElementById('noteInput').value;
    
    toggleHabitStatus(id, date, status);
    saveHabitNote(id, date, note);
    closeNoteModal();
}

// Profile & Auth Modals
function openProfileModal() {
    const profileContent = document.getElementById('profileContent');
    
    if (currentUser) {
        // User is Logged In
        profileContent.innerHTML = `
            <div class="profile-summary">
                <div class="avatar large"><i class="fas fa-user"></i></div>
                <h2>${appData.user.username}</h2>
                <p>Member since ${new Date(appData.user.joinedDate).toLocaleDateString()}</p>
            </div>
            <div class="profile-stats">
                <div class="p-stat">
                    <strong>${appData.habits.length}</strong>
                    <span>Habits</span>
                </div>
                <div class="p-stat">
                    <strong>${Math.floor(appData.user.totalPoints / 10)}</strong>
                    <span>Completions</span>
                </div>
            </div>
            <hr>
            <div class="form-group">
                <button class="btn-secondary full-width" onclick="exportData()">
                    <i class="fas fa-file-export"></i> Export Data (JSON)
                </button>
            </div>
            <div class="form-group">
                <button class="btn-danger full-width" onclick="handleLogout()">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </button>
            </div>
        `;
    } else {
        // Guest - Show Login/Register Options
        profileContent.innerHTML = `
            <div style="text-align: center; padding: 1rem;">
                <div class="avatar large" style="background: var(--text-secondary)"><i class="fas fa-user-secret"></i></div>
                <h2>Guest</h2>
                <p>You are using a temporary guest account. <br>Login or Register to save your progress permanently.</p>
            </div>
            <div class="auth-options">
                <button class="btn-primary full-width" onclick="openLoginModal()">Login</button>
                <button class="btn-secondary full-width" onclick="openRegisterModal()">Create Account</button>
            </div>
            <hr>
             <div class="form-group">
                <button class="btn-danger full-width" onclick="resetAllData()">
                    <i class="fas fa-trash"></i> Reset Guest Data
                </button>
            </div>
        `;
    }

    document.getElementById('profileModal').classList.add('open');
}

function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('open');
}

function openLoginModal() {
    closeProfileModal();
    document.getElementById('loginModal').classList.add('open');
}

function closeLoginModal() {
    document.getElementById('loginModal').classList.remove('open');
}

function openRegisterModal() {
    closeProfileModal();
    document.getElementById('registerModal').classList.add('open');
}

function closeRegisterModal() {
    document.getElementById('registerModal').classList.remove('open');
}

function resetAllData() {
    if (confirm("Are you sure you want to delete all data? This cannot be undone.")) {
        appData = JSON.parse(JSON.stringify(defaultState));
        saveData();
        location.reload();
    }
}

function exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "habitify_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

// Global scope for HTML onclick access
window.openAddHabitModal = openAddHabitModal;
window.closeHabitModal = closeHabitModal;
window.saveHabit = saveHabit;
window.deleteHabit = deleteHabit;
window.handleHabitClick = handleHabitClick;
window.openNoteModal = openNoteModal;
window.closeNoteModal = closeNoteModal;
window.saveNote = saveNote;
window.openProfileModal = openProfileModal;
window.closeProfileModal = closeProfileModal;
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.openRegisterModal = openRegisterModal;
window.closeRegisterModal = closeRegisterModal;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleLogout = handleLogout;
window.resetAllData = resetAllData;
window.exportData = exportData;

window.switchTab = switchTab;
window.handleFitnessSetup = handleFitnessSetup;
window.toggleEquipmentOptions = toggleEquipmentOptions;
window.completeWorkout = completeWorkout;
window.resetFitnessPlan = resetFitnessPlan;
