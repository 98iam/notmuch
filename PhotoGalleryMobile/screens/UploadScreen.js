import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../App';

export default function UploadScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // Request permissions on component mount
  React.useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
          Alert.alert(
            'Permissions needed',
            'Camera and photo library permissions are required to upload photos.'
          );
        }
      }
    })();
  }, []);

  const pickImageFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        aspect: [4, 3],
        quality: 0.8,
        selectionLimit: 10,
      });

      if (!result.canceled) {
        const newImages = result.assets.map(asset => ({
          uri: asset.uri,
          type: asset.type || 'image',
          fileName: asset.fileName || `photo-${Date.now()}.jpg`,
        }));
        setSelectedImages([...selectedImages, ...newImages]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images from library');
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        const newImage = {
          uri: asset.uri,
          type: asset.type || 'image',
          fileName: asset.fileName || `photo-${Date.now()}.jpg`,
        };
        setSelectedImages([...selectedImages, newImage]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const removeImage = (index) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(newImages);
  };

  const uploadImages = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (selectedImages.length === 0) {
      Alert.alert('Error', 'Please select at least one photo');
      return;
    }

    setUploading(true);
    setUploadProgress(`Uploading ${selectedImages.length} photo(s)...`);

    try {
      const uploadPromises = selectedImages.map(async (image, index) => {
        try {
          // Get file extension
          const fileExt = image.fileName.split('.').pop();
          const cleanUsername = username.replace(/[^a-zA-Z0-9]/g, '_');
          const fileName = `${cleanUsername}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
          const filePath = fileName;

          // Read file as base64
          const base64 = await FileSystem.readAsStringAsync(image.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          // Create file object for upload
          const file = {
            uri: image.uri,
            type: `image/${fileExt}`,
            name: fileName,
          };

          setUploadProgress(`Uploading photo ${index + 1} of ${selectedImages.length}...`);

          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('photos')
            .upload(filePath, file, {
              contentType: `image/${fileExt}`,
            });

          if (uploadError) {
            throw uploadError;
          }

          // Save to database
          const { error: dbError } = await supabase
            .from('uploaded_photos')
            .insert({
              file_name: image.fileName,
              file_path: uploadData.path,
              file_size: 0, // We could get this from FileSystem.getInfoAsync if needed
              content_type: `image/${fileExt}`,
              username: username,
            });

          if (dbError) {
            throw dbError;
          }

          return { success: true, fileName: image.fileName };
        } catch (error) {
          console.error('Error uploading image:', error);
          return { success: false, fileName: image.fileName, error: error.message };
        }
      });

      const results = await Promise.all(uploadPromises);
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      if (successful > 0) {
        Alert.alert(
          'Success',
          `Successfully uploaded ${successful} photo(s)!${failed > 0 ? ` ${failed} failed.` : ''}`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form
                setUsername('');
                setSelectedImages([]);
                setUploadProgress('');
                // Navigate back to home
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', 'All uploads failed. Please try again.');
      }

    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload photos. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Upload Photos</Text>

        <View style={styles.section}>
          <Text style={styles.label}>Step 1: Enter your name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., John's Phone"
            value={username}
            onChangeText={setUsername}
            maxLength={50}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Step 2: Choose photos</Text>
          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
              <Text style={styles.photoButtonText}>📷 Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={pickImageFromLibrary}>
              <Text style={styles.photoButtonText}>🖼️ Choose from Library</Text>
            </TouchableOpacity>
          </View>
        </View>

        {selectedImages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Selected Photos ({selectedImages.length})</Text>
            <ScrollView horizontal style={styles.imagePreviewContainer}>
              {selectedImages.map((image, index) => (
                <View key={index} style={styles.imagePreview}>
                  <Image source={{ uri: image.uri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeImage(index)}
                  >
                    <Text style={styles.removeButtonText}>✕</Text>
                  </TouchableOpacity>
                  <Text style={styles.imageName} numberOfLines={1}>
                    {image.fileName}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.uploadButton, (!username.trim() || selectedImages.length === 0 || uploading) && styles.disabledButton]}
            onPress={uploadImages}
            disabled={!username.trim() || selectedImages.length === 0 || uploading}
          >
            {uploading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.uploadButtonText}>Uploading...</Text>
              </View>
            ) : (
              <Text style={styles.uploadButtonText}>
                Upload {selectedImages.length} Photo{selectedImages.length !== 1 ? 's' : ''}
              </Text>
            )}
          </TouchableOpacity>

          {uploadProgress ? (
            <Text style={styles.progressText}>{uploadProgress}</Text>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7f6',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 30,
  },
  section: {
    marginBottom: 25,
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34495e',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  buttonGroup: {
    gap: 12,
  },
  photoButton: {
    backgroundColor: '#17a2b8',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  photoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imagePreviewContainer: {
    maxHeight: 120,
  },
  imagePreview: {
    marginRight: 15,
    alignItems: 'center',
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  removeButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#dc3545',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageName: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    maxWidth: 80,
    textAlign: 'center',
  },
  uploadButton: {
    backgroundColor: '#28a745',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#6c757d',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressText: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
});
