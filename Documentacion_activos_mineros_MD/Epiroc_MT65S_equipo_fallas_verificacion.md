---
activo: "Camión Minero Epiroc Minetruck MT65 S"
tag_code: "TS-CAEX-0000125"
tipo: "Camión minero"
fabricante: "Epiroc"
modelo: "MT65 S"
specs_generales:
  motor: "Cummins QSK19; 567 kW / 760 hp a 2.100 rpm; 3.084 Nm a 1.500 rpm; estanque 843 L diésel."
  potencia: "567 kW / 760 hp a 2.100 rpm"
  torque: "3.084 Nm a 1.500 rpm"
  capacidad_nominal: "65.000 kg (65 t); volumen colmado SAE 2:1 de 34,0 m³; tiempo de volteo 13 s."
  capacidad_volumen: "34,0 m³ colmada SAE 2:1"
  peso_operativo: "54.800 kg tara vacía; 119.800 kg peso bruto vehicular (PBV)"
  transmision: "Allison 6625 automática, 6 marchas adelante / 2 reversa; ejes Kessler D111; convertidor con lock-up."
  sistema_electrico: "24 V; alternador 140 A; convertidor 24/12 V; 3 paradas de emergencia con corte de combustible."
sistemas_activos:
  - motor
  - frenos
  - direccion
  - hidraulico
  - electrico
  - ejes
  - temperatura
  - sensores
  - neumaticos
  - suspension
  - tolva
---

# Camión Minero Epiroc Minetruck MT65 S — Ficha Técnica y Guía de Diagnóstico TAGSENSE

> **Resumen del activo:** Camión de bajo perfil de 65 toneladas para minería subterránea profunda. Motor Cummins QSK19 de 760 hp, transmisión automática Allison 6625 y frenos SAHR multidiscos en baño de aceite. Esta ficha consolida especificaciones OEM, diagnósticos de falla y procedimientos secuenciales de verificación para soporte técnico en terreno.

---

## Motor y Combustible (slug: motor)

### Equipamiento y Especificaciones
• Motor OEM : Cummins QSK19 diésel, 6 cilindros en línea, turboalimentado y post-enfriado aire-aire.
• Potencia y torque : 567 kW (760 hp) a 2.100 rpm; par motor máximo 3.084 Nm a 1.500 rpm.
• Presión de aceite : 1,4 bar (20 psi) en ralentí caliente (85°C); 3,4 - 4,8 bar (50 - 70 psi) a régimen nominal.
• Capacidad de cárter : 72 L de lubricante 15W-40 API CK-4 / Cummins CES 20081.
• Sistema de combustible : Inyección electrónica HPI-PT; estanque de 843 L; filtro primario separador de agua 10 µm y secundario 3 µm.

### Fallas Principales y Síntomas
• Pérdida de potencia bajo carga : Filtros de combustible saturados (> 15 inHg de restricción), baja presión de rail (< 1.200 bar) o fuga en mangueras de turbo/intercooler.
• Humo negro excesivo en aceleración : Restricción en filtro de aire (> 6 kPa / 25 inH2O), sensor MAF/MAP descalibrado o inyectores HPI con goteo.
• Baja presión de aceite de motor : Nivel de aceite bajo en cárter, válvula de alivio de bomba trabada abierta o dilución de aceite con diésel.
• Dificultad o retardo en arranque : Aire en el circuito de baja presión de combustible, sensor de posición de cigüeñal (Crankshaft) sucio o tensión de baterías < 24V en partida.

### Procedimientos de Verificación
• 1. Purga del sistema de combustible : Aflojar tornillo de purga en cabezal de filtro secundario y accionar cebador manual hasta salida continua de diésel sin burbujas.
• 2. Medición de restricción de admisión y combustible : Conectar manómetro de vacío en toma post-filtro y acelerar a 2.100 rpm; si la restricción supera 15 inHg, cambiar cartuchos.
• 3. Inspección de presión de aceite : Conectar manómetro calibrado en galería principal de bloque y verificar mínimo 1,4 bar en ralentí caliente (85°C).
• 4. Verificación de códigos ECM : Conectar herramienta de diagnóstico INSITE en conector J1939 de cabina y registrar códigos de falla activos.

