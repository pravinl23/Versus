"""
FastAPI Server for Voice-Powered AI Debate Arena
Handles debate setup, round management, and real-time WebSocket communication
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import asyncio
import json
import uuid
import time
import os

from debate_game import VoiceDebateGame

# FastAPI app initialization
app = FastAPI(title="Voice Debate Arena API", version="1.0.0")

# CORS middleware for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Game storage
active_debates: Dict[str, VoiceDebateGame] = {}
websocket_connections: Dict[str, List[WebSocket]] = {}

# Pydantic models for request/response
class DebateStartRequest(BaseModel):
    player1_model: str
    player2_model: str
    topic: str
    total_rounds: int = 6

class DebateStartResponse(BaseModel):
    debate_id: str
    initial_state: Dict[str, Any]

class NextRoundResponse(BaseModel):
    success: bool
    round_data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# WebSocket Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, debate_id: str):
        await websocket.accept()
        if debate_id not in self.active_connections:
            self.active_connections[debate_id] = []
        self.active_connections[debate_id].append(websocket)

    def disconnect(self, websocket: WebSocket, debate_id: str):
        if debate_id in self.active_connections:
            self.active_connections[debate_id].remove(websocket)
            if not self.active_connections[debate_id]:
                del self.active_connections[debate_id]

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast_to_debate(self, message: dict, debate_id: str):
        if debate_id in self.active_connections:
            for connection in self.active_connections[debate_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except:
                    # Remove broken connections
                    self.active_connections[debate_id].remove(connection)

manager = ConnectionManager()

@app.get("/")
async def root():
    return {"message": "Voice Debate Arena API", "status": "active"}

@app.get("/api/debate/health")
async def health_check():
    return {
        "status": "healthy",
        "active_debates": len(active_debates),
        "websocket_connections": len(websocket_connections)
    }

@app.post("/api/debate/start", response_model=DebateStartResponse)
async def start_debate(request: DebateStartRequest):
    """Start a new voice debate between two LLM models"""
    try:
        # Generate unique debate ID
        debate_id = str(uuid.uuid4())
        
        # Create new debate game
        debate_game = VoiceDebateGame(
            player1_model=request.player1_model,
            player2_model=request.player2_model,
            topic=request.topic,
            total_rounds=request.total_rounds
        )
        
        # Initialize the game
        initial_state = debate_game.initialize_game()
        
        # Store the game
        active_debates[debate_id] = debate_game
        
        # Broadcast to WebSocket clients
        await manager.broadcast_to_debate({
            "type": "debate_started",
            "debate_id": debate_id,
            "state": initial_state
        }, debate_id)
        
        return DebateStartResponse(
            debate_id=debate_id,
            initial_state=initial_state
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start debate: {str(e)}")

@app.post("/api/debate/{debate_id}/next-round")
async def next_round(debate_id: str) -> NextRoundResponse:
    """Advance to the next round of the debate"""
    if debate_id not in active_debates:
        raise HTTPException(status_code=404, detail="Debate not found")
    
    debate_game = active_debates[debate_id]
    
    try:
        # Start the next round
        result = await debate_game.start_debate_round()
        
        if result.get("success"):
            # Broadcast round update to WebSocket clients
            await manager.broadcast_to_debate({
                "type": "round_completed",
                "debate_id": debate_id,
                "round_data": result["round_data"],
                "debate_state": result["debate_state"]
            }, debate_id)
            
            # Check if debate is finished
            if result["debate_state"]["debate_finished"]:
                # Judge the debate
                judgment = await debate_game.judge_debate()
                final_results = debate_game.get_final_results()
                
                # Broadcast final results
                await manager.broadcast_to_debate({
                    "type": "debate_finished",
                    "debate_id": debate_id,
                    "judgment": judgment,
                    "final_results": final_results
                }, debate_id)
        
        return NextRoundResponse(
            success=result.get("success", False),
            round_data=result.get("round_data"),
            error=result.get("error")
        )
        
    except Exception as e:
        return NextRoundResponse(
            success=False,
            error=f"Failed to advance round: {str(e)}"
        )

@app.get("/api/debate/{debate_id}/state")
async def get_debate_state(debate_id: str):
    """Get current state of a debate"""
    if debate_id not in active_debates:
        raise HTTPException(status_code=404, detail="Debate not found")
    
    debate_game = active_debates[debate_id]
    
    return {
        "debate_id": debate_id,
        "state": debate_game._get_current_state(),
        "transcript": debate_game.debate_transcript
    }

@app.get("/api/debate/{debate_id}/transcript")
async def get_debate_transcript(debate_id: str):
    """Get full transcript of a debate"""
    if debate_id not in active_debates:
        raise HTTPException(status_code=404, detail="Debate not found")
    
    debate_game = active_debates[debate_id]
    
    return {
        "debate_id": debate_id,
        "topic": debate_game.topic,
        "transcript": debate_game.debate_transcript,
        "debate_finished": debate_game.debate_finished
    }

@app.post("/api/debate/{debate_id}/judge")
async def judge_debate(debate_id: str):
    """Judge a completed debate"""
    if debate_id not in active_debates:
        raise HTTPException(status_code=404, detail="Debate not found")
    
    debate_game = active_debates[debate_id]
    
    if not debate_game.debate_finished:
        raise HTTPException(status_code=400, detail="Debate is not finished yet")
    
    try:
        judgment = await debate_game.judge_debate()
        final_results = debate_game.get_final_results()
        
        return {
            "judgment": judgment,
            "final_results": final_results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to judge debate: {str(e)}")

@app.delete("/api/debate/{debate_id}")
async def end_debate(debate_id: str):
    """End and cleanup a debate"""
    if debate_id not in active_debates:
        raise HTTPException(status_code=404, detail="Debate not found")
    
    # Broadcast debate ending
    await manager.broadcast_to_debate({
        "type": "debate_ended",
        "debate_id": debate_id
    }, debate_id)
    
    # Cleanup
    del active_debates[debate_id]
    if debate_id in manager.active_connections:
        del manager.active_connections[debate_id]
    
    return {"message": "Debate ended and cleaned up"}

@app.get("/api/debate/active")
async def list_active_debates():
    """List all active debates"""
    debates = []
    for debate_id, debate_game in active_debates.items():
        debates.append({
            "debate_id": debate_id,
            "topic": debate_game.topic,
            "current_round": debate_game.current_round,
            "total_rounds": debate_game.total_rounds,
            "debate_finished": debate_game.debate_finished,
            "player1_model": debate_game.player1.model_type,
            "player2_model": debate_game.player2.model_type
        })
    
    return {"active_debates": debates}

# Auto-advance endpoint for continuous debate flow
@app.post("/api/debate/{debate_id}/auto-advance")
async def auto_advance_debate(debate_id: str):
    """Automatically advance through all rounds of a debate"""
    if debate_id not in active_debates:
        raise HTTPException(status_code=404, detail="Debate not found")
    
    debate_game = active_debates[debate_id]
    
    try:
        rounds_completed = []
        
        while not debate_game.debate_finished:
            # Start next round
            result = await debate_game.start_debate_round()
            
            if result.get("success"):
                rounds_completed.append(result["round_data"])
                
                # Broadcast round update
                await manager.broadcast_to_debate({
                    "type": "round_completed",
                    "debate_id": debate_id,
                    "round_data": result["round_data"],
                    "debate_state": result["debate_state"]
                }, debate_id)
                
                # Add small delay between rounds for better UX
                await asyncio.sleep(2)
            else:
                break
        
        # Judge the debate if finished
        if debate_game.debate_finished:
            judgment = await debate_game.judge_debate()
            final_results = debate_game.get_final_results()
            
            # Broadcast final results
            await manager.broadcast_to_debate({
                "type": "debate_finished",
                "debate_id": debate_id,
                "judgment": judgment,
                "final_results": final_results
            }, debate_id)
            
            return {
                "success": True,
                "rounds_completed": len(rounds_completed),
                "judgment": judgment,
                "final_results": final_results
            }
        
        return {
            "success": False,
            "rounds_completed": len(rounds_completed),
            "error": "Debate did not complete successfully"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Auto-advance failed: {str(e)}"
        }

# WebSocket endpoint for real-time debate updates
@app.websocket("/api/debate/ws/{debate_id}")
async def websocket_endpoint(websocket: WebSocket, debate_id: str):
    await manager.connect(websocket, debate_id)
    
    try:
        # Send initial connection confirmation
        await websocket.send_text(json.dumps({
            "type": "connected",
            "debate_id": debate_id,
            "message": "Connected to debate WebSocket"
        }))
        
        # Send current debate state if debate exists
        if debate_id in active_debates:
            debate_game = active_debates[debate_id]
            await websocket.send_text(json.dumps({
                "type": "current_state",
                "debate_id": debate_id,
                "state": debate_game._get_current_state(),
                "transcript": debate_game.debate_transcript
            }))
        
        # Keep connection alive and listen for client messages
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle different message types from client
            if message.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
            elif message.get("type") == "request_next_round":
                # Client requesting next round
                if debate_id in active_debates:
                    result = await active_debates[debate_id].start_debate_round()
                    await manager.broadcast_to_debate({
                        "type": "round_completed",
                        "debate_id": debate_id,
                        "round_data": result.get("round_data"),
                        "debate_state": result.get("debate_state")
                    }, debate_id)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, debate_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket, debate_id)

# Vapi webhook endpoint (for voice processing callbacks)
@app.post("/api/debate/vapi-webhook")
async def vapi_webhook(request: dict):
    """Handle Vapi webhook callbacks for voice processing"""
    try:
        # Handle different Vapi event types
        event_type = request.get("type", "")
        
        if event_type == "call-started":
            print(f"Vapi call started: {request.get('call', {}).get('id', '')}")
        elif event_type == "call-ended":
            print(f"Vapi call ended: {request.get('call', {}).get('id', '')}")
        elif event_type == "transcript":
            # Handle speech-to-text results
            transcript = request.get("transcript", {})
            print(f"Vapi transcript: {transcript}")
        
        return {"status": "received"}
        
    except Exception as e:
        print(f"Vapi webhook error: {e}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8003,
        reload=True,
        log_level="info"
    ) 