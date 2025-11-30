import { useEffect } from "react";

function useClickOutside(
  refs: React.RefObject<HTMLElement | null>[],
  callback: () => void
) {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        !refs.some(
          (ref) => ref.current && ref.current.contains(event.target as Node)
        )
      ) {
        callback();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [refs, callback]);
}

export { useClickOutside };
