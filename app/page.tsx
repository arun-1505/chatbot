"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { io, type Socket } from "socket.io-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Send, Users, MessageCircle } from "lucide-react"

interface Message {
  id: string
  user: string
  message: string
  timestamp: number
}

interface TypingUser {
  user: string
  isTyping: boolean
}

export default function ChatApp() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [username, setUsername] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  // Generate random username
  useEffect(() => {
    const randomUsername = `User${Math.floor(Math.random() * 1000)}`
    setUsername(randomUsername)
  }, [])

  // Initialize socket connection
  useEffect(() => {
    const socketInstance = io({
      path: "/api/socket",
    })

    socketInstance.on("connect", () => {
      setIsConnected(true)
      console.log("Connected to server")
    })

    socketInstance.on("disconnect", () => {
      setIsConnected(false)
      console.log("Disconnected from server")
    })

    socketInstance.on("message", (data: Message) => {
      setMessages((prev) => [...prev, data])
    })

    socketInstance.on("message_history", (history: Message[]) => {
      setMessages(history)
    })

    socketInstance.on("user_typing", (data: TypingUser) => {
      setTypingUsers((prev) => {
        const filtered = prev.filter((user) => user.user !== data.user)
        if (data.isTyping) {
          return [...filtered, data]
        }
        return filtered
      })
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputMessage.trim() && socket && isConnected) {
      socket.emit("message", {
        user: username,
        message: inputMessage.trim(),
      })
      setInputMessage("")

      // Stop typing indicator
      if (isTyping) {
        socket.emit("typing", { user: username, isTyping: false })
        setIsTyping(false)
      }
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value)

    if (socket && isConnected) {
      if (!isTyping) {
        socket.emit("typing", { user: username, isTyping: true })
        setIsTyping(true)
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing", { user: username, isTyping: false })
        setIsTyping(false)
      }, 1000)
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2">
            <MessageCircle className="h-8 w-8 text-blue-600" />
            Real-Time Chat
          </h1>
          <div className="flex items-center justify-center gap-4">
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {username}
            </Badge>
          </div>
        </div>

        <Card className="h-[600px] flex flex-col shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Chat Room</CardTitle>
          </CardHeader>

          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full px-4">
              <div className="space-y-4 py-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.user === username ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          msg.user === username ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium opacity-75">{msg.user}</span>
                          <span className="text-xs opacity-50">{formatTime(msg.timestamp)}</span>
                        </div>
                        <p className="text-sm break-words">{msg.message}</p>
                      </div>
                    </div>
                  ))
                )}

                {/* Typing indicators */}
                {typingUsers.length > 0 && (
                  <div className="flex justify-start">
                    <div className="bg-gray-200 rounded-lg px-4 py-2 max-w-[70%]">
                      <p className="text-sm text-gray-600 italic">
                        {typingUsers.map((user) => user.user).join(", ")}
                        {typingUsers.length === 1 ? " is" : " are"} typing...
                      </p>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </CardContent>

          <CardFooter className="pt-4">
            <form onSubmit={sendMessage} className="flex w-full gap-2">
              <Input
                value={inputMessage}
                onChange={handleInputChange}
                placeholder={isConnected ? "Type your message..." : "Connecting..."}
                disabled={!isConnected}
                className="flex-1"
                maxLength={500}
              />
              <Button type="submit" disabled={!isConnected || !inputMessage.trim()} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>

        <div className="mt-4 text-center text-sm text-gray-600">
          <p>Messages are stored temporarily and limited to the last 100 messages.</p>
        </div>
      </div>
    </div>
  )
}
