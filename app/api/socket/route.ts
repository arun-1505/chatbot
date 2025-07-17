import type { NextRequest } from "next/server"
import { Server as SocketIOServer } from "socket.io"
import type { Server as NetServer } from "http"

export const dynamic = "force-dynamic"

// Store for message history
const messageHistory: Array<{
  id: string
  user: string
  message: string
  timestamp: number
}> = []

let io: SocketIOServer

export async function GET(req: NextRequest) {
  if (!io) {
    const httpServer: NetServer = (req as any).socket.server
    io = new SocketIOServer(httpServer, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    })

    io.on("connection", (socket) => {
      console.log("User connected:", socket.id)

      // Send message history to newly connected user
      socket.emit("message_history", messageHistory)

      // Handle new messages
      socket.on("message", (data) => {
        const messageData = {
          id: Date.now().toString(),
          user: data.user || `User${socket.id.slice(0, 4)}`,
          message: data.message,
          timestamp: Date.now(),
        }

        // Store message in history
        messageHistory.push(messageData)

        // Keep only last 100 messages
        if (messageHistory.length > 100) {
          messageHistory.shift()
        }

        // Broadcast message to all connected clients
        io.emit("message", messageData)
      })

      // Handle user typing
      socket.on("typing", (data) => {
        socket.broadcast.emit("user_typing", {
          user: data.user,
          isTyping: data.isTyping,
        })
      })

      socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id)
      })
    })
  }

  return new Response("Socket server initialized", { status: 200 })
}