---

## Frenos y Retardo (slug: frenos)

### Equipamiento y Especificaciones
• Sistema de frenos : SAHR (Spring Applied Hydraulic Released) multidiscos húmedos refrigerados en las 4 ruedas.
• Presión de liberación : 145 - 160 bar (2.100 - 2.320 psi) suministrada por acumuladores de pistón.
• Fluido de frenos y retardo : Aceite hidráulico ISO VG 46 / ATF Dexron III; depósito separado de refrigeración de frenos de 85 L.
• Espesor de discos y tolerancia : Nominal 5,7 mm; desgaste máximo admisible 1,5 mm (límite de descarte 4,2 mm).
• Presión de precarga acumuladores : 85 bar N2 (nitrógeno seco) a 20°C.

### Fallas Principales y Síntomas
• Baja presión en circuito de frenos : Fuga interna en válvula moduladora, falla en bomba de carga o precarga baja de nitrógeno en acumuladores.
• Freno de parqueo no libera : Presión de destrabe inferior a 130 bar por solenoide de parqueo trabado, bobina quemada o falla en línea piloto.
• Sobrecalentamiento de discos en descenso : Flujo de refrigeración insuficiente (< 60 L/min), depósito de 85 L bajo nivel o no uso del retardador hidráulico.
• Fuga de aceite por mazas de rueda : Falla en sellos Duo-Cone o sellos de pistón SAHR comunicando aceite de freno con mandos finales.

### Procedimientos de Verificación
• 1. Verificación de presión en acumuladores : Bloquear con cuñas en piso nivelado, conectar manómetro de 0-250 bar en toma TP1 y medir presión en ralentí (mínimo 145 bar).
• 2. Prueba de estanqueidad y caída de presión : Apagar el motor, aplicar 10 frenadas sucesivas y verificar que la caída no supere 12 bar por frenada.
• 3. Inspección del circuito de refrigeración : Revisar mirilla del tanque de 85 L y medir temperatura con pirómetro infrarrojo en retorno (máx. 95°C).
• 4. Medición de desgaste de discos : Medir con calibre el perno palpador indicador de desgaste en cada caliper sin desarmar la maza.

---

## Dirección y Articulación (slug: direccion)

### Equipamiento y Especificaciones
• Tipo de dirección : Dirección hidráulica articulada con dos cilindros de doble efecto y función steering soft stop.
• Ángulo de articulación : ±44° mediante perno rey y articulación central oscilante.
• Presión de dirección : 190 bar (2.755 psi) con válvula de prioridad Load Sensing.
• Dirección de emergencia : Bomba secundaria accionada por motor eléctrico de 24V con acumulador hidráulico dedicado.
• Válvula de control : Válvula orbital con sensor de ángulo y centro cerrado.

### Fallas Principales y Síntomas
• Dirección dura o volante pesado al girar : Presión de dirección baja (< 150 bar), válvula de prioridad pegada o cilindros con bypass interno.
• Articulación con juego o golpeteo al cambiar rumbo : Desgaste en bujes y pasadores de perno rey (juego radial > 1,5 mm) o falta de engrase en rótulas.
• Dirección oscilante o sin centro fijo ("culebreo") : Fuga interna en válvula orbital o aire atrapado en los cilindros de dirección.
• Alarma de falla en dirección secundaria : Presión de acumulador de emergencia baja o switch de presión de dirección defectuoso.

