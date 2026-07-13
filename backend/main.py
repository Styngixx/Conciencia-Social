import os
import io
import json
import base64
import requests 
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pyswip import Prolog
from groq import Groq
from gtts import gTTS

load_dotenv()
app = FastAPI()
# Pon esto debajo de load_dotenv()
api_key = os.getenv("GROQ_API_KEY")
print(f"DEBUG: ¿La API Key está cargada? {'SÍ' if api_key else 'NO'}")
if api_key:
    print(f"DEBUG: Longitud de la clave: {len(api_key)}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicialización segura de Prolog
prolog = Prolog()
try:
    # Usamos la ruta absoluta al archivo para evitar errores de ubicación
    ruta_prolog = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reglas.pl")
    prolog.consult(ruta_prolog)
    print("✅ Reglas de Prolog cargadas desde:", ruta_prolog)
except Exception as e:
    print(f"❌ Error crítico al cargar Prolog: {e}")

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

class MensajeUsuario(BaseModel):
    texto: str
    emocion_detectada: str = "ansiedad"
    requiere_audio: bool = False

@app.post("/chat")
def procesar_mensaje(mensaje: MensajeUsuario):
    # 1. Consultar a SCALA
    bpm_actual = 80
    try:
        scala_res = requests.get("http://localhost:9000/sensor", timeout=2)
        if scala_res.status_code == 200:
            bpm_actual = scala_res.json().get("bpm", 80)
    except:
        print("⚠️ Scala no respondió, usando datos por defecto.")

    # 2. Consultar Prolog
    directriz = "Escuchar activamente."
    try:
        consulta = f"protocolo_ia({mensaje.emocion_detectada}, Directriz)"
        resultados = list(prolog.query(consulta))
        if resultados:
            directriz = resultados[0]["Directriz"]
    except Exception as e:
        print(f"❌ Error en consulta Prolog: {e}")

    # 3. Prompt estricto para Groq
    prompt_sistema = f"""
    Eres un psicólogo virtual evaluando a Francis. El usuario te habla.
    Directriz clínica: '{directriz}'.
    Ritmo cardíaco: {bpm_actual} BPM.
    
    Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
    {{"respuesta": "texto", "diagnostico": "texto", "color_hex": "#hex"}}
    """

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": prompt_sistema},
                {"role": "user", "content": mensaje.texto}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.7
        )
        
        # Limpieza de respuesta (por si Groq añade texto Markdown)
        raw_content = chat_completion.choices[0].message.content.strip()
        if raw_content.startswith("```json"):
            raw_content = raw_content.replace("```json", "").replace("```", "").strip()
            
        ia_data = json.loads(raw_content)
        texto_ia = ia_data.get("respuesta", "No tengo respuesta")
        color_ia = ia_data.get("color_hex", "#94a3b8")
        diagnostico_ia = ia_data.get("diagnostico", "Evaluación fallida")
        
    except Exception as e:
        print(f"❌ Error crítico en Groq o JSON: {e}") # ¡Esto te dirá el error real!
        texto_ia, color_ia, diagnostico_ia = "Error interno del servidor", "#000000", "Error"

    # 4. Generar Voz
    audio_base64 = ""
    if mensaje.requiere_audio and "Error" not in texto_ia:
        try:
            tts = gTTS(text=texto_ia, lang='es', tld='com.mx') 
            fp = io.BytesIO()
            tts.write_to_fp(fp)
            fp.seek(0)
            audio_base64 = base64.b64encode(fp.read()).decode('utf-8')
        except Exception as e:
            print(f"Error Voz: {e}")

    return {
        "respuesta": texto_ia,
        "audio": audio_base64,
        "color": color_ia,
        "diagnostico": diagnostico_ia
    }