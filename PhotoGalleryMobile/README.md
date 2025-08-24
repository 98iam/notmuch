# 📱 Photo Gallery Mobile App

A complete mobile photo gallery application built with **React Native** and **Expo**, featuring camera integration, Supabase backend, and native mobile experience.

## 🚀 Features

### ✨ Core Features
- **📤 Photo Upload**: Upload photos from camera or gallery
- **🖼️ Gallery View**: Browse all uploaded photos in a grid
- **👤 Profile Management**: Group photos by user profiles
- **🗑️ Delete Functionality**: Remove photos and entire profiles
- **📱 Mobile-First**: Optimized for mobile devices

### 📷 Camera & Media
- **📸 Take Photos**: Direct camera integration
- **🖼️ Photo Library**: Access device photo library
- **📁 File Management**: Native file system handling
- **🖼️ Image Preview**: Preview selected photos before upload

### 🔄 Real-time Features
- **🔄 Pull-to-Refresh**: Refresh photo galleries
- **⚡ Live Updates**: Real-time photo loading
- **📊 Progress Tracking**: Upload progress indicators

## 🛠️ Technology Stack

- **Framework**: React Native with Expo
- **Navigation**: React Navigation v6
- **Backend**: Supabase (Database + Storage)
- **Camera**: Expo Camera & ImagePicker
- **File System**: Expo File System
- **Styling**: React Native StyleSheet

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Expo Go app (on your phone)
- Android Studio (for APK builds)

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd PhotoGalleryMobile
npm install
```

### 2. Start Development Server
```bash
npm start
```

### 3. Test on Device
- Install **Expo Go** app on your Android phone
- Scan the QR code shown in terminal
- App will open on your device!

## 📱 App Screens

### 🏠 Home Screen
- View all user profiles
- Quick access to upload and gallery
- Delete entire profiles
- Pull-to-refresh functionality

### 📤 Upload Screen
- Take photos with camera
- Select from photo library
- Preview selected photos
- Upload with progress tracking
- Multi-photo selection support

### 🖼️ Gallery Screen
- Full-screen photo grid
- Tap to view photo details
- Delete individual photos
- Modal view with photo info

## 🔧 Configuration

### Supabase Setup
The app is configured to work with your existing Supabase project:
- **URL**: `https://ycgfcgdpezrgpftcnagp.supabase.co`
- **Tables**: `uploaded_photos`
- **Storage**: `photos` bucket

### Permissions
The app requests the following permissions:
- Camera access (for taking photos)
- Photo library access (for selecting existing photos)
- File system access (for uploads)

## 📦 Building APK

### For Android APK:
```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Login to Expo
eas login

# Configure for build
eas build:configure

# Build APK
eas build --platform android
```

## 🎯 Usage Instructions

### For Users:
1. **Upload Photos**: Tap "Upload Photos" → Enter name → Take/choose photos → Upload
2. **View Gallery**: Tap "Full Gallery" → Browse all photos
3. **Manage Profiles**: On home screen, view/delete user profiles
4. **Delete Photos**: Tap photos to see delete options

### For Developers:
- All source code in `screens/` directory
- Main app logic in `App.js`
- Supabase configuration in `App.js`
- Styles use React Native StyleSheet

## 🔍 Troubleshooting

### Common Issues:
- **Camera not working**: Check app permissions
- **Upload fails**: Verify Supabase configuration
- **App crashes**: Ensure all dependencies installed

### Debug Mode:
- Shake device or press `Ctrl+M` in Expo Go
- Access developer menu
- View console logs

## 📄 Project Structure

```
PhotoGalleryMobile/
├── App.js                 # Main app component & navigation
├── screens/
│   ├── HomeScreen.js      # Profile management & home
│   ├── UploadScreen.js    # Photo upload with camera
│   └── GalleryScreen.js   # Full photo gallery
├── assets/               # App icons and assets
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

## 🔒 Security Notes

- Supabase keys are configured for your project
- Row Level Security (RLS) enabled on database
- Storage policies configured for photo access
- Camera permissions requested appropriately

## 📞 Support

For issues or questions:
1. Check the console logs in Expo Go developer menu
2. Verify Supabase configuration
3. Ensure all permissions are granted
4. Check network connectivity for uploads

---

**Happy coding! 📸✨**
