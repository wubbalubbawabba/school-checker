/**
 * Real API functions to connect to the backend
 */

const API_BASE_URL = 'https://school-checker-epmh.onrender.com/api';

/**
 * Fetch all schools from the backend
 * @returns {Promise<Array<{id: string, name: string, school_type: string, suburb: string, postcode: string, state: string}>>}
 */
export const fetchSchools = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/schools`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const schools = await response.json();
    return schools;
  } catch (error) {
    console.error('Error fetching schools:', error);
    throw error;
  }
};

/**
 * Check if a school is open on a specific date
 * @param {string} schoolId - School UUID
 * @param {Date} date - Date to check
 * @returns {Promise<{isOpen: boolean, reason: string, schoolName: string, date: string, timeTraveler?: boolean}>}
 */
export const checkSchoolStatus = async (schoolId, date) => {
  // Check if date is beyond 2026
  const year = date.getFullYear();
  if (year > 2026) {
    return {
      timeTraveler: true,
      schoolName: '',
      date: date.toLocaleDateString('en-AU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
    };
  }

  // Format date as YYYY-MM-DD using local time (avoid timezone issues)
  const yearStr = date.getFullYear();
  const monthStr = String(date.getMonth() + 1).padStart(2, '0');
  const dayStr = String(date.getDate()).padStart(2, '0');
  const dateStr = `${yearStr}-${monthStr}-${dayStr}`;

  try {
    const response = await fetch(`${API_BASE_URL}/check?schoolId=${encodeURIComponent(schoolId)}&date=${dateStr}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Map backend response format to UI format
    // Backend: { status: "Open" | "Closed", reason: string, schoolName: string, date: string }
    // UI expects: { isOpen: boolean, reason: string, schoolName: string, date: string }

    const isOpen = data.status === 'Open';

    // Format date for display
    const formattedDate = data.date
      ? new Date(data.date + 'T00:00:00').toLocaleDateString('en-AU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      : date.toLocaleDateString('en-AU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

    return {
      isOpen,
      reason: data.reason || 'Unknown',
      schoolName: data.schoolName || '',
      date: formattedDate,
    };
  } catch (error) {
    console.error('Error checking school status:', error);
    throw error;
  }
};

