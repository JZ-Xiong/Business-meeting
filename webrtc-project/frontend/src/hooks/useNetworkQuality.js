import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Polls RTCPeerConnection.getStats() to estimate network quality.
 * Returns: 'excellent' | 'good' | 'poor' | 'bad' | 'unknown'
 */
export default function useNetworkQuality(peerConnection) {
  const [quality, setQuality] = useState('unknown');
  const intervalRef = useRef(null);

  const assess = useCallback(async () => {
    if (!peerConnection || peerConnection.connectionState !== 'connected') {
      setQuality('unknown');
      return;
    }

    try {
      const stats = await peerConnection.getStats();
      let roundTripTime = null;
      let packetsLost = 0;
      let packetsReceived = 0;

      stats.forEach((report) => {
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          roundTripTime = report.currentRoundTripTime;
        }
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          packetsLost = report.packetsLost || 0;
          packetsReceived = report.packetsReceived || 0;
        }
      });

      const lossRate =
        packetsReceived > 0 ? packetsLost / (packetsLost + packetsReceived) : 0;
      const rtt = roundTripTime != null ? roundTripTime * 1000 : null; // ms

      if (rtt !== null) {
        if (rtt < 50 && lossRate < 0.01) setQuality('excellent');
        else if (rtt < 150 && lossRate < 0.03) setQuality('good');
        else if (rtt < 300 && lossRate < 0.08) setQuality('poor');
        else setQuality('bad');
      } else if (lossRate > 0) {
        setQuality(lossRate < 0.03 ? 'good' : 'poor');
      }
    } catch {
      // getStats not available
    }
  }, [peerConnection]);

  useEffect(() => {
    if (peerConnection) {
      intervalRef.current = setInterval(assess, 3000);
    } else {
      setQuality('unknown');
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [peerConnection, assess]);

  return quality;
}
