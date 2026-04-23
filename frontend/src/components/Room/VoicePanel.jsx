import { useEffect, useMemo, useRef, useState } from "react";
import { ACTIONS } from "../../constants/actions";
import { socket } from "../../services/socket";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export default function VoicePanel({ roomId, username, clients = [] }) {
  const myName = useMemo(() => String(username || "").trim(), [username]);
  const [micReady, setMicReady] = useState(false);
  const [micError, setMicError] = useState("");
  const [talking, setTalking] = useState(false);
  const [muted, setMuted] = useState(true);
  const [remoteStreams, setRemoteStreams] = useState({});

  const localStreamRef = useRef(null);
  const peersRef = useRef(new Map()); // remoteSocketId -> { pc, iceQueue: RTCIceCandidateInit[] }

  const ensurePeer = async (remoteSocketId) => {
    if (!remoteSocketId) return null;
    if (peersRef.current.has(remoteSocketId)) return peersRef.current.get(remoteSocketId).pc;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const state = { pc, iceQueue: [] };
    peersRef.current.set(remoteSocketId, state);

    pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      socket.emit(ACTIONS.VOICE_ICE_CANDIDATE, {
        to: remoteSocketId,
        candidate: e.candidate,
      });
    };

    pc.ontrack = (e) => {
      const [stream] = e.streams;
      if (!stream) return;
      setRemoteStreams((prev) => ({ ...prev, [remoteSocketId]: stream }));
    };

    // Add mic tracks if we already have them
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    return pc;
  };

  const flushIceQueue = async (remoteSocketId) => {
    const state = peersRef.current.get(remoteSocketId);
    if (!state?.iceQueue?.length) return;
    if (!state.pc.remoteDescription) return;
    const queue = [...state.iceQueue];
    state.iceQueue = [];
    for (const candidate of queue) {
      try {
        await state.pc.addIceCandidate(candidate);
      } catch {
        // ignore bad/late candidates
      }
    }
  };

  const startOfferIfNeeded = async (remoteSocketId) => {
    const pc = peersRef.current.get(remoteSocketId)?.pc ?? (await ensurePeer(remoteSocketId));
    if (!pc) return;

    const localId = socket.id;
    if (!localId) return;

    // Deterministic initiator to prevent offer collisions:
    // the peer with lexicographically smaller socket id initiates.
    const iAmInitiator = localId.localeCompare(remoteSocketId) < 0;
    if (!iAmInitiator) return;

    if (pc.signalingState !== "stable") return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit(ACTIONS.VOICE_OFFER, {
        to: remoteSocketId,
        sdp: pc.localDescription,
      });
    } catch (e) {
      // ignore renegotiation failures
    }
  };

  useEffect(() => {
    if (!roomId) return;

    const onOffer = async ({ from, sdp }) => {
      if (!from || !sdp) return;
      const pc = await ensurePeer(from);
      if (!pc) return;

      try {
        await pc.setRemoteDescription(sdp);
        await flushIceQueue(from);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit(ACTIONS.VOICE_ANSWER, {
          to: from,
          sdp: pc.localDescription,
        });
      } catch {
        // ignore
      }
    };

    const onAnswer = async ({ from, sdp }) => {
      if (!from || !sdp) return;
      const pc = peersRef.current.get(from)?.pc ?? (await ensurePeer(from));
      if (!pc) return;

      try {
        await pc.setRemoteDescription(sdp);
        await flushIceQueue(from);
      } catch {
        // ignore
      }
    };

    const onIce = async ({ from, candidate }) => {
      if (!from || !candidate) return;
      const state = peersRef.current.get(from);
      const pc = state?.pc ?? (await ensurePeer(from));
      if (!pc) return;

      // If remote description isn't set yet, queue candidates.
      if (!pc.remoteDescription) {
        const st = peersRef.current.get(from);
        if (st) st.iceQueue.push(candidate);
        return;
      }

      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // ignore
      }
    };

    socket.on(ACTIONS.VOICE_OFFER, onOffer);
    socket.on(ACTIONS.VOICE_ANSWER, onAnswer);
    socket.on(ACTIONS.VOICE_ICE_CANDIDATE, onIce);

    return () => {
      socket.off(ACTIONS.VOICE_OFFER, onOffer);
      socket.off(ACTIONS.VOICE_ANSWER, onAnswer);
      socket.off(ACTIONS.VOICE_ICE_CANDIDATE, onIce);

      peersRef.current.forEach(({ pc }) => {
        try {
          pc.close();
        } catch {
          // ignore
        }
      });
      peersRef.current.clear();
      setRemoteStreams({});
    };
  }, [roomId]);

  useEffect(() => {
    if (!micReady) return;
    const localId = socket.id;
    if (!localId) return;

    // Create peers for all existing remote users
    clients.forEach(({ socketId }) => {
      if (!socketId || socketId === localId) return;
      ensurePeer(socketId).then(() => startOfferIfNeeded(socketId));
    });
    // Also handle future peers via onClientsChange triggers; VoicePanel re-renders when clients changes.
  }, [clients, micReady]);

  const enableMic = async () => {
    setMicError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      // Start muted; push-to-talk will enable
      stream.getAudioTracks().forEach((t) => {
        t.enabled = false;
      });

      setMicReady(true);
      setTalking(false);
      setMuted(true);
    } catch (e) {
      setMicReady(false);
      setMicError(e?.message || "Microphone permission denied");
    }
  };

  const setTrackEnabled = (enabled) => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = enabled;
    });
  };

  const handleTalkDown = () => {
    if (!micReady || muted) return;
    setTalking(true);
    setTrackEnabled(true);
  };
  const handleTalkUp = () => {
    setTalking(false);
    setTrackEnabled(false);
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40">
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-3 py-2">
        <h3 className="text-sm font-semibold text-slate-200">Voice</h3>
        <span
          className={`text-xs ${
            micReady ? (muted ? "text-amber-400" : "text-emerald-400") : "text-slate-500"
          }`}
        >
          {!micReady ? "Mic off" : muted ? "Muted" : "Live (push to talk)"}
        </span>
      </div>

      <div className="p-3">
        {!micReady ? (
          <>
            <button
              type="button"
              onClick={enableMic}
              className="w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Enable voice
            </button>
            {micError ? (
              <p className="mt-2 text-xs text-red-400">{micError}</p>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                Uses WebRTC. Click enable, then hold “Push to talk”.
              </p>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onPointerDown={handleTalkDown}
                onPointerUp={handleTalkUp}
                onPointerCancel={handleTalkUp}
                onPointerLeave={handleTalkUp}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium text-white transition ${
                  talking ? "bg-emerald-500" : "bg-indigo-600 hover:bg-indigo-500"
                }`}
              >
                {talking ? "Talking…" : "Push to talk"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMuted((prev) => {
                    const next = !prev;
                    if (next) {
                      // now muted
                      setTalking(false);
                      setTrackEnabled(false);
                    }
                    return next;
                  });
                }}
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                  muted
                    ? "bg-red-600 text-white hover:bg-red-500"
                    : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                }`}
              >
                {muted ? "Unmute" : "Mute"}
              </button>
            </div>

            <div className="mt-2 text-xs text-slate-500">
              {clients.length > 1 ? "Peers connected: " + (clients.length - 1) : "Waiting for peers…"}
            </div>
          </>
        )}

        {/* Render remote audio elements */}
        <div className="mt-3 space-y-2">
          {Object.entries(remoteStreams).map(([remoteId, stream]) => (
            <RemoteAudio key={remoteId} stream={stream} />
          ))}
        </div>
      </div>
    </div>
  );
}

function RemoteAudio({ stream }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !stream) return;
    ref.current.srcObject = stream;
    ref.current.play().catch(() => {});
  }, [stream]);

  return <audio ref={ref} autoPlay playsInline />;
}

