import { useEffect, useState } from "react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";
import { useCallStore } from "../store/useCallStore";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { axiosInstance } from "../lib/axios";
import { errorMessage } from "../lib/errors";
type Invitation = {
  _id: string;
  hostId: { _id: string; fullName: string };
  members: { userId: string; status: string; invitedUntil?: string }[];
};
export default function CallPanel() {
  const user = useAuthStore((state) => state.authUser);
  const session = useCallStore((state) => state.session);
  const users = useChatStore((state) => state.users);
  const [calls, setCalls] = useState<Invitation[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!user) {
      useCallStore.getState().leave();
      return;
    }
    let alive = true;
    const refresh = async () => {
      try {
        const { data } = await axiosInstance.get<Invitation[]>("/calls", {
          timeout: 10000,
        });
        if (alive) setCalls(data);
      } catch {
        /* Invitations retry on the next poll. */
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [user]);
  async function action(task: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (cause) {
      setError(errorMessage(cause, "Call action failed. Please try again."));
    } finally {
      setBusy(false);
    }
  }
  if (!user) return null;
  if (session)
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Video call"
        className="fixed inset-0 z-50 bg-base-100 flex flex-col"
      >
        <div className="p-2 flex flex-wrap gap-2 items-center">
          <span className="font-semibold">Video call · up to 8 people</span>
          {session.hostId === user._id && (
            <>
              <select
                aria-label="Invite participant"
                className="select select-sm"
                disabled={busy}
                defaultValue=""
                onChange={(event) => {
                  const id = event.target.value;
                  event.target.value = "";
                  if (id)
                    void action(() =>
                      axiosInstance.post(`/calls/${session.callId}/invite`, {
                        userId: id,
                      }),
                    );
                }}
              >
                <option value="">Invite a contact…</option>
                {users
                  .filter((peer) => peer._id !== user._id)
                  .map((peer) => (
                    <option key={peer._id} value={peer._id}>
                      {peer.fullName}
                    </option>
                  ))}
              </select>
              <button
                className="btn btn-sm btn-error"
                disabled={busy}
                onClick={() =>
                  void action(async () => {
                    await axiosInstance.post(`/calls/${session.callId}/end`);
                    useCallStore.getState().leave();
                  })
                }
              >
                End for everyone
              </button>
            </>
          )}
          <button
            className="btn btn-sm"
            onClick={() => useCallStore.getState().leave()}
          >
            Leave call
          </button>
          {error && (
            <p role="alert" className="text-error">
              {error}
            </p>
          )}
        </div>
        <LiveKitRoom
          className="flex-1 min-h-0"
          data-lk-theme="default"
          token={session.token}
          serverUrl={session.url}
          connect
          audio={false}
          video={false}
          onDisconnected={() => useCallStore.getState().leave()}
          onError={(cause) => setError(cause.message)}
        >
          <VideoConference />
        </LiveKitRoom>
      </div>
    );
  const available = calls.filter((call) =>
    call.members.some(
      (member) =>
        member.userId === user._id &&
        (member.status === "accepted" ||
          (member.status === "invited" &&
            new Date(member.invitedUntil || 0).getTime() > Date.now())),
    ),
  );
  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm space-y-2">
      {error && (
        <p role="alert" className="bg-base-100 p-3 text-error">
          {error}
        </p>
      )}
      {available.map((call) => (
        <div
          key={call._id}
          className="bg-base-100 border border-base-300 rounded-lg shadow-lg p-3"
        >
          <p>{call.hostId.fullName} invited you to a video call</p>
          <div className="flex gap-2 mt-2">
            <button
              className="btn btn-primary btn-sm"
              disabled={busy}
              onClick={() =>
                void action(() => useCallStore.getState().join(call._id))
              }
            >
              Join call
            </button>
            <button
              className="btn btn-sm"
              disabled={busy}
              onClick={() =>
                void action(async () => {
                  await axiosInstance.post(`/calls/${call._id}/decline`);
                  setCalls((items) =>
                    items.filter((item) => item._id !== call._id),
                  );
                })
              }
            >
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
