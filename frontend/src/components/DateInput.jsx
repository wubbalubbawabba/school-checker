import { useState, useEffect, useRef } from 'react';
import DatePicker from 'react-datepicker';
import { Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DateInput = ({ value, onChange, id, label }) => {
    const [displayValue, setDisplayValue] = useState('');
    const [error, setError] = useState('');
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const inputRef = useRef(null);
    const datePickerRef = useRef(null);

    // Strict 2026 constraints - set to midnight local time to ensure inclusive range
    const minDate = new Date(2026, 0, 1); // January 1, 2026 at midnight local time
    minDate.setHours(0, 0, 0, 0);
    const maxDate = new Date(2026, 11, 31); // December 31, 2026 at midnight local time
    maxDate.setHours(0, 0, 0, 0);
    const defaultViewDate = new Date(2026, 0, 1); // January 1, 2026
    defaultViewDate.setHours(0, 0, 0, 0);

    // Sync displayValue with parent value prop (two-way sync)
    useEffect(() => {
        // Always sync with parent value - this handles calendar -> input updates
        if (value) {
            setDisplayValue(value);
        } else {
            setDisplayValue('');
        }
    }, [value]);

    // Format function: strips non-digits, then reconstructs with dashes
    const formatDateString = (input) => {
        // Step 1: Strip ALL non-digit characters
        const digitsOnly = input.replace(/[^0-9]/g, '');

        // Step 2: Limit to 8 digits (YYYYMMDD)
        const limited = digitsOnly.slice(0, 8);

        // Step 3: Reconstruct step-by-step
        if (limited.length === 0) {
            return '';
        } else if (limited.length <= 4) {
            // Just the year: "2025"
            return limited;
        } else if (limited.length <= 6) {
            // Year and month: "2025-01"
            return `${limited.slice(0, 4)}-${limited.slice(4)}`;
        } else {
            // Full date: "2025-01-15"
            return `${limited.slice(0, 4)}-${limited.slice(4, 6)}-${limited.slice(6, 8)}`;
        }
    };

    // Validate date
    const validateDate = (dateStr) => {
        // Check if format is correct (YYYY-MM-DD)
        if (!dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return { valid: false, message: 'Invalid Date' };
        }

        const [year, month, day] = dateStr.split('-').map(Number);

        // Check if year is 2026
        if (year !== 2026) {
            return { valid: false, message: 'Only year 2026 is allowed' };
        }

        // Check month range
        if (month < 1 || month > 12) {
            return { valid: false, message: 'Invalid Date' };
        }

        // Check if date is valid
        const date = new Date(year, month - 1, day);
        if (
            date.getFullYear() !== year ||
            date.getMonth() !== month - 1 ||
            date.getDate() !== day
        ) {
            return { valid: false, message: 'Invalid Date' };
        }

        // Check if date is in valid range (Jan 1, 2026 to Dec 31, 2026) - inclusive
        // Create date at midnight local time for accurate comparison
        const dateAtMidnight = new Date(year, month - 1, day);
        dateAtMidnight.setHours(0, 0, 0, 0);
        
        // Compare timestamps for inclusive range (2026-01-01 and 2026-12-31 are valid)
        const dateTime = dateAtMidnight.getTime();
        const minDateTime = minDate.getTime();
        const maxDateTime = maxDate.getTime();
        
        if (dateTime < minDateTime) {
            return { valid: false, message: 'Date cannot be before January 1, 2026' };
        }

        if (dateTime > maxDateTime) {
            return { valid: false, message: 'Date cannot be after December 31, 2026' };
        }

        return { valid: true, date: dateStr };
    };

    // Handle input change - only formatting, no validation
    const handleInputChange = (e) => {
        const inputValue = e.target.value;

        // Format the input using our formatter function
        const formatted = formatDateString(inputValue);

        // Update display value
        setDisplayValue(formatted);

        // Calculate cursor position
        const cursorPos = e.target.selectionStart;
        const beforeCursor = inputValue.slice(0, cursorPos);
        const digitsBeforeCursor = (beforeCursor.match(/\d/g) || []).length;

        // Find position in formatted string with same number of digits
        let newCursorPos = 0;
        let digitCount = 0;

        for (let i = 0; i < formatted.length; i++) {
            if (/\d/.test(formatted[i])) {
                digitCount++;
                if (digitCount > digitsBeforeCursor) {
                    newCursorPos = i;
                    break;
                }
            }
            newCursorPos = i + 1;
        }

        // Set cursor position after state update
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 0);

        // Only validate if complete (10 chars) and invalid - don't show errors while typing
        if (formatted.length === 0) {
            onChange('');
        } else if (formatted.length === 10) {
            // Complete format (YYYY-MM-DD) - validate only if invalid
            const validation = validateDate(formatted);
            if (validation.valid) {
                setError('');
                onChange(validation.date);
            } else {
                // Only show error if complete but invalid
                setError(validation.message);
            }
        } else {
            // Incomplete - don't show error, just update value
            // Clear error if user is typing
            if (error) {
                setError('');
            }
        }
    };

    // Handle backspace - allow natural deletion
    const handleKeyDown = (e) => {
        if (e.key === 'Backspace') {
            const cursorPos = e.target.selectionStart;
            const value = displayValue;

            // If cursor is right after a dash, delete the dash and the digit before it
            if (cursorPos > 0 && value[cursorPos - 1] === '-') {
                e.preventDefault();
                const beforeDash = value.slice(0, cursorPos - 2);
                const afterDash = value.slice(cursorPos);
                const combined = beforeDash + afterDash;
                const formatted = formatDateString(combined);
                setDisplayValue(formatted);

                // Set cursor position
                setTimeout(() => {
                    if (inputRef.current) {
                        const digitsBefore = (beforeDash.match(/\d/g) || []).length - 1;
                        let newPos = 0;
                        let digitCount = 0;
                        for (let i = 0; i < formatted.length; i++) {
                            if (/\d/.test(formatted[i])) {
                                digitCount++;
                                if (digitCount > digitsBefore) {
                                    newPos = i;
                                    break;
                                }
                            }
                            newPos = i + 1;
                        }
                        inputRef.current.setSelectionRange(newPos, newPos);
                    }
                }, 0);

                // Don't validate after deletion - let blur handle it
                if (formatted.length === 0) {
                    onChange('');
                } else if (formatted.length === 10) {
                    // Only validate if complete
                    const validation = validateDate(formatted);
                    if (validation.valid) {
                        setError('');
                        onChange(validation.date);
                    } else {
                        setError(validation.message);
                    }
                }
                // Clear error if incomplete
                if (formatted.length < 10 && error) {
                    setError('');
                }
            }
        }
    };

    // Handle focus - clear error when user clicks back into input
    const handleFocus = () => {
        setError('');
    };

    // Handle blur - validate when user clicks outside
    const handleBlur = () => {
        if (displayValue) {
            if (displayValue.length === 10) {
                // Complete format - validate fully
                const validation = validateDate(displayValue);
                if (validation.valid) {
                    setError('');
                    onChange(validation.date);
                } else {
                    setError(validation.message);
                }
            } else if (displayValue.length > 0) {
                // Incomplete - show error only on blur
                setError('Invalid Date');
            } else {
                // Empty - clear error
                setError('');
            }
        } else {
            // Empty - clear error
            setError('');
        }
    };

    // Handle date picker change - Calendar -> Input sync
    // Use local time to avoid timezone issues (toISOString uses UTC which can cause date shift)
    const handleDateChange = (date) => {
        if (date) {
            // Format date as YYYY-MM-DD using local time, not UTC
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            setError('');
            // Update parent state - this will flow back down as value prop
            onChange(dateStr);
            setIsCalendarOpen(false);
        }
    };

    // Trigger calendar picker when icon is clicked
    const handleCalendarClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // When opening calendar, ensure it shows the current input value
        // The DatePicker will use dateForPicker which is derived from value prop
        setIsCalendarOpen(!isCalendarOpen);
    };

    // Parse value prop to Date object for DatePicker - Input -> Calendar sync
    // If value is valid, use it; otherwise default to January 2026
    const selectedDate = value && value.length === 10 ? new Date(value + 'T00:00:00') : null;
    // Validate the parsed date
    const isValidDate = selectedDate && !isNaN(selectedDate.getTime());
    const dateForPicker = isValidDate ? selectedDate : null;
    const startDate = dateForPicker || defaultViewDate;

    // Replace day names with short versions
    useEffect(() => {
        if (isCalendarOpen) {
            const replaceDayNames = () => {
                const dayNames = document.querySelectorAll('.react-datepicker__day-name');
                const shortNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

                dayNames.forEach((dayName, index) => {
                    if (dayName.textContent && dayName.textContent.length > 2) {
                        dayName.textContent = shortNames[index % 7];
                    }
                });
            };

            // Replace immediately and on a slight delay to catch any dynamic updates
            replaceDayNames();
            const interval = setInterval(replaceDayNames, 100);

            return () => clearInterval(interval);
        }
    }, [isCalendarOpen]);

    return (
        <div>
            <label
                htmlFor={id}
                className="block text-sm font-semibold text-gray-700 mb-2"
            >
                {label}
            </label>
            <div className="relative">
                <div className="flex items-center gap-2">
                    <input
                        ref={inputRef}
                        id={id}
                        type="text"
                        value={displayValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        placeholder="YYYY-MM-DD"
                        maxLength={10}
                        className={`
              flex-1 px-4 py-3 rounded-xl border-2 transition-all
              ${error
                                ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                                : 'border-ocean/30 focus:border-ocean focus:ring-2 focus:ring-ocean/20'
                            }
              bg-white text-gray-800 font-medium text-lg
              placeholder:text-gray-400
            `}
                    />
                    <div className="relative">
                        {/* Calendar icon button */}
                        <button
                            type="button"
                            onClick={handleCalendarClick}
                            className="w-12 h-12 flex items-center justify-center bg-ocean/10 hover:bg-ocean/20 rounded-xl border-2 border-ocean/30 transition-colors cursor-pointer z-20 relative"
                            aria-label="Open calendar"
                        >
                            <Calendar size={20} className="text-ocean pointer-events-none" />
                        </button>

                        {/* DatePicker - hidden but controlled */}
                        <div
                            className="absolute top-full right-0 mt-2 z-[100] shadow-xl border border-gray-100 rounded-xl bg-white overflow-hidden"
                            style={{ display: isCalendarOpen ? 'block' : 'none' }}
                        >
                            <DatePicker
                                ref={datePickerRef}
                                selected={dateForPicker}
                                onChange={handleDateChange}
                                minDate={minDate}
                                maxDate={maxDate}
                                startDate={startDate}
                                open={isCalendarOpen}
                                onSelect={(date) => {
                                    // Handle selection - update parent immediately
                                    if (date) {
                                        // Use local time to avoid timezone issues
                                        const year = date.getFullYear();
                                        const month = String(date.getMonth() + 1).padStart(2, '0');
                                        const day = String(date.getDate()).padStart(2, '0');
                                        const dateStr = `${year}-${month}-${day}`;
                                        onChange(dateStr);
                                        setIsCalendarOpen(false);
                                    }
                                }}
                                onClickOutside={() => setIsCalendarOpen(false)}
                                showYearDropdown={false}
                                showMonthDropdown
                                dateFormat="yyyy-MM-dd"
                                inline
                                calendarStartDay={0}
                                fixedHeight
                                key={`${value}-${isCalendarOpen}`} // Force re-render when value or open state changes
                                renderCustomHeader={({
                                    date,
                                    decreaseMonth,
                                    increaseMonth,
                                    changeMonth,
                                    monthOptions,
                                }) => {
                                    const isJanuary = date.getMonth() === 0 && date.getFullYear() === 2026;
                                    const isDecember = date.getMonth() === 11 && date.getFullYear() === 2026;

                                    const monthNames = [
                                        'January', 'February', 'March', 'April', 'May', 'June',
                                        'July', 'August', 'September', 'October', 'November', 'December'
                                    ];

                                    return (
                                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
                                            {/* Previous Month Button */}
                                            <button
                                                onClick={decreaseMonth}
                                                disabled={isJanuary}
                                                className={`
                          px-3 py-1.5 rounded text-gray-700 font-semibold text-lg
                          transition-colors
                          ${isJanuary
                                                        ? 'opacity-50 cursor-not-allowed'
                                                        : 'cursor-pointer hover:bg-gray-100 active:bg-gray-200'
                                                    }
                        `}
                                                type="button"
                                                aria-label="Previous month"
                                            >
                                                ‹
                                            </button>

                                            {/* Month Dropdown */}
                                            <select
                                                value={date.getMonth()}
                                                onChange={(e) => {
                                                    const newMonth = parseInt(e.target.value);
                                                    const newDate = new Date(2026, newMonth, 1);
                                                    changeMonth(newMonth);
                                                }}
                                                className="px-3 py-1.5 border border-gray-300 rounded-md bg-white text-gray-900 font-semibold text-sm cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-ocean/20 focus:border-ocean"
                                            >
                                                {monthNames.map((month, index) => (
                                                    <option key={index} value={index}>
                                                        {month}
                                                    </option>
                                                ))}
                                            </select>

                                            {/* Year (Static) */}
                                            <div className="px-3 py-1.5 font-bold text-gray-900 text-base">
                                                2026
                                            </div>

                                            {/* Next Month Button */}
                                            <button
                                                onClick={increaseMonth}
                                                disabled={isDecember}
                                                className={`
                          px-3 py-1.5 rounded text-gray-700 font-semibold text-lg
                          transition-colors
                          ${isDecember
                                                        ? 'opacity-50 cursor-not-allowed'
                                                        : 'cursor-pointer hover:bg-gray-100 active:bg-gray-200'
                                                    }
                        `}
                                                type="button"
                                                aria-label="Next month"
                                            >
                                                ›
                                            </button>
                                        </div>
                                    );
                                }}
                                renderDayContents={(dayOfMonth) => {
                                    return <span>{dayOfMonth}</span>;
                                }}
                                filterDate={(date) => {
                                    // Only allow dates in 2026
                                    return date.getFullYear() === 2026;
                                }}
                            />
                        </div>
                    </div>
                </div>
                <AnimatePresence>
                    {error && (
                        <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mt-2 text-sm text-red-600 font-medium"
                        >
                            {error}
                        </motion.p>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default DateInput;
