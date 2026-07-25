import { useState, useEffect } from "react";
import socket from "../services/socketService";

export interface MarketDataPayload {
  timestamp: string;
  US: Record<string, number>;
  IN: Record<string, number>;
  CRYPTO: Record<string, number>;
  MARQUEE: Record<string, number>;
}

export const useMarketData = (region: 'US' | 'IN' | 'CRYPTO') => {
  const [data, setData] = useState<{
    timestamp: string;
    regionData: Record<string, number>;
    marqueeData: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    // Listener function for incoming socket data
    const handleMarketUpdate = (payload: MarketDataPayload) => {
      setData({
        timestamp: payload.timestamp,
        regionData: payload[region] || {},
        marqueeData: payload.MARQUEE || {}
      });
    };

    // Attach the event listener to the "marketUpdate" event emitted by our backend
    socket.on("marketUpdate", handleMarketUpdate);

    // Cleanup function: runs when the component unmounts.
    // This removes the listener to prevent memory leaks and duplicate triggers.
    return () => {
      socket.off("marketUpdate", handleMarketUpdate);
    };
  }, [region]);

  return data;
};
