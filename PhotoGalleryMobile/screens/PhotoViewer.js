import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Animated, Dimensions } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { supabase } from '../App';

const { width, height } = Dimensions.get('window');

const PhotoViewer = ({ photo, onClose, initialPosition }) => {
  const scale = useRef(new Animated.Value(initialPosition.width / width)).current;
  const translateX = useRef(new Animated.Value(initialPosition.x - width / 2 + initialPosition.width / 2)).current;
  const translateY = useRef(new Animated.Value(initialPosition.y - height / 2 + initialPosition.height / 2)).current;
  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;

  const onPanEvent = Animated.event(
    [{ nativeEvent: { translationY: panY } }],
    { useNativeDriver: true }
  );

  const onPanStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      if (Math.abs(event.nativeEvent.translationY) > 100) {
        Animated.timing(backgroundOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
        Animated.spring(panY, {
          toValue: event.nativeEvent.translationY > 0 ? height : -height,
          useNativeDriver: true,
        }).start(() => onClose());
      } else {
        Animated.spring(panY, { toValue: 0, useNativeDriver: true }).start();
      }
    }
  };

  useEffect(() => {
    Animated.timing(backgroundOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
  }, []);

  if (!photo) {
    return null;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('photos')
    .getPublicUrl(photo.file_path);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.background, { opacity: backgroundOpacity }]} />
      <PanGestureHandler
        onGestureEvent={onPanEvent}
        onHandlerStateChange={onPanStateChange}
      >
        <Animated.View style={styles.container}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Animated.Image
            source={{ uri: publicUrl }}
            style={[
              styles.image,
              {
                transform: [
                  { scale },
                  { translateX },
                  { translateY: Animated.add(translateY, panY) },
                ],
              },
            ]}
            resizeMode="contain"
          />
        </Animated.View>
      </PanGestureHandler>
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 30,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  actionButton: {
    padding: 10,
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default PhotoViewer;
