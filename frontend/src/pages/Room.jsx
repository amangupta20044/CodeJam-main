import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import RoomSidebar from "../components/Room/RoomSidebar";
import CodeEditor from "../components/Editor/CodeEditor";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Room() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const username = location.state?.username || user?.username;
  const [clients, setClients] = useState([]);
  const [files, setFiles] = useState([]);
  const [filePresence, setFilePresence] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadRoomMeta = async () => {
      if (!username) {
        toast.error("Enter your name on the home page to join a room.");
        navigate("/", { replace: true });
        return;
      }

      try {
        const { data } = await API.get(`/api/rooms/${id}`);
        if (!active) return;
        setIsAdmin(Boolean(data.isAdmin));
      } catch (error) {
        if (!active) return;
        toast.error(error.response?.data?.message || "Room not found");
        navigate("/", { replace: true });
        return;
      } finally {
        if (active) setLoading(false);
      }
    };

    loadRoomMeta();

    return () => {
      active = false;
    };
  }, [id, username, navigate]);

  if (!username || loading) {
    return null;
  }

  return (
    <div className="flex h-screen min-h-0 bg-slate-950 text-slate-100">
      <RoomSidebar
        roomId={id}
        username={username}
        clients={clients}
        files={files}
        filePresence={filePresence}
      />
      <div className="min-w-0 flex-1">
        <CodeEditor
          roomId={id}
          username={username}
          isAdmin={isAdmin}
          onClientsChange={setClients}
          onFilesChange={setFiles}
          onFilePresenceChange={setFilePresence}
        />
      </div>
    </div>
  );
}
