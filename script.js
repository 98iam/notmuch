// --- 1. SUPABASE SETUP ---
const SUPABASE_URL = 'https://ycgfcgdpezrgpftcnagp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZ2ZjZ2RwZXpyZ3BmdGNuYWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwMDQwNTIsImV4cCI6MjA3MTU4MDA1Mn0.1hxe-8DCmpY8NMG4kL8YFH9712KYKsQSQn6dCfLpPZ8';
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- 2. GLOBAL STATE ---
let allPhotos = [];
let currentLightboxIndex = 0;

// --- 3. DOM ELEMENTS ---
// Views
const uploaderView = document.getElementById('uploader-view');
const galleryView = document.getElementById('gallery-view');
// Navigation
const navUploader = document.getElementById('nav-uploader');
const navGallery = document.getElementById('nav-gallery');
// Uploader Form
const form = document.getElementById('upload-form');
const usernameInput = document.getElementById('username-input');
const photoInput = document.getElementById('photo-input');
const uploadButton = document.getElementById('upload-button');
const statusMessage = document.getElementById('status-message');
const previewText = document.getElementById('preview-text');
// Galleries
const profilesGallery = document.getElementById('profiles-gallery');
const galleryGrid = document.getElementById('gallery-grid');
// Lightbox
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxCaption = document.getElementById('lightbox-caption');
const closeBtn = document.getElementById('close-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

// --- 4. NAVIGATION & VIEW SWITCHING ---
function showView(viewToShow) {
    [uploaderView, galleryView].forEach(view => view.classList.remove('active'));
    [navUploader, navGallery].forEach(nav => nav.classList.remove('active'));
    
    if (viewToShow === 'uploader') {
        uploaderView.classList.add('active');
        navUploader.classList.add('active');
    } else {
        galleryView.classList.add('active');
        navGallery.classList.add('active');
    }
}
navUploader.addEventListener('click', (e) => { e.preventDefault(); showView('uploader'); });
navGallery.addEventListener('click', (e) => { e.preventDefault(); showView('gallery'); });

// --- 5. UPLOAD LOGIC ---
photoInput.addEventListener('change', () => {
    const files = photoInput.files;
    if (files && files.length > 0) {
        uploadButton.disabled = false;
        previewText.textContent = `${files.length} photo(s) selected.`;
        uploadButton.textContent = `Upload ${files.length} Photo(s)`;
    } else {
        uploadButton.disabled = true;
        previewText.textContent = '';
        uploadButton.textContent = 'Upload Photos';
    }
});

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = usernameInput.value.trim();
    const files = photoInput.files;

    if (!username || !files || files.length === 0) {
        setStatus('Please enter a name and select at least one file.', 'error');
        return;
    }

    uploadButton.disabled = true;
    setStatus(`Uploading ${files.length} photo(s)...`, '');
    const uploadPromises = Array.from(files).map(file => uploadPhoto(file, username));

    try {
        await Promise.all(uploadPromises);
        setStatus(`Successfully uploaded ${files.length} photo(s)!`, 'success');
        resetForm();
        await loadAndRenderGalleries(); // This will refresh both views
    } catch (err) {
        setStatus(`One or more uploads failed. See console for details.`, 'error');
        console.error("Error during bulk upload:", err);
    } finally {
        uploadButton.disabled = false;
        uploadButton.textContent = 'Upload Photos';
    }
});

function setStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = type;
}

function resetForm() {
    form.reset();
    uploadButton.disabled = true;
    previewText.textContent = '';
    statusMessage.textContent = '';
    statusMessage.className = '';
    uploadButton.textContent = 'Upload Photos';
}

async function uploadPhoto(file, username) {
    const fileExt = file.name.split('.').pop();
    const cleanUsername = username.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${cleanUsername}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = fileName;

    const { data, error: uploadError } = await supabaseClient.storage.from('photos').upload(filePath, file);
    if (uploadError) throw uploadError;

    const { error: dbError } = await supabaseClient
        .from('uploaded_photos')
        .insert({
            file_name: file.name,
            file_path: data.path,
            file_size: file.size,
            content_type: file.type,
            username: username
        });
    if (dbError) throw dbError;
}

