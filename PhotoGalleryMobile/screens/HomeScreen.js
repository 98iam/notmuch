import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { supabase } from '../App';

export default function HomeScreen({ navigation }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('uploaded_photos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching photos:', error);
        Alert.alert('Error', 'Failed to load photos');
        return;
      }

      setPhotos(data || []);
    } catch (error) {
      console.error('Error loading photos:', error);
      Alert.alert('Error', 'Failed to load photos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPhotos();
  };

  // Group photos by username
  const photosByUser = photos.reduce((acc, photo) => {
    const user = photo.username || 'Anonymous';
    if (!acc[user]) acc[user] = [];
    acc[user].push(photo);
    return acc;
  }, {});

  const handleUploadPress = () => {
    navigation.navigate('Upload');
  };

  const handleGalleryPress = () => {
    navigation.navigate('Gallery');
  };

  const handleDeleteProfile = async (username, userPhotos) => {
    Alert.alert(
      'Delete Profile',
      `Are you sure you want to delete ALL ${userPhotos.length} photos for "${username}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete files from storage
              const filePaths = userPhotos.map(p => p.file_path);
              if (filePaths.length > 0) {
                await supabase.storage.from('photos').remove(filePaths);
              }

              // Delete from database
              const photoIds = userPhotos.map(p => p.id);
              await supabase
                .from('uploaded_photos')
                .delete()
                .in('id', photoIds);

              Alert.alert('Success', `Deleted ${userPhotos.length} photos for "${username}"`);
              loadPhotos();
            } catch (error) {
              console.error('Error deleting profile:', error);
              Alert.alert('Error', 'Failed to delete profile');
            }
          },
        },
      ]
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading photos...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>My Shared Gallery</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleUploadPress}>
            <Text style={styles.primaryButtonText}>📤 Upload Photos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleGalleryPress}>
            <Text style={styles.secondaryButtonText}>🖼️ Full Gallery</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.profilesSection}>
        <Text style={styles.sectionTitle}>Profiles</Text>

        {Object.keys(photosByUser).length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No photos have been uploaded yet.{'\n'}
              Go to Upload to add some!
            </Text>
          </View>
        ) : (
          Object.entries(photosByUser).map(([username, userPhotos]) => (
            <View key={username} style={styles.profileCard}>
              <View style={styles.profileHeader}>
                <Text style={styles.username}>{username}</Text>
                <Text style={styles.photoCount}>
                  {userPhotos.length} photo{userPhotos.length !== 1 ? 's' : ''}
                </Text>
              </View>

              <View style={styles.profileActions}>
                <TouchableOpacity
                  style={styles.downloadButton}
                  onPress={() => {
                    // TODO: Implement download functionality
                    Alert.alert('Info', 'Download functionality coming soon!');
                  }}
                >
                  <Text style={styles.downloadButtonText}>📁 Download ZIP</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteProfile(username, userPhotos)}
                >
                  <Text style={styles.deleteButtonText}>🗑️ Delete Profile</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.photoGrid}>
                {userPhotos.slice(0, 6).map((photo) => (
                  <View key={photo.id} style={styles.photoItem}>
                    <Text style={styles.photoPlaceholder}>📷</Text>
                  </View>
                ))}
                {userPhotos.length > 6 && (
                  <View style={styles.morePhotos}>
                    <Text style={styles.morePhotosText}>
                      +{userPhotos.length - 6} more
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7f6',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f7f6',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3498db',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#3498db',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profilesSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#34495e',
  },
  photoCount: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  profileActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  downloadButton: {
    flex: 1,
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#dc3545',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoItem: {
    width: 60,
    height: 60,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  photoPlaceholder: {
    fontSize: 24,
  },
  morePhotos: {
    width: 60,
    height: 60,
    backgroundColor: '#6c757d',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  morePhotosText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
