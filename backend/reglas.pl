% Archivo: reglas.pl

% Hechos: Definimos emociones y su nivel de severidad
emocion_severidad(estres, alta).
emocion_severidad(ansiedad, alta).
emocion_severidad(tristeza, media).
emocion_severidad(apatia, baja). % Falta de conciencia social

% Reglas: ¿Qué directriz debe tomar la IA según la emoción?
protocolo_ia(Emocion, Directriz) :-
    emocion_severidad(Emocion, alta),
    Directriz = 'Urgente: Mostrar empatia extrema, sugerir ejercicios de respiracion y contencion emocional.'.

protocolo_ia(Emocion, Directriz) :-
    emocion_severidad(Emocion, media),
    Directriz = 'Apoyo: Validar sus sentimientos y ofrecer un espacio seguro para hablar.'.

protocolo_ia(Emocion, Directriz) :-
    emocion_severidad(Emocion, baja),
    Directriz = 'Conciencia Social: Reflexionar sutilmente sobre el entorno, motivar el impacto positivo en la comunidad.'.