import { io } from "socket.io-client";

const SERVER = "https://live-poll-battle-ceyg.onrender.com"; 
const socket = io(SERVER, { autoConnect: true });

export default socket;
