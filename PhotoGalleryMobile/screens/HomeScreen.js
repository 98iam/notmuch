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
  Modal,
  Dimensions,
  Image,
  PanResponder,
  Animated,
} from 'react-native';
import { supabase } from '../App';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const { width, height } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [panResponder, setPanResponder] = useState(null);

  useEffect(() => {
    loadPhotos();
  }, []);

  // Initialize pinch gesture handler
  useEffect(() => {
    if (modalVisible) {
      const _panResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          // Handle single touch (for potential future features)
        },
        onPanResponderMove: (evt) => {
          if (evt.nativeEvent.touches.length === 2) {
            // Handle pinch gesture
            const touches = evt.nativeEvent.touches;
            const touch1 = touches[0];
            const touch2 = touches[1];

            const distance = Math.sqrt(
              Math.pow(touch2.pageX - touch1.pageX, 2) +
              Math.pow(touch2.pageY - touch1.pageY, 2)
            );

            // Calculate new scale based on distance
            const newScale = Math.min(Math.max(distance / 200, 1), 3);
            setZoomScale(newScale);
          }
        },
        onPanResponderRelease: () => {
          // Reset to minimum scale if too small
          if (zoomScale < 1) {
            setZoomScale(1);
          }
        },
      });
      setPanResponder(_panResponder);
    }
  }, [modalVisible, zoomScale]);

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

  const handleDownloadProfile = async (username, userPhotos) => {
    if (userPhotos.length === 0) {
      Alert.alert('Error', 'No photos to download');
      return;
    }

    try {
      Alert.alert('Info', 'Downloading photos...');

      // Download each photo
      for (let i = 0; i < userPhotos.length; i++) {
        const photo = userPhotos[i];
        const { data: { publicUrl } } = supabase.storage
          .from('photos')
          .getPublicUrl(photo.file_path);

        // Download the image
        const response = await fetch(publicUrl);
        const blob = await response.blob();

        // Create a unique filename
        const fileName = `${photo.id}-${photo.file_name}`;

        // Save to device
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, await blobToBase64(blob), {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Share the file
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: blob.type,
            dialogTitle: `Download ${photo.file_name}`,
          });
        }
      }

      Alert.alert('Success', `Downloaded ${userPhotos.length} photos for "${username}"`);
    } catch (error) {
      console.error('Error downloading photos:', error);
      Alert.alert('Error', 'Failed to download photos');
    }
  };

  // Helper function to convert blob to base64
  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const openPhotoModal = (photo) => {
    const index = photos.findIndex(p => p.id === photo.id);
    setSelectedPhotoIndex(index);
    setModalVisible(true);
    setZoomScale(1);
  };

  const closePhotoModal = () => {
    setModalVisible(false);
    setZoomScale(1);
  };

  const navigatePhoto = (direction) => {
    let newIndex = selectedPhotoIndex + direction;
    if (newIndex >= 0 && newIndex < photos.length) {
      setSelectedPhotoIndex(newIndex);
      setZoomScale(1);
    }
  };

  const handleZoomIn = () => {
    if (zoomScale < 3) {
      setZoomScale(zoomScale + 0.5);
    }
  };

  const handleZoomOut = () => {
    if (zoomScale > 1) {
      setZoomScale(Math.max(1, zoomScale - 0.5));
    }
  };

  const handleDeletePhoto = async (photo) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete from storage
              await supabase.storage.from('photos').remove([photo.file_path]);

              // Delete from database
              await supabase
                .from('uploaded_photos')
                .delete()
                .eq('id', photo.id);

              Alert.alert('Success', 'Photo deleted successfully!');
              loadPhotos();
              closePhotoModal();
            } catch (error) {
              console.error('Error deleting photo:', error);
              Alert.alert('Error', 'Failed to delete photo');
            }
          },
        },
      ]
    );
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
                  onPress={() => handleDownloadProfile(username, userPhotos)}
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
                {userPhotos.slice(0, 6).map((photo) => {
                  const { data: { publicUrl } } = supabase.storage
                    .from('photos')
                    .getPublicUrl(photo.file_path);

                  return (
                    <TouchableOpacity
                      key={photo.id}
                      style={styles.photoItem}
                      onPress={() => openPhotoModal(photo)}
                    >
                      <Image
                        source={{ uri: publicUrl }}
                        style={styles.photoImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  );
                })}
                {userPhotos.length > 6 && (
                  <TouchableOpacity
                    style={styles.morePhotos}
                    onPress={() => {
                      // Open the first photo of this user
                      if (userPhotos.length > 0) {
                        openPhotoModal(userPhotos[0]);
                      }
                    }}
                  >
                    <Text style={styles.morePhotosText}>
                      +{userPhotos.length - 6} more
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Full-Screen Image Viewer */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closePhotoModal}
      >
        <View style={styles.fullScreenContainer}>
          {/* Header with photo info and close button */}
          <View style={styles.fullScreenHeader}>
            <View style={styles.photoInfo}>
              <Text style={styles.fullScreenUsername}>
                {photos[selectedPhotoIndex]?.username || 'Anonymous'}
              </Text>
              <Text style={styles.fullScreenCounter}>
                {selectedPhotoIndex + 1} / {photos.length}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={closePhotoModal}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Full-screen image with swipe gestures */}
          <View style={styles.fullScreenImageContainer}>
            {photos[selectedPhotoIndex] && (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) => {
                  const slideSize = event.nativeEvent.layoutMeasurement.width;
                  const index = event.nativeEvent.contentOffset.x / slideSize;
                  const roundedIndex = Math.round(index);
                  if (roundedIndex !== selectedPhotoIndex) {
                    setSelectedPhotoIndex(roundedIndex);
                  }
                }}
                style={styles.imageScrollView}
              >
                {photos.map((photo, index) => {
                  const { data: { publicUrl } } = supabase.storage
                    .from('photos')
                    .getPublicUrl(photo.file_path);

                  return (
                    <View key={photo.id} style={styles.fullScreenImageWrapper}>
                      <Image
                        source={{ uri: publicUrl }}
                        style={[styles.fullScreenImage, { transform: [{ scale: zoomScale }] }]}
                        resizeMode="contain"
                        {...panResponder?.panHandlers}
                      />
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Navigation arrows */}
          {photos.length > 1 && (
            <>
              {selectedPhotoIndex > 0 && (
                <TouchableOpacity
                  style={[styles.navArrow, styles.leftArrow]}
                  onPress={() => navigatePhoto(-1)}
                >
                  <Text style={styles.arrowText}>❮</Text>
                </TouchableOpacity>
              )}
              {selectedPhotoIndex < photos.length - 1 && (
                <TouchableOpacity
                  style={[styles.navArrow, styles.rightArrow]}
                  onPress={() => navigatePhoto(1)}
                >
                  <Text style={styles.arrowText}>❯</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Bottom actions */}
          <View style={styles.fullScreenActions}>
            {/* Zoom controls */}
            <View style={styles.zoomControls}>
              <TouchableOpacity style={styles.zoomButton} onPress={handleZoomOut}>
                <Text style={styles.zoomButtonText}>🔍-</Text>
              </TouchableOpacity>
              <Text style={styles.zoomText}>{zoomScale.toFixed(1)}x</Text>
              <TouchableOpacity style={styles.zoomButton} onPress={handleZoomIn}>
                <Text style={styles.zoomButtonText}>🔍+</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.deleteActionButton}
              onPress={() => handleDeletePhoto(photos[selectedPhotoIndex])}
            >
              <Text style={styles.deleteActionButtonText}>🗑️ Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  // Photo image style
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },

  // Full-screen viewer styles
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullScreenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50, // Account for status bar
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  photoInfo: {
    flex: 1,
  },
  fullScreenUsername: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  fullScreenCounter: {
    color: '#ccc',
    fontSize: 14,
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  fullScreenImageContainer: {
    flex: 1,
  },
  imageScrollView: {
    flex: 1,
  },
  fullScreenImageWrapper: {
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: width,
    height: height * 0.8,
  },
  navArrow: {
    position: 'absolute',
    top: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -30,
  },
  leftArrow: {
    left: 20,
  },
  rightArrow: {
    right: 20,
  },
  arrowText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
  },
  fullScreenActions: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingBottom: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  zoomButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  zoomText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 50,
    textAlign: 'center',
  },
  deleteActionButton: {
    backgroundColor: '#dc3545',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
