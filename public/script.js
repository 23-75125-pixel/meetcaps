// DOM Elements
const joinScreen = document.getElementById('joinScreen');
const meetingRoom = document.getElementById('meetingRoom');
const joinButton = document.getElementById('joinButton');
const newMeetingButton = document.getElementById('newMeetingButton');
const userNameInput = document.getElementById('userName');
const roomIdInput = document.getElementById('roomId');
const currentRoomId = document.getElementById('currentRoomId');
const meetingTime = document.getElementById('meetingTime');
const participantCount = document.getElementById('participantCount');
const videoGrid = document.getElementById('videoGrid');
const emptyState = document.getElementById('emptyState');
const sidebar = document.getElementById('sidebar');
const sidebarTitle = document.getElementById('sidebarTitle');
const sidebarContent = document.getElementById('sidebarContent');
const toggleParticipants = document.getElementById('toggleParticipants');
const toggleChat = document.getElementById('toggleChat');
const closeSidebar = document.getElementById('closeSidebar');
const micButton = document.getElementById('micButton');
const cameraButton = document.getElementById('cameraButton');
const screenShareButton = document.getElementById('screenShareButton');
const recordButton = document.getElementById('recordButton');
const leaveButton = document.getElementById('leaveButton');
const pasteBtn = document.getElementById('pasteBtn');
const generateBtn = document.getElementById('generateBtn');
const shareLinkInMeeting = document.getElementById('shareLinkInMeeting');
const shareMeetingBtn = document.getElementById('shareMeetingBtn');
const shareInfo = document.getElementById('shareInfo');
const shareLinkInput = document.getElementById('shareLink');
const copyLinkBtn = document.getElementById('copyLinkBtn');

// App State
let socket;
let localStream;
let remoteStreams = new Map();
let peerConnections = new Map();
let roomId = null;
let userName = 'Guest';
let isAudioOn = true;
let isVideoOn = true;
let isScreenSharing = false;
let isRecording = false;
let meetingStartTime = null;
let meetingTimer = null;
let sidebarView = 'participants';
let participants = new Map();
let chatMessages = [];
let activeSpeaker = null;

// Configuration for WebRTC
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
    ]
};

// Initialize the application
function initApp() {
    // Connect to Socket.io server
    const serverUrl = window.CONFIG?.SERVER_URL || 'http://localhost:3001';
    console.log('Connecting to server:', serverUrl);
    
    socket = io(serverUrl, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5
    });
    
    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        showNotification('Connection Error', 'Failed to connect to server. Make sure the backend is running at: ' + serverUrl);
    });
    
    // Set up event listeners
    setupEventListeners();
    
    // Check URL for room ID
    checkUrlForRoomId();
    
    // Generate random room ID if needed
    generateBtn.addEventListener('click', generateRandomRoomId);
    
    // Paste from clipboard
    pasteBtn.addEventListener('click', pasteFromClipboard);
    
    // Copy share link
    copyLinkBtn?.addEventListener('click', copyShareLink);
}

