import { useState, useEffect, useCallback } from 'react';
import { createGameWebSocket } from '../utils/gameUtils';

const useGameWebSocket = (gameType, gameId) => {
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);

  useEffect(() => {
    if (!gameType || !gameId) return;

    const ws = createGameWebSocket(gameType, gameId);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received WebSocket message:', data);
      setLastMessage(data);
      
      // Handle different message types
      if (data.type === 'game_state' || data.type === 'ship_placed' || 
          data.type === 'placement_start' || data.type === 'placement_complete' ||
          data.type === 'game_over' || data.type === 'error') {
        setGameState(data);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [gameType, gameId]);

  const sendMessage = useCallback((message) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }, [socket]);

  return {
    gameState,
    isConnected,
    lastMessage,
    sendMessage
  };
};

export default useGameWebSocket; 