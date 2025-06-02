import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export function useBackendSocket() {
  const [ready, setReady] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    fetch("/backend-url.txt")
      .then(res => res.text())
      .then(url => {
        socketRef.current = io(url.trim());
        setReady(true);
      });
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  return [socketRef, ready];
}