### Procedimientos de Verificación
• 1. Prueba de dirección secundaria de emergencia : Detener motor, activar switch de dirección de emergencia en tablero y girar volante a ambos topes comprobando asistencia.
• 2. Medición de presión de dirección : Conectar manómetro en toma TP de válvula orbital y forzar tope de articulación a 1.500 rpm (nominal 190 bar).
• 3. Medición de holgura en perno rey : Levantar el chasis central con gatas hidráulicas y medir con reloj comparador el desplazamiento axial y radial.
• 4. Verificación de engrase automático : Comprobar que los puntos de engrase de rótulas de dirección y articulación central reciban grasa fresca NLGI 2.

---

## Sistema Hidráulico Principal (slug: hidraulico)

### Equipamiento y Especificaciones
• Tipo de sistema : Circuito de centro cerrado con bombas de pistones axiales de caudal variable (Load Sensing).
• Presión principal de trabajo : 23 MPa (230 bar / 3.335 psi) regulada en válvula de alivio principal.
• Capacidad y fluido : Tanque hidráulico 292 L con mirilla de nivel; aceite hidráulico anti-desgaste ISO VG 46/68.
• Filtración : Filtro de retorno de 12 µm con indicador de saturación y bypass a 3,5 bar.
• Presión piloto : 3,5 MPa (35 bar / 507 psi) para control de joysticks y solenoides.

### Fallas Principales y Síntomas
• Movimientos hidráulicos lentos o sin fuerza : Bomba de caudal variable descalibrada, carrete Load Sensing pegado o baja presión de alivio (< 180 bar).
• Sobrecalentamiento del aceite hidráulico (> 85°C) : Válvula de alivio aliviando constantemente, termostato de enfriador trabado o bypass de filtro abierto.
• Ruido de cavitación en bomba hidráulica : Nivel bajo en tanque de 292 L, filtro de succión obstruido o entrada de aire por sellos de succión.
• Cilindros caen solos o no sostienen carga : Fuga interna por sellos de pistón de cilindro o válvula de contrabalance (holding valve) con asiento dañado.

### Procedimientos de Verificación
• 1. Comprobación de nivel y temperatura : Verificar nivel en mirilla con cilindros retraídos en piso plano y medir temperatura en estanque (rango normal 55-75°C).
• 2. Medición de presión en toma TP principal : Conectar manómetro de 0-400 bar en toma de presión principal y llevar una función a calado para verificar los 230 bar.
• 3. Prueba de fugas internas de cilindros : Extender completamente el cilindro, desconectar manguera del lado varilla con seguridad y observar goteo bajo presión de calado.
• 4. Inspección de filtros de retorno : Revisar manómetro indicador de saturación en cabeza de filtro; si marca rojo (> 2,5 bar), reemplazar cartuchos de 12 µm.

---

## Tolva y Levante (slug: tolva)

### Equipamiento y Especificaciones
• Configuración : Tolva de volteo trasero con dos cilindros telescópicos de doble efecto y amortiguación hidráulica.
• Capacidad de carga : 65.000 kg (65 t); volumen colmado SAE 2:1 de 34,0 m³ (según densidad de mineral).
• Tiempo de ciclo : Tiempo de descarga (levante) 13 segundos; tiempo de bajada flotante 14 segundos.
• Presión de volteo : 210 bar (3.045 psi) controlada por banco de válvulas proporcional.
• Válvula de retención : Holding valve montada directamente en la base de los cilindros telescópicos.

### Fallas Principales y Síntomas
• Tolva no sube o levanta con excesiva lentitud : Presión insuficiente en circuito de tolva (< 160 bar), mando eléctrico en cabina defectuoso o solenoide de levante trabado.
• Tolva no baja o desciende con golpe brusco : Solenoide de bajada sin energizar, válvula de contrabalance descalibrada o aire en cilindros telescópicos.
• Fuga de aceite por vástagos telescópicos : Sellos rascadores y empaquetaduras desgastadas por contaminación con polvo de roca o vástago rayado.
• Sensor de tolva arriba no activa alarma en cabina : Switch de proximidad inductivo desalineado (> 8 mm de distancia) o conector sulfurado.

