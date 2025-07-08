import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import html2pdf from "html2pdf.js";
import "./App.css";

const socket = io(process.env.REACT_APP_BACKEND_URL || "http://localhost:4000");


function App() {
  const [text, setText] = useState("");
  const [isDark, setIsDark] = useState(false);
  const [title, setTitle] = useState("Real-Time Document Editor 📝");
  const [saveStatus, setSaveStatus] = useState("Saved ✅");
  const [lastEdited, setLastEdited] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [listening, setListening] = useState(false);
  const [username, setUsername] = useState("");
  const [inputName, setInputName] = useState("");
  const [others, setOthers] = useState([]);

  const micRef = useRef(null);

  useEffect(() => {
    micRef.current = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    micRef.current.continuous = true;
    micRef.current.interimResults = true;
    micRef.current.lang = "en-IN";
  }, []);

  useEffect(() => {
    socket.on("load-document", (data) => setText(data));
    socket.on("receive-changes", (data) => setText(data));
    return () => {
      socket.off("load-document");
      socket.off("receive-changes");
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("dark", isDark);
  }, [isDark]);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (username) {
      socket.emit("join-user", username);
    }

    socket.on("user-joined", (name) => {
      setOthers((prev) => [...prev, name]);
    });

    return () => {
      socket.off("user-joined");
    };
  }, [username]);

  useEffect(() => {
    const mic = micRef.current;
    if (!mic) return;

    mic.onstart = () => console.log("Mic started");
    mic.onend = () => console.log("Mic stopped");
    mic.onresult = (event) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        }
      }
      if (finalTranscript) {
        setText((prev) => prev + finalTranscript.trim() + " ");
      }
    };

    if (listening) mic.start();
    else mic.stop();
  }, [listening]);

  const toggleListening = () => {
    setListening((prev) => !prev);
  };

  const handleChange = (e) => {
    setText(e.target.value);
    setSaveStatus("Saving...");
    setLastEdited(new Date());
    socket.emit("send-changes", e.target.value);
    setTimeout(() => setSaveStatus("Saved ✅"), 600);
  };

  const formatTime = (date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const countWords = (text) =>
    text.trim() === "" ? 0 : text.trim().split(/\s+/).length;

  const exportToPDF = () => {
    const element = document.createElement("div");
    element.innerHTML = `<h2>${title}</h2><pre style="font-size: 14px; font-family: 'Segoe UI', sans-serif;">${text}</pre>`;
    html2pdf()
      .from(element)
      .set({
        margin: 0.5,
        filename: `${title || "document"}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: "in", format: "a4", orientation: "portrait" }
      })
      .save();
  };

  if (!username) {
    return (
      <div className="App">
        <div className="name-form">
          <h2>Enter your name to start editing</h2>
          <input
            type="text"
            placeholder="Your name"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
          />
          <button
            disabled={!inputName.trim()}
            onClick={() => setUsername(inputName.trim())}
          >
            Start Writing ✏️
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="toolbar">
        <h1
          className="title-input"
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => setTitle(e.target.textContent)}
        >
          {title}
        </h1>

        <div className="toolbar-buttons">
          <button onClick={() => setIsDark(!isDark)}>
            {isDark ? "☀ Light" : "🌙 Dark"}
          </button>
          <button onClick={() => setText("")}>🗑 Clear</button>
          <button
            onClick={() => {
              const element = document.createElement("a");
              const file = new Blob([text], { type: "text/plain" });
              element.href = URL.createObjectURL(file);
              element.download = `${title}.txt`;
              element.click();
            }}
          >
            ⬇ Download
          </button>
          <button onClick={exportToPDF}>📄 Export as PDF</button>
          <button onClick={toggleListening}>
            {listening ? "🛑 Stop Mic" : "🎙 Start Mic"}
          </button>
        </div>

        <div className="user-badge">
          🪪 You are editing as: <strong>{username}</strong>
        </div>
      </div>

      <div className="editor-container">
        <textarea
          value={text}
          onChange={handleChange}
          placeholder="Start typing collaboratively..."
        />
        <div className="info-bar">
          <span>{countWords(text)} words / {text.length} characters</span>
          <span>{saveStatus}</span>
        </div>
        <div className="last-edited">
          Last edited: {formatTime(lastEdited)} | Live: {formatTime(time)}
        </div>
      </div>

      {others.length > 0 && (
        <div className="other-users">
          👥 Others editing: {others.join(", ")}
        </div>
      )}

      <footer>
        Made with ❤️ by Sonakshi Soni • Real-Time Editor
      </footer>
    </div>
  );
}

export default App;
