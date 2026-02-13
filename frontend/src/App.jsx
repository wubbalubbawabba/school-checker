import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { getSchools, getSchoolStatus } from './utils/schoolLogic';
import LoadingAnimation from './components/LoadingAnimation';
import SchoolResult from './components/SchoolResult';
import TimeTravelerMessage from './components/TimeTravelerMessage';
import DateInput from './components/DateInput';
import { MapPin, Github } from 'lucide-react';

function App() {
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  // Single source of truth: initialize to empty string on page reload
  const [dateStr, setDateStr] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSchools, setIsLoadingSchools] = useState(true);
  const [result, setResult] = useState(null);
  const [emergencyClosure, setEmergencyClosure] = useState(null);
  const [isCheckingEmergency, setIsCheckingEmergency] = useState(false);

  // Load schools locally (instant - no API call)
  useEffect(() => {
    const loadSchools = () => {
      try {
        const schoolsData = getSchools();
        setSchools(schoolsData);
        // Set first school as default if available
        if (schoolsData.length > 0) {
          setSelectedSchoolId(schoolsData[0].id);
        }
      } catch (error) {
        console.error('Failed to load schools:', error);
      } finally {
        setIsLoadingSchools(false);
      }
    };

    loadSchools();
  }, []);

  // Check for emergency closures (silent background check)
  const checkEmergencyClosure = useCallback(async (schoolName, date) => {
    if (!schoolName) return;
    
    setIsCheckingEmergency(true);
    try {
      // Check if we have cached result (10-minute cache)
      const cacheKey = `emergency-${schoolName}-${date}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        
        // Cache is valid for 10 minutes
        if (age < 10 * 60 * 1000) {
          if (data.isClosed) {
            setEmergencyClosure(data);
          }
          setIsCheckingEmergency(false);
          return;
        }
      }
      
      // Determine API base URL
      const API_BASE_URL = import.meta.env.PROD
        ? 'https://school-checker-epmh.onrender.com'
        : 'http://localhost:3000';
      
      // Call backend API to check closures.qld.edu.au
      const response = await fetch(`${API_BASE_URL}/api/emergency?schoolName=${encodeURIComponent(schoolName)}&date=${date}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Cache the result
        localStorage.setItem(cacheKey, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
        
        if (data.isClosed) {
          setEmergencyClosure(data);
        } else {
          setEmergencyClosure(null);
        }
      }
    } catch (error) {
      console.error('Failed to check emergency closure:', error);
      // Don't show error to user, just skip the check
    } finally {
      setIsCheckingEmergency(false);
    }
  }, []);

  const handleCheck = useCallback(async () => {
    if (!selectedSchoolId || !dateStr || dateStr.trim() === '') {
      setResult(null);
      setEmergencyClosure(null);
      return;
    }

    // Validate date format before proceeding
    const dateObj = new Date(dateStr + 'T00:00:00');
    if (isNaN(dateObj.getTime())) {
      // Invalid date, don't proceed
      setResult(null);
      setEmergencyClosure(null);
      return;
    }

    setIsLoading(true);
    setResult(null);
    setEmergencyClosure(null);

    try {
      // LOCAL calculation - instant result
      const status = getSchoolStatus(selectedSchoolId, dateStr);
      
      // Get school name for display and emergency check
      const school = schools.find(s => s.id === selectedSchoolId);
      const schoolName = school ? school.name : '';
      
      // Format date for display
      const formattedDate = dateObj.toLocaleDateString('en-AU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const result = {
        ...status,
        schoolName,
        date: formattedDate
      };
      
      setResult(result);
      setIsLoading(false);
      
      // Check emergency closure in background (non-blocking)
      checkEmergencyClosure(schoolName, dateStr);
      
    } catch (error) {
      console.error('Error checking school status:', error);
      setResult({
        isOpen: false,
        reason: 'Error: Failed to check school status',
        schoolName: '',
        date: dateObj.toLocaleDateString('en-AU', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      });
      setIsLoading(false);
    }
  }, [selectedSchoolId, dateStr, schools, checkEmergencyClosure]);

  // Auto-check when school or date changes (only if date is valid)
  useEffect(() => {
    if (selectedSchoolId && dateStr && dateStr.trim() !== '') {
      const dateObj = new Date(dateStr + 'T00:00:00');
      if (!isNaN(dateObj.getTime())) {
        handleCheck();
      } else {
        setResult(null);
        setEmergencyClosure(null);
      }
    } else {
      setResult(null);
      setEmergencyClosure(null);
    }
  }, [selectedSchoolId, dateStr, handleCheck]);


  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-800 mb-3">
            Is School On?
          </h1>
          <div className="flex items-center justify-center gap-2 text-ocean">
            <MapPin size={20} />
            <p className="text-lg text-gray-600">
              The Gap, Queensland, Australia
            </p>
          </div>
        </div>

        {/* Input Section */}
        <div className="relative z-50 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8 border border-gray-200/50">
          <div className="space-y-4">
            {/* School Selector */}
            <div>
              <label
                htmlFor="school-select"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Select School
              </label>
              {isLoadingSchools ? (
                <div className="w-full px-4 py-3 rounded-xl border-2 border-ocean/30 bg-gray-100 text-gray-500 text-lg">
                  Loading schools...
                </div>
              ) : (
                <select
                  id="school-select"
                  value={selectedSchoolId}
                  onChange={(e) => setSelectedSchoolId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-ocean/30 focus:border-ocean focus:outline-none focus:ring-2 focus:ring-ocean/20 bg-white text-gray-800 font-medium text-lg transition-all"
                >
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Date Input with Hybrid Support */}
            <DateInput
              id="date-picker"
              label="Select Date"
              value={dateStr}
              onChange={setDateStr}
            />
          </div>
        </div>

        {/* Results Area */}
        <div className="relative z-0 min-h-[400px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <LoadingAnimation key="loading" />
            ) : result ? (
              result.timeTraveler ? (
                <TimeTravelerMessage
                  key="time-traveler"
                  schoolName={result.schoolName}
                  date={result.date}
                />
              ) : (
                <SchoolResult 
                  key="result" 
                  result={result} 
                  selectedDate={dateStr}
                  emergencyClosure={emergencyClosure}
                  isCheckingEmergency={isCheckingEmergency}
                />
              )
            ) : null}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center">
          <p className="text-sm text-slate-400">
            Built with ❤️ by Fan. Have feedback?{' '}
            <span className="inline-flex items-center gap-2">
              <a
                href="mailto:laurel.fan12@gmail.com"
                className="text-slate-500 hover:text-slate-700 hover:underline transition-colors"
              >
                Email me
              </a>
              <span className="text-slate-300">|</span>
              <a
                href="https://github.com/wubbalubbawabba/school-checker"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="GitHub Repository"
              >
                <Github className="w-5 h-5" />
              </a>
            </span>
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
