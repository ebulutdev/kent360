import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, Image, TouchableWithoutFeedback, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export default function StoryViewer({ visible, stories = [], onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const animationFrameId = useRef(null);
  
  const DURATION = 5000; // 5 seconds per story

  useEffect(() => {
    if (visible && stories.length > 0) {
      startAnimation();
    } else {
      stopAnimation();
      setCurrentIndex(0);
      setProgress(0);
      progressRef.current = 0;
    }
    return () => stopAnimation();
  }, [visible, currentIndex, stories]);

  const startAnimation = () => {
    stopAnimation();
    const startTime = Date.now();
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const newProgress = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(newProgress);
      progressRef.current = newProgress;
      
      if (newProgress < 100) {
        animationFrameId.current = requestAnimationFrame(animate);
      } else {
        goToNext();
      }
    };
    animationFrameId.current = requestAnimationFrame(animate);
  };

  const stopAnimation = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
  };

  const goToNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
      progressRef.current = 0;
    } else {
      onClose();
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
      progressRef.current = 0;
    }
  };

  const handlePress = (evt) => {
    const x = evt.nativeEvent.locationX;
    if (x < width / 3) {
      goToPrev();
    } else {
      goToNext();
    }
  };

  if (!visible || stories.length === 0) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <TouchableWithoutFeedback onPress={handlePress}>
          <Image source={{ uri: typeof stories[currentIndex] === 'string' ? stories[currentIndex] : (stories[currentIndex]?.uri || '') }} style={styles.image} resizeMode="contain" />
        </TouchableWithoutFeedback>

        {/* Progress Bars */}
        <View style={styles.progressBarContainer}>
          {stories.map((_, idx) => (
            <View key={idx} style={styles.progressBackground}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: idx === currentIndex 
                      ? `${progress}%` 
                      : idx < currentIndex ? '100%' : '0%' 
                  }
                ]} 
              />
            </View>
          ))}
        </View>

        {/* Navigation Arrows */}
        {currentIndex > 0 && (
          <TouchableOpacity 
            style={[styles.arrowBtn, { left: 16 }]} 
            onPress={goToPrev}
          >
            <ChevronLeft size={32} color="#FFF" />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[styles.arrowBtn, { right: 16 }]} 
          onPress={goToNext}
        >
          <ChevronRight size={32} color="#FFF" />
        </TouchableOpacity>

        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={28} color="#FFF" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  progressBarContainer: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    flexDirection: 'row',
    gap: 4,
  },
  progressBackground: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFF',
    borderRadius: 2,
  },
  arrowBtn: {
    position: 'absolute',
    top: '50%',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateY: -22 }],
  },
  closeButton: {
    position: 'absolute',
    top: 65,
    right: 20,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  }
});
