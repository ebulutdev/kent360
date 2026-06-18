import React, { useRef } from 'react';
import { TouchableOpacity } from 'react-native';

export default function CounterButton({ onPress, style, children, activeOpacity = 0.7 }) {
  const timerRef = useRef(null);
  const intervalRef = useRef(null);

  const startPressing = () => {
    if (onPress) onPress();

    // Setup initial delay before repeat (400ms)
    timerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        if (onPress) onPress();
      }, 80);
    }, 400);
  };

  const stopPressing = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  return (
    <TouchableOpacity
      style={style}
      activeOpacity={activeOpacity}
      onPressIn={startPressing}
      onPressOut={stopPressing}
    >
      {children}
    </TouchableOpacity>
  );
}