### Procedimientos de Verificación
• 1. Instalación de traba mecánica de tolva : Levantar tolva y colocar el puntal mecánico de seguridad antes de cualquier inspección bajo la tolva.
• 2. Medición de presión de levante : Conectar manómetro en puerto TP de banco de tolva, acelerar a 1.800 rpm y accionar mando; registrar presión pico (nominal 210 bar).
• 3. Calibración de sensor de proximidad : Ajustar la tuerca del sensor magnético/inductivo a 4-6 mm de la pletina de tolva y verificar led de activación en cabina.
• 4. Purga y despresurización de cilindros : Colocar tolva en reposo, apagar motor, mover joystick en cruz y revisar ausencia de emulsión/aire en retorno.

---

## Transmisión, Convertidor y Ejes (slug: ejes)

### Equipamiento y Especificaciones
• Transmisión : Allison 6625 automática con control electrónico de cambios, 6 marchas adelante / 2 reversa.
• Ejes : Ejes planetarios Kessler D111 con diferenciales convencionales y mandos finales.
• Convertidor de torque : Convertidor con embrague de traba (Lock-up clutch) de acople automático en marchas 2 a 6.
• Fluido de transmisión : 60 L de fluido sintético TES-295 / TranSynd; temperatura normal de trabajo 80 - 105°C.
• Aceite de mandos finales y diferenciales : SAE 85W-140 API GL-5 (28 L por eje).

### Fallas Principales y Síntomas
• Cambios de marcha bruscos o patinamiento : Nivel incorrecto de aceite TES-295, presión de embragues fuera de rango o solenoides PWM trabados.
• Alta temperatura de transmisión (> 110°C) : Enfriador de transmisión obstruido, convertidor en patinamiento prolongado o nivel excesivo de aceite.
• Ruido metálico o zumbido en mandos finales : Desgaste en rodamientos planetarios o nivel bajo de aceite 85W-140 en cubos de rueda.
• Transmisión trabada en modo neutral o emergencia (Limp Home) : Sensor de velocidad de turbina o salida sin señal, o arnés de cableado dañado.

### Procedimientos de Verificación
• 1. Verificación de nivel de transmisión : Motor en ralentí caliente (80°C), selector en neutro, comprobar nivel en varilla o display de cabina.
• 2. Prueba de calado de convertidor (Stall Test) : Aplicar frenos al 100%, seleccionar D y acelerar a fondo por 5 segundos; las RPM no deben variar más de ±100 rpm del OEM.
• 3. Inspección magnética de tapones de drenaje : Retirar tapón magnético de mandos finales y verificar que no existan esquirlas ni virutas metálicas.
• 4. Diagnóstico electrónico Allison : Conectar scanner Allison DOC y leer códigos de falla DTC en módulo TCM.

---

## Refrigeración y Temperatura (slug: temperatura)

### Equipamiento y Especificaciones
• Radiador : Radiador de núcleo modular de alta resistencia con ventilador accionado hidráulicamente.
• Termostatos : Rango de apertura 82°C (180°F) a apertura total 93°C (200°F).
• Refrigerante : Mezcla 50/50 etilenglicol con tecnología OAT de larga duración; volumen total del circuito 115 L.
• Presión tapa de radiador : 1,0 bar (15 psi) con válvula de alivio y compensación por vacío.

### Fallas Principales y Síntomas
• Sobrecalentamiento de refrigerante (> 98°C) en rampa : Paneles de radiador tapados con barro/polvo, termostatos trabados cerrados o ventilador a baja velocidad.
• Pérdida constante de refrigerante sin fuga externa visible : Fuga en post-enfriador, enfriador de aceite de motor o empaque de culata comunicado.
• Temperatura no alcanza rango de operación (< 70°C) : Termostatos trabados abiertos provocando desgaste prematuro y consumo elevado.
• Ventilador hidráulico no acelera : Falla en válvula solenoide proporcional de control de ventilador o sensor ECT descalibrado.