// --- 6. GALLERY & PROFILE RENDERING ---
async function loadAndRenderGalleries() {
    const { data, error } = await supabaseClient.from('uploaded_photos').select('*').order('created_at', { ascending: false });
    if (error) {
        console.error('Error fetching photos:', error);
        return;
    }
    allPhotos = data; // Store photos globally for the lightbox

    renderProfiles();
    renderGalleryGrid();
}

function renderProfiles() {
    const photosByUsername = allPhotos.reduce((acc, photo) => {
        const user = photo.username || 'Anonymous';
        if (!acc[user]) acc[user] = [];
        acc[user].push(photo);
        return acc;
    }, {});

    profilesGallery.innerHTML = '';
    if (Object.keys(photosByUsername).length === 0) {
        profilesGallery.innerHTML = '<p>Your uploaded photos will appear here, grouped by user...</p>';
        return;
    }

    for (const username in photosByUsername) {
        const userPhotos = photosByUsername[username];
        const profileSection = document.createElement('div');
        profileSection.className = 'profile-section';

        const profileHeader = document.createElement('div');
        profileHeader.className = 'profile-header';
        
        const profileTitle = document.createElement('h3');
        profileTitle.textContent = username;
        
        const profileActions = document.createElement('div');
        profileActions.className = 'profile-actions';
        
        const downloadProfileBtn = document.createElement('button');
        downloadProfileBtn.textContent = 'Download ZIP';
        downloadProfileBtn.onclick = (e) => { e.stopPropagation(); handleDownloadProfile(username, userPhotos, downloadProfileBtn); };
        
        const deleteProfileBtn = document.createElement('button');
        deleteProfileBtn.className = 'delete-btn';
        deleteProfileBtn.textContent = 'Delete Profile';
        deleteProfileBtn.onclick = (e) => { e.stopPropagation(); handleDeleteProfile(username, userPhotos); };
        
        profileActions.append(downloadProfileBtn, deleteProfileBtn);
        profileHeader.append(profileTitle, profileActions);
        
        const photosGrid = document.createElement('div');
        photosGrid.className = 'profile-photos-grid';
        
        for (const photo of userPhotos) {
            const { data: { publicUrl } } = supabaseClient.storage.from('photos').getPublicUrl(photo.file_path);
            
            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            
            const img = document.createElement('img');
            img.src = publicUrl;
            img.alt = photo.file_name;
            
            const overlay = document.createElement('div');
            overlay.className = 'image-overlay';
            
            const downloadBtn = document.createElement('button');
            downloadBtn.className = 'overlay-btn';
            downloadBtn.innerHTML = '&#x21E9;'; // Down arrow
            downloadBtn.title = 'Download Photo';
            downloadBtn.onclick = (e) => { e.stopPropagation(); handleDownloadPhoto(publicUrl, photo.file_name); };
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'overlay-btn';
            deleteBtn.innerHTML = '&#x1F5D1;'; // Trash can
            deleteBtn.title = 'Delete Photo';
            deleteBtn.onclick = (e) => { e.stopPropagation(); handleDeletePhoto(photo.id, photo.file_path); };
            
            overlay.append(downloadBtn, deleteBtn);
            galleryItem.append(img, overlay);
            photosGrid.appendChild(galleryItem);
        }

        profileSection.append(profileHeader, photosGrid);
        profilesGallery.appendChild(profileSection);
    }
}

function renderGalleryGrid() {
    galleryGrid.innerHTML = '';
    if (allPhotos.length === 0) {
        galleryGrid.innerHTML = '<p>No photos have been uploaded yet. Go to the uploader to add some!</p>';
        return;
    }

    allPhotos.forEach((photo, index) => {
        const { data: { publicUrl } } = supabaseClient.storage.from('photos').getPublicUrl(photo.file_path);
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.innerHTML = `<img src="${publicUrl}" alt="${photo.file_name}" loading="lazy">`;
        item.onclick = () => openLightbox(index);
        galleryGrid.appendChild(item);
    });
}

