"use client";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import videojs from "video.js";
import "video.js/dist/video-js.css";
// You might need to import a dark Video.js skin, 
// for example: import 'videojs-themes/dist/fantasy.css';

const socket = io("https://watch2gether-9ijg.onrender.com", {
  transports: ["websocket"],
  upgrade: false // Prevents falling back to polling if websocket fails
});

// const socket = io("http://localhost:3001"); // backend URL
// const socket = io("https://watch2gether-9ijg.onrender.com"); // backend URL

// --- DARK MODE STYLES ---
const styles = {
  container: {
    padding: "40px",
    backgroundColor: "#1e1e1e", // Dark background
    color: "#e0e0e0", // Light text
    minHeight: "100vh",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  header: {
    color: "#64b5f6", // Light blue accent for the title
    marginBottom: "30px",
    borderBottom: "2px solid #333",
    paddingBottom: "10px",
  },
  inputGroup: {
    display: "flex",
    gap: "30px",
    marginBottom: "30px",
    flexWrap: "wrap",
  },
  label: {
    fontSize: "1rem",
    fontWeight: "600",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
  },
  fileInput: {
    marginTop: "5px",
    padding: "8px",
    backgroundColor: "#333",
    border: "1px solid #555",
    borderRadius: "4px",
    color: "#e0e0e0",
  },
  videoWrapper: {
    marginTop: "20px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)", // Subtle shadow
  }
};
// -------------------------

export default function Home() {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [videoURL, setVideoURL] = useState(null);
  const [subtitleURL, setSubtitleURL] = useState(null);
  const lastRemoteAction = useRef(0);
  const IGNORE_WINDOW = 600;

  // Handle video file upload
  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setVideoURL(URL.createObjectURL(file));
  };

  // Handle subtitle file upload (SRT or VTT)
  const handleSubtitleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const subtitleBlobURL = URL.createObjectURL(file);
    setSubtitleURL(subtitleBlobURL);
  };

  useEffect(() => {
    if (!videoURL) return;

    // Initialize Video.js
    if (!playerRef.current) {
      playerRef.current = videojs(videoRef.current, {
        controls: true,
        preload: "auto",
        // Optional: Add a dark skin class if you have one imported
        // for example: className: "video-js vjs-big-play-centered vjs-theme-fantasy",
      });
    }

    const player = playerRef.current;
    player.src({ src: videoURL, type: "video/mp4" });

    // Add subtitle track if available
    if (subtitleURL) {
      // Remove existing tracks safely
      Array.from(player.remoteTextTracks()).forEach((track) =>
        player.removeRemoteTextTrack(track)
      );

      player.addRemoteTextTrack(
        {
          kind: "subtitles",
          src: subtitleURL,
          srclang: "en",
          label: "Custom Subtitle",
          default: true,
        },
        false
      );
    }

    // --- LOCAL EVENTS ---
    const emitPlay = () => {
      if (Date.now() - lastRemoteAction.current > IGNORE_WINDOW) {
        socket.emit("play", player.currentTime());
      }
    };
    const emitPause = () => {
      if (Date.now() - lastRemoteAction.current > IGNORE_WINDOW) {
        socket.emit("pause", player.currentTime());
      }
    };
    const emitSeek = () => {
      if (Date.now() - lastRemoteAction.current > IGNORE_WINDOW) {
        socket.emit("seek", player.currentTime());
      }
    };

    player.on("play", emitPlay);
    player.on("pause", emitPause);
    player.on("seeked", emitSeek);

    // --- PERIODIC SYNC ---
    // const syncInterval = setInterval(() => {
    //   if (!player.paused()) socket.emit("sync", player.currentTime());
    // }, 2000);

    // --- REMOTE EVENTS ---
    socket.on("play", (time) => {
      lastRemoteAction.current = Date.now();
      player.currentTime(time);
      player.play();
    });
    socket.on("pause", (time) => {
      lastRemoteAction.current = Date.now();
      player.currentTime(time);
      player.pause();
    });
    socket.on("seek", (time) => {
      lastRemoteAction.current = Date.now();
      player.currentTime(time);
    });
    socket.on("sync", (time) => {
      const drift = player.currentTime() - time;
      if (Math.abs(drift) > 0.5) {
        player.currentTime(time);
      } else if (Math.abs(drift) > 0.1) {
        player.playbackRate(drift > 0 ? 0.95 : 1.05);
        setTimeout(() => player.playbackRate(1), 1000);
      }
    });

    return () => {
      // clearInterval(syncInterval);
      player.off("play", emitPlay);
      player.off("pause", emitPause);
      player.off("seeked", emitSeek);
      socket.off("play");
      socket.off("pause");
      socket.off("seek");
      socket.off("sync");
    };
  }, [videoURL, subtitleURL]);

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>🎥 Watch2Gether</h2>

      <div style={styles.inputGroup}>
        <label style={styles.label}>
          Upload Video:
          <input
            type="file"
            accept="video/*,.mkv,.mp4"
            onChange={handleVideoUpload}
            style={styles.fileInput}
          />
        </label>

        <label style={styles.label}>
          Upload Subtitle (SRT/VTT):
          <input
            type="file"
            accept=".srt,.vtt"
            onChange={handleSubtitleUpload}
            style={styles.fileInput}
          />
        </label>
      </div>

      {videoURL && (
        <div data-vjs-player style={styles.videoWrapper}>
          <video
            ref={videoRef}
            // Add a dark skin class here if you have one installed (e.g., vjs-theme-city)
            className="video-js vjs-big-play-centered"
            width="1280"
            height="720"
          />
        </div>
      )}
    </div>
  );
}