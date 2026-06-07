import { Component, ElementRef, ViewChild, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule], 
  templateUrl: './app.html'
})
export class App implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('mensajeInput') mensajeInput!: ElementRef<HTMLInputElement>;
  
  stream: MediaStream | null = null;
  camApagada = false;

  reproductorIA: HTMLAudioElement | null = null;
  mensajes: { emisor: 'usuario' | 'ia', texto: string }[] = [];
  pensando = false;
  iaHablando = false;

  nombreUsuario = 'Francis'; 
  colorCorazon = '#94a3b8'; 
  diagnosticoTexto = 'Esperando conexión con Scala y Groq...';

  reconocimientoVoz: any;
  modoMic: 'apagado' | 'conversacion_live' | 'nota_voz' = 'apagado';
  fueDictadoPorVoz = false; 

  ngOnInit() {
    this.inicializarReconocimiento();
  }

  inicializarReconocimiento() {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      this.reconocimientoVoz = new (window as any).webkitSpeechRecognition();
      this.reconocimientoVoz.continuous = false; 
      this.reconocimientoVoz.interimResults = false; 
      this.reconocimientoVoz.lang = ''; // Vacío para que detecte cualquier idioma (Inglés, Español, etc.)

      this.reconocimientoVoz.onresult = (event: any) => {
        const textoHablado = event.results[0][0].transcript.trim();
        if (!textoHablado) return;

        if (this.modoMic === 'conversacion_live') {
          // Si está en Live, se manda solo y exige audio
          this.enviarMensaje(textoHablado, true);
        } else if (this.modoMic === 'nota_voz') {
          // Si es nota de voz, se pone en la caja de texto y espera a que el usuario presione Enviar
          if (this.mensajeInput) {
            this.mensajeInput.nativeElement.value = textoHablado;
          }
          this.fueDictadoPorVoz = true;
          this.modoMic = 'apagado'; // Apaga el botón rojo de grabar
        }
      };

      this.reconocimientoVoz.onend = () => {
        // Ciclo automático para el Modo Conversación Live
        if (this.modoMic === 'conversacion_live' && !this.pensando && !this.iaHablando) {
          try { this.reconocimientoVoz.start(); } catch(e){}
        } else if (this.modoMic === 'nota_voz') {
          this.modoMic = 'apagado';
        }
      };
    }
  }

  toggleConversacionLive() {
    if (this.modoMic === 'conversacion_live') {
      this.modoMic = 'apagado';
      this.reconocimientoVoz.stop();
    } else {
      this.modoMic = 'conversacion_live';
      this.interrumpirIA();
      try { this.reconocimientoVoz.start(); } catch(e){}
    }
  }

  toggleNotaVoz() {
    if (this.modoMic === 'nota_voz') {
      this.modoMic = 'apagado';
      this.reconocimientoVoz.stop();
    } else {
      this.modoMic = 'nota_voz';
      this.fueDictadoPorVoz = true;
      this.interrumpirIA();
      try { this.reconocimientoVoz.start(); } catch(e){}
    }
  }

  alEscribir() {
    // Si toca el teclado, anula la intención de voz
    this.fueDictadoPorVoz = false;
  }

  async iniciarCamara() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) return;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (this.videoElement) this.videoElement.nativeElement.srcObject = this.stream;
      this.camApagada = false;
    } catch (e) { alert('Permite acceso a la cámara.'); }
  }

  toggleCamaraVisual() {
    if (this.stream) {
      const track = this.stream.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        this.camApagada = !track.enabled;
      }
    }
  }

  detenerTodo() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.modoMic = 'apagado';
    if (this.reconocimientoVoz) this.reconocimientoVoz.stop();
    this.interrumpirIA();
  }

  ngOnDestroy() { this.detenerTodo(); }

  interrumpirIA() {
    if (this.reproductorIA) {
      this.reproductorIA.pause();
      this.reproductorIA.currentTime = 0; 
      this.iaHablando = false;
    }
  }

  async enviarMensaje(texto: string, requiereAudioParam?: boolean) {
    if (!texto.trim()) return;
    this.interrumpirIA();
    
    if (this.mensajeInput) this.mensajeInput.nativeElement.value = '';
    
    this.mensajes.push({ emisor: 'usuario', texto: texto });
    this.pensando = true;

    // Decide si debe pedirle a Python que genere voz
    const debeGenerarAudio = requiereAudioParam !== undefined ? requiereAudioParam : this.fueDictadoPorVoz;
    this.fueDictadoPorVoz = false; // Resetear bandera

    // Pausar el micrófono mientras procesa para no captar ruidos basura
    if (this.modoMic === 'conversacion_live') this.reconocimientoVoz.stop();

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          texto: texto, 
          emocion_detectada: 'ansiedad',
          requiere_audio: debeGenerarAudio 
        })
      });
      
      const data = await response.json();
      this.pensando = false;
      this.mensajes.push({ emisor: 'ia', texto: data.respuesta });
      
      // Actualiza la biometría (Psicología del color)
      if (data.color) this.colorCorazon = data.color;
      if (data.diagnostico) this.diagnosticoTexto = data.diagnostico;

      // Reproducir audio si Python lo mandó
      if (data.audio && data.audio !== "") {
        this.iaHablando = true;
        this.reproductorIA = new Audio('data:audio/mp3;base64,' + data.audio);
        this.reproductorIA.play().catch(e => { console.log('Autoplay bloqueado'); this.iaHablando = false; });
        
        // Cuando termine de hablar, reanuda la escucha si estamos en Modo Live
        this.reproductorIA.onended = () => {
          this.iaHablando = false;
          if (this.modoMic === 'conversacion_live') {
            try { this.reconocimientoVoz.start(); } catch(e){}
          }
        };
      } else {
        // Si fue un mensaje de texto (sin voz), reanuda el Live al instante
        if (this.modoMic === 'conversacion_live') {
          try { this.reconocimientoVoz.start(); } catch(e){}
        }
      }
      
    } catch (error) {
      this.pensando = false;
      this.mensajes.push({ emisor: 'ia', texto: 'Error de conexión.' });
    }
  }
}