### Procedimientos de Verificación
• 1. Lavado y soplado de radiador : Soplar con aire a baja presión o agua caliente a contracorriente eliminando barro y polvo de aletas.
• 2. Prueba de presurización del sistema de enfriamiento : Conectar bomba de presurización manual en cuello de radiador a 1,2 bar y observar si mantiene presión 5 min.
• 3. Medición de velocidad de ventilador : Con tacómetro óptico medir rpm de ventilador con motor a 2.100 rpm y verificar aumento al subir temperatura.
• 4. Prueba de concentración de glicol : Medir con refractómetro óptico la concentración (debe marcar -37°C / 50% concentración).

---

## Sistema Eléctrico, Baterías y Sensores (slug: electrico)

### Equipamiento y Especificaciones
• Tensión nominal : Sistema de 24 V con dos baterías de 12V 200Ah conectadas en serie libre de mantenimiento.
• Alternador : Alternador de servicio pesado de 28 V / 140 A accionado por correa poli-V con tensor automático.
• Convertidor : Convertidor reductor 24V / 12V 30A para radio de faena y accesorios de cabina.
• Corte maestro : Llave selectora LOTO de desconexión de baterías y 3 pulsadores de parada de emergencia (E-stop).

### Fallas Principales y Síntomas
• Motor no da arranque / voltaje bajo en carga : Baterías sulfatadas o descargadas (< 23,5V en reposo), motor de partida pegado o solenoide sin señal.
• Baterías no cargan / alarma de alternador : Alternador entregando < 26,5V, correa de alternador destensada o fusible maestro fundido.
• Parada de emergencia activada sin causa aparente : Pulsador E-stop con microruptor dañado, cableado a tierra aterrizado o relé maestro pegado.
• Luces de trabajo LED intermitentes o apagadas : Relé de luces con bornes recalentados o conector Deutsch sulfatado.

### Procedimientos de Verificación
• 1. Prueba de carga y densidad de baterías : Medir voltaje con multímetro (reposo > 25,2V; en arranque > 20,0V); probar con tester de conductancia digital.
• 2. Medición de voltaje de alternador : Con motor a 1.500 rpm medir en bornes de alternador (nominal 27,8 - 28,4 V).
• 3. Inspección del circuito E-stop : Comprobar continuidad en los 3 botones de emergencia (cabina, chasis izquierdo, parte trasera).
• 4. Reapriete y limpieza de bornes : Limpiar sulfato con solución neutralizante y aplicar vaselina dieléctrica en bornes a 15 Nm.

---

## Suspensión y Chasis (slug: suspension)

### Equipamiento y Especificaciones
• Suspensión delantera : Cilindros hidroneumáticos oscilantes con acumuladores de nitrógeno integrados.
• Suspensión trasera : Montaje rígido con soporte basculante oscilante sobre el eje posterior.
• Chasis : Bastidor articulado de acero de alta resistencia soldado en caja cerrada con pletinas anti-desgaste.
• Presión precarga suspensión delantera : 45 bar de N2 a vástago completamente extendido.

### Fallas Principales y Síntomas
• Suspensión delantera rígida o golpeando en baches : Pérdida de precarga de nitrógeno en cilindros hidroneumáticos o nivel de aceite bajo.
• Camión inclinado hacia un costado : Cilindro de suspensión despresurizado o válvula niveladora descalibrada.
• Fisuras en soldaduras de articulación o chasis : Fatiga estructural por sobrecarga o impactos reiterados en carguío.
• Fuga de aceite por vástagos de suspensión : Sellos de labio y raspadores rotos por proyecciones de roca.

### Procedimientos de Verificación
• 1. Medición de altura de suspensión : Estacionar en piso plano con tolva vacía y medir longitud expuesta de vástagos (rango OEM 120 - 140 mm).
• 2. Comprobación de precarga con kit de nitrógeno : Conectar manómetro de N2 con adaptador de válvula Schrader en frío (nominal 45 bar).
• 3. Inspección con tintas penetrantes en puntos críticos : Limpiar y aplicar ensayo no destructivo en uniones soldadas de articulación central.
• 4. Engrase de bujes de oscilación : Purgar graseras hasta observar salida de grasa limpia alrededor de retenes.

