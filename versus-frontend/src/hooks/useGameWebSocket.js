import { useState, useEffect, useCallback } from 'react';
import { createGameWebSocket } from '../utils/gameUtils';

const useGameWebSocket = (gameTypeOrUrl, gameId = null) => {
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);

  useEffect(() => {
    // Support both URL format and gameType/gameId format
    let ws;
    
    if (gameTypeOrUrl && gameTypeOrUrl.startsWith('ws://') || gameTypeOrUrl && gameTypeOrUrl.startsWith('wss://')) {
      // Direct WebSocket URL
      ws = new WebSocket(gameTypeOrUrl);
    } else if (gameTypeOrUrl && gameId) {
      // Legacy format: gameType and gameId
      ws = createGameWebSocket(gameTypeOrUrl, gameId);
    } else {
      return;
    }

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setLastMessage(data);
      
      if (data.type === 'game_state') {
        setGameState(data.state);
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
  }, [gameTypeOrUrl, gameId]);

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