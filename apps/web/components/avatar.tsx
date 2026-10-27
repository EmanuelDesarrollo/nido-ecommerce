import Image from "next/image";
import type { UserDto } from "@nido/shared";

export function Avatar({ user, size = 40 }: { user: UserDto; size?: number }) {
  return (
    <Image
      src={user.avatarUrl}
      alt={user.name}
      width={size}
      height={size}
      className="rounded-full bg-sand object-cover ring-2 ring-white"
    />
  );
}
