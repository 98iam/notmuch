import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  PanResponder,
} from 'react-native';
import { supabase } from '../App';

const { width, height } = Dimensions.get('window');

export default function GalleryScreen({ navigation }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

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

  const openPhotoModal = (photo) => {
    const index = photos.findIndex(p => p.id === photo.id);
    setSelectedPhotoIndex(index);
    setModalVisible(true);
  };

  const closePhotoModal = () => {
    setModalVisible(false);
  };

  const navigatePhoto = (direction) => {
    let newIndex = selectedPhotoIndex + direction;
    if (newIndex >= 0 && newIndex < photos.length) {
      setSelectedPhotoIndex(newIndex);
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
              // Close modal if this was the last photo
              if (photos.length <= 1) {
                closePhotoModal();
              } else if (selectedPhotoIndex >= photos.length - 1) {
                // If we deleted the last photo, go to previous
                setSelectedPhotoIndex(Math.max(0, selectedPhotoIndex - 1));
              }
            } catch (error) {
              console.error('Error deleting photo:', error);
              Alert.alert('Error', 'Failed to delete photo');
            }
          },
        },
      ]
    );
  };

  const renderPhotoItem = ({ item }) => {
    const { data: { publicUrl } } = supabase.storage
      .from('photos')
      .getPublicUrl(item.file_path);

    return (
      <TouchableOpacity
        style={styles.photoItem}
        onPress={() => openPhotoModal(item)}
      >
        <Image
          source={{ uri: publicUrl }}
          style={styles.photoImage}
          resizeMode="cover"
        />
        <View style={styles.photoOverlay}>
          <Text style={styles.photoUsername} numberOfLines={1}>
            {item.username || 'Anonymous'}
          </Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeletePhoto(item)}
          >
            <Text style={styles.deleteButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Full Gallery</Text>
        <Text style={styles.subtitle}>
          {photos.length} photo{photos.length !== 1 ? 's' : ''} total
        </Text>
      </View>

      {photos.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            No photos have been uploaded yet.{'\n'}
            Go to Upload to add some!
          </Text>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => navigation.navigate('Upload')}
          >
            <Text style={styles.uploadButtonText}>📤 Upload Photos</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={photos}
          renderItem={renderPhotoItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={3}
          contentContainerStyle={styles.photoGrid}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

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
                        style={styles.fullScreenImage}
                        resizeMode="contain"
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
            <TouchableOpacity
              style={styles.deleteActionButton}
              onPress={() => handleDeletePhoto(photos[selectedPhotoIndex])}
            >
              <Text style={styles.deleteActionButtonText}>🗑️ Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  uploadButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 8,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  photoGrid: {
    padding: 10,
  },
  photoItem: {
    flex: 1/3,
    aspectRatio: 1,
    margin: 5,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoUsername: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    flex: 1,
  },
  deleteButton: {
    backgroundColor: 'rgba(220, 53, 69, 0.8)',
    borderRadius: 4,
    padding: 4,
  },
  deleteButtonText: {
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.9,
    maxHeight: height * 0.8,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalImage: {
    width: '100%',
    height: 300,
  },
  modalInfo: {
    padding: 20,
  },
  modalUsername: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  modalFilename: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  modalDate: {
    fontSize: 14,
    color: '#666',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  modalDeleteButton: {
    flex: 1,
    backgroundColor: '#dc3545',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  modalDeleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  },
  deleteActionButton: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
