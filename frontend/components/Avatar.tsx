interface Props {
  src?: string;
  username?: string;
  size?: number;
  className?: string;
}

export function Avatar({ src, username, size = 32, className = "" }: Props) {
  const initials = username?.charAt(0).toUpperCase() ?? "?";
  const style = { width: size, height: size, minWidth: size };

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={username ?? "avatar"}
        style={style}
        className={`rounded-full object-cover ${className}`}
        loading="lazy"
      />
    );
  }

  return (
    <div
      style={style}
      className={`rounded-full bg-gradient-to-tr from-[#f09433] via-[#e6683c] via-[#dc2743] via-[#cc2366] to-[#bc1888] flex items-center justify-center text-white font-semibold ${className}`}
    >
      <span style={{ fontSize: size * 0.4 }}>{initials}</span>
    </div>
  );
}
