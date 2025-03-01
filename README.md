# ChatBot AI

Un chatbot basado en la API de OpenAI, construido con Flask.

## Estructura del Proyecto

```
chatopenai/
├── .env                # Variables de entorno (API keys, etc.)
├── app.py             # Aplicación principal Flask
├── requirements.txt   # Dependencias de Python
├── static/           # Archivos estáticos
│   ├── css/         # Estilos CSS
│   └── js/          # JavaScript
├── templates/        # Plantillas HTML
│   └── index.html   # Página principal
└── chats/           # Almacenamiento de chats (JSON)
```

## Configuración

1. Crear un entorno virtual:
```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
```

2. Instalar dependencias:
```bash
pip install -r requirements.txt
```

3. Configurar variables de entorno:
Crear un archivo `.env` con:
```
OPENAI_API_KEY=tu_api_key_aqui
```

## Ejecutar la Aplicación

```bash
python app.py
```

La aplicación estará disponible en `http://localhost:5000`

## Características

- Interfaz de chat en tiempo real
- Almacenamiento persistente de conversaciones
- Soporte para markdown y resaltado de código
- Historial de chats
- Edición de títulos de chat

## Requisitos

- Python 3.8+
- Flask
- OpenAI API Key

## Instalación

1. Clonar el repositorio:
```bash
git clone <url-del-repositorio>
cd chatopenai
```

2. Crear un entorno virtual e instalar dependencias:
```bash
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. Crear archivo .env con tu API key de OpenAI:
```
OPENAI_API_KEY=tu-api-key-aquí
```

4. Ejecutar la aplicación:
```bash
python app.py
```

## Desarrollo

Para contribuir al proyecto:

1. Crear una nueva rama para tu característica:
```bash
git checkout -b feature/nueva-caracteristica
```

2. Hacer commit de tus cambios:
```bash
git add .
git commit -m "Descripción de los cambios"
```

3. Subir los cambios:
```bash
git push origin feature/nueva-caracteristica
```

## Licencia

MIT