// Set up event listeners
function setupEventListeners() {
    joinButton.addEventListener('click', joinMeeting);
    newMeetingButton.addEventListener('click', createNewMeeting);
    toggleParticipants.addEventListener('click', () => showSidebar('participants'));
    toggleChat.addEventListener('click', () => showSidebar('chat'));
    closeSidebar.addEventListener('click', hideSidebar);
    micButton.addEventListener('click', toggleAudio);
    cameraButton.addEventListener('click', toggleVideo);
    screenShareButton.addEventListener('click', toggleScreenShare);
    recordButton.addEventListener('click', toggleRecording);
    leaveButton.addEventListener('click', leaveMeeting);
    shareLinkInMeeting?.addEventListener('click', showShareLink);
    shareMeetingBtn?.addEventListener('click', showShareLink);
    
    // Enter key to join meeting
    roomIdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinMeeting();
    });
    
    userNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinMeeting();
    });
    
    // Socket.io event handlers
    socket.on('connect', () => {
        console.log('Connected to server with ID:', socket.id);
    });
    
    socket.on('room-created', ({ roomId, userName }) => {
        showNotification('Meeting created!', 'Share the link with others to invite them.');
        roomIdInput.value = roomId;
        updateShareLink(roomId);
        shareInfo.classList.remove('hidden');
    });
    
    socket.on('room-joined', ({ roomId, userId, userName, users }) => {
        console.log('Joined room:', roomId);
        enterMeetingRoom(roomId, userName);
        
        // Initialize connections with existing users
        users.forEach(user => {
            if (user.id !== userId) {
                createPeerConnection(user.id, user.name);
            }
        });
    });
    
    socket.on('user-joined', ({ userId, userName, usersCount }) => {
        showNotification(`${userName} joined the meeting`, `${usersCount} participants in the room`);
        updateParticipantCount(usersCount);
        
        // Create peer connection for new user
        createPeerConnection(userId, userName);
        
        // Update participants list
        participants.set(userId, { id: userId, name: userName, isAudioOn: true, isVideoOn: true });
        renderParticipantsList();
        
        // Hide empty state if needed
        if (emptyState && usersCount > 1) {
            emptyState.classList.add('hidden');
        }
    });
    
    socket.on('user-left', ({ userId, userName, usersCount }) => {
        showNotification(`${userName} left the meeting`, `${usersCount} participants remaining`);
        updateParticipantCount(usersCount);
        
        // Clean up peer connection
        closePeerConnection(userId);
        
        // Remove from participants
        participants.delete(userId);
        renderParticipantsList();
        
        // Show empty state if alone
        if (emptyState && usersCount === 1) {
            emptyState.classList.remove('hidden');
        }
    });
    
    socket.on('offer', async ({ offer, from }) => {
        console.log('Received offer from:', from);
        
        try {
            const peerConnection = getOrCreatePeerConnection(from);
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            
            socket.emit('answer', { answer, to: from });
        } catch (error) {
            console.error('Error handling offer:', error);
        }
    });
    
    socket.on('answer', async ({ answer, from }) => {
        console.log('Received answer from:', from);
        
        const peerConnection = peerConnections.get(from);
        if (peerConnection) {
            try {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            } catch (error) {
                console.error('Error handling answer:', error);
            }
        }
    });
    
    socket.on('ice-candidate', async ({ candidate, from }) => {
        console.log('Received ICE candidate from:', from);
        
        const peerConnection = peerConnections.get(from);
        if (peerConnection) {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
                console.error('Error adding ICE candidate:', error);
            }
        }
    });
    
    socket.on('user-audio-toggled', ({ userId, isAudioOn }) => {
        const participant = participants.get(userId);
        if (participant) {
            participant.isAudioOn = isAudioOn;
            renderParticipantsList();
            updateVideoTileAudio(userId, isAudioOn);
        }
    });
    
    socket.on('user-video-toggled', ({ userId, isVideoOn }) => {
        const participant = participants.get(userId);
        if (participant) {
            participant.isVideoOn = isVideoOn;
            renderParticipantsList();
            updateVideoTileVideo(userId, isVideoOn);
        }
    });
    
    socket.on('new-message', ({ userId, userName, message, timestamp }) => {
        addChatMessage(userId, userName, message, timestamp, userId === socket.id);
        if (sidebarView !== 'chat') {
            // Show notification for new message when chat is not open
            showNotification(`New message from ${userName}`, message.substring(0, 50) + '...');
        }
    });
}

// Check URL for room ID
function checkUrlForRoomId() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomIdFromUrl = urlParams.get('room');
    
    if (roomIdFromUrl) {
        roomIdInput.value = roomIdFromUrl;
        // Check if room exists
        socket.emit('get-room-info', { roomId: roomIdFromUrl });
        
        socket.once('room-info', ({ exists }) => {
            if (exists) {
                showNotification('Room found!', 'Enter your name and click Join Meeting');
            }
        });
    }
}

// Generate random room ID
function generateRandomRoomId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 3; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code += '-';
    for (let i = 0; i < 3; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code += '-';
    for (let i = 0; i < 3; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    roomIdInput.value = code;
}

// Paste from clipboard
async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        if (text) {
            roomIdInput.value = text;
            showNotification('Pasted from clipboard', 'Click Join Meeting to continue');
        }
    } catch (err) {
        console.error('Failed to paste:', err);
        showNotification('Error', 'Could not paste from clipboard');
    }
}

