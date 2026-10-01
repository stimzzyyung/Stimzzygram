import { io } from 'socket.io-client';
import { API_URL } from '../config';

let socket = null;
export const connectSocket = (token) => {
  if (socket) socket.disconnect();
  socket = io(API_URL, { auth: { token }, transports: ['websocket'], reconnection: true });
  return socket;
};
export const getSocket = () => socket;
export const disconnectSocket = () => { socket?.disconnect(); socket = null; };
