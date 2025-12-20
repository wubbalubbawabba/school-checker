import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { fetchSchools, checkSchoolStatus } from './utils/api';
import LoadingAnimation from './components/LoadingAnimation';
import SchoolResult from './components/SchoolResult';
import TimeTravelerMessage from './components/TimeTravelerMessage';
import DateInput from './components/DateInput';
import { MapPin } from 'lucide-react';

function App() {
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  // Single source of truth: initialize to empty string on page reload
  const [dateStr, setDateStr] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSchools, setIsLoadingSchools] = useState(true);
  const [result, setResult] = useState(null);

  // Fetch schools on component mount
  useEffect(() => {
    const loadSchools = async () => {
      try {
        setIsLoadingSchools(true);
        const schoolsData = await fetchSchools();
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

  const handleCheck = useCallback(async () => {
    if (!selectedSchoolId || !dateStr || dateStr.trim() === '') {
      setResult(null);
      return;
    }

    // Validate date format before proceeding
    const dateObj = new Date(dateStr + 'T00:00:00');
    if (isNaN(dateObj.getTime())) {
      // Invalid date, don't proceed
      setResult(null);
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const status = await checkSchoolStatus(selectedSchoolId, dateObj);
      setResult(status);
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
    } finally {
      setIsLoading(false);
    }
  }, [selectedSchoolId, dateStr]);

  // Auto-check when school or date changes (only if date is valid)
  useEffect(() => {
    if (selectedSchoolId && dateStr && dateStr.trim() !== '') {
      const dateObj = new Date(dateStr + 'T00:00:00');
      if (!isNaN(dateObj.getTime())) {
        handleCheck();
      } else {
        setResult(null);
      }
    } else {
      setResult(null);
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
                <SchoolResult key="result" result={result} />
              )
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default App;
