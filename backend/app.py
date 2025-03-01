from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from openai import OpenAI
from dotenv import load_dotenv
import os
import json
from datetime import datetime
import traceback
import uuid

# Load environment variables
load_dotenv()

# Obtener la ruta base del proyecto
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHATS_DIR = os.path.join(BASE_DIR, 'chats')

app = Flask(__name__, 
    static_folder=os.path.join(BASE_DIR, 'frontend-flask/static'),
    template_folder=os.path.join(BASE_DIR, 'frontend-flask/templates')
)

# Enable CORS for Next.js frontend
CORS(app, resources={
    r"/api/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000"]}
})

# Verificar API key
api_key = os.getenv('OPENAI_API_KEY')
if not api_key:
    raise ValueError("No se encontró OPENAI_API_KEY en las variables de entorno")

print(f"API Key encontrada: {api_key[:10]}...")

try:
    # Probar la conexión con OpenAI al inicio
    client = OpenAI(api_key=api_key)
    test_response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "system", "content": "You are a helpful assistant."}, {"role": "user", "content": "Test"}],
        max_tokens=5
    )
    print("Conexión con OpenAI establecida exitosamente")
except Exception as e:
    print(f"Error al conectar con OpenAI: {str(e)}")
    print(traceback.format_exc())
    raise e

# Rutas para la interfaz Flask
@app.route('/')
def home():
    return render_template('index.html')

# API endpoints compartidos entre Flask y Next.js
@app.route('/api/save-chat', methods=['POST'])
def save_chat():
    try:
        data = request.get_json()
        chat_id = str(uuid.uuid4())
        
        # Crear el directorio de chats si no existe
        if not os.path.exists(CHATS_DIR):
            os.makedirs(CHATS_DIR)
        
        # Usar los primeros 30 caracteres del mensaje como título
        title = data.get('message', 'Nuevo Chat')
        if len(title) > 30:
            title = title[:27] + '...'
            
        chat_data = {
            'id': chat_id,
            'title': title,
            'messages': [],
            'created_at': datetime.now().isoformat()
        }
        
        # Guardar el chat
        chat_file = os.path.join(CHATS_DIR, f'{chat_id}.json')
        with open(chat_file, 'w', encoding='utf-8') as f:
            json.dump(chat_data, f, ensure_ascii=False, indent=2)
        
        # Verificar que el archivo se creó correctamente
        if not os.path.exists(chat_file):
            raise Exception('Error al crear el archivo del chat')
            
        return jsonify({
            'chatId': chat_id,
            'title': chat_data['title']
        })
    except Exception as e:
        print(f"Error al guardar el chat: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/update-chat-title/<chat_id>', methods=['POST'])
def update_chat_title(chat_id):
    try:
        data = request.get_json()
        new_title = data.get('title', '')
        
        if not new_title:
            return jsonify({'error': 'No title provided'}), 400
            
        chat_file = os.path.join(CHATS_DIR, f'{chat_id}.json')
        if not os.path.exists(chat_file):
            return jsonify({'error': 'Chat not found'}), 404
            
        with open(chat_file, 'r', encoding='utf-8') as f:
            chat_data = json.load(f)
            
        chat_data['title'] = new_title
        
        with open(chat_file, 'w', encoding='utf-8') as f:
            json.dump(chat_data, f, ensure_ascii=False, indent=2)
            
        return jsonify({'success': True, 'title': new_title})
    except Exception as e:
        print(f"Error al actualizar el título: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/load-chats', methods=['GET'])
def load_chats():
    try:
        chats = []
        if os.path.exists(CHATS_DIR):
            for filename in os.listdir(CHATS_DIR):
                if filename.endswith('.json'):
                    with open(os.path.join(CHATS_DIR, filename), 'r', encoding='utf-8') as f:
                        chat_data = json.load(f)
                        chats.append({
                            'id': chat_data['id'],
                            'title': chat_data['title'],
                            'created_at': chat_data.get('created_at', '')
                        })
        # Ordenar chats por fecha de creación, más recientes primero
        chats.sort(key=lambda x: x['created_at'], reverse=True)
        return jsonify({'chats': chats})
    except Exception as e:
        print(f"Error al cargar los chats: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/load-chat/<chat_id>', methods=['GET'])
def load_chat(chat_id):
    try:
        chat_file = os.path.join(CHATS_DIR, f'{chat_id}.json')
        if os.path.exists(chat_file):
            with open(chat_file, 'r', encoding='utf-8') as f:
                chat_data = json.load(f)
                return jsonify(chat_data)
        return jsonify({'error': 'Chat not found'}), 404
    except Exception as e:
        print(f"Error al cargar el chat: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/delete-chat/<chat_id>', methods=['DELETE'])
def delete_chat(chat_id):
    try:
        chat_file = os.path.join(CHATS_DIR, f'{chat_id}.json')
        if os.path.exists(chat_file):
            os.remove(chat_file)
            return jsonify({'success': True})
        return jsonify({'error': 'Chat not found'}), 404
    except Exception as e:
        print(f"Error al eliminar el chat: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        chat_id = data.get('chatId')
        user_message = data.get('message', '')
        
        if not chat_id or not user_message:
            return jsonify({'error': 'Missing chatId or message'}), 400
        
        chat_file = os.path.join(CHATS_DIR, f'{chat_id}.json')
        
        # Cargar el historial del chat
        if os.path.exists(chat_file):
            with open(chat_file, 'r', encoding='utf-8') as f:
                chat_data = json.load(f)
        else:
            return jsonify({'error': 'Chat not found'}), 404
        
        # Agregar el mensaje del usuario al historial
        chat_data['messages'].append({
            'role': 'user',
            'content': user_message
        })
        
        # Convertir mensajes del historial al formato correcto para la API
        api_messages = [
            {'role': 'system', 'content': 'Eres un asistente amigable y servicial. Cuando necesites mostrar código, usa bloques de código con el lenguaje apropiado.'}
        ]
        
        # Convertir los últimos 10 mensajes, cambiando 'ai' por 'assistant'
        for msg in chat_data['messages'][-10:]:
            role = 'assistant' if msg['role'] == 'ai' else msg['role']
            api_messages.append({
                'role': role,
                'content': msg['content']
            })
        
        try:
            print("Enviando solicitud a OpenAI...")
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=api_messages,
                temperature=0.7,
                max_tokens=2000
            )
            print("Respuesta recibida de OpenAI")
            
            # Obtener la respuesta del asistente
            assistant_message = response.choices[0].message.content
            print(f"Mensaje del asistente: {assistant_message[:100]}...")
            
            # Guardar en el historial como 'ai' para mantener consistencia en el frontend
            chat_data['messages'].append({
                'role': 'ai',
                'content': assistant_message
            })
            
            # Guardar el chat actualizado
            with open(chat_file, 'w', encoding='utf-8') as f:
                json.dump(chat_data, f, ensure_ascii=False, indent=2)
            
            print("Enviando respuesta al frontend...")
            return jsonify({
                'response': assistant_message
            })
            
        except Exception as e:
            print(f"Error en la API de OpenAI: {str(e)}")
            return jsonify({'error': f'Error en la API de OpenAI: {str(e)}'}), 500
            
    except Exception as e:
        print(f"Error en el servidor: {str(e)}")
        return jsonify({'error': f'Error en el servidor: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True)
