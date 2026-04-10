import * as React from "react";

function joinClasses(...values) {
  return values.filter(Boolean).join(" ");
}

const Avatar = React.forwardRef(function Avatar({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={joinClasses(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-black bg-white",
        className,
      )}
      {...props}
    />
  );
});

const AvatarImage = React.forwardRef(function AvatarImage(
  { className, alt = "avatar", onError, ...props },
  ref,
) {
  const [hasError, setHasError] = React.useState(false);

  if (hasError) return null;

  return (
    <img
      ref={ref}
      alt={alt}
      className={joinClasses(
        "absolute inset-0 h-full w-full object-cover",
        className,
      )}
      onError={(event) => {
        setHasError(true);
        if (onError) onError(event);
      }}
      {...props}
    />
  );
});

const AvatarFallback = React.forwardRef(function AvatarFallback(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={joinClasses(
        "flex h-full w-full items-center justify-center bg-[#f4f4f5] text-xs font-black uppercase text-black",
        className,
      )}
      {...props}
    />
  );
});

export { Avatar, AvatarImage, AvatarFallback };
