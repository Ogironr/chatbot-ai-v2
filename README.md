# ChatBot AI

Un chatbot basado en la API de OpenAI, con dos interfaces de usuario diferentes.

## Estructura del Proyecto

```
chatopenai/
├── backend/              # API Backend con Flask
│   ├── .env             # Variables de entorno
│   ├── app.py           # Aplicación principal Flask
│   └── requirements.txt # Dependencias de Python
│
├── frontend-flask/      # Interfaz original con Flask
│   ├── static/         # Archivos estáticos
│   │   ├── css/       # Estilos CSS
│   │   └── js/        # JavaScript
│   └── templates/      # Plantillas HTML
│       └── index.html # Página principal
│
├── frontend-next/      # Nueva interfaz con Next.js
│   ├── app/           # Componentes y páginas Next.js
│   ├── components/    # Componentes React reutilizables
│   ├── styles/        # Estilos Tailwind
│   └── package.json   # Dependencias de Node.js
│
├── chats/             # Almacenamiento de chats (JSON)
└── git_config.json    # Configuración de GitHub (ignorado)
```

## Configuración

### Backend (Flask)

1. Crear un entorno virtual:
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows
```

2. Instalar dependencias:
```bash
pip install -r requirements.txt
```

3. Configurar variables de entorno:
Crear un archivo `.env` en la carpeta `backend` con:
```
OPENAI_API_KEY=tu_api_key_aqui
```

4. Ejecutar el backend:
```bash
python app.py
```

El backend estará disponible en `http://localhost:5000`

### Frontend Flask (Interfaz Original)

La interfaz original está integrada con el backend y se sirve automáticamente en `http://localhost:5000`

### Frontend Next.js (Nueva Interfaz)

1. Instalar dependencias:
```bash
cd frontend-next
npm install
```

2. Ejecutar en modo desarrollo:
```bash
npm run dev
```

La nueva interfaz estará disponible en `http://localhost:3000`

## Características

### Interfaz Flask
- Diseño simple y funcional
- Soporte para markdown y resaltado de código
- Historial de chats
- Edición de títulos de chat

### Interfaz Next.js
- Diseño moderno con Tailwind CSS
- Interfaz responsiva
- Componentes React reutilizables
- Tema oscuro/claro
- Mejor experiencia de usuario

## Desarrollo

Para contribuir al proyecto:

1. Haz un fork del repositorio
2. Crea una rama para tu feature
3. Haz commit de tus cambios
4. Crea un pull request

## Licencia

MIT
