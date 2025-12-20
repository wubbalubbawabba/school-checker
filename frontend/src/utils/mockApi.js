/**
 * Mock API function to simulate checking if a school is open
 * @param {string} schoolName - Name of the school
 * @param {Date} date - Date to check
 * @returns {Promise<{isOpen: boolean, reason: string, timeTraveler?: boolean}>}
 */
export const checkSchoolStatus = async (schoolName, date) => {
  // Simulate API delay (1.5 seconds)
  await new Promise(resolve => setTimeout(resolve, 1500));

  const year = date.getFullYear();
  
  // Check if date is beyond 2026
  if (year > 2026) {
    return {
      timeTraveler: true,
      schoolName,
      date: date.toLocaleDateString('en-AU', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
    };
  }

  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  const day = date.getDate();
  const month = date.getMonth() + 1; // 0-indexed, so add 1

  // Mock logic: Weekends are always closed
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      isOpen: false,
      reason: dayOfWeek === 0 ? 'Sunday' : 'Saturday',
      schoolName,
      date: date.toLocaleDateString('en-AU', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
    };
  }

  // Mock some public holidays (QLD specific examples)
  // New Year's Day
  if (month === 1 && day === 1) {
    return {
      isOpen: false,
      reason: 'QLD Public Holiday (New Year\'s Day)',
      schoolName,
      date: date.toLocaleDateString('en-AU', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
    };
  }

  // Australia Day (26th January)
  if (month === 1 && day === 26) {
    return {
      isOpen: false,
      reason: 'QLD Public Holiday (Australia Day)',
      schoolName,
      date: date.toLocaleDateString('en-AU', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
    };
  }

  // Anzac Day (25th April)
  if (month === 4 && day === 25) {
    return {
      isOpen: false,
      reason: 'QLD Public Holiday (Anzac Day)',
      schoolName,
      date: date.toLocaleDateString('en-AU', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
    };
  }

  // Queen's Birthday (second Monday in June - simplified mock)
  if (month === 6 && dayOfWeek === 1 && day >= 8 && day <= 14) {
    return {
      isOpen: false,
      reason: 'QLD Public Holiday (Queen\'s Birthday)',
      schoolName,
      date: date.toLocaleDateString('en-AU', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
    };
  }

  // Christmas Day
  if (month === 12 && day === 25) {
    return {
      isOpen: false,
      reason: 'QLD Public Holiday (Christmas Day)',
      schoolName,
      date: date.toLocaleDateString('en-AU', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
    };
  }

  // Boxing Day
  if (month === 12 && day === 26) {
    return {
      isOpen: false,
      reason: 'QLD Public Holiday (Boxing Day)',
      schoolName,
      date: date.toLocaleDateString('en-AU', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
    };
  }

  // Default: School is open on weekdays
  return {
    isOpen: true,
    reason: 'Regular school day',
    schoolName,
    date: date.toLocaleDateString('en-AU', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
  };
};

