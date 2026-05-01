import { useEffect, useRef, useState, useCallback } from 'react';
import SimplePeer from 'simple-peer';
import { getWebRTCSocket } from './useSocket';
import { useStore } from '../store';

export interface PeerStream {
  peerId: string;
  socketId: string;
  role: string;
  stream: MediaStream;
}

export function useWebRTC(sessionId: string | null) {
  const { twitchUser, role } = useStore();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peerStreams, setPeerStreams] = useState<PeerStream[]>([]);
  const peersRef = useRef<Map<string, SimplePeer.Instance>>(new Map());
  const socket = getWebRTCSocket();

  const peerId = twitchUser?.id || Math.random().toString(36).slice(2);

  const createPeer = useCallback((
    socketId: string,
    peerRole: string,
    initiator: boolean,
    stream: MediaStream
  ) => {
    const peer = new SimplePeer({ initiator, stream, trickle: true });

    peer.on('signal', (signal) => {
      if (initiator) {
        socket.emit('offer', { to: socketId, offer: signal, peerId });
      } else {
        socket.emit('answer', { to: socketId, answer: signal });
      }
    });

    peer.on('stream', (remoteStream) => {
      setPeerStreams((prev) => {
        const exists = prev.find(p => p.socketId === socketId);
        if (exists) return prev.map(p => p.socketId === socketId ? { ...p, stream: remoteStream } : p);
        return [...prev, { peerId: socketId, socketId, role: peerRole, stream: remoteStream }];
      });
    });

    peer.on('error', (err) => console.error('[WebRTC] Peer error:', err));
    peer.on('close', () => {
      peersRef.current.delete(socketId);
      setPeerStreams((prev) => prev.filter(p => p.socketId !== socketId));
    });

    peersRef.current.set(socketId, peer);
    return peer;
  }, [peerId, socket]);

  useEffect(() => {
    if (!sessionId || !role) return;

    // Get camera
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setLocalStream(stream);

        socket.connect();
        socket.emit('join_room', { sessionId, peerId, role });

        // Existing peers in room → we initiate
        socket.on('existing_peers', (peers: Array<{ peerId: string; socketId: string; role: string }>) => {
          peers.forEach(({ socketId, role: pRole }) => {
            createPeer(socketId, pRole, true, stream);
          });
        });

        // New peer joined → they initiate to us
        socket.on('peer_joined', ({ socketId, role: pRole }: { peerId: string; socketId: string; role: string }) => {
          createPeer(socketId, pRole, false, stream);
        });

        socket.on('offer', ({ from, offer }: { from: string; offer: SimplePeer.SignalData }) => {
          const peer = peersRef.current.get(from);
          if (peer) peer.signal(offer);
        });

        socket.on('answer', ({ from, answer }: { from: string; answer: SimplePeer.SignalData }) => {
          const peer = peersRef.current.get(from);
          if (peer) peer.signal(answer);
        });

        socket.on('ice_candidate', ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
          const peer = peersRef.current.get(from);
          if (peer) peer.signal(candidate);
        });

        socket.on('peer_left', ({ socketId }: { socketId: string }) => {
          peersRef.current.get(socketId)?.destroy();
          peersRef.current.delete(socketId);
          setPeerStreams((prev) => prev.filter(p => p.socketId !== socketId));
        });
      })
      .catch((err) => console.error('[WebRTC] Camera access denied:', err));

    return () => {
      localStream?.getTracks().forEach(t => t.stop());
      peersRef.current.forEach(p => p.destroy());
      peersRef.current.clear();
      socket.disconnect();
    };
  }, [sessionId, role]);

  return { localStream, peerStreams };
}
