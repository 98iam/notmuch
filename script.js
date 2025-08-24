// --- 1. SUPABASE SETUP ---

const SUPABASE_URL = 'https://ycgfcgdpezrgpftcnagp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZ2ZjZ2RwZXpyZ3BmdGNuYWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwMDQwNTIsImV4cCI6MjA3MTU4MDA1Mn0.1hxe-8DCmpY8NMG4kL8YFH9712KYKsQSQn6dCfLpPZ8';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- 2. DOM ELEMENTS ---

const form = document.getElementById('upload-form');
const usernameInput = document.getElementById('username-input');
const photoInput = document.getElementById('photo-input');
const uploadButton = document.getElementById('upload-button');
const statusMessage = document.getElementById('status-message');
const previewText = document.getElementById('preview-text');
const gallery = document.getElementById('gallery');

// --- 3. EVENT LISTENERS ---

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

    if (!username) {
        setStatus('Please enter a name or device identifier.', 'error');
        return;
    }
    if (!files || files.length === 0) {
        setStatus('Please select at least one file to upload.', 'error');
        return;
    }

    uploadButton.disabled = true;
    setStatus(`Uploading ${files.length} photo(s)...`, '');

    const uploadPromises = Array.from(files).map(file => uploadPhoto(file, username));

    try {
        await Promise.all(uploadPromises);
        setStatus(`Successfully uploaded ${files.length} photo(s)!`, 'success');
        resetForm();
        await loadGalleryImages();
    } catch (err) {
        setStatus(`One or more uploads failed. Please check the console.`, 'error');
        console.error("Error during bulk upload:", err);
    } finally {
        uploadButton.disabled = false;
        uploadButton.textContent = 'Upload Photos';
    }
});

// --- 4. HELPER FUNCTIONS ---

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

async function loadGalleryImages() {
    const { data: photos, error } = await supabaseClient
        .from('uploaded_photos')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching photos:', error);
        return;
    }

    const photosByUsername = photos.reduce((acc, photo) => {
        const user = photo.username || 'Anonymous';
        if (!acc[user]) acc[user] = [];
        acc[user].push(photo);
        return acc;
    }, {});

    gallery.innerHTML = '';
    if (Object.keys(photosByUsername).length === 0) {
        const initialMessage = document.createElement('p');
        initialMessage.textContent = 'Your uploaded photos will appear here...';
        gallery.appendChild(initialMessage);
        return;
    }

    for (const username in photosByUsername) {
        const profileSection = document.createElement('div');
        profileSection.className = 'profile-section';

        const profileTitle = document.createElement('h3');
        profileTitle.textContent = username;
        profileSection.appendChild(profileTitle);

        const photosGrid = document.createElement('div');
        photosGrid.className = 'profile-photos-grid';

        for (const photo of photosByUsername[username]) {
            const { data: { publicUrl } } = supabaseClient.storage.from('photos').getPublicUrl(photo.file_path);
            
            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            const img = document.createElement('img');
            img.src = publicUrl;
            img.alt = photo.file_name;
            galleryItem.appendChild(img);
            photosGrid.appendChild(galleryItem);
        }

        profileSection.appendChild(photosGrid);
        gallery.appendChild(profileSection);
    }
}

// --- 5. INITIALIZATION ---
loadGalleryImages();    