import { motion } from 'framer-motion';
import { School } from 'lucide-react';

const LoadingAnimation = () => {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        animate={{
          y: [0, -20, 0],
        }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="mb-4"
      >
        <School 
          size={64} 
          className="text-ocean"
        />
      </motion.div>
      <motion.p
        className="text-lg text-gray-700 font-medium"
        animate={{
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        Checking the calendar...
      </motion.p>
    </motion.div>
  );
};

export default LoadingAnimation;




