import os
import subprocess
import sys
from pathlib import Path

def get_project_root():
    return Path(__file__).parent.absolute()

def activate_venv():
    if sys.platform == "win32":
        activate_script = os.path.join(get_project_root(), ".venv", "Scripts", "activate.ps1")
    else:
        activate_script = os.path.join(get_project_root(), ".venv", "bin", "activate")
    
    if not os.path.exists(activate_script):
        print("❌ Entorno virtual no encontrado. Por favor, crea uno primero.")
        sys.exit(1)
    
    return activate_script

def install_backend_dependencies():
    print("📦 Instalando dependencias del backend...")
    requirements_file = os.path.join(get_project_root(), "backend", "requirements.txt")
    subprocess.run([sys.executable, "-m", "pip", "install", "-r", requirements_file], check=True)

def install_frontend_dependencies():
    print("📦 Instalando dependencias del frontend...")
    frontend_dir = os.path.join(get_project_root(), "frontend-next")
    if sys.platform == "win32":
        npm_cmd = "npm.cmd"
    else:
        npm_cmd = "npm"
    subprocess.run([npm_cmd, "install"], cwd=frontend_dir, check=True)

def start_backend():
    print("🚀 Iniciando servidor backend...")
    backend_file = os.path.join(get_project_root(), "backend", "app.py")
    return subprocess.Popen([sys.executable, backend_file])

def start_frontend():
    print("🚀 Iniciando servidor frontend...")
    frontend_dir = os.path.join(get_project_root(), "frontend-next")
    if sys.platform == "win32":
        npm_cmd = "npm.cmd"
    else:
        npm_cmd = "npm"
    return subprocess.Popen([npm_cmd, "run", "dev"], cwd=frontend_dir)

def main():
    try:
        # Activar entorno virtual
        activate_script = activate_venv()
        print("✅ Entorno virtual activado")

        # Instalar dependencias
        install_backend_dependencies()
        install_frontend_dependencies()
        print("✅ Dependencias instaladas")

        # Iniciar servidores
        backend_process = start_backend()
        frontend_process = start_frontend()

        print("\n🌟 ¡Proyecto iniciado correctamente!")
        print("📝 Backend corriendo en: http://localhost:5000")
        print("🎨 Frontend corriendo en: http://localhost:3000")
        print("\nPresiona Ctrl+C para detener ambos servidores...")

        # Esperar hasta que el usuario presione Ctrl+C
        backend_process.wait()
        frontend_process.wait()

    except KeyboardInterrupt:
        print("\n\n🛑 Deteniendo servidores...")
        if 'backend_process' in locals():
            backend_process.terminate()
        if 'frontend_process' in locals():
            frontend_process.terminate()
        print("✅ Servidores detenidos")
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
