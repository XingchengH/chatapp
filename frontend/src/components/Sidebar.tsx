import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

export default function Sidebar() {
  const {
    selectedUser,
    getUsers,
    users,
    setSelectedUser,
    isUsersLoading,
    usersCursor,
  } = useChatStore();
  const onlineUsers = useAuthStore((state) => state.onlineUsers);
  const [showOnline, setShowOnline] = useState(false);
  const [search, setSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => void getUsers(search), 250);
    return () => clearTimeout(timer);
  }, [getUsers, search]);
  const filtered = showOnline
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;
  return (
    <aside
      className={
        (selectedUser ? "hidden md:flex " : "flex ") +
        "h-full w-full md:w-72 shrink-0 border-r border-base-300 flex-col"
      }
    >
      <div className="border-b border-base-300 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Users size={22} />
          <span className="font-medium">Contacts</span>
        </div>
        <input
          type="search"
          aria-label="Search contacts"
          placeholder="Search contacts"
          className="input input-bordered input-sm w-full"
          maxLength={100}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={showOnline}
            onChange={(event) => setShowOnline(event.target.checked)}
          />
          Show online only
        </label>
      </div>
      <div className="overflow-y-auto flex-1 py-2">
        {isUsersLoading && !users.length ? (
          <SidebarSkeleton />
        ) : (
          filtered.map((user) => (
            <button
              type="button"
              key={user._id}
              onClick={() => setSelectedUser(user)}
              aria-pressed={selectedUser?._id === user._id}
              className={
                "w-full p-3 flex items-center gap-3 hover:bg-base-300 " +
                (selectedUser?._id === user._id ? "bg-base-300" : "")
              }
            >
              <div className="relative shrink-0">
                <img
                  src={user.profilePic || "/avatar.png"}
                  alt=""
                  className="size-12 object-cover rounded-full"
                />
                {onlineUsers.includes(user._id) && (
                  <span className="absolute bottom-0 right-0 size-2 bg-green-500 rounded-full" />
                )}
              </div>
              <div className="text-left min-w-0">
                <div className="font-medium truncate">{user.fullName}</div>
                <div className="text-xs opacity-60">
                  {onlineUsers.includes(user._id) ? "Online" : "Offline"}
                </div>
              </div>
            </button>
          ))
        )}
        {!isUsersLoading && !filtered.length && (
          <p className="p-4 text-sm opacity-60">
            {showOnline
              ? "No online contacts in this list."
              : "No contacts found."}
          </p>
        )}
        {usersCursor && (
          <button
            className="btn btn-sm block mx-auto my-3"
            disabled={isUsersLoading}
            onClick={() => void getUsers(search, true)}
          >
            {isUsersLoading ? "Loading…" : "Load more contacts"}
          </button>
        )}
      </div>
    </aside>
  );
}