// Ensure we have a local audio track (request microphone if needed)
async function ensureLocalAudio() {
    try {
        if (!localStream) {
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } else if (localStream.getAudioTracks().length === 0) {
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            const audioTrack = audioStream.getAudioTracks()[0];
            if (audioTrack) {
                localStream.addTrack(audioTrack);
                peerConnections.forEach((peerConnection) => {
                    try {
                        const sender = peerConnection.getSenders().find(s => s.track?.kind === 'audio');
                        if (sender) {
                            sender.replaceTrack(audioTrack);
                        } else {
                            peerConnection.addTrack(audioTrack, localStream);
                        }
                    } catch (e) {
                        console.warn('Could not add audio track to peer connection', e);
                    }
                });
            }
        }
        return true;
    } catch (err) {
        console.error('Error obtaining microphone:', err);
        showNotification('Microphone', 'Microphone access denied or unavailable');
        return false;
    }
}

// Join a meeting
async function joinMeeting() {
    roomId = roomIdInput.value.trim();
    userName = userNameInput.value.trim() || 'Guest';
    
    if (!roomId) {
        showNotification('Error', 'Please enter a meeting code');
        return;
    }
    
    if (!userName) {
        showNotification('Error', 'Please enter your name');
        return;
    }
    
    // Initialize local media
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 }
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });
        
        // Join the room
        socket.emit('join-room', { roomId, userName });
        
    } catch (error) {
        console.error('Error accessing media devices:', error);
        showNotification('Error', 'Could not access camera/microphone. Please check permissions.');
        
        // Try joining without video/audio
        socket.emit('join-room', { roomId, userName });
    }
}

// Create new meeting
function createNewMeeting() {
    userName = userNameInput.value.trim() || 'Host';
    socket.emit('create-room', { userName });
}

// Enter meeting room
function enterMeetingRoom(roomId, userName) {
    // Update UI
    joinScreen.classList.add('hidden');
    meetingRoom.classList.remove('hidden');
    currentRoomId.textContent = roomId;
    
    // Update URL without reloading
    const url = new URL(window.location);
    url.searchParams.set('room', roomId);
    window.history.pushState({}, '', url);
    
    // Update share link
    updateShareLink(roomId);
    shareInfo.classList.remove('hidden');
    
    // Start meeting timer
    startMeetingTimer();
    
    // Initialize local video
    if (localStream) {
        createLocalVideoTile();
    } else {
        // Create placeholder for local video
        createLocalVideoPlaceholder();
    }
    
    // Add self to participants
    participants.set(socket.id, { 
        id: socket.id, 
        name: userName, 
        isAudioOn: true, 
        isVideoOn: true 
    });
    
    // Show participants sidebar
    showSidebar('participants');
}

// Create local video tile
function createLocalVideoTile() {
    const videoItem = document.createElement('div');
    videoItem.className = 'video-item';
    videoItem.id = `video-${socket.id}`;
    
    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = localStream;
    
    const participantInfo = document.createElement('div');
    participantInfo.className = 'participant-info';
    
    const nameSpan = document.createElement('span');
    nameSpan.textContent = `${userName} (You)`;
    
    const audioIcon = document.createElement('i');
    audioIcon.className = `fas ${isAudioOn ? 'fa-microphone' : 'fa-microphone-slash participant-muted'}`;
    
    participantInfo.appendChild(nameSpan);
    participantInfo.appendChild(audioIcon);
    
    videoItem.appendChild(video);
    videoItem.appendChild(participantInfo);
    
    // Add active speaker indicator
    const audioVisualizer = document.createElement('div');
    audioVisualizer.className = 'audio-visualizer';
    audioVisualizer.innerHTML = '<i class="fas fa-volume-up"></i>';
    videoItem.appendChild(audioVisualizer);
    
    videoGrid.appendChild(videoItem);
    
    // Hide empty state
    if (emptyState) {
        emptyState.classList.add('hidden');
    }
}

// Create local video placeholder
function createLocalVideoPlaceholder() {
    const videoItem = document.createElement('div');
    videoItem.className = 'video-item';
    videoItem.id = `video-${socket.id}`;
    
    const placeholder = document.createElement('div');
    placeholder.className = 'video-placeholder';
    placeholder.innerHTML = `<i class="fas fa-user"></i>`;
    
    const participantInfo = document.createElement('div');
    participantInfo.className = 'participant-info';
    
    const nameSpan = document.createElement('span');
    nameSpan.textContent = `${userName} (You)`;
    
    const audioIcon = document.createElement('i');
    audioIcon.className = `fas ${isAudioOn ? 'fa-microphone' : 'fa-microphone-slash participant-muted'}`;
    
    participantInfo.appendChild(nameSpan);
    participantInfo.appendChild(audioIcon);
    
    videoItem.appendChild(placeholder);
    videoItem.appendChild(participantInfo);
    
    videoGrid.appendChild(videoItem);
    
    // Hide empty state
    if (emptyState) {
        emptyState.classList.add('hidden');
    }
}

