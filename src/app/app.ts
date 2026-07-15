import { Component, ElementRef, ViewChild, OnDestroy, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
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

  nombreUsuario = 'Invitado';
  colorCorazon = '#94a3b8'; 
  diagnosticoTexto = 'Esperando conexión con la IA...';

  reconocimientoVoz: any;
  modoMic: 'apagado' | 'conversacion_live' | 'nota_voz' = 'apagado';
  fueDictadoPorVoz = false; 

  constructor(private ngZone: NgZone, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.inicializarReconocimiento();
  }

  trackByMensaje(index: number) {
    return index;
  }

  // --- DETECTOR DE NOMBRES ---
  detectarNombre(texto: string) {
    const patrones = [
      /me llamo\s+([a-záéíóúñ]+)/i,
      /mi nombre es\s+([a-záéíóúñ]+)/i,
      /soy\s+([a-záéíóúñ]+)/i
    ];

    for (const patron of patrones) {
      const match = texto.match(patron);
      if (match && match[1]) {
        const nombre = match[1];
        const palabrasIgnoradas = ['un', 'una', 'el', 'la', 'muy', 'feliz', 'triste', 'ansioso', 'estudiante', 'programador', 'alguien'];
        
        if (!palabrasIgnoradas.includes(nombre.toLowerCase())) {
          this.nombreUsuario = nombre.charAt(0).toUpperCase() + nombre.slice(1).toLowerCase();
          break;
        }
      }
    }
  }

  // --- RECONOCIMIENTO DE VOZ ---
  inicializarReconocimiento() {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.reconocimientoVoz = new SpeechRecognition();
      this.reconocimientoVoz.interimResults = false; 
      this.reconocimientoVoz.lang = 'es-ES';

      this.reconocimientoVoz.onresult = (event: any) => {
        this.ngZone.run(() => {
          let nuevoFragmento = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            nuevoFragmento += event.results[i][0].transcript;
          }
          const textoLimpio = nuevoFragmento.trim();

          if (!textoLimpio) return;
          console.log("🎤 MICRÓFONO ESCUCHÓ:", textoLimpio);

          if (this.modoMic === 'conversacion_live') {
            if (this.mensajeInput) {
              const actual = this.mensajeInput.nativeElement.value.trim();
              this.mensajeInput.nativeElement.value = actual ? actual + ' ' + textoLimpio : textoLimpio;
            }
          } else if (this.modoMic === 'nota_voz') {
            this.enviarMensaje(textoLimpio, true);
            this.modoMic = 'apagado';
            try { this.reconocimientoVoz.stop(); } catch(e) {}
          }
          this.cdr.detectChanges();
        });
      };

      this.reconocimientoVoz.onerror = (event: any) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          this.ngZone.run(() => {
            this.modoMic = 'apagado';
            this.cdr.detectChanges();
          });
        }
      };

      this.reconocimientoVoz.onend = () => {
        this.ngZone.run(() => {
          if (this.modoMic === 'conversacion_live') {
            try { this.reconocimientoVoz.start(); } catch(e) {}
          } else if (this.modoMic === 'nota_voz') {
            this.modoMic = 'apagado';
          }
          this.cdr.detectChanges();
        });
      };
    }
  }

  toggleConversacionLive() {
    if (this.modoMic === 'conversacion_live') {
      this.modoMic = 'apagado';
      this.reconocimientoVoz.continuous = false;
      
      const textoAcumulado = this.mensajeInput ? this.mensajeInput.nativeElement.value.trim() : '';
      
      try { this.reconocimientoVoz.stop(); } catch(e) {}
      this.cdr.detectChanges();
      
      if (textoAcumulado) {
        setTimeout(() => {
          this.enviarMensaje(textoAcumulado, true);
        }, 150);
      }
    } else {
      this.modoMic = 'conversacion_live';
      this.reconocimientoVoz.continuous = true; 
      this.interrumpirIA();
      if (this.mensajeInput) this.mensajeInput.nativeElement.value = ''; 
      this.cdr.detectChanges();
      try { this.reconocimientoVoz.start(); } catch(e) { this.modoMic = 'apagado'; }
    }
  }

  toggleNotaVoz() {
    if (this.modoMic === 'nota_voz') {
      this.modoMic = 'apagado';
      try { this.reconocimientoVoz.stop(); } catch(e) {}
    } else {
      this.modoMic = 'nota_voz';
      this.reconocimientoVoz.continuous = false; 
      this.fueDictadoPorVoz = true;
      this.interrumpirIA();
      try { this.reconocimientoVoz.start(); } catch(e) { this.modoMic = 'apagado'; }
    }
    this.cdr.detectChanges();
  }

  // --- ENVÍO MANUAL (AQUÍ ESTÁ LA MAGIA Y EL FIX DEL LOCALHOST) ---
  async enviarMensaje(texto: string, requiereAudioParam?: boolean) {
    if (!texto || !texto.trim()) return;

    this.detectarNombre(texto.trim());

    if (this.mensajeInput) {
      this.mensajeInput.nativeElement.value = '';
    }
    this.mensajes = [...this.mensajes, { emisor: 'usuario', texto: texto.trim() }];
    this.pensando = true;

    const debeGenerarAudio = requiereAudioParam !== undefined ? requiereAudioParam : this.fueDictadoPorVoz;
    this.fueDictadoPorVoz = false;
    
    this.cdr.detectChanges();

    try {
      // ✅ FIX: Ruta relativa para que funcione perfecto en Render
      const response = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: texto.trim(), emocion_detectada: 'ansiedad', requiere_audio: debeGenerarAudio })
      });
      
      if (!response.ok) throw new Error('Error en el servidor');
      const data = await response.json();

      this.ngZone.run(() => {
        this.pensando = false;
        if (data && data.respuesta) {
            this.mensajes = [...this.mensajes, { emisor: 'ia', texto: data.respuesta }];
            this.colorCorazon = data.color || '#94a3b8';
            this.diagnosticoTexto = data.diagnostico || 'Evaluación terminada';
        }
        this.cdr.detectChanges();
      });
    } catch (error) {
      this.ngZone.run(() => {
        this.pensando = false;
        this.mensajes = [...this.mensajes, { emisor: 'ia', texto: 'Ups, perdí la conexión con el servidor. Intenta de nuevo.' }];
        this.cdr.detectChanges();
      });
    }
  }

  alEscribir() {
    this.fueDictadoPorVoz = false;
  }

  async iniciarCamara() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) return;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (this.videoElement) this.videoElement.nativeElement.srcObject = this.stream;
      this.camApagada = false;
      this.cdr.detectChanges();
    } catch (e) { console.error('Error al iniciar cámara', e); }
  }

  toggleCamaraVisual() {
    if (this.stream) {
      const track = this.stream.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        this.camApagada = !track.enabled;
        this.cdr.detectChanges();
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
    this.cdr.detectChanges();
  }

  interrumpirIA() {
    if (this.reproductorIA) {
      this.reproductorIA.pause();
      this.iaHablando = false;
    }
  }

  ngOnDestroy() { 
    if (this.reconocimientoVoz) this.reconocimientoVoz.stop(); 
  }
}