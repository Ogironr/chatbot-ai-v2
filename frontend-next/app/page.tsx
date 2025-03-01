"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, User, Plus, Trash2, Send, MessageCircle, ChevronLeft, Menu } from "lucide-react"
import { marked } from "marked"
import hljs from "highlight.js"

// Configuración de marked.js
marked.setOptions({
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value
      } catch (err) {}
    }
    try {
      return hljs.highlightAuto(code).value
    } catch (err) {}
    return code
  },
  breaks: true,
  gfm: true,
})

interface Message {
  role: "user" | "ai"
  content: string
}

interface Chat {
  id: string
  title: string
  messages: Message[]
}

export default function ChatInterface() {
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showChats, setShowChats] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Cargar chats guardados al inicio
  useEffect(() => {
    loadSavedChats()
  }, [])

  // Ajustar altura del textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [textareaRef])

  // Scroll al fondo cuando hay nuevos mensajes
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatContainerRef])

  const loadSavedChats = async () => {
    try {
      console.log('Cargando chats...');
      const response = await fetch('/api/load-chats')
      const data = await response.json()
      console.log('Chats cargados:', data)

      setChats(data.chats)

      if (data.chats && data.chats.length > 0) {
        loadChat(data.chats[0].id)
      } else {
        createNewChat()
      }
    } catch (error) {
      console.error("Error loading chats:", error)
      createNewChat()
    }
  }

  const loadChat = async (chatId: string) => {
    try {
      setCurrentChatId(chatId)
      const response = await fetch(`/api/load-chat/${chatId}`)
      const data = await response.json()
      setMessages(data.messages || [])
    } catch (error) {
      console.error("Error loading chat:", error)
    }
  }

  const createNewChat = async () => {
    try {
      console.log('Creando nuevo chat...');
      const response = await fetch('/api/save-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Nuevo Chat' })
      })
      const data = await response.json()
      console.log('Respuesta del servidor:', data)

      const newChat = {
        id: data.chatId,
        title: data.title,
      }

      setChats((prev) => [newChat, ...prev])
      setCurrentChatId(data.chatId)
      setMessages([{
        role: "ai" as const,
        content: "¡Hola! Soy tu asistente de IA. ¿En qué puedo ayudarte hoy?"
      }])
      setInput("")
    } catch (error) {
      console.error("Error creating new chat:", error)
    }
  }

  const deleteChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/delete-chat/${chatId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
        if (currentChatId === chatId) {
          setCurrentChatId('');
          setMessages([]);
        }
      } else {
        console.error('Error al eliminar el chat');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      role: "user",
      content: input,
    }

    console.log('Enviando mensaje:', {
      message: input,
      chatId: currentChatId
    });

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          chatId: currentChatId
        })
      })
      const data = await response.json()
      console.log('Respuesta del servidor:', data)

      if (data.response) {
        const aiResponse: Message = {
          role: "ai",
          content: data.response
        }

        setMessages((prev) => [...prev, aiResponse])

        // Actualizar título del chat si es el primer mensaje del usuario
        if (messages.length === 1) {
          const shortTitle = input.length > 30 ? input.substring(0, 27) + "..." : input
          setChats((prev) => prev.map((chat) => (chat.id === currentChatId ? { ...chat, title: shortTitle } : chat)))
          
          // Actualizar título en el servidor
          await fetch(`/api/update-chat-title/${currentChatId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: shortTitle })
          })
        }
      }
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar con lista de chats */}
      <div 
        className={`${
          showChats ? 'w-64' : 'w-0'
        } flex-shrink-0 bg-muted/30 border-r border-border transition-all duration-300 ease-in-out overflow-hidden`}
      >
        <div className="p-3">
          <Button onClick={createNewChat} className="w-full justify-start gap-2 bg-primary hover:bg-primary/90">
            <Plus size={18} />
            <span>Nuevo chat</span>
          </Button>
        </div>

        <ScrollArea className="flex-1 h-[calc(100vh-5rem)]">
          <div className="space-y-1">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/50 ${
                  chat.id === currentChatId ? "bg-muted" : ""
                }`}
              >
                <Button
                  variant="ghost"
                  className="flex-1 justify-start gap-2 h-auto p-0 text-left font-normal"
                  onClick={() => loadChat(chat.id)}
                >
                  <MessageSquare size={16} />
                  <span className="truncate">{chat.title}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('¿Estás seguro de que deseas eliminar este chat?')) {
                      deleteChat(chat.id);
                    }
                  }}
                >
                  <Trash2 size={16} className="text-destructive hover:text-destructive/90" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Área principal del chat */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${showChats ? '' : 'pl-0'}`}>
        {/* Barra superior */}
        <div className="h-14 border-b border-border flex items-center px-4 justify-between">
          <Button
            onClick={() => setShowChats(!showChats)}
            variant="ghost"
            size="icon"
            className="text-foreground hover:text-foreground/90 transition-colors"
          >
            {showChats ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            )}
          </Button>
          <div className="flex-1 ml-4">
            {currentChatId && (
              <input
                type="text"
                value={chats.find(chat => chat.id === currentChatId)?.title || ''}
                onChange={(e) => {
                  const shortTitle = e.target.value.length > 30 ? e.target.value.substring(0, 27) + "..." : e.target.value
                  setChats((prev) => prev.map((chat) => (chat.id === currentChatId ? { ...chat, title: shortTitle } : chat)))
                }}
                className="bg-transparent border-none focus:outline-none text-foreground w-full"
                placeholder="Título del chat"
              />
            )}
          </div>
        </div>

        {/* Área de mensajes */}
        <div
          ref={chatContainerRef}
          className={`flex-1 overflow-y-auto p-4 transition-all duration-300 ease-in-out ${
            !showChats ? "pt-16 md:pt-20" : "pt-4"
          }`}
        >
          {/* Full Width Content Container */}
          <div className="w-full h-full flex flex-col">
            <div className="w-full max-w-3xl mx-auto px-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`w-full py-6 ${
                    message.role === "user" ? "bg-background" : "bg-muted/30"
                  }`}
                >
                  <div className="flex gap-4">
                    <div className="mt-0.5 shrink-0">
                      {message.role === "user" ? (
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <User size={18} />
                        </div>
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <MessageCircle size={18} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 prose prose-invert max-w-none">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: marked.parse(message.content, {
                            gfm: true,
                            breaks: true,
                            highlight: (code, lang) => {
                              if (lang && hljs.getLanguage(lang)) {
                                try {
                                  return hljs.highlight(code, { language: lang }).value;
                                } catch (err) {}
                              }
                              try {
                                return hljs.highlightAuto(code).value;
                              } catch (err) {}
                              return code;
                            },
                          }),
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="w-full py-6 bg-muted/30">
                  <div className="flex gap-4">
                    <div className="mt-0.5 shrink-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <MessageCircle size={18} />
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="flex space-x-1.5">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-primary/50"></div>
                        <div className="h-2 w-2 animate-bounce rounded-full bg-primary/50 [animation-delay:0.2s]"></div>
                        <div className="h-2 w-2 animate-bounce rounded-full bg-primary/50 [animation-delay:0.4s]"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-border">
          <div className="w-full flex justify-center px-4 py-4">
            <div className="w-full max-w-3xl relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Envía un mensaje..."
                className="min-h-[60px] resize-none pr-12 py-3 bg-background"
                rows={1}
              />
              <Button
                size="icon"
                className="absolute right-2 bottom-2 h-8 w-8"
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
              >
                <Send size={16} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
