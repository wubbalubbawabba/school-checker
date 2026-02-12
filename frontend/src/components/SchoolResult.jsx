import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, PartyPopper, Calendar, School as SchoolIcon, Clock, Share2, Check } from 'lucide-react';
import WeatherWidget from './WeatherWidget';

const SchoolResult = ({ result, selectedDate, emergencyClosure, isCheckingEmergency }) => {
  const { isOpen, reason, schoolName, date, nextChangeDate, countdownLabel, nextChangeReason } = result;
  const [daysUntil, setDaysUntil] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);

  // Show emergency closure if detected
  useEffect(() => {
    if (emergencyClosure && emergencyClosure.isClosed) {
      setShowEmergency(true);
    }
  }, [emergencyClosure]);

  // Calculate days until next change based on selected date (not today)
  useEffect(() => {
    if (nextChangeDate && selectedDate) {
      // Parse the selected date (format: YYYY-MM-DD)
      const selectedDateObj = new Date(selectedDate + 'T00:00:00');
      selectedDateObj.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(nextChangeDate + 'T00:00:00');
      nextDate.setHours(0, 0, 0, 0);
      
      const diffTime = nextDate - selectedDateObj;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysUntil(diffDays >= 0 ? diffDays : 0);
    } else {
      setDaysUntil(null);
    }
  }, [nextChangeDate, selectedDate]);

  // Trigger confetti when NO state appears
  useEffect(() => {
    if (!isOpen) {
      // Create a burst of confetti
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
      }

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        
        // Launch confetti from multiple positions
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      // Cleanup
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const containerVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.95,
      y: 20
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25,
        mass: 0.8
      }
    }
  };

  const iconVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: { 
      scale: 1, 
      rotate: 0,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 15,
        delay: 0.15
      }
    }
  };

  const textVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        delay: 0.25,
        duration: 0.4
      }
    }
  };

  // Unified theme colors
  const themeColors = showEmergency ? {
    bg: 'bg-gradient-to-br from-red-50/90 to-rose-50/80 backdrop-blur-sm',
    border: 'border-2 border-red-300/60',
    statusText: 'text-red-600',
    icon: 'text-red-500',
    accent: 'text-red-600',
    accentBg: 'bg-red-100/60',
    accentBorder: 'border-red-200/40',
  } : isOpen ? {
    bg: 'bg-gradient-to-br from-emerald-50/80 to-teal-50/60 backdrop-blur-sm',
    border: 'border border-emerald-200/40',
    statusText: 'text-emerald-600',
    icon: 'text-emerald-500',
    accent: 'text-emerald-600',
    accentBg: 'bg-emerald-100/50',
    accentBorder: 'border-emerald-200/30',
  } : {
    bg: 'bg-gradient-to-br from-orange-50/80 to-amber-50/60 backdrop-blur-sm',
    border: 'border border-orange-200/40',
    statusText: 'text-orange-600',
    icon: 'text-orange-500',
    accent: 'text-orange-600',
    accentBg: 'bg-orange-100/50',
    accentBorder: 'border-orange-200/30',
  };

  const displayStatus = showEmergency ? 'EMERGENCY CLOSURE' : (isOpen ? 'YES' : 'NO');
  const displayReason = showEmergency ? (emergencyClosure.reason || 'Emergency Closure') : reason;
  const displayMessage = showEmergency 
    ? '⚠️ School closed due to emergency conditions'
    : (isOpen ? "Pack your lunch! School's on." : "Woohoo! Sleep in. 🎉");

  // Format countdown display
  const getCountdownDisplay = () => {
    if (daysUntil === 0) {
      return { number: null, text: 'Today', reason: nextChangeReason };
    } else if (daysUntil === 1) {
      return { number: null, text: 'Tomorrow', reason: nextChangeReason };
    } else if (daysUntil > 1) {
      return { number: daysUntil, text: 'days left', reason: nextChangeReason };
    } else {
      return { number: null, text: nextChangeReason || 'Date has passed', reason: null };
    }
  };

  // Compute countdown display data
  const countdownDisplay = nextChangeDate && daysUntil !== null ? getCountdownDisplay() : null;
  const countdownLabelText = countdownDisplay ? (countdownLabel || (isOpen ? 'Holidays start' : 'School starts')) : null;

  // Handle share functionality
  const handleShare = async () => {
    const url = window.location.href;
    
    try {
      // Check if navigator.share is available (mobile)
      if (navigator.share) {
        await navigator.share({
          title: `Is School On? - ${schoolName}`,
          text: `${schoolName} is ${isOpen ? 'OPEN' : 'CLOSED'} on ${date}`,
          url: url,
        });
      } else {
        // Fallback to clipboard (desktop)
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      // User cancelled share or clipboard failed
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error);
        // Fallback to clipboard if share fails
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (clipboardError) {
          console.error('Clipboard error:', clipboardError);
        }
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-lg mx-auto"
    >
      <div className={`
        relative rounded-3xl p-8 shadow-xl ${themeColors.bg} ${themeColors.border}
      `}>
        {/* Share Button */}
        <button
          onClick={handleShare}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-200"
          aria-label="Share"
        >
          {copied ? (
            <Check size={18} className="text-green-600" />
          ) : (
            <Share2 size={18} />
          )}
        </button>
        {/* Top Section: Icon and Status */}
        <div className="text-center mb-8">
          <motion.div
            variants={iconVariants}
            className="flex justify-center mb-4"
          >
            {showEmergency ? (
              <motion.div
                animate={{
                  rotate: [0, -15, 15, -15, 15, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 0.6,
                  delay: 0.3,
                  repeat: Infinity,
                  repeatDelay: 2,
                }}
              >
                <PartyPopper 
                  size={72} 
                  className={`${themeColors.icon} drop-shadow-md`}
                />
              </motion.div>
            ) : isOpen ? (
              <CheckCircle2 
                size={72} 
                className={`${themeColors.icon} drop-shadow-md`}
              />
            ) : (
              <motion.div
                animate={{
                  rotate: [0, -10, 10, -10, 10, 0],
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 0.5,
                  delay: 0.3,
                }}
              >
                <PartyPopper 
                  size={72} 
                  className={`${themeColors.icon} drop-shadow-md`}
                />
              </motion.div>
            )}
          </motion.div>

          <motion.h2
            variants={textVariants}
            className={`text-5xl md:text-6xl font-black mb-3 ${themeColors.statusText}`}
          >
            {displayStatus}
          </motion.h2>

          <motion.p
            variants={textVariants}
            className="text-lg text-gray-600 font-medium"
          >
            {displayMessage}
          </motion.p>
        </div>

        {/* Middle Section: School Name and Date (Subtle) */}
        <motion.div
          variants={textVariants}
          className="flex flex-col items-center gap-2 mb-6 pb-6 border-b border-gray-200/40"
        >
          <div className="flex items-center gap-2 text-gray-500">
            <SchoolIcon size={16} className="flex-shrink-0" />
            <span className="text-sm font-medium">{schoolName}</span>
          </div>
          
          <div className="flex items-center gap-2 text-gray-500">
            <Calendar size={16} className="flex-shrink-0" />
            <span className="text-sm">{date}</span>
          </div>

          {/* Reason for NO state or Emergency Closure */}
          {(!isOpen || showEmergency) && displayReason && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className={`mt-4 p-5 rounded-2xl bg-white/70 backdrop-blur-sm border border-white/50 shadow-sm ${showEmergency ? 'border-red-200' : ''}`}
            >
              <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">
                {showEmergency ? '⚠️ EMERGENCY' : 'REASON'}
              </p>
              <p className={`text-lg font-bold tracking-tight ${showEmergency ? 'text-red-700' : 'text-orange-900/80'}`}>
                {displayReason}
              </p>
              {showEmergency && emergencyClosure.details && (
                <p className="text-sm text-red-600 mt-2">
                  {emergencyClosure.details}
                </p>
              )}
            </motion.div>
          )}

          {/* Emergency closure checking indicator */}
          {isCheckingEmergency && !showEmergency && !isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 text-xs text-slate-400 flex items-center gap-1"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <PartyPopper size={12} />
              </motion.div>
              Checking emergency closures...
            </motion.div>
          )}
        </motion.div>

        {/* Bottom Grid: Countdown and Weather Side-by-Side */}
        <motion.div
          variants={textVariants}
          className="flex gap-3"
        >
          {/* Countdown Pill/Badge */}
          {countdownDisplay && countdownLabelText && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35 }}
              className="flex-1 p-5 rounded-2xl bg-white/70 backdrop-blur-sm border border-white/50 shadow-sm"
            >
              <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">
                {countdownLabelText.toUpperCase()}
              </p>
              <div className="flex items-baseline gap-2">
                {countdownDisplay.number !== null && (
                  <>
                    <span className={`text-3xl font-black leading-none tracking-tight ${isOpen ? 'text-emerald-600' : 'text-orange-500'}`}>
                      {countdownDisplay.number}
                    </span>
                    <span className="text-sm text-stone-500 leading-none">
                      {countdownDisplay.text}
                    </span>
                  </>
                )}
                {countdownDisplay.number === null && (
                  <span className={`text-xl font-black tracking-tight ${isOpen ? 'text-emerald-600' : 'text-orange-600'}`}>
                    {countdownDisplay.text}
                  </span>
                )}
              </div>
              {countdownDisplay.reason && (
                <p className="text-base text-slate-500 mt-2">
                  {countdownDisplay.reason}
                </p>
              )}
            </motion.div>
          )}

          {/* Weather Widget */}
          {selectedDate && (
            <WeatherWidget date={new Date(selectedDate + 'T00:00:00')} theme={isOpen ? 'green' : 'orange'} />
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default SchoolResult;
