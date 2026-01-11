import { useState, useEffect, useCallback } from 'react';
import { getBackendUrl } from '../utils/networkUtils';

const useVoteStats = (gameId) => {
  const [voteStats, setVoteStats] = useState({
    gpt_4o: 0,
    claude: 0,
    total: 0,
    percentages: { gpt_4o: 0, claude: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch vote stats via HTTP
  const fetchVoteStats = useCallback(async () => {
    try {
      const backendUrl = getBackendUrl();
      const url = `${backendUrl}/api/vote/stats?gameId=${gameId}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch vote stats');
      
      const data = await response.json();
      console.log('Vote stats updated via HTTP:', data);
      setVoteStats(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching vote stats:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!gameId) return;

    let ws = null;
    let reconnectInterval = null;
    let isConnected = false;

    const connectWebSocket = () => {
      try {
        const backendUrl = getBackendUrl();
        const wsUrl = backendUrl.replace('http://', 'ws://').replace('https://', 'wss://');
        ws = new WebSocket(`${wsUrl}/api/vote/ws/${gameId}`);
        
        ws.onopen = () => {
          console.log(`Connected to vote WebSocket for game ${gameId}`);
          isConnected = true;
          setError(null);
          if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
          }
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.type === 'vote_update' && message.data) {
              setVoteStats(prevStats => {
                const newStats = {
                  gpt_4o: message.data.votes?.['gpt-4o'] || 0,
                  claude: message.data.votes?.claude || 0,
                  total: message.data.total || 0,
                  percentages: message.data.percentages || { gpt_4o: 0, claude: 0 }
                };
                console.log('Vote stats updated via WebSocket:', newStats);
                return newStats;
              });
              setIsLoading(false);
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setError('WebSocket connection error');
        };

        ws.onclose = () => {
          console.log('Vote WebSocket disconnected');
          isConnected = false;
          
          // Try to reconnect every 3 seconds
          if (!reconnectInterval) {
            reconnectInterval = setInterval(() => {
              if (!isConnected) {
                console.log('Attempting to reconnect vote WebSocket...');
                connectWebSocket();
              }
            }, 3000);
          }
        };
      } catch (err) {
        console.error('Failed to create WebSocket connection:', err);
        setError('Failed to connect to real-time updates');
      }
    };

    // Initial fetch and WebSocket connection
    fetchVoteStats();
    connectWebSocket();

    // Fallback polling if WebSocket fails (more frequent for real-time feel)
    const pollInterval = setInterval(() => {
      if (!isConnected) {
        fetchVoteStats();
      }
    }, 2000); // Poll every 2 seconds instead of 5

    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectInterval) {
        clearInterval(reconnectInterval);
      }
      clearInterval(pollInterval);
    };
  }, [gameId, fetchVoteStats]);

  return { voteStats, isLoading, error, refetch: fetchVoteStats };
};

export { useVoteStats };
export default useVoteStats; 