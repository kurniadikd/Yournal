import { createMemo } from "solid-js";

interface UserAvatarProps {
  size?: number;
  initials?: string;
  avatarUrl?: string;
}

const UserAvatar = (props: UserAvatarProps) => {
  const size = createMemo(() => props.size || 96);
  const initials = createMemo(() => props.initials || "YD"); // Default for Yournal demo

  return (
    <div
      class="relative flex-shrink-0 rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] flex items-center justify-center font-bold overflow-hidden"
      style={{
        width: `${size()}px`,
        height: `${size()}px`,
        "font-family": "'Outfit', sans-serif" // Using Outfit as default
      }}
    >
      {props.avatarUrl ? (
        <img
          src={props.avatarUrl}
          alt="Avatar"
          class="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
        />
      ) : (
        <span
          class="select-none"
          style={{ "font-size": `${size() * 0.4}px` }}
        >
          {initials()}
        </span>
      )}
    </div>
  );
};

export default UserAvatar;
