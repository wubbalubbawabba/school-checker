import { motion } from 'framer-motion';
import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, PartyPopper, Calendar, School as SchoolIcon } from 'lucide-react';

const SchoolResult = ({ result }) => {
  const { isOpen, reason, schoolName, date } = result;

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
      scale: 0.8,
      y: 50
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
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
        delay: 0.2
      }
    }
  };

  const textVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        delay: 0.3,
        duration: 0.5
      }
    }
  };

  // Celebration colors for NO state
  const celebrationColors = {
    bg: 'bg-gradient-to-br from-orange-400/30 to-yellow-400/20',
    border: 'border-2 border-orange-400/40',
    text: 'text-orange-600',
    icon: 'text-orange-500',
    reasonBg: 'bg-orange-100/50',
    reasonBorder: 'border-orange-300/30',
    reasonText: 'text-orange-700'
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-md mx-auto"
    >
      <div className={`
        rounded-3xl p-8 shadow-xl
        ${isOpen 
          ? 'bg-gradient-to-br from-eucalyptus/20 to-eucalyptus/5 border-2 border-eucalyptus/30' 
          : `${celebrationColors.bg} ${celebrationColors.border}`
        }
      `}>
        {/* Status Icon */}
        <motion.div
          variants={iconVariants}
          className="flex justify-center mb-6"
        >
          {isOpen ? (
            <CheckCircle2 
              size={80} 
              className="text-eucalyptus drop-shadow-lg"
            />
          ) : (
            <motion.div
              animate={{
                rotate: [0, -10, 10, -10, 10, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 0.6,
                delay: 0.3,
              }}
            >
              <PartyPopper 
                size={80} 
                className={`${celebrationColors.icon} drop-shadow-lg`}
              />
            </motion.div>
          )}
        </motion.div>

        {/* Big Status Text */}
        <motion.h2
          variants={textVariants}
          className={`
            text-6xl font-bold text-center mb-4
            ${isOpen ? 'text-eucalyptus' : celebrationColors.text}
          `}
        >
          {isOpen ? 'YES' : 'NO'}
        </motion.h2>

        {/* Playful Text */}
        <motion.p
          variants={textVariants}
          className="text-xl text-center text-gray-700 mb-6 font-medium"
        >
          {isOpen 
            ? "Pack your lunch! School's on." 
            : "Woohoo! Sleep in. 🎉"
          }
        </motion.p>

        {/* Details Section */}
        <motion.div
          variants={textVariants}
          className="space-y-3 mt-8 pt-6 border-t border-gray-200"
        >
          <div className="flex items-center gap-3 text-gray-700">
            <SchoolIcon size={20} className="text-ocean flex-shrink-0" />
            <span className="font-medium">{schoolName}</span>
          </div>
          
          <div className="flex items-center gap-3 text-gray-700">
            <Calendar size={20} className="text-ocean flex-shrink-0" />
            <span>{date}</span>
          </div>

          {!isOpen && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className={`mt-4 p-4 ${celebrationColors.reasonBg} rounded-xl border ${celebrationColors.reasonBorder}`}
            >
              <p className={`text-sm font-semibold ${celebrationColors.reasonText} mb-1`}>
                Reason:
              </p>
              <p className="text-gray-700">
                {reason}
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default SchoolResult;
