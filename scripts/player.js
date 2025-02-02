const API_URL = localStorage.getItem("AFTERTV_API_URL") || "";
let video, ui, controls, player = null;


async function init() {
    if (!API_URL) return;

    video = document.getElementById('video');
    ui = video.ui;
    controls = ui.getControls();
    player = controls.getPlayer();

    await applyStyle();
    await loadChannels();
}


async function applyStyle() {
    ui.configure({
        seekBarColors: {
            base: 'rgba(54, 20, 112, 0.3)',
            buffered: 'rgba(54, 20, 112, 0.6)',
            played: 'rgba(54, 20, 112, 0.9)'
        },
        seekOnTaps: true,
        volumeBarColors: {
            base: 'rgba(54, 20, 112, 0.54)',
            level: 'rgba(54, 20, 112, 1)'
        },
        preferDocumentPictureInPicture: false
    });

    const timeStep = 10;
    const volumeStep = 0.05;
    document.addEventListener('keydown', (e) => {
        switch (e.key) {
            // Play/Pause
            case ' ':
                e.preventDefault();
                video.paused ? video.play() : video.pause();
                break;

            // Volume
            case 'ArrowUp':
                e.preventDefault();
                try {
                    video.volume += volumeStep;
                } catch {
                    video.volume = 1;
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                try {
                    video.volume -= volumeStep;
                } catch {
                    video.volume = 0;
                }
                break;

            // Seek
            case 'ArrowLeft':
                e.preventDefault();
                video.currentTime -= timeStep;
                break;
            case 'ArrowRight':
                video.currentTime += timeStep;
                break;

            // Mute
            case 'm':
                e.preventDefault();
                video.muted = !video.muted;
                break;
        }
    });
}


async function loadChannels() {
    const channelsList = document.getElementById('channels-list');
    const response = await fetch(`${API_URL}/channels`);
    const channels = await response.json();

    for (const channel of channels) {
        const button = document.createElement('button');
        button.textContent = channel.name;
        button.addEventListener('click', () => {
            loadChannel(channel.id);
        });
        channelsList.appendChild(button);
    }
}


async function loadChannel(channelId) {
    const response = await fetch(`${API_URL}/channels/${channelId}`);
    const channel = await response.json();
    
    player.configure({
        drm: {
            clearKeys: {
                [channel.stream_id]: channel.stream_key
            }
        }
    });

    await player.load(channel.manifest).then(() => {
        console.log('Loaded channel:', channel.name, "| Is live:", player.isLive());
        document.title = `${channel.name} | AfterTV Player`;
    }).catch((error) => {
        console.error('Error loading channel:', error);
    });
}


function openSettings() {
    document.getElementById("settings-modal").style.display = "block";
    document.getElementById("api-url").value = API_URL;
}


function saveSettings() {
    let api_url = document.getElementById("api-url").value;
    localStorage.setItem("AFTERTV_API_URL", api_url);
    location.reload();
}


document.addEventListener('shaka-ui-loaded', init);
document.addEventListener("DOMContentLoaded", () => {
    if (!API_URL) openSettings();
});