// Create peer connection
function createPeerConnection(userId, userName) {
    if (peerConnections.has(userId)) {
        return peerConnections.get(userId);
    }
    
    const peerConnection = new RTCPeerConnection(configuration);
    peerConnections.set(userId, peerConnection);
    
    // Add local stream tracks
    if (localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
    }
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', { candidate: event.candidate, to: userId });
        }
    };
    
    // Handle remote stream
    peerConnection.ontrack = (event) => {
        console.log('Received remote track from:', userId);
        
        if (!remoteStreams.has(userId)) {
            const remoteStream = new MediaStream();
            remoteStreams.set(userId, remoteStream);
            
            event.streams[0].getTracks().forEach(track => {
                remoteStream.addTrack(track);
            });
            
            createRemoteVideoTile(userId, userName, remoteStream);
        }
    };
    
    // Create and send offer
    peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => {
            socket.emit('offer', { offer: peerConnection.localDescription, to: userId });
        })
        .catch(error => console.error('Error creating offer:', error));
    
    return peerConnection;
}

// Get or create peer connection
function getOrCreatePeerConnection(userId) {
    if (peerConnections.has(userId)) {
        return peerConnections.get(userId);
    }
    return createPeerConnection(userId, '');
}

// Close peer connection
function closePeerConnection(userId) {
    const peerConnection = peerConnections.get(userId);
    if (peerConnection) {
        peerConnection.close();
        peerConnections.delete(userId);
    }
    
    // Remove video tile
    const videoElement = document.getElementById(`video-${userId}`);
    if (videoElement) {
        videoElement.remove();
    }
    
    remoteStreams.delete(userId);
}

// Create remote video tile
function createRemoteVideoTile(userId, userName, remoteStream) {
    const videoItem = document.createElement('div');
    videoItem.className = 'video-item';
    videoItem.id = `video-${userId}`;
    
    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.srcObject = remoteStream;
    
    const participantInfo = document.createElement('div');
    participantInfo.className = 'participant-info';
    
    const nameSpan = document.createElement('span');
    nameSpan.textContent = userName;
    
    const audioIcon = document.createElement('i');
    audioIcon.className = `fas fa-microphone`;
    
    participantInfo.appendChild(nameSpan);
    participantInfo.appendChild(audioIcon);
    
    // Add active speaker indicator
    const audioVisualizer = document.createElement('div');
    audioVisualizer.className = 'audio-visualizer';
    audioVisualizer.innerHTML = '<i class="fas fa-volume-up"></i>';
    audioVisualizer.style.display = 'none';
    
    videoItem.appendChild(video);
    videoItem.appendChild(participantInfo);
    videoItem.appendChild(audioVisualizer);
    
    videoGrid.appendChild(videoItem);
    
    // Hide empty state
    if (emptyState) {
        emptyState.classList.add('hidden');
    }
    
    // Add to participants
    participants.set(userId, { 
        id: userId, 
        name: userName, 
        isAudioOn: true, 
        isVideoOn: true 
    });
    renderParticipantsList();
}

// Update video tile audio status
function updateVideoTileAudio(userId, isAudioOn) {
    const videoElement = document.getElementById(`video-${userId}`);
    if (videoElement) {
        const audioIcon = videoElement.querySelector('.participant-info i');
        if (audioIcon) {
            audioIcon.className = `fas ${isAudioOn ? 'fa-microphone' : 'fa-microphone-slash participant-muted'}`;
        }
    }
}

// Update video tile video status
function updateVideoTileVideo(userId, isVideoOn) {
    const videoElement = document.getElementById(`video-${userId}`);
    if (videoElement) {
        const video = videoElement.querySelector('video');
        const placeholder = videoElement.querySelector('.video-placeholder');
        
        if (isVideoOn) {
            if (placeholder) placeholder.style.display = 'none';
            if (video) video.style.display = 'block';
        } else {
            if (video) video.style.display = 'none';
            if (!placeholder) {
                const newPlaceholder = document.createElement('div');
                newPlaceholder.className = 'video-placeholder';
                newPlaceholder.innerHTML = `<i class="fas fa-user"></i>`;
                videoElement.appendChild(newPlaceholder);
            } else {
                placeholder.style.display = 'flex';
            }
        }
    }
}

