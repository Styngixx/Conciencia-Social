#Usa Python ligero
FROM python:3.11-slim

#Instala SWI-Prolog a nivel de sistema operativo
RUN apt-get update && \
    apt-get install -y swi-prolog && \
    rm -rf /var/lib/apt/lists/*

#Configura la carpeta de trabajo
WORKDIR /app

#Copia e instala las dependencias de Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

#Copia el resto de los archivos de tu proyecto
COPY . .

#Comando para iniciar Uvicorn en el puerto dinámico de Render
CMD sh -c "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-10000}"