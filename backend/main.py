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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

prolog = Prolog()
prolog.consult("reglas.pl")
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

class MensajeUsuario(BaseModel):
    texto: str
    emocion_detectada: str = "ansiedad"
    requiere_audio: bool = False  # Por defecto falso, Angular decide cuándo ponerlo en True

@app.post("/chat")
def procesar_mensaje(mensaje: MensajeUsuario):
    # 1. Consultar a SCALA (Microservicio Biométrico)
    bpm_actual = 80
    try:
        scala_res = requests.get("http://localhost:9000/sensor", timeout=2)
        if scala_res.status_code == 200:
            bpm_actual = scala_res.json().get("bpm", 80)
    except:
        print("⚠️ Scala no respondió, usando datos por defecto.")

    # 2. Consultar Prolog
    consulta = f"protocolo_ia({mensaje.emocion_detectada}, Directriz)"
    resultados = list(prolog.query(consulta))
    directriz = resultados[0]["Directriz"] if resultados else "Escuchar activamente."

    # 3. Prompt estricto para Groq (Multilingüe)
    prompt_sistema = f"""
    Eres un psicólogo virtual evaluando a Francis. El usuario te puede hablar en cualquier idioma; respóndele en el idioma que él use.
    Directriz clínica: '{directriz}'.
    Ritmo cardíaco de Francis: {bpm_actual} BPM.
    
    Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
    {{
        "respuesta": "tu respuesta empática y hablada en un párrafo",
        "diagnostico": "Ej: Estrés severo / Calma total / Frustración",
        "color_hex": "#Código hexadecimal según psicología del color"
    }}
    """

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": prompt_sistema},
                {"role": "user", "content": mensaje.texto}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.7,
            response_format={"type": "json_object"} 
        )
        
        ia_data = json.loads(chat_completion.choices[0].message.content)
        texto_ia = ia_data.get("respuesta", "Error leyendo respuesta")
        color_ia = ia_data.get("color_hex", "#94a3b8")
        diagnostico_ia = ia_data.get("diagnostico", "Evaluación fallida")
        
    except Exception as e:
        texto_ia, color_ia, diagnostico_ia = "Error de servidores", "#000000", "Error"

    # 4. Generar Voz SOLO si Angular dice que fue por nota de voz o live (requiere_audio = True)
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