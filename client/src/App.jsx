import { useState, useEffect } from "react";
import socket from "./socket";

function App() {
  const [step, setStep] = useState("join"); 
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [state, setState] = useState(null);
  const [vote, setVote] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);

  // to generate localStorage key per room+user
  const voteKey = (roomCode, name) => `vote:${roomCode}:${name}`;

  // Socket listeners
  useEffect(() => {
    socket.on("room_created", ({ roomCode, state }) => {
      setRoomCode(roomCode);
      setState(state);
      setStep("poll");
      setVote(localStorage.getItem(voteKey(roomCode, name)) || null);
    });

    socket.on("joined", ({ roomCode, state }) => {
      setRoomCode(roomCode);
      setState(state);
      setStep("poll");
      setVote(localStorage.getItem(voteKey(roomCode, name)) || null);
    });

    socket.on("state_updated", (room) => {
      setState({ ...room });
    });

    socket.on("poll_closed", (room) => {
      setState({ ...room, closed: true });
      localStorage.removeItem(voteKey(roomCode, name)); // ✅ reset for future polls
      setVote(null);
    });

    return () => {
      socket.off("room_created");
      socket.off("joined");
      socket.off("state_updated");
      socket.off("poll_closed");
    };
  }, [name]);

  // Timer
  useEffect(() => {
    if (state?.endTime && !state.closed) {
      const interval = setInterval(() => {
        const remaining = Math.max(
          0,
          Math.floor((state.endTime - Date.now()) / 1000)
        );
        setTimeLeft(remaining);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [state]);

  const createRoom = () => {
    socket.emit("create_room", { name, question, options });
  };

  const joinRoom = () => {
    socket.emit("join_room", { name, roomCode });
  };

  const castVote = (option) => {
    if (vote || state.closed) return;
    socket.emit("vote", { roomCode, name, option });
    setVote(option);
    localStorage.setItem(voteKey(roomCode, name), option); // ✅ store per room+user
  };

  // ------------------ UI ------------------
  if (step === "join") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
        <div className="bg-white/10 p-8 rounded-2xl shadow-lg w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-center">
            Live Poll Battle 
          </h2>

          <input
            className="w-full p-2 mb-4 rounded-lg text-black"
            placeholder="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Create Room</h3>
            <input
              className="w-full p-2 mb-2 rounded-lg text-black"
              placeholder="Question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <input
              className="w-full p-2 mb-2 rounded-lg text-black"
              placeholder="Option 1"
              value={options[0]}
              onChange={(e) => setOptions([e.target.value, options[1]])}
            />
            <input
              className="w-full p-2 mb-2 rounded-lg text-black"
              placeholder="Option 2"
              value={options[1]}
              onChange={(e) => setOptions([options[0], e.target.value])}
            />
            <button
              onClick={createRoom}
              className="w-full bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg font-semibold"
            >
              Create
            </button>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Join Room</h3>
            <input
              className="w-full p-2 mb-2 rounded-lg text-black"
              placeholder="Room Code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
            />
            <button
              onClick={joinRoom}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg font-semibold"
            >
              Join
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "poll" && state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4">{state.question}</h2>
          <p className="text-sm text-gray-500 mb-4">Room: {roomCode}</p>
          <p className="text-lg font-semibold mb-6">
            Time left: <span className="text-red-500">{timeLeft}s</span>
          </p>

          {state.options.map((opt) => (
            <button
              key={opt}
              disabled={vote || state.closed}
              onClick={() => castVote(opt)}
              className={`w-full mb-3 p-3 rounded-lg font-semibold text-white transition ${
                vote || state.closed
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-indigo-500 hover:bg-indigo-600"
              }`}
            >
              {opt} ({state.votes[opt]})
            </button>
          ))}

          {vote && (
            <p className="mt-4 text-green-600 font-semibold">
              You voted: {vote}
            </p>
          )}
          {state.closed && (
            <p className="mt-4 text-red-600 font-bold">Voting Closed</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      Loading...
    </div>
  );
}

export default App;
