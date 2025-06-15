const API_URL = localStorage.getItem("AFTERTV_API_URL") || "";
let video,
  ui,
  controls,
  player = null;
const JSON_DATA = localStorage.getItem("AFTERTV_JSON_DATA");
let data = JSON_DATA ? JSON.parse(JSON_DATA) : null;

async function init() {
  video = document.getElementById("video");
  ui = video.ui;
  controls = ui.getControls();
  player = controls.getPlayer();

  await applyUiConfig();
  await applyPlayerConfig();

  if (API_URL) {
    await loadCategoriesFromAPI();
  } else if (data) {
    await loadCategoriesFromJSON();
  } else {
    openSettings();
  }
}

async function applyUiConfig() {
  ui.configure({
    seekBarColors: {
      base: "rgba(54, 20, 112, 0.3)",
      buffered: "rgba(54, 20, 112, 0.6)",
      played: "rgba(54, 20, 112, 0.9)",
    },
    seekOnTaps: true,
    volumeBarColors: {
      base: "rgba(54, 20, 112, 0.6)",
      level: "rgba(54, 20, 112, 0.9)",
    },
    preferDocumentPictureInPicture: false,
    enableKeyboardPlaybackControls: false,   
    
    controlPanelElements: [
      "play_pause",
      "mute",
      "volume",
      "time_and_duration",
      "spacer",
      "picture_in_picture",
      "airplay",
      "cast",
      "remote",
      "overflow_menu",
      "fullscreen"
    ],

    overflowMenuButtons: [
      "quality",
      "language",
      "playback_rate",
      "statistics"
    ],
  });

  // Keyboard controls
  videoContainer = document.getElementById("video-container");
  document.addEventListener("keydown", (event) => {
    switch (event.key) {
      case " ":
      case "k":
        event.preventDefault();
        video.paused ? video.play() : video.pause();
        break;
      case "f":
        event.preventDefault();
        !!document.fullscreenElement ? document.exitFullscreen() : videoContainer.requestFullscreen();
        break;
      case "p":
        event.preventDefault();
        !!document.pictureInPictureElement ? document.exitPictureInPicture() : video.requestPictureInPicture();
        break;
      case "m":
        event.preventDefault();
        video.muted = !video.muted;
        break;
      case "ArrowLeft":
      case "j":
        event.preventDefault();
        video.currentTime -= 10;
        break;
      case "ArrowRight":
      case "l":
        event.preventDefault();
        video.currentTime += 10;
        break;
      case "ArrowUp":
        event.preventDefault();
        video.volume = Math.min(video.volume+0.1, 1);
        break;
      case "ArrowDown":
        event.preventDefault();
        video.volume = Math.max(video.volume-0.1, 0);
        break;
      case "s":
        event.preventDefault();
        openSettings();
        break;
    }
  });
}

async function applyPlayerConfig() {
    video.addEventListener("enterpictureinpicture", () => {
    if (video.paused) {
      video.play().catch((error) => {
        console.error("Error playing video:", error);
      });
    }
  });

  player.configure({
    streaming: {
      lowLatencyMode: true,
      bufferBehind: 120,
      bufferingGoal: 300,
      rebufferingGoal: 0
    }
  });
}

async function loadCategoriesFromAPI() {
  const channelsList = document.getElementById("channels-list");
  channelsList.innerHTML = "";

  const response = await fetch(`${API_URL}/categories`);
  const categories = await response.json();

  for (const category of categories) {
    const categoryDiv = document.createElement("div");
    categoryDiv.classList.add("category");
    categoryDiv.innerHTML = `<h3>${category.name}</h3>`;

    const channelsContainer = document.createElement("div");
    channelsContainer.classList.add("channels-container");
    categoryDiv.appendChild(channelsContainer);
    channelsList.appendChild(categoryDiv);

    await loadChannelsFromAPI(category.id, channelsContainer);
  }
}

async function loadChannelsFromAPI(categoryId, container) {
  const response = await fetch(`${API_URL}/categories/${categoryId}`);
  const data = await response.json();

  for (const channel of data.channels) {
    const button = document.createElement("button");
    button.textContent = channel.name;
    button.style.borderColor = data.color;
    button.addEventListener("click", () => loadChannelFromAPI(channel.id));
    container.appendChild(button);
  }
}

async function loadChannelFromAPI(channelId) {
  const response = await fetch(`${API_URL}/channels/${channelId}`);
  const channel = await response.json();

  if (channel.type === "clearkey") {
    player.configure({
      drm: {
        clearKeys: {
          [channel.stream_id]: channel.stream_key,
        },
      },
    });
  }

  await player.load(channel.manifest).then(() => {
    document.title = `${channel.name} | AfterTV Player`;
  });
}

async function loadCategoriesFromJSON() {
  const channelsList = document.getElementById("channels-list");
  channelsList.innerHTML = "";

  for (const category of data.categories) {
    const categoryDiv = document.createElement("div");
    categoryDiv.classList.add("category");
    categoryDiv.innerHTML = `<h3>${category.name}</h3>`;

    const channelsContainer = document.createElement("div");
    channelsContainer.classList.add("channels-container");
    categoryDiv.appendChild(channelsContainer);
    channelsList.appendChild(categoryDiv);

    loadChannelsFromJSON(category, channelsContainer);
  }
}

function loadChannelsFromJSON(category, container) {
  for (const channel of category.channels) {
    const button = document.createElement("button");
    button.textContent = channel.name;
    button.style.borderColor = category.color;
    button.addEventListener("click", () => loadChannelFromJSON(channel.id));
    container.appendChild(button);
  }
}

async function loadChannelFromJSON(channelId) {
  try {
    const channel = data.channels.find((c) => c.id === channelId);

    if (!channel) {
      throw new Error(`Channel with ID ${channelId} not found.`);
    }

    if (channel.type === "clearkey") {
      player.configure({
        drm: {
          clearKeys: {
            [channel.stream_id]: channel.stream_key,
          },
        },
      });
    }

    await player.load(channel.manifest).then(() => {
      document.title = `${channel.name} | AfterTV Player`;
    });
  } catch (error) {
    console.error("Error loading channel:", error);
    alert(`Error loading channel: ${error.message}`);
  }
}

function openSettings() {
  document.getElementById("settings-modal").style.display = "block";
  document.getElementById("api-url").value = API_URL;
  document.getElementById("json-file").value = "";
}

function clearSettings() {
    localStorage.removeItem("AFTERTV_API_URL");
    localStorage.removeItem("AFTERTV_JSON_DATA");
    location.reload();
}

function saveSettings() {
  const api_url = document.getElementById("api-url").value;
  const jsonFile = document.getElementById("json-file").files[0];

  if (api_url) {
    localStorage.setItem("AFTERTV_API_URL", api_url);
    localStorage.removeItem("AFTERTV_JSON_DATA");
    location.reload();
  } else if (jsonFile) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const jsonData = e.target.result;
      localStorage.setItem("AFTERTV_JSON_DATA", jsonData);
      localStorage.removeItem("AFTERTV_API_URL");
      location.reload();
    };
    reader.readAsText(jsonFile);
  }
  else {
    document.getElementById("settings-modal").style.display = "none";
  }
}

document.addEventListener("shaka-ui-loaded", init);
