import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from '../services/socket.js';

export function useSocket(eventHandlers = {}) {
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef(eventHandlers);
  handlersRef.current = eventHandlers;

  useEffect(() => {
    const socket = getSocket();

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    const events = [
      'agent:event_received',
      'agent:investigating',
      'agent:event_processing',
      'agent:tool_started',
      'agent:tool_completed',
      'agent:decision_created',
      'agent:risk_evaluated',
      'agent:action_started',
      'agent:action_completed',
      'agent:approval_required',
      'agent:approval_updated',
      'agent:state_changed',
      'agent:error',
      'agent:retrying',
      'agent:failed_safe',
      'agent:audit',
    ];

    events.forEach((event) => {
      socket.on(event, (data) => {
        if (handlersRef.current.onActivity) {
          handlersRef.current.onActivity({ event, data, timestamp: data.timestamp || new Date() });
        }
        if (handlersRef.current[event]) {
          handlersRef.current[event](data);
        }
      });
    });

    return () => {
      events.forEach((event) => socket.off(event));
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);

  return { connected };
}
