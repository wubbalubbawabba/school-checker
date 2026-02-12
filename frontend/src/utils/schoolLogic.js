/**
 * Local school status calculation - runs entirely in the browser
 * No API calls needed for basic school status
 */

import schools from '../data/schools.json';
import holidays from '../data/holidays.json';
import termDates from '../data/termDates.json';

/**
 * Get all schools (sync, instant)
 */
export const getSchools = () => {
  return schools;
};

/**
 * Get school by ID
 */
export const getSchoolById = (id) => {
  return schools.find(s => s.id === id);
};

/**
 * Check if a date is a school day (sync, instant)
 * Priority order:
 * 1. School Events (e.g., student free days) - Note: Need school-specific events
 * 2. Public Holidays
 * 3. Weekends (Saturday/Sunday)
 * 4. Term Dates (within term = open, outside = holidays)
 * 
 * @param {string} schoolId - School ID
 * @param {string|Date} date - Date (YYYY-MM-DD string or Date object)
 * @returns {Object} - { isOpen: boolean, reason: string, term?: number }
 */
export const checkSchoolStatusLocal = (schoolId, date) => {
  // Normalize date to YYYY-MM-DD string
  let dateStr;
  if (typeof date === 'string') {
    dateStr = date;
  } else if (date instanceof Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    dateStr = `${year}-${month}-${day}`;
  } else {
    throw new Error('Invalid date format');
  }

  // Get school info
  const school = getSchoolById(schoolId);
  if (!school) {
    return {
      isOpen: false,
      reason: 'School not found'
    };
  }

  const schoolState = school.state;
  const termRuleId = school.termRuleId;

  // Check if year is beyond 2026
  const dateObj = new Date(dateStr + 'T00:00:00');
  if (dateObj.getFullYear() > 2026) {
    return {
      timeTraveler: true,
      isOpen: false,
      reason: 'Date beyond 2026'
    };
  }

  // STEP 1: Check school events (student free days, etc.)
  // Note: We'll add school-specific events here if needed
  // For now, hardcode the 9/4 student free day for all schools
  if (dateStr === '2026-09-04') {
    return {
      isOpen: false,
      reason: 'Student Free Day - Staff PD Day'
    };
  }

  // STEP 2: Check public holidays
  const holiday = holidays.find(
    h => h.holiday_date === dateStr && h.state === schoolState
  );
  if (holiday) {
    return {
      isOpen: false,
      reason: holiday.name
    };
  }

  // STEP 3: Check weekends
  const dayOfWeek = dateObj.getDay(); // 0=Sunday, 6=Saturday
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      isOpen: false,
      reason: dayOfWeek === 0 ? 'Sunday' : 'Saturday'
    };
  }

  // STEP 4: Check term dates
  const termRule = termDates[termRuleId];
  if (termRule && termRule.terms) {
    for (const term of termRule.terms) {
      if (dateStr >= term.start_date && dateStr <= term.end_date) {
        return {
          isOpen: true,
          reason: `Term ${term.term}`,
          term: term.term
        };
      }
    }
  }

  // STEP 5: Fallback - Outside all terms = School Holidays
  return {
    isOpen: false,
    reason: 'School Holidays'
  };
};

/**
 * Find the next date when the school status changes
 * @param {string} schoolId - School ID
 * @param {string} startDate - Starting date (YYYY-MM-DD)
 * @param {boolean} currentOpen - Current open status
 * @returns {Object} - { date: string, label: string, reason: string }
 */
export const findNextChangeDate = (schoolId, startDate, currentOpen) => {
  const maxDays = 60;
  const targetOpen = !currentOpen;
  
  let date = new Date(startDate + 'T00:00:00');
  
  for (let i = 1; i <= maxDays; i++) {
    date.setDate(date.getDate() + 1);
    const dateStr = date.toISOString().split('T')[0];
    
    const status = checkSchoolStatusLocal(schoolId, dateStr);
    
    if (status.timeTraveler) {
      // Can't go beyond 2026
      break;
    }
    
    if (status.isOpen === targetOpen) {
      return {
        date: dateStr,
        label: currentOpen ? 'Holidays start in...' : 'School starts in...',
        reason: status.reason,
        term: status.term
      };
    }
  }
  
  return {
    date: null,
    label: null,
    reason: null
  };
};

/**
 * Complete school status check with next change date
 */
export const getSchoolStatus = (schoolId, date) => {
  const status = checkSchoolStatusLocal(schoolId, date);
  
  if (status.timeTraveler) {
    return status;
  }
  
  const nextChange = findNextChangeDate(schoolId, date, status.isOpen);
  
  return {
    ...status,
    nextChangeDate: nextChange.date,
    countdownLabel: nextChange.label,
    nextChangeReason: nextChange.reason
  };
};

/**
 * Find nearest school to a location (lat, lng)
 * Note: This is a simplified version - in production you'd use proper geocoding
 * Currently returns The Gap schools since they're all in the same area
 */
export const findNearestSchool = (lat, lng) => {
  // The Gap, QLD coordinates: -27.4159, 152.9912
  const theGapLat = -27.4159;
  const theGapLng = 152.9912;
  
  // Calculate distance from user to The Gap
  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  
  const distance = Math.sqrt(
    Math.pow(userLat - theGapLat, 2) + Math.pow(userLng - theGapLng, 2)
  );
  
  // If within 0.5 degrees (~55km), return the first school
  if (distance < 0.5) {
    return schools[0];
  }
  
  // Otherwise return first school anyway
  return schools[0];
};
