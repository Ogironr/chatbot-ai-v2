import json
import subprocess
import os

def run_command(command):
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✓ {command}")
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"✗ Error ejecutando '{command}':")
        print(e.stderr)
        raise

def main():
    # Leer configuración
    with open('git_config.json', 'r') as f:
        config = json.load(f)
    
    repo_url = config['repo_url']
    
    print("\n🚀 Configurando repositorio Git...\n")
    
    try:
        # Agregar cambios
        run_command('git add .')
        print("✓ Cambios agregados al stage")
        
        # Crear commit
        run_command('git commit -m "Actualización del proyecto"')
        print("✓ Commit creado")
        
        # Verificar si el remoto ya existe
        try:
            run_command('git remote remove origin')
            print("✓ Remoto anterior eliminado")
        except:
            pass
        
        # Configurar el remoto
        run_command(f'git remote add origin {repo_url}')
        print("\n✓ Remoto configurado correctamente")
        
        # Subir cambios
        run_command('git push -u origin main')
        print("\n✓ Cambios subidos a GitHub correctamente")
        
        print(f"\n🎉 ¡Listo! Tu repositorio está disponible en:")
        print(f"   {repo_url}")
        
    except subprocess.CalledProcessError:
        print("\n❌ Hubo un error. Asegúrate de:")
        print("   1. Tener acceso a GitHub")
        print("   2. Haber creado el repositorio en GitHub")
        print("   3. Tener las credenciales de Git configuradas")

if __name__ == '__main__':
    main()