// Start meeting timer
function startMeetingTimer() {
    meetingStartTime = new Date();
    
    meetingTimer = setInterval(() => {
        const now = new Date();
        const diff = now - meetingStartTime;
        
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        
        const timeString = 
            hours.toString().padStart(2, '0') + ':' +
            minutes.toString().padStart(2, '0') + ':' +
            seconds.toString().padStart(2, '0');
        
        meetingTime.textContent = timeString;
    }, 1000);
}

// Update participant count
function updateParticipantCount(count) {
    participantCount.textContent = count;
}

// Show sidebar
function showSidebar(view) {
    sidebarView = view;
    sidebar.classList.remove('collapsed');
    
    if (view === 'participants') {
        sidebarTitle.textContent = `Participants (${participants.size})`;
        renderParticipantsList();
    } else if (view === 'chat') {
        sidebarTitle.textContent = 'Chat';
        renderChat();
    }
}

// Hide sidebar
function hideSidebar() {
    sidebar.classList.add('collapsed');
}

// Render participants list
function renderParticipantsList() {
    sidebarContent.innerHTML = '<div class="participant-list"></div>';
    const participantList = sidebarContent.querySelector('.participant-list');
    
    participants.forEach((participant, userId) => {
        const item = document.createElement('div');
        item.className = `participant-item ${userId === socket.id ? 'you' : ''}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'participant-avatar';
        avatar.textContent = participant.name.charAt(0).toUpperCase();
        
        const details = document.createElement('div');
        details.className = 'participant-details';
        
        const name = document.createElement('div');
        name.className = 'participant-name';
        name.textContent = participant.name;
        
        if (userId === socket.id) {
            const youBadge = document.createElement('span');
            youBadge.className = 'participant-role';
            youBadge.textContent = ' (You)';
            name.appendChild(youBadge);
        }
        
        const role = document.createElement('div');
        role.className = 'participant-role';
        role.textContent = userId === socket.id ? 'Host' : 'Participant';
        
        details.appendChild(name);
        details.appendChild(role);
        
        const status = document.createElement('div');
        status.className = 'participant-status';
        
        const icons = [];
        
        if (!participant.isAudioOn) {
            icons.push('<i class="fas fa-microphone-slash" style="color:#ea4335"></i>');
        }
        
        if (!participant.isVideoOn) {
            icons.push('<i class="fas fa-video-slash"></i>');
        }
        
        if (activeSpeaker === userId) {
            icons.push('<i class="fas fa-volume-up" style="color:#4285f4"></i>');
        }
        
        status.innerHTML = icons.join(' ');
        
        item.appendChild(avatar);
        item.appendChild(details);
        item.appendChild(status);
        
        participantList.appendChild(item);
    });
}

// Render chat
function renderChat() {
    sidebarContent.innerHTML = `
        <div class="chat-container">
            <div class="chat-messages" id="chatMessagesContainer"></div>
            <div class="chat-input-container">
                <input type="text" class="chat-input" id="chatInput" placeholder="Type a message...">
                <button class="btn-icon" id="sendMessageBtn">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        </div>
    `;
    
    const chatMessagesContainer = document.getElementById('chatMessagesContainer');
    const chatInput = document.getElementById('chatInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    
    // Render existing messages
    chatMessages.forEach(message => {
        const messageElement = createChatMessageElement(message);
        chatMessagesContainer.appendChild(messageElement);
    });
    
    // Scroll to bottom
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    
    // Send message functionality
    function sendMessage() {
        const messageText = chatInput.value.trim();
        
        if (!messageText) return;
        
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Send to server
        socket.emit('send-message', { 
            roomId, 
            message: messageText, 
            userName 
        });
        
        // Clear input
        chatInput.value = '';
    }
    
    sendMessageBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
}

// Add chat message
function addChatMessage(userId, userName, message, timestamp, isSent) {
    const chatMessage = {
        userId,
        userName,
        message,
        timestamp,
        isSent
    };
    
    chatMessages.push(chatMessage);
    
    if (sidebarView === 'chat') {
        const chatMessagesContainer = document.getElementById('chatMessagesContainer');
        if (chatMessagesContainer) {
            const messageElement = createChatMessageElement(chatMessage);
            chatMessagesContainer.appendChild(messageElement);
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        }
    }
}

// Create chat message element
function createChatMessageElement(message) {
    const messageElement = document.createElement('div');
    messageElement.className = `chat-message ${message.isSent ? 'sent' : ''}`;
    
    const senderElement = document.createElement('div');
    senderElement.className = 'chat-sender';
    senderElement.innerHTML = `
        ${message.userName}
        <span class="chat-time">${message.timestamp}</span>
    `;
    
    const messageText = document.createElement('div');
    messageText.textContent = message.message;
    
    messageElement.appendChild(senderElement);
    messageElement.appendChild(messageText);
    
    return messageElement;
}

// Toggle audio
async function toggleAudio() {
    // Ensure we have an audio track available (request permission if needed)
    if (!localStream || localStream.getAudioTracks().length === 0) {
        const ok = await ensureLocalAudio();
        if (!ok) return;
    }

    isAudioOn = !isAudioOn;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
        audioTrack.enabled = isAudioOn;
    }
    
    // Update UI
    const micIcon = micButton.querySelector('i');
    const micText = micButton.querySelector('span');
    
    if (isAudioOn) {
        micIcon.className = 'fas fa-microphone';
        micText.textContent = 'Mute';
        micButton.classList.add('active');
    } else {
        micIcon.className = 'fas fa-microphone-slash';
        micText.textContent = 'Unmute';
        micButton.classList.remove('active');
    }
    
    // Notify others
    socket.emit('user-toggle-audio', { userId: socket.id, isAudioOn });
    
    // Update local video tile
    updateVideoTileAudio(socket.id, isAudioOn);
    
    // Update participants list
    const participant = participants.get(socket.id);
    if (participant) {
        participant.isAudioOn = isAudioOn;
        renderParticipantsList();
    }
}

// Toggle video
async function toggleVideo() {
    try {
        if (!isVideoOn) {
            // Turn video on
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                },
                audio: false
            });
            
            const videoTrack = newStream.getVideoTracks()[0];
            
            // Replace the video track in localStream
            if (localStream) {
                const oldVideoTrack = localStream.getVideoTracks()[0];
                if (oldVideoTrack) {
                    oldVideoTrack.stop();
                    localStream.removeTrack(oldVideoTrack);
                }
                localStream.addTrack(videoTrack);
            } else {
                localStream = new MediaStream([videoTrack]);
            }
            
            // Update all peer connections
            peerConnections.forEach((peerConnection, userId) => {
                const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video');
                if (sender) {
                    sender.replaceTrack(videoTrack);
                }
            });
            
            // Update local video tile
            const videoElement = document.querySelector(`#video-${socket.id} video`);
            if (videoElement) {
                videoElement.srcObject = localStream;
            }
        } else {
            // Turn video off
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.stop();
                localStream.removeTrack(videoTrack);
            }
        }
        
        isVideoOn = !isVideoOn;
        
        // Update UI
        const cameraIcon = cameraButton.querySelector('i');
        const cameraText = cameraButton.querySelector('span');
        
        if (isVideoOn) {
            cameraIcon.className = 'fas fa-video';
            cameraText.textContent = 'Stop Video';
            cameraButton.classList.add('active');
        } else {
            cameraIcon.className = 'fas fa-video-slash';
            cameraText.textContent = 'Start Video';
            cameraButton.classList.remove('active');
        }
        
        // Notify others
        socket.emit('user-toggle-video', { userId: socket.id, isVideoOn });
        
        // Update video tile
        updateVideoTileVideo(socket.id, isVideoOn);
        
        // Update participants list
        const participant = participants.get(socket.id);
        if (participant) {
            participant.isVideoOn = isVideoOn;
            renderParticipantsList();
        }
        
    } catch (error) {
        console.error('Error toggling video:', error);
        showNotification('Error', 'Could not toggle video');
    }
}

