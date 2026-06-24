import { useEffect, useMemo, useRef, useState } from "react";
import { ACTIONS } from "../../constants/actions";
import { socket } from "../../services/socket";
import Avatar from "../common/Avatar";

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
  const peersRef = useRef(new Map());

  const ensurePeer = async (remoteSocketId) => {
    if (!remoteSocketId) return null;
    if (peersRef.current.has(remoteSocketId))
      return peersRef.current.get(remoteSocketId).pc;

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
    const pc =
      peersRef.current.get(remoteSocketId)?.pc ??
      (await ensurePeer(remoteSocketId));
    if (!pc) return;

    const localId = socket.id;
    if (!localId) return;

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
    } catch {
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

    clients.forEach(({ socketId }) => {
      if (!socketId || socketId === localId) return;
      ensurePeer(socketId).then(() => startOfferIfNeeded(socketId));
    });
  }, [clients, micReady]);

  const enableMic = async () => {
    setMicError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 border border-[var(--cj-border)] bg-[var(--cj-surface)] p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--cj-text)]">Voice</p>
          <span
            className={`text-xs ${
              micReady
                ? muted
                  ? "text-amber-400"
                  : "text-[var(--cj-success)]"
                : "text-[var(--cj-muted)]"
            }`}
          >
            {!micReady ? "Mic off" : muted ? "Muted" : "Live"}
          </span>
        </div>

        {!micReady ? (
          <>
            <button
              type="button"
              onClick={enableMic}
              className="cj-btn cj-btn-outline w-full py-2 normal-case tracking-normal"
            >
              Enable voice
            </button>
            {micError ? (
              <p className="mt-2 text-xs text-[var(--cj-danger)]">{micError}</p>
            ) : (
              <p className="mt-2 text-xs text-[var(--cj-muted)]">
                WebRTC voice chat. Hold push-to-talk to speak.
              </p>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onPointerDown={handleTalkDown}
                onPointerUp={handleTalkUp}
                onPointerCancel={handleTalkUp}
                onPointerLeave={handleTalkUp}
                className={`cj-btn flex-1 py-2 normal-case tracking-normal ${
                  talking ? "cj-btn-run" : "cj-btn-outline"
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
                      setTalking(false);
                      setTrackEnabled(false);
                    }
                    return next;
                  });
                }}
                className={`cj-btn px-3 py-2 normal-case tracking-normal ${
                  muted ? "cj-btn-danger-outline" : "cj-btn-outline"
                }`}
              >
                {muted ? "Unmute" : "Mute"}
              </button>
            </div>
            <p className="text-xs text-[var(--cj-muted)]">
              {clients.length > 1
                ? `${clients.length - 1} peer(s) in room`
                : "Waiting for peers…"}
            </p>
          </div>
        )}
      </div>

      <p className="cj-label mb-2">In voice channel</p>
      <div className="cj-scrollbar min-h-0 flex-1 space-y-1.5 overflow-y-auto">
        {clients.length === 0 ? (
          <p className="text-xs text-[var(--cj-muted)]">No one connected yet.</p>
        ) : (
          clients.map(({ socketId, username: name }) => (
            <div
              key={socketId}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5"
            >
              <Avatar name={name || "Anonymous"} size="sm" />
              <span className="truncate text-sm">{name || "Anonymous"}</span>
            </div>
          ))
        )}
      </div>

      <div className="hidden">
        {Object.entries(remoteStreams).map(([remoteId, stream]) => (
          <RemoteAudio key={remoteId} stream={stream} />
        ))}
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
