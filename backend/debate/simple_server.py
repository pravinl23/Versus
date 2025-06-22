"""
Simple Debate Server
Clean FastAPI server with minimal endpoints for debate functionality
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uuid
import asyncio
import uvicorn

from simple_debate import SimpleDebate, active_debates

app = FastAPI(title="Simple Debate API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request models
class CreateDebateRequest(BaseModel):
    topic: str
    model1: str = "gpt-4o-mini"
    model2: str = "gpt-4o-mini"
    judge_model: str = "gpt-4o"

class GenerateArgumentRequest(BaseModel):
    debate_id: str

class JudgeDebateRequest(BaseModel):
    debate_id: str

@app.get("/")
async def root():
    """Health check"""
    return {"message": "Simple Debate API is running! 🎭"}

@app.post("/create-debate")
async def create_debate(request: CreateDebateRequest):
    """Create a new debate"""
    try:
        # Generate unique ID
        debate_id = str(uuid.uuid4())[:8]
        
        # Create debate
        debate = SimpleDebate(
            topic=request.topic,
            model1=request.model1,
            model2=request.model2,
            judge_model=request.judge_model
        )
        
        # Store it
        active_debates[debate_id] = debate
        
        print(f"🎭 Created debate {debate_id}: {request.topic}")
        
        return {
            "success": True,
            "debate_id": debate_id,
            "topic": request.topic,
            "model1": request.model1,
            "model2": request.model2
        }
        
    except Exception as e:
        print(f"❌ Error creating debate: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-argument")
async def generate_argument(request: GenerateArgumentRequest):
    """Generate next argument in debate"""
    try:
        # Get debate
        if request.debate_id not in active_debates:
            raise HTTPException(status_code=404, detail="Debate not found")
        
        debate = active_debates[request.debate_id]
        
        # Generate argument
        result = await debate.generate_argument()
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error generating argument: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/debate/{debate_id}")
async def get_debate(debate_id: str):
    """Get current debate state"""
    try:
        if debate_id not in active_debates:
            raise HTTPException(status_code=404, detail="Debate not found")
        
        debate = active_debates[debate_id]
        return debate.get_state()
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting debate: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/judge-debate")
async def judge_debate(request: JudgeDebateRequest):
    """Judge a completed debate"""
    try:
        # Get debate
        if request.debate_id not in active_debates:
            raise HTTPException(status_code=404, detail="Debate not found")
        
        debate = active_debates[request.debate_id]
        
        # Judge the debate
        result = await debate.judge_debate()
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error judging debate: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/debates")
async def list_debates():
    """List all active debates"""
    return {
        "debates": [
            {
                "debate_id": debate_id,
                "topic": debate.topic,
                "round_count": debate.round_count,
                "finished": debate.round_count >= debate.max_rounds
            }
            for debate_id, debate in active_debates.items()
        ]
    }

@app.delete("/debate/{debate_id}")
async def delete_debate(debate_id: str):
    """Delete a debate"""
    if debate_id in active_debates:
        del active_debates[debate_id]
        return {"success": True, "message": f"Debate {debate_id} deleted"}
    else:
        raise HTTPException(status_code=404, detail="Debate not found")

if __name__ == "__main__":
    print("🚀 Starting Simple Debate Server...")
    uvicorn.run(app, host="0.0.0.0", port=8001) 