// --- 7. LIGHTBOX LOGIC ---
function openLightbox(index) {
    currentLightboxIndex = index;
    updateLightboxImage();
    lightbox.style.display = 'flex';
    document.addEventListener('keydown', handleKeyPress);
}

function closeLightbox() {
    lightbox.style.display = 'none';
    document.removeEventListener('keydown', handleKeyPress);
}

function showNextImage() {
    currentLightboxIndex = (currentLightboxIndex + 1) % allPhotos.length;
    updateLightboxImage();
}

function showPrevImage() {
    currentLightboxIndex = (currentLightboxIndex - 1 + allPhotos.length) % allPhotos.length;
    updateLightboxImage();
}

function updateLightboxImage() {
    if (allPhotos.length === 0) return;
    const photo = allPhotos[currentLightboxIndex];
    const { data: { publicUrl } } = supabaseClient.storage.from('photos').getPublicUrl(photo.file_path);
    lightboxImg.src = publicUrl;
    lightboxCaption.textContent = `Uploaded by: ${photo.username || 'Anonymous'}`;
}

function handleKeyPress(e) {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') showNextImage();
    if (e.key === 'ArrowLeft') showPrevImage();
}

closeBtn.addEventListener('click', closeLightbox);
prevBtn.addEventListener('click', showPrevImage);
nextBtn.addEventListener('click', showNextImage);

// --- 8. ACTION HANDLERS (Delete/Download) ---
async function handleDeletePhoto(photoId, filePath) {
    if (!confirm('Are you sure you want to delete this photo?')) return;
    try {
        const { error: storageError } = await supabaseClient.storage.from('photos').remove([filePath]);
        if (storageError) throw storageError;

        const { error: dbError } = await supabaseClient.from('uploaded_photos').delete().eq('id', photoId);
        if (dbError) throw dbError;

        await loadAndRenderGalleries();
    } catch (error) {
        alert(`Failed to delete photo: ${error.message}`);
    }
}

async function handleDeleteProfile(username, photos) {
    if (!confirm(`Are you sure you want to delete ALL ${photos.length} photos for "${username}"? This cannot be undone.`)) return;
    try {
        const filePaths = photos.map(p => p.file_path);
        
        const { error: storageError } = await supabaseClient.storage.from('photos').remove(filePaths);
        if (storageError) throw storageError;
        
        const { error: dbError } = await supabaseClient.from('uploaded_photos').delete().eq('username', username);
        if (dbError) throw dbError;
        
        await loadAndRenderGalleries();
    } catch (error) {
        alert(`Failed to delete profile: ${error.message}`);
    }
}

async function handleDownloadPhoto(publicUrl, fileName) {
    try {
        const response = await fetch(publicUrl);
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    } catch (error) {
        alert(`Failed to download photo: ${error.message}`);
    }
}

async function handleDownloadProfile(username, photos, button) {
    button.disabled = true;
    button.textContent = 'Zipping...';
    try {
        const zip = new JSZip();
        
        const fetchPromises = photos.map(async (photo) => {
            const { data: { publicUrl } } = supabaseClient.storage.from('photos').getPublicUrl(photo.file_path);
            const response = await fetch(publicUrl);
            const blob = await response.blob();
            // Use a unique name in the zip file in case of duplicates
            const uniqueFileName = `${photo.id}-${photo.file_name}`;
            zip.file(uniqueFileName, blob);
        });
        
        await Promise.all(fetchPromises);
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = `${username.replace(/ /g, '_')}_photos.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

    } catch (error) {
        alert(`Failed to create zip file: ${error.message}`);
    } finally {
        button.disabled = false;
        button.textContent = 'Download ZIP';
    }
}

// --- 9. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadAndRenderGalleries();
    showView('uploader'); // Start on the uploader page by default
});