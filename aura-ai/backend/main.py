"""
AURA AI - Phase 1 Backend
FastAPI WebSocket Server for Real-Time Telemetry Streaming
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List
import json
import asyncio
from datetime import datetime
import uvicorn

# ============================================================================
# APP INITIALIZATION
# ============================================================================

app = FastAPI(
    title="AURA AI Telemetry Server",
    description="Enterprise-Grade Human Telemetry & Behavioral Intelligence Backend",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# CONNECTION MANAGER
# ============================================================================

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.session_data: Dict[str, Dict] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.session_data[session_id] = {
            "connected_at": datetime.now().isoformat(),
            "message_count": 0
        }
        print(f"✅ Client connected: {session_id}")
    
    def disconnect(self, websocket: WebSocket, session_id: str):
        self.active_connections.remove(websocket)
        if session_id in self.session_data:
            del self.session_data[session_id]
        print(f"❌ Client disconnected: {session_id}")
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)
    
    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

# ============================================================================
# ROUTES
# ============================================================================

@app.get("/")
async def root():
    return {
        "service": "AURA AI Telemetry Server",
        "version": "1.0.0",
        "phase": "Phase 1: Human Telemetry & Behavioral Intelligence Foundation",
        "status": "operational",
        "active_connections": len(manager.active_connections)
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "active_sessions": len(manager.session_data)
    }

@app.get("/sessions")
async def get_sessions():
    return {
        "active_sessions": len(manager.session_data),
        "sessions": manager.session_data
    }

# ============================================================================
# WEBSOCKET ENDPOINT
# ============================================================================

@app.websocket("/ws/telemetry/{session_id}")
async def telemetry_websocket(websocket: WebSocket, session_id: str):
    await manager.connect(websocket, session_id)
    
    try:
        while True:
            # Receive telemetry data from client
            data = await websocket.receive_text()
            
            try:
                telemetry = json.loads(data)
                
                # Update session stats
                if session_id in manager.session_data:
                    manager.session_data[session_id]["message_count"] += 1
                    manager.session_data[session_id]["last_message"] = datetime.now().isoformat()
                
                # Process telemetry message
                message_type = telemetry.get("type")
                
                if message_type == "FACE_LANDMARKS":
                    await process_face_landmarks(telemetry, session_id)
                elif message_type == "EYE_METRICS":
                    await process_eye_metrics(telemetry, session_id)
                elif message_type == "BLINK_EVENT":
                    await process_blink_event(telemetry, session_id)
                elif message_type == "TYPING_METRICS":
                    await process_typing_metrics(telemetry, session_id)
                elif message_type == "MOUSE_METRICS":
                    await process_mouse_metrics(telemetry, session_id)
                elif message_type == "SENSOR_QUALITY":
                    await process_sensor_quality(telemetry, session_id)
                elif message_type == "CALIBRATION_UPDATE":
                    await process_calibration_update(telemetry, session_id)
                
                # Echo acknowledgment
                await manager.send_personal_message(
                    json.dumps({
                        "type": "ACK",
                        "message_type": message_type,
                        "timestamp": datetime.now().isoformat()
                    }),
                    websocket
                )
                
            except json.JSONDecodeError:
                print(f"⚠️  Invalid JSON received from {session_id}")
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)
    except Exception as e:
        print(f"❌ Error in websocket {session_id}: {str(e)}")
        manager.disconnect(websocket, session_id)

# ============================================================================
# TELEMETRY PROCESSORS
# ============================================================================

async def process_face_landmarks(telemetry: Dict, session_id: str):
    """Process facial landmark data"""
    payload = telemetry.get("payload", {})
    confidence = payload.get("confidence", 0)
    
    # Log high-quality detections
    if confidence > 0.8:
        print(f"📸 High-quality face detection: {session_id} (confidence: {confidence:.2f})")

async def process_eye_metrics(telemetry: Dict, session_id: str):
    """Process eye aspect ratio metrics"""
    payload = telemetry.get("payload", {})
    ear = payload.get("averageEAR", 0)
    
    # Log potential blink threshold crossings
    if ear < 0.2:
        print(f"👁️  Low EAR detected: {session_id} (EAR: {ear:.3f})")

async def process_blink_event(telemetry: Dict, session_id: str):
    """Process blink event"""
    payload = telemetry.get("payload", {})
    duration = payload.get("duration", 0)
    
    print(f"👁️  Blink detected: {session_id} (duration: {duration} frames)")

async def process_typing_metrics(telemetry: Dict, session_id: str):
    """Process typing dynamics"""
    payload = telemetry.get("payload", {})
    wpm = payload.get("wpm", 0)
    confidence = payload.get("confidence", 0)
    
    if confidence > 0.7:
        print(f"⌨️  Typing metrics: {session_id} (WPM: {wpm}, confidence: {confidence:.2f})")

async def process_mouse_metrics(telemetry: Dict, session_id: str):
    """Process mouse dynamics"""
    payload = telemetry.get("payload", {})
    velocity = payload.get("velocity", 0)
    entropy = payload.get("movementEntropy", 0)
    
    print(f"🖱️  Mouse metrics: {session_id} (velocity: {velocity} px/s, entropy: {entropy:.2f})")

async def process_sensor_quality(telemetry: Dict, session_id: str):
    """Process sensor quality scores"""
    payload = telemetry.get("payload", {})
    overall = payload.get("overallQuality", 0)
    
    if overall < 0.5:
        print(f"⚠️  Low sensor quality: {session_id} (quality: {overall:.2f})")

async def process_calibration_update(telemetry: Dict, session_id: str):
    """Process calibration progress"""
    payload = telemetry.get("payload", {})
    progress = payload.get("progress", 0)
    
    print(f"🎯 Calibration progress: {session_id} ({progress*100:.1f}%)")

# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("🚀 AURA AI - Phase 1 Telemetry Server")
    print("=" * 70)
    print("📡 WebSocket endpoint: ws://localhost:8000/ws/telemetry/{session_id}")
    print("🌐 HTTP endpoint: http://localhost:8000")
    print("=" * 70)
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