---

## Neumáticos y Llantas (slug: neumaticos)

### Equipamiento y Especificaciones
• Medida de neumático : 35/65R33 radial para minería subterránea en los dos ejes (4 ruedas).
• Presión en frío : Eje delantero 7,0 bar (101 psi); eje trasero 7,5 bar (108 psi).
• Tuercas de rueda : 24 espárragos por rueda M24x1,5 con torque de apriete nominal 750 Nm.
• Llantas : Llantas desmontables de 5 piezas tipo OTR con aros de cierre y pestañas de fijación.

### Fallas Principales y Síntomas
• Presión baja de neumático : Pérdida por válvula de inflado, o-ring de llanta reseco o corte en banda de rodado por roca afilada.
• Desgaste irregular o desprendimiento de tacos : Presión de inflado descalibrada, sobrecarga o alineación de eje delantero desajustada.
• Espárragos de rueda cortados o tuercas sueltas : Torque inadecuado en montaje, falta de retorque a las 10 horas de servicio o fatiga de material.
• Calentamiento excesivo de neumático (> 85°C) : Velocidad de traslado excesiva superando el índice TKPH del compuesto de caucho.

### Procedimientos de Verificación
• 1. Medición de presión en frío : Verificar con manómetro digital calibrado antes de iniciar el turno (7,0 bar del. / 7,5 bar tras.).
• 2. Torquimetría cruzada de tuercas de rueda : Aplicar torquímetro calibrado a 750 Nm en estrella siguiendo la secuencia de 24 tuercas.
• 3. Inspección de cortes y profundidad de banda : Medir con profundímetro en 4 puntos de la banda de rodado (descarte al llegar a banda lisa OEM).
• 4. Comprobación de o-ring de pestaña de llanta : Aplicar agua jabonosa en el asiento de la llanta de 5 piezas para detectar micro-fugas.

---

## Sensores, Pantalla y Diagnóstico (slug: sensores)

### Equipamiento y Especificaciones
• Sistema de control : Módulo RCS (Rig Control System) con pantalla digital a color en cabina de operador.
• Red de comunicación : CAN-Bus SAE J1939 de alta velocidad con dos resistencias terminadoras de 120 Ω (60 Ω equivalente).
• Sensores principales : Sensores de presión (4-20 mA / 0.5-4.5V), sensores de temperatura (PT100/NTC), sensores inductivos.

### Fallas Principales y Síntomas
• Pantalla de cabina no enciende o se reinicia : Falla en alimentación de 24V a pantalla, fusible de control fundido o cable de tierra flojo.
• Códigos de error activos de red CAN (CAN-Bus Error) : Pérdida de resistencia terminal de 60 Ω, arnés CAN aplastado o módulo ECU desconectado.
• Lectura errónea o valor intermitente en sensor : Conector Deutsch con humedad/polvo, cable cortado o sensor descalibrado.
• Advertencia de tolva o freno en pantalla sin estar activo : Falla en sensor inductivo de posición o cortocircuito a positivo en señal digital.

### Procedimientos de Verificación
• 1. Lectura de menú de diagnóstico en pantalla : Ingresar al menú de servicio con clave de operador/mantenedor y listar fallas activas registradas.
• 2. Medición de resistencia de red CAN-Bus : Con batería desconectada, medir entre pines CAN_H y CAN_L en conector J1939 (debe medir exactamente 60 Ω).
• 3. Verificación de voltaje de alimentación de sensores : Medir 5,0V ± 0,1V o 24V en el pin de suministro del conector del sensor con multímetro.
• 4. Prueba de continuidad de arnés : Desconectar ambos extremos y verificar que no haya derivación a chasis ni continuidad entre líneas.
