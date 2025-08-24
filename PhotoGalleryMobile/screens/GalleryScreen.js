import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { supabase } from '../App';
import {
  PinchGestureHandler,
  PanGestureHandler,
  State,
} from 'react-native-gesture-handler';
import PhotoViewer from './PhotoViewer';

const { width, height } = Dimensions.get('window');

export default function GalleryScreen({ navigation }) {
  const [photos, setPhotos] = useState([]);
  const [groupedPhotos, setGroupedPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [tappedPhotoPosition, setTappedPhotoPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const scale = useRef(new Animated.Value(1)).current;
  const pinchRef = useRef();
  const photoRefs = useRef({});

  useEffect(() => {
    loadPhotos();
  }, []);

  const groupPhotosByDate = (photos) => {
    const groups = photos.reduce((acc, photo) => {
      const date = new Date(photo.created_at).toDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(photo);
      return acc;
    }, {});

    return Object.keys(groups).map(date => ({
      title: date,
      data: groups[date],
    }));
  };

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
      setGroupedPhotos(groupPhotosByDate(data || []));
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
    const photoRef = photoRefs.current[photo.id];
    if (photoRef) {
      photoRef.measure((fx, fy, width, height, px, py) => {
        setTappedPhotoPosition({ x: px, y: py, width, height });
        setSelectedPhoto(photo);
        setModalVisible(true);
      });
    }
  };

  const closePhotoModal = () => {
    setModalVisible(false);
    scale.setValue(1);
  };


  // Pinch gesture handlers
  const onPinchEvent = Animated.event(
    [
      {
        nativeEvent: { scale: scale }
      }
    ],
    {
      useNativeDriver: true
    }
  );

  const onPinchStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true
      }).start();
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

  const renderPhotoItem = ({ item }) => {
    const { data: { publicUrl } } = supabase.storage
      .from('photos')
      .getPublicUrl(item.file_path);

    return (
      <TouchableOpacity
        ref={(ref) => (photoRefs.current[item.id] = ref)}
        style={styles.photoItem}
        onPress={() => openPhotoModal(item)}
      >
        <Image
          source={{ uri: publicUrl }}
          style={styles.photoImage}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section: { title } }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

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
        <Text style={styles.title}>Gallery</Text>
        <Text style={styles.subtitle}>
          {photos.length} photo{photos.length !== 1 ? 's' : ''}
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
        <SectionList
          sections={groupedPhotos}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ section }) => (
            <FlatList
              data={section.data}
              renderItem={renderPhotoItem}
              keyExtractor={(item) => item.id.toString()}
              numColumns={4}
              contentContainerStyle={styles.photoGrid}
            />
          )}
          renderSectionHeader={renderSectionHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closePhotoModal}
      >
        <PhotoViewer
          photo={selectedPhoto}
          onClose={closePhotoModal}
          initialPosition={tappedPhotoPosition}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  header: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
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
    padding: 2,
  },
  photoItem: {
    flex: 1 / 4,
    aspectRatio: 1,
    margin: 2,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  sectionHeader: {
    padding: 10,
    fontSize: 18,
    fontWeight: 'bold',
    backgroundColor: '#fff',
  },
});