// Toggle screen share
async function toggleScreenShare() {
    try {
        if (!isScreenSharing) {
            // Start screen sharing
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });
            
            const screenTrack = screenStream.getVideoTracks()[0];
            
            // Replace video track in all peer connections
            peerConnections.forEach((peerConnection, userId) => {
                const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video');
                if (sender) {
                    sender.replaceTrack(screenTrack);
                }
            });
            
            // Update local video
            const videoElement = document.querySelector(`#video-${socket.id} video`);
            if (videoElement) {
                videoElement.srcObject = new MediaStream([screenTrack]);
            }
            
            // Handle when screen sharing stops
            screenTrack.onended = () => {
                toggleScreenShare();
            };
            
            isScreenSharing = true;
            screenShareButton.classList.add('active');
            showNotification('Screen Sharing', 'You are now sharing your screen');
        } else {
            // Stop screen sharing
            const videoTrack = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                }
            }).then(stream => stream.getVideoTracks()[0]);
            
            // Replace screen track with camera track
            peerConnections.forEach((peerConnection, userId) => {
                const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video');
                if (sender) {
                    sender.replaceTrack(videoTrack);
                }
            });
            
            // Update local video
            const videoElement = document.querySelector(`#video-${socket.id} video`);
            if (videoElement && localStream) {
                videoElement.srcObject = localStream;
            }
            
            isScreenSharing = false;
            screenShareButton.classList.remove('active');
            showNotification('Screen Sharing', 'Screen sharing stopped');
        }
    } catch (error) {
        console.error('Error toggling screen share:', error);
        if (error.name !== 'NotAllowedError') {
            showNotification('Error', 'Could not share screen');
        }
    }
}

