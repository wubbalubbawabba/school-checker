import { motion } from 'framer-motion';
import { Rocket } from 'lucide-react';

const TimeTravelerMessage = ({ schoolName, date }) => {
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

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-md mx-auto"
    >
      <div className="rounded-3xl p-8 shadow-xl bg-gradient-to-br from-sunshine/30 to-sunshine/10 border-2 border-sunshine/40">
        {/* Rocket Icon */}
        <motion.div
          variants={iconVariants}
          className="flex justify-center mb-6"
        >
          <Rocket 
            size={80} 
            className="text-ocean drop-shadow-lg"
          />
        </motion.div>

        {/* Main Message */}
        <motion.h2
          variants={textVariants}
          className="text-3xl font-bold text-center mb-4 text-gray-800"
        >
          Whoa, time traveler! 🛸
        </motion.h2>

        <motion.p
          variants={textVariants}
          className="text-xl text-center text-gray-700 mb-6 font-medium"
        >
          I lost my crystal ball. I can't predict that far into the future yet!
        </motion.p>

        {/* Details Section */}
        <motion.div
          variants={textVariants}
          className="space-y-3 mt-8 pt-6 border-t border-gray-200"
        >
          <div className="text-center text-gray-600">
            <p className="font-medium mb-1">We only have data up to the end of 2026.</p>
            <p className="text-sm">Please select a date in 2026 or earlier.</p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default TimeTravelerMessage;






