from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    """Manages WebSocket connections for real-time updates."""

    def __init__(self) -> None:
        self.active_connections: dict[int, list[WebSocket]] = {}
        self.broadcast_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket, user_id: int | None = None) -> None:
        await websocket.accept()
        if user_id is not None:
            self.active_connections.setdefault(user_id, []).append(websocket)
        else:
            self.broadcast_connections.append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int | None = None) -> None:
        if user_id is not None and user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        elif websocket in self.broadcast_connections:
            self.broadcast_connections.remove(websocket)

    async def send_to_user(self, user_id: int, message: dict[str, Any]) -> None:
        for connection in self.active_connections.get(user_id, []):
            await connection.send_json(message)

    async def broadcast(self, message: dict[str, Any]) -> None:
        for connections in self.active_connections.values():
            for connection in connections:
                await connection.send_json(message)
        for connection in self.broadcast_connections:
            await connection.send_json(message)


manager = ConnectionManager()
