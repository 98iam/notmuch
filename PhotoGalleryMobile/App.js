import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';

// Import screens
import HomeScreen from './screens/HomeScreen';
import GalleryScreen from './screens/GalleryScreen';
import UploadScreen from './screens/UploadScreen';

// Supabase configuration
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ycgfcgdpezrgpftcnagp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZ2ZjZ2RwZXpyZ3BmdGNuYWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwMDQwNTIsImV4cCI6MjA3MTU4MDA1Mn0.1hxe-8DCmpY8NMG4kL8YFH9712KYKsQSQn6dCfLpPZ8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#3498db',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Photo Gallery' }}
        />
        <Stack.Screen
          name="Upload"
          component={UploadScreen}
          options={{ title: 'Upload Photos' }}
        />
        <Stack.Screen
          name="Gallery"
          component={GalleryScreen}
          options={{ title: 'Full Gallery' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
