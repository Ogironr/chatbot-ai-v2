document.addEventListener('DOMContentLoaded', function() {
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const newChatBtn = document.getElementById('newChatBtn');
    const chatHistory = document.getElementById('chatHistory');
    const chatContainer = document.getElementById('chat-container');

    let currentChatId = null;

    // Configuración de marked.js
    marked.setOptions({
        highlight: function(code, lang) {
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
        gfm: true
    });

    // Cargar chats guardados al inicio
    loadSavedChats().then(() => {
        // Si no hay chat activo, crear uno nuevo
        if (!currentChatId) {
            createNewChat();
        }
    });

    // Función para ajustar la altura del textarea
    function adjustTextareaHeight() {
        userInput.style.height = 'auto';
        userInput.style.height = Math.min(userInput.scrollHeight, 200) + 'px';
    }

    // Evento para ajustar altura mientras se escribe
    userInput.addEventListener('input', adjustTextareaHeight);

    // Evento para enviar mensaje con Enter (sin Shift)
    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Evento para el botón de enviar
    sendButton.addEventListener('click', sendMessage);

    // Evento para el botón de nuevo chat
    newChatBtn.addEventListener('click', createNewChat);

    async function loadSavedChats() {
        try {
            const response = await fetch('/load-chats');
            if (!response.ok) {
                throw new Error('Error al cargar los chats');
            }
            
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }

            chatHistory.innerHTML = '';
            
            if (data.chats && data.chats.length > 0) {
                data.chats.forEach(chat => {
                    addChatToHistory(chat.id, chat.title);
                });
                // Cargar el chat más reciente
                await loadChat(data.chats[0].id);
            }
        } catch (error) {
            console.error('Error loading chats:', error);
            addMessageToChat('ai', `Error al cargar los chats: ${error.message}`);
        }
    }

    function createNewChat() {
        console.log('Creando nuevo chat...');
        
        // Limpiar el chat actual
        chatContainer.innerHTML = '';
        userInput.value = '';
        adjustTextareaHeight();
        
        // Add welcome message
        const welcomeMessage = {
            role: 'ai',
            content: '¡Hola! Soy tu asistente de IA. ¿En qué puedo ayudarte hoy?'
        };
        addMessageToChat(welcomeMessage.role, welcomeMessage.content);
        
        // Create new chat in backend
        fetch('/save-chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Nuevo Chat'
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error en la respuesta del servidor');
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            console.log('Chat creado exitosamente:', data);
            currentChatId = data.chatId;
            addChatToHistory(data.chatId, data.title);
            updateActiveChat(data.chatId);
        })
        .catch(error => {
            console.error('Error creating new chat:', error);
            addMessageToChat('ai', `Error al crear nuevo chat: ${error.message}`);
            currentChatId = null;
        });
    }

    function updateActiveChat(chatId) {
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });
        const chatItem = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
        if (chatItem) {
            chatItem.classList.add('active');
        }
    }

    function addChatToHistory(chatId, title) {
        const existingChat = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
        if (existingChat) {
            existingChat.remove();
        }

        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        chatItem.setAttribute('data-chat-id', chatId);
        chatItem.innerHTML = `
            <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span class="chat-title">${title}</span>
            <button class="delete-chat" title="Eliminar chat">
                <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        `;
        
        chatItem.addEventListener('click', (e) => {
            if (!e.target.closest('.delete-chat')) {
                loadChat(chatId);
            }
        });

        const deleteBtn = chatItem.querySelector('.delete-chat');
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm('¿Estás seguro de que quieres eliminar este chat?')) {
                try {
                    const response = await fetch(`/delete-chat/${chatId}`, {
                        method: 'DELETE'
                    });
                    
                    if (!response.ok) {
                        throw new Error('Error al eliminar el chat');
                    }
                    
                    chatItem.remove();
                    
                    if (currentChatId === chatId) {
                        createNewChat();
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('Error al eliminar el chat');
                }
            }
        });

        // Insertar al principio del historial
        chatHistory.insertBefore(chatItem, chatHistory.firstChild);
        
        // Si es el único chat, hacerlo activo
        if (chatHistory.children.length === 1) {
            updateActiveChat(chatId);
        }
    }

    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        // Si no hay un chat activo, crear uno nuevo primero
        if (!currentChatId) {
            try {
                const createResponse = await fetch('/save-chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: message
                    })
                });

                if (!createResponse.ok) {
                    throw new Error('Error al crear el chat');
                }

                const createData = await createResponse.json();
                if (createData.error) {
                    throw new Error(createData.error);
                }

                currentChatId = createData.chatId;
                addChatToHistory(createData.chatId, createData.title);
                updateActiveChat(createData.chatId);
            } catch (error) {
                console.error('Error creating chat:', error);
                addMessageToChat('ai', `Error: ${error.message}`);
                return;
            }
        }

        // Limpiar el input y ajustar altura
        userInput.value = '';
        adjustTextareaHeight();

        // Agregar mensaje del usuario al chat
        addMessageToChat('user', message);

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    chatId: currentChatId
                })
            });

            if (!response.ok) {
                throw new Error('Error en la respuesta del servidor');
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            // Agregar respuesta del asistente
            if (data.message) {
                addMessageToChat('ai', data.message);
                
                // Actualizar el título del chat si es el primer mensaje
                const chatItem = document.querySelector(`.chat-item[data-chat-id="${currentChatId}"]`);
                if (chatItem && message.length > 0) {
                    const titleSpan = chatItem.querySelector('.chat-title');
                    const shortTitle = message.length > 30 ? message.substring(0, 27) + '...' : message;
                    titleSpan.textContent = shortTitle;
                    
                    // Actualizar el título en el backend
                    updateChatTitle(currentChatId, shortTitle);
                }
            }

        } catch (error) {
            console.error('Error:', error);
            addMessageToChat('ai', `Error: ${error.message}`);
        }
    }

    async function updateChatTitle(chatId, newTitle) {
        try {
            const response = await fetch(`/update-chat-title/${chatId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: newTitle
                })
            });

            if (!response.ok) {
                throw new Error('Error al actualizar el título');
            }

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Error updating chat title:', error);
        }
    }

    async function loadChat(chatId) {
        try {
            const response = await fetch(`/load-chat/${chatId}`);
            if (!response.ok) {
                throw new Error('Error al cargar el chat');
            }
            
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }
            
            currentChatId = chatId;
            chatContainer.innerHTML = '';
            updateActiveChat(chatId);
            
            if (data.messages && data.messages.length > 0) {
                data.messages.forEach(msg => {
                    addMessageToChat(msg.role, msg.content);
                });
                chatContainer.scrollTop = chatContainer.scrollHeight;
            } else {
                // Si no hay mensajes, mostrar mensaje de bienvenida
                addMessageToChat('ai', '¡Hola! Soy tu asistente de IA. ¿En qué puedo ayudarte hoy?');
            }
        } catch (error) {
            console.error('Error loading chat:', error);
            addMessageToChat('ai', `Error al cargar el chat: ${error.message}`);
        }
    }

    function addMessageToChat(role, content) {
        if (!content) {
            console.error('Content is undefined or null');
            return;
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role === 'user' ? 'user-message' : 'ai-message'}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = role === 'user' ? `
            <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
            </svg>
        ` : `
            <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
        `;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        try {
            // Asegurarse de que content sea una cadena
            const contentStr = String(content);
            // Usar marked para renderizar Markdown
            messageContent.innerHTML = marked.parse(contentStr);
        } catch (error) {
            console.error('Error parsing markdown:', error);
            messageContent.textContent = content;
        }
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        chatContainer.appendChild(messageDiv);
        
        // Resaltar bloques de código
        messageDiv.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
        
        // Scroll to bottom
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        // Renderizar fórmulas matemáticas si hay MathJax disponible
        if (window.MathJax) {
            MathJax.typesetPromise([messageContent]);
        }
    }
});
