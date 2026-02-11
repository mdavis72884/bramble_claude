// Day-time pair for scheduling (each day can have its own time)
export interface DayTimePair {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string;
  endTime: string;
}

// Simplified scheduler config - one main schedule per offering
export interface SchedulerConfig {
  startDate: string;
  endDate: string;
  dayTimes: DayTimePair[];
  location: string;
  locationDetails: string;
}

// Individual class preview/data
export interface ClassPreview {
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  locationDetails: string;
  dayOfWeek: number;
}

export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  startDate: "",
  endDate: "",
  dayTimes: [{ dayOfWeek: 1, startTime: "10:00", endTime: "11:30" }], // Default: Monday
  location: "",
  locationDetails: "",
};

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Extract schedule pattern from existing classes (for display and edit pre-population)
export interface ExtractedSchedule {
  startDate: string;
  endDate: string;
  dayTimes: DayTimePair[];
  location: string;
  locationDetails: string;
  hasSchedule: boolean;
}

export function extractScheduleFromClasses(classes: Array<{
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  locationDetails?: string;
  isOneOff?: boolean;
}>): ExtractedSchedule {
  // Filter to only pattern-based classes (not one-off)
  const patternClasses = classes.filter(c => !c.isOneOff);
  
  if (patternClasses.length === 0) {
    return {
      startDate: "",
      endDate: "",
      dayTimes: [],
      location: "",
      locationDetails: "",
      hasSchedule: false,
    };
  }
  
  // Sort by date
  const sorted = [...patternClasses].sort((a, b) => a.date.localeCompare(b.date));
  // Normalize dates to YYYY-MM-DD format (handles ISO datetime strings)
  const normalizeDate = (d: string) => d.split('T')[0];
  const startDate = normalizeDate(sorted[0].date);
  const endDate = normalizeDate(sorted[sorted.length - 1].date);
  
  // Extract day/time patterns - group by day of week
  const dayTimeMap = new Map<number, { startTime: string; endTime: string }>();
  sorted.forEach(cls => {
    const d = new Date(cls.date);
    const dayOfWeek = d.getDay();
    // Take the first time we see for each day (they should be consistent)
    if (!dayTimeMap.has(dayOfWeek)) {
      dayTimeMap.set(dayOfWeek, { startTime: cls.startTime, endTime: cls.endTime });
    }
  });
  
  const dayTimes: DayTimePair[] = [];
  dayTimeMap.forEach((times, dayOfWeek) => {
    dayTimes.push({ dayOfWeek, ...times });
  });
  // Sort by day of week (Monday first)
  dayTimes.sort((a, b) => {
    const order = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun
    return order.indexOf(a.dayOfWeek) - order.indexOf(b.dayOfWeek);
  });
  
  // Get location from first class
  const location = sorted[0].location || "";
  const locationDetails = sorted[0].locationDetails || "";
  
  return {
    startDate,
    endDate,
    dayTimes,
    location,
    locationDetails,
    hasSchedule: true,
  };
}

// Format schedule for display
export function formatScheduleSummary(schedule: ExtractedSchedule): string {
  if (!schedule.hasSchedule || schedule.dayTimes.length === 0) {
    return "No recurring schedule set";
  }
  
  const days = schedule.dayTimes.map(dt => DAY_NAMES[dt.dayOfWeek]).join(" & ");
  
  // Check if all times are the same
  const firstTime = schedule.dayTimes[0];
  const allSameTime = schedule.dayTimes.every(
    dt => dt.startTime === firstTime.startTime && dt.endTime === firstTime.endTime
  );
  
  if (allSameTime) {
    return `${days}, ${formatTime12h(firstTime.startTime)} - ${formatTime12h(firstTime.endTime)}`;
  } else {
    // Different times for different days
    const parts = schedule.dayTimes.map(dt => 
      `${DAY_NAMES[dt.dayOfWeek]} ${formatTime12h(dt.startTime)}-${formatTime12h(dt.endTime)}`
    );
    return parts.join(", ");
  }
}

// Format date range for display
export function formatDateRange(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return "";
  const start = new Date(startDate);
  const end = new Date(endDate);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} - ${end.toLocaleDateString("en-US", opts)}`;
}

// Format time to 12h format
function formatTime12h(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const hour = h % 12 || 12;
  return m === 0 ? `${hour}${ampm}` : `${hour}:${m.toString().padStart(2, "0")}${ampm}`;
}

// Generate class dates from schedule config
export function generateClassesFromConfig(config: SchedulerConfig): ClassPreview[] {
  const { startDate, endDate, dayTimes, location, locationDetails } = config;
  if (!startDate || !endDate || dayTimes.length === 0) return [];

  // Create a map of dayOfWeek -> time info
  const dayTimeMap = new Map<number, { startTime: string; endTime: string }>();
  dayTimes.forEach(dt => {
    dayTimeMap.set(dt.dayOfWeek, { startTime: dt.startTime, endTime: dt.endTime });
  });

  const classes: ClassPreview[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const activeDays = dayTimes.map(dt => dt.dayOfWeek);

  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (activeDays.includes(dayOfWeek)) {
      const timeInfo = dayTimeMap.get(dayOfWeek)!;
      classes.push({
        date: current.toISOString().split('T')[0],
        startTime: timeInfo.startTime,
        endTime: timeInfo.endTime,
        location,
        locationDetails,
        dayOfWeek,
      });
    }
    current.setDate(current.getDate() + 1);
  }
  return classes;
}

// Legacy support - convert old format to new
export interface LegacySchedulerConfig {
  startDate: string;
  endDate: string;
  frequency: "daily" | "weekly" | "custom";
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  location: string;
  locationDetails: string;
}

export interface SessionPreview {
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  locationDetails: string;
}

export function generateSessionsFromConfig(config: LegacySchedulerConfig): SessionPreview[] {
  const { startDate, endDate, frequency, daysOfWeek, startTime, endTime, location, locationDetails } = config;
  if (!startDate || !endDate) return [];

  const sessions: SessionPreview[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const activeDays = frequency === "daily" ? [0, 1, 2, 3, 4, 5, 6] : daysOfWeek;

  const current = new Date(start);
  while (current <= end) {
    if (activeDays.includes(current.getDay())) {
      sessions.push({
        date: current.toISOString().split('T')[0],
        startTime,
        endTime,
        location,
        locationDetails,
      });
    }
    current.setDate(current.getDate() + 1);
  }
  return sessions;
}
