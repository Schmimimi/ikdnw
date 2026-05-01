import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useStore } from '../store';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

let gameSocket: Socket | null = null;
let webrtcSocket: Socket | null = null;

export function getGameSocket(): Socket {
  if (!gameSocket) {
    gameSocket = io(`${BACKEND_URL}/game`, { autoConnect: false });
  }
  return gameSocket;
}

export function getWebRTCSocket(): Socket {
  if (!webrtcSocket) {
    webrtcSocket = io(`${BACKEND_URL}/webrtc`, { autoConnect: false });
  }
  return webrtcSocket;
}

export function useGameSocket() {
  const { sessionId, twitchUser, role, setSession, setConnected } = useStore();
  const socket = getGameSocket();

  useEffect(() => {
    if (!sessionId || !role) return;
    if (role !== 'overlay' && !twitchUser) return;

    socket.connect();

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_session', { sessionId, role, twitchUser });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('state_sync', (state) => {
      setSession(state);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('state_sync');
      socket.disconnect();
      setConnected(false);
    };
  }, [sessionId, twitchUser, role]);

  return socket;
}
