// Configuración de marked.js
marked.setOptions({
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
    breaks: true,
    gfm: true,
});

// Elementos del DOM
const elements = {
    chatContainer: document.getElementById('chatContainer'),
    userInput: document.getElementById('userInput'),
    sendButton: document.getElementById('sendButton'),
    newChatBtn: document.getElementById('newChatBtn'),
    chatHistory: document.getElementById('chatHistory'),
};

// Estado de la aplicación
let state = {
    currentChatId: null,
    chats: [],
    isLoading: false
};

// Funciones de utilidad
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function scrollToBottom() {
    elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
}

function adjustTextareaHeight() {
    elements.userInput.style.height = 'auto';
    elements.userInput.style.height = `${Math.min(elements.userInput.scrollHeight, 200)}px`;
}

// Funciones de renderizado
function renderMessage(message, role) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.textContent = role === 'user' ? '👤' : '🤖';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = marked.parse(message);

    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);

    elements.chatContainer.appendChild(messageDiv);
    scrollToBottom();

    // Aplicar resaltado de sintaxis a los bloques de código
    messageDiv.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
    });
}

function renderChatHistory() {
    elements.chatHistory.innerHTML = '';
    state.chats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = `chat-item ${chat.id === state.currentChatId ? 'active' : ''}`;
        chatItem.dataset.chatId = chat.id;

        const chatTitle = document.createElement('div');
        chatTitle.className = 'chat-title';
        chatTitle.textContent = chat.title;

        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-chat';
        deleteButton.innerHTML = '🗑️';
        deleteButton.onclick = (e) => {
            e.stopPropagation();
            deleteChat(chat.id);
        };

        chatItem.appendChild(chatTitle);
        chatItem.appendChild(deleteButton);

        chatItem.onclick = () => loadChat(chat.id);
        elements.chatHistory.appendChild(chatItem);
    });
}

// Funciones de manejo de chats
async function createNewChat() {
    try {
        // Crear el chat en el servidor primero
        const response = await fetch('/save-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'Nuevo Chat'
            })
        });

        if (!response.ok) {
            throw new Error('Error al crear el chat');
        }

        const data = await response.json();
        const newChat = {
            id: data.chatId,
            title: data.title,
            messages: []
        };

        state.chats.unshift(newChat);
        state.currentChatId = data.chatId;
        
        elements.chatContainer.innerHTML = '';
        renderChatHistory();
        
        const welcomeMessage = '¡Hola! Soy tu asistente de IA. ¿En qué puedo ayudarte hoy?';
        renderMessage(welcomeMessage, 'ai');
    } catch (error) {
        console.error('Error creating chat:', error);
        alert('Error al crear el chat. Por favor, intenta de nuevo.');
    }
}

async function loadChat(chatId) {
    try {
        const response = await fetch(`/load-chat/${chatId}`);
        const chat = await response.json();
        
        state.currentChatId = chatId;
        elements.chatContainer.innerHTML = '';
        
        chat.messages.forEach(msg => {
            renderMessage(msg.content, msg.role);
        });
        
        renderChatHistory();
    } catch (error) {
        console.error('Error loading chat:', error);
    }
}

async function deleteChat(chatId) {
    try {
        await fetch(`/delete-chat/${chatId}`, { method: 'DELETE' });
        
        state.chats = state.chats.filter(chat => chat.id !== chatId);
        
        if (state.currentChatId === chatId) {
            if (state.chats.length > 0) {
                await loadChat(state.chats[0].id);
            } else {
                await createNewChat();
            }
        } else {
            renderChatHistory();
        }
    } catch (error) {
        console.error('Error deleting chat:', error);
    }
}

async function saveChatToServer(chat) {
    try {
        await fetch('/save-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(chat)
        });
    } catch (error) {
        console.error('Error saving chat:', error);
    }
}

async function updateChatTitle(chatId, firstMessage) {
    const title = firstMessage.length > 30 
        ? firstMessage.substring(0, 30) + '...'
        : firstMessage;

    const chatToUpdate = state.chats.find(chat => chat.id === chatId);
    if (chatToUpdate) {
        chatToUpdate.title = title;
        renderChatHistory();
        
        try {
            await fetch(`/update-chat-title/${chatId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title })
            });
        } catch (error) {
            console.error('Error updating chat title:', error);
        }
    }
}

// Función principal de envío de mensajes
async function sendMessage() {
    const message = elements.userInput.value.trim();
    if (!message || state.isLoading) return;

    state.isLoading = true;
    elements.userInput.value = '';
    adjustTextareaHeight();
    
    // Renderizar mensaje del usuario
    renderMessage(message, 'user');

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                chatId: state.currentChatId
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Network response was not ok');
        }
        
        // Actualizar título del chat si es el primer mensaje
        const currentChat = state.chats.find(chat => chat.id === state.currentChatId);
        const isFirstMessage = currentChat && (!currentChat.messages || currentChat.messages.length === 0);
        if (isFirstMessage) {
            await updateChatTitle(state.currentChatId, message);
        }

        // Renderizar respuesta del asistente
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Actualizar el estado del chat con los nuevos mensajes
        if (currentChat) {
            if (!currentChat.messages) {
                currentChat.messages = [];
            }
            currentChat.messages.push(
                { role: 'user', content: message },
                { role: 'ai', content: data.response }
            );
        }
        
        renderMessage(data.response, 'ai');
    } catch (error) {
        console.error('Error:', error);
        renderMessage(`Error: ${error.message}`, 'ai');
    } finally {
        state.isLoading = false;
    }
}

// Event Listeners y inicialización
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/load-chats');
        const data = await response.json();
        
        state.chats = data.chats || [];
        renderChatHistory();
        
        if (state.chats.length > 0) {
            await loadChat(state.chats[0].id);
        } else {
            await createNewChat();
        }
    } catch (error) {
        console.error('Error loading chats:', error);
        await createNewChat();
    }
});

elements.userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
    adjustTextareaHeight();
});

elements.sendButton.addEventListener('click', sendMessage);
elements.newChatBtn.addEventListener('click', createNewChat);
elements.userInput.addEventListener('input', adjustTextareaHeight);