// Toggle recording
function toggleRecording() {
    // Note: This is a simplified version. In production, you'd use MediaRecorder API
    isRecording = !isRecording;
    
    const recordIcon = recordButton.querySelector('i');
    const recordText = recordButton.querySelector('span');
    
    if (isRecording) {
        recordIcon.className = 'fas fa-square';
        recordText.textContent = 'Stop Recording';
        recordIcon.style.color = '#ea4335';
        recordButton.classList.add('active');
        showNotification('Recording', 'Meeting recording started');
    } else {
        recordIcon.className = 'fas fa-circle';
        recordText.textContent = 'Record';
        recordIcon.style.color = '';
        recordButton.classList.remove('active');
        showNotification('Recording', 'Meeting recording stopped');
    }
}

// Leave meeting
function leaveMeeting() {
    if (confirm('Are you sure you want to leave the meeting?')) {
        // Stop all media tracks
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        
        // Close all peer connections
        peerConnections.forEach((connection, userId) => {
            connection.close();
        });
        
        // Clear timers
        clearInterval(meetingTimer);
        
        // Disconnect socket
        socket.disconnect();
        
        // Reset UI
        meetingRoom.classList.add('hidden');
        joinScreen.classList.remove('hidden');
        
        // Clear video grid
        videoGrid.innerHTML = '';
        
        // Reset state
        remoteStreams.clear();
        peerConnections.clear();
        participants.clear();
        chatMessages = [];
        
        // Show empty state
        if (emptyState) {
            emptyState.classList.remove('hidden');
        }
        
        // Reconnect socket
        socket.connect();
    }
}

// Update share link
function updateShareLink(roomId) {
    const shareLink = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    if (shareLinkInput) {
        shareLinkInput.value = shareLink;
    }
}

// Show share link
function showShareLink() {
    updateShareLink(roomId);
    shareInfo.classList.remove('hidden');
    
    // Scroll to share info
    shareInfo.scrollIntoView({ behavior: 'smooth' });
    
    // Auto-select the link
    setTimeout(() => {
        shareLinkInput.select();
        shareLinkInput.focus();
    }, 100);
}

// Copy share link to clipboard
async function copyShareLink() {
    const link = (shareLinkInput && shareLinkInput.value) || `${window.location.origin}${window.location.pathname}?room=${roomId || ''}`;
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(link);
            showNotification('Link Copied', 'Meeting link copied to clipboard');
            return;
        }

        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = link;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (successful) {
            showNotification('Link Copied', 'Meeting link copied to clipboard');
        } else {
            throw new Error('Fallback copy failed');
        }
    } catch (err) {
        console.error('Failed to copy:', err);
        showNotification('Error', 'Could not copy link');
    }
}

// Show notification
function showNotification(title, message) {
    const notificationContainer = document.getElementById('notificationContainer');
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    
    notification.innerHTML = `
        <i class="fas fa-info-circle"></i>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    notificationContainer.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
    
    // Close button
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);