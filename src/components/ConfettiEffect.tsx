import React, { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import useWindowSize from 'react-use/lib/useWindowSize';

interface ConfettiEffectProps {
  recycle?: boolean; // Whether the confetti should recycle or stop after a while
  numberOfPieces?: number;
  run: boolean; // Prop to control whether the confetti is active
  onComplete?: () => void; // Callback when confetti finishes (if not recycling)
}

const ConfettiEffect: React.FC<ConfettiEffectProps> = ({
  recycle = false,
  numberOfPieces = 200,
  run,
  onComplete
}) => {
  const { width, height } = useWindowSize();
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (run) {
      setIsRunning(true);
      if (!recycle) {
        // Stop confetti after a duration if not recycling
        const timer = setTimeout(() => {
          setIsRunning(false);
          if (onComplete) {
            onComplete();
          }
        }, 5000); // Stop after 5 seconds, adjust as needed
        return () => clearTimeout(timer);
      }
    }
    // Allow external control to stop it immediately if run becomes false
    if(!run) {
        setIsRunning(false);
    }

  }, [run, recycle, onComplete]);

  if (!isRunning) {
    return null; // Don't render anything if not running
  }

  return (
    <Confetti
      width={width}
      height={height}
      recycle={recycle}
      numberOfPieces={numberOfPieces}
      // Optional: Customize colors, gravity, etc.
      // colors={['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722', '#795548']}
      // gravity={0.1}
    />
  );
};

export default ConfettiEffect; 