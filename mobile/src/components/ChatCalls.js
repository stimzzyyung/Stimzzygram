import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Modal, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  mediaDevices,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCView,
} from 'react-native-webrtc';
import { getSocket } from '../services/socket';

const CallContext = createContext(null);
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

export function ChatCallProvider({ children }) {
  const [call, setCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const callRef = useRef(null);
  const peerRef = useRef(null);
  const localRef = useRef(null);
  const pendingIceRef = useRef([]);
  const outgoingIceRef = useRef([]);
  const socket = getSocket();

  const updateCall = useCallback((value) => {
    const next = typeof value === 'function' ? value(callRef.current) : value;
    callRef.current = next;
    setCall(next);
  }, []);

  const releaseMedia = useCallback(() => {
    const peer = peerRef.current;
    peerRef.current = null;
    if (peer) {
      peer.onicecandidate = null;
      peer.ontrack = null;
      peer.onconnectionstatechange = null;
      peer.close();
    }
    localRef.current?.getTracks().forEach((track) => track.stop());
    localRef.current = null;
    pendingIceRef.current = [];
    outgoingIceRef.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setMuted(false);
    setCameraOff(false);
  }, []);

  const finishLocalCall = useCallback(() => {
    releaseMedia();
    updateCall(null);
  }, [releaseMedia, updateCall]);

  const flushPendingIce = useCallback(async () => {
    const peer = peerRef.current;
    if (!peer?.remoteDescription) return;
    const candidates = pendingIceRef.current.splice(0);
    for (const candidate of candidates) {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.warn('[Call] Could not add ICE candidate:', error.message);
      }
    }
  }, []);

  const makePeer = useCallback(async (callId, callType) => {
    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerRef.current = peer;
    peer.onicecandidate = ({ candidate }) => {
      if (!candidate) return;
      const activeCallId = callRef.current?.id || callId;
      const payload = { callId: activeCallId, candidate: candidate.toJSON() };
      if (activeCallId) getSocket()?.emit('call:ice', payload);
      else outgoingIceRef.current.push(payload);
    };
    peer.ontrack = ({ streams }) => {
      if (streams?.[0]) setRemoteStream(streams[0]);
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'failed' && peerRef.current === peer) {
        Alert.alert('Call failed', 'A connection could not be established. Please try again.');
        getSocket()?.emit('call:end', { callId: callRef.current?.id });
        finishLocalCall();
      }
    };

    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video' ? { facingMode: 'user' } : false,
      });
      if (peerRef.current !== peer) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error('The call was cancelled.');
      }
      localRef.current = stream;
      setLocalStream(stream);
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      return peer;
    } catch (error) {
      if (peerRef.current === peer) {
        peerRef.current = null;
        peer.close();
      }
      throw error;
    }
  }, [finishLocalCall]);

  const startCall = useCallback(async (target, conversationId, callType) => {
    if (!target?._id || callRef.current) return;
    const socket = getSocket();
    if (!socket?.connected) {
      Alert.alert('Call unavailable', 'Reconnect to the internet and try again.');
      return;
    }
    updateCall({
      direction: 'outgoing',
      callType,
      status: 'starting',
      remoteId: String(target._id),
      remoteUser: target,
    });
    try {
      const peer = await makePeer(null, callType);
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.timeout(15000).emit('call:offer', {
        to: String(target._id),
        conversationId: conversationId || undefined,
        callType,
        offer: { type: offer.type, sdp: offer.sdp },
      }, (timeoutError, result) => {
        if (timeoutError || !result?.success) {
          Alert.alert('Could not start call', result?.message || 'Call setup timed out. Please try again.');
          finishLocalCall();
          return;
        }
        updateCall((current) => current && ({ ...current, id: result.callId, status: 'calling' }));
        outgoingIceRef.current.splice(0).forEach(({ candidate }) => {
          socket.emit('call:ice', { callId: result.callId, candidate });
        });
      });
    } catch (error) {
      finishLocalCall();
      Alert.alert('Call unavailable', error?.message || 'Could not access the microphone or camera.');
    }
  }, [finishLocalCall, makePeer, updateCall]);

  const acceptCall = useCallback(async () => {
    const incoming = callRef.current;
    const socket = getSocket();
    if (!incoming?.id || !incoming.offer || !socket?.connected) return;
    updateCall({ ...incoming, status: 'connecting' });
    try {
      const peer = await makePeer(incoming.id, incoming.callType);
      await peer.setRemoteDescription(new RTCSessionDescription(incoming.offer));
      await flushPendingIce();
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.timeout(15000).emit('call:answer', {
        callId: incoming.id,
        answer: { type: answer.type, sdp: answer.sdp },
      }, (timeoutError, result) => {
        if (timeoutError || !result?.success) {
          Alert.alert('Call ended', result?.message || 'This call is no longer available.');
          finishLocalCall();
          return;
        }
        updateCall((current) => current && ({ ...current, status: 'connected' }));
        outgoingIceRef.current.splice(0).forEach(({ candidate }) => {
          socket.emit('call:ice', { callId: incoming.id, candidate });
        });
      });
    } catch (error) {
      socket.emit('call:reject', { callId: incoming.id });
      finishLocalCall();
      Alert.alert('Could not answer call', error?.message || 'Could not access the microphone or camera.');
    }
  }, [finishLocalCall, flushPendingIce, makePeer, updateCall]);

  const rejectCall = useCallback(() => {
    const current = callRef.current;
    if (current?.id) getSocket()?.emit('call:reject', { callId: current.id });
    finishLocalCall();
  }, [finishLocalCall]);

  const endCall = useCallback(() => {
    const current = callRef.current;
    if (current?.id) getSocket()?.emit('call:end', { callId: current.id });
    finishLocalCall();
  }, [finishLocalCall]);

  useEffect(() => {
    if (!socket) return undefined;
    const onIncoming = (incoming) => {
      if (callRef.current) {
        socket.emit('call:reject', { callId: incoming.callId });
        return;
      }
      pendingIceRef.current = [];
      updateCall({
        id: incoming.callId,
        direction: 'incoming',
        remoteId: String(incoming.from),
        remoteUser: incoming.fromUser || { _id: incoming.from, username: 'Someone' },
        callType: incoming.callType,
        offer: incoming.offer,
        status: 'incoming',
      });
    };
    const onAnswered = async ({ callId, answer }) => {
      if (callRef.current?.id !== callId || !peerRef.current) return;
      try {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        await flushPendingIce();
        updateCall((current) => current && ({ ...current, status: 'connected' }));
        outgoingIceRef.current.splice(0).forEach(({ candidate }) => {
          socket.emit('call:ice', { callId, candidate });
        });
      } catch (error) {
        console.warn('[Call] Could not apply call answer:', error.message);
        endCall();
      }
    };
    const onIce = async ({ callId, candidate }) => {
      if (callRef.current?.id !== callId) return;
      if (!peerRef.current?.remoteDescription) {
        pendingIceRef.current.push(candidate);
        return;
      }
      try {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.warn('[Call] Could not add ICE candidate:', error.message);
      }
    };
    const onEnded = ({ callId, reason }) => {
      const current = callRef.current;
      if (current?.id !== callId) return;
      finishLocalCall();
      if (reason === 'rejected') {
        Alert.alert('Call declined', `${current.remoteUser?.username || 'This person'} declined the call.`);
      } else if (reason === 'missed') {
        Alert.alert('No answer', `${current.remoteUser?.username || 'This person'} did not answer.`);
      } else if (reason === 'disconnected') {
        Alert.alert('Call ended', 'The other person disconnected.');
      }
    };

    socket.on('call:incoming', onIncoming);
    socket.on('call:answered', onAnswered);
    socket.on('call:ice', onIce);
    socket.on('call:ended', onEnded);
    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:answered', onAnswered);
      socket.off('call:ice', onIce);
      socket.off('call:ended', onEnded);
      const current = callRef.current;
      if (current?.id) socket.emit('call:end', { callId: current.id });
      finishLocalCall();
    };
  }, [endCall, finishLocalCall, flushPendingIce, socket, updateCall]);

  const toggleMute = () => {
    const next = !muted;
    localRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    setMuted(next);
  };

  const toggleCamera = () => {
    const next = !cameraOff;
    localRef.current?.getVideoTracks().forEach((track) => { track.enabled = !next; });
    setCameraOff(next);
  };

  const remoteUser = call?.remoteUser;
  const displayStatus = call?.status === 'incoming'
    ? 'Incoming call...'
    : call?.status === 'starting'
      ? 'Starting call...'
      : call?.status === 'calling'
        ? `Calling ${remoteUser?.username || 'user'}...`
        : call?.status === 'connecting'
          ? 'Connecting...'
          : call?.status === 'connected'
            ? (call.callType === 'video' ? 'Video call' : 'Voice call')
            : 'Incoming call';

  return (
    <CallContext.Provider value={{ startCall }}>
      {children}
      <Modal visible={!!call} animationType="fade" onRequestClose={endCall} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: '#080C10', alignItems: 'center', justifyContent: 'center' }}>
          {call?.callType === 'video' && remoteStream && (
            <RTCView streamURL={remoteStream.toURL()} style={{ position: 'absolute', width: '100%', height: '100%' }} objectFit="cover" />
          )}
          {call?.callType === 'video' && localStream && call.status !== 'incoming' && (
            <RTCView
              streamURL={localStream.toURL()}
              style={{ position: 'absolute', right: 16, top: 56, width: 110, height: 160, borderRadius: 14 }}
              objectFit="cover"
              mirror
            />
          )}
          <View style={{ alignItems: 'center', padding: 28 }}>
            <Ionicons name={call?.callType === 'video' ? 'videocam' : 'call'} size={38} color="#D4AF6A" />
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 16 }}>
              {remoteUser?.fullName || remoteUser?.username || 'Call'}
            </Text>
            <Text style={{ color: '#ddd', fontSize: 15, marginTop: 8 }}>{displayStatus}</Text>
          </View>
          <View style={{ position: 'absolute', bottom: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            {call?.status === 'incoming' ? (
              <>
                <TouchableOpacity onPress={rejectCall} accessibilityLabel="Decline call" style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: '#D92D45', alignItems: 'center', justifyContent: 'center', marginHorizontal: 18 }}>
                  <Ionicons name="close" size={30} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={acceptCall} accessibilityLabel="Answer call" style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: '#20A464', alignItems: 'center', justifyContent: 'center', marginHorizontal: 18 }}>
                  <Ionicons name={call?.callType === 'video' ? 'videocam' : 'call'} size={26} color="#fff" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity onPress={toggleMute} accessibilityLabel={muted ? 'Unmute microphone' : 'Mute microphone'} style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: '#252A30', alignItems: 'center', justifyContent: 'center', marginHorizontal: 12 }}>
                  <Ionicons name={muted ? 'mic-off' : 'mic'} size={23} color="#fff" />
                </TouchableOpacity>
                {call?.callType === 'video' && (
                  <TouchableOpacity onPress={toggleCamera} accessibilityLabel={cameraOff ? 'Turn camera on' : 'Turn camera off'} style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: '#252A30', alignItems: 'center', justifyContent: 'center', marginHorizontal: 12 }}>
                    <Ionicons name={cameraOff ? 'videocam-off' : 'videocam'} size={23} color="#fff" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={endCall} accessibilityLabel="End call" style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: '#D92D45', alignItems: 'center', justifyContent: 'center', marginHorizontal: 18 }}>
                  <Ionicons name="call" size={26} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </CallContext.Provider>
  );
}

export function ChatCallButtons({ user, conversationId, enabled, colors }) {
  const context = useContext(CallContext);
  if (!context) throw new Error('ChatCallButtons must be rendered inside ChatCallProvider.');
  if (!enabled || !user?._id) return null;

  return (
    <>
      <TouchableOpacity onPress={() => context.startCall(user, conversationId, 'audio')} accessibilityRole="button" accessibilityLabel="Start voice call" style={{ padding: 7, marginLeft: 2 }}>
        <Ionicons name="call-outline" size={21} color={colors.text} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => context.startCall(user, conversationId, 'video')} accessibilityRole="button" accessibilityLabel="Start video call" style={{ padding: 7, marginLeft: 1 }}>
        <Ionicons name="videocam-outline" size={22} color={colors.text} />
      </TouchableOpacity>
    </>
  );
}
