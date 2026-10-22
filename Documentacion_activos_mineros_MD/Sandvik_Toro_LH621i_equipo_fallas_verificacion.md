---
activo: "Pala Cargadora Sandvik Toro LH621i"
tag_code: "TS-LHD-0000200"
tipo: "Cargador frontal"
fabricante: "Sandvik"
modelo: "Toro LH621i"
specs_generales:
  motor: "Volvo TAD1344VE 12,78 L; 6 cilindros; 352 kW (478 hp) a 2.100 rpm; par 2.005 Nm a 1.260 rpm"
  potencia: "352 kW (478 hp) @ 2.100 rpm"
  torque: "2.005 Nm @ 1.260 rpm"
  capacidad_nominal: "Carga útil de 21.000 kg (baldes de 8,0 a 11,2 m³)"
  capacidad_volumen: "Balde estándar 8,6 m³ colmado SAE 2:1"
  peso_operativo: "56.800 kg peso vacío; 77.800 kg peso cargado en faena"
  transmision: "Dana TE32 4 velocidades adelante / 4 atrás con convertidor C9000"
  sistema_electrico: "24V DC con alternador 28V 150A y baterías de servicio 2x12V 145 Ah"
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
  - balde
---

# Pala Cargadora Sandvik Toro LH621i — Ficha Técnica y Guía de Diagnóstico TAGSENSE

> **Ficha Técnica Maestra:** Parámetros cuantitativos oficiales, tolerancias de taller, causas raíces y procedimientos de comprobación en terreno para el cargador subterráneo LHD Sandvik Toro LH621i.

---

## Motor y Combustible (slug: motor)

### Equipamiento y Especificaciones
• Motor OEM : Volvo TAD1344VE diésel de 6 cilindros en línea, 12,78 L de cilindrada, turboalimentado y post-enfriado aire-aire
• Potencia y torque : 352 kW (478 hp) a 2.100 rpm; torque máximo 2.005 Nm a 1.260 rpm
• Capacidad fluido : Aceite de motor 15W-40 VDS-4.5 cárter húmedo 36 L; refrigerante OAT 50/50 65 L
• Presión de aceite : Mínimo 1,2 bar en ralentí caliente (85 °C); 3,5 a 5,0 bar a régimen nominal de 2.100 rpm
• Inyección y combustible : Sistema Common Rail de alta presión Bosch (hasta 1.800 bar); doble filtro de combustible con separador de agua

### Fallas Principales y Síntomas
• Pérdida de potencia en rampa de acarreo : Filtros de combustible saturados (> 12 inHg de restricción), baja presión de rail o fuga en mangueras de intercooler
• Humo negro excesivo en aceleración : Obstrucción en filtros de aire primario/secundario (> 20 inHg) o fuga en circuito de sobrealimentación de turbo
• Alerta de baja presión de aceite motor : Presión cae bajo 1,0 bar en ralentí; aceite degradado o diluido con diésel, o falla en sensor de presión
• Dificultad o retardo en arranque en frío : Aire en circuito de combustible, baja tensión en baterías (< 22V en arranque) o precalentadores defectuosos

### Procedimientos de Verificación
• Purga del circuito de combustible : Conectar manguera en niple de purga sobre cabezal de filtro secundario; accionar cebador manual hasta flujo continuo sin burbujas
• Medición de restricción de admisión : Conectar manómetro de vacío en toma post-filtro de aire; acelerar a 2.100 rpm; si supera 20 inHg, sustituir cartucho primario
• Medición de presión de aceite : Conectar manómetro calibrado 0-10 bar en galería principal de bloque motor; verificar mínimo 1,2 bar en ralentí a 85 °C
• Diagnóstico electrónico VCU : Conectar herramienta de diagnóstico o revisar display Sandvik SICA; leer códigos activos en módulo EMR4/TAD

---

## Frenos y Retardo (slug: frenos)

### Equipamiento y Especificaciones
• Sistema de frenos : SAHR (Spring Applied Hydraulic Released) multidiscos húmedos enfriados por aceite forzado en las 4 ruedas
• Presión de liberación : 130 a 150 bar (1.885 a 2.175 psi) nominal suministrada por acumuladores de pistón
• Capacidad fluido : Aceite hidráulico ISO VG 46 / ATF 65 L en circuito independiente de refrigeración de frenos
• Precarga acumulador : 80 bar de nitrógeno N2 en acumuladores de pistón de servicio y parqueo
• Espesor y desgaste de discos : Indicador de desgaste mecánico en mazas; desgaste máximo permisible de paquete de discos 2,0 mm

### Fallas Principales y Síntomas
• Freno de parqueo no libera / equipo trabado : Presión de liberación cae bajo 115 bar por falla en válvula solenoide de parqueo o bomba de carga
• Pedal de freno esponjoso o baja fuerza de frenado : Presión en circuito de servicio menor a 125 bar, aire en cañerías o fuga interna en válvula moduladora
• Sobrecalentamiento de mazas en rampa descendente : Temperatura en discos de rueda supera 100 °C por arrastre continuo o enfriador de frenos obstruido
• Fuga de aceite por extremo de eje en rueda : Falla del sello Duo-Cone o retén tórico de maza por contaminación de barro o desgaste

### Procedimientos de Verificación
• Medición de presión de liberación : Conectar manómetro 0-250 bar en toma TP de freno de parqueo; con motor encendido verificar lectura entre 130 y 150 bar
• Prueba de estanqueidad : Aplicar pedal a fondo durante 60 segundos; la caída de presión en manómetro no debe superar 5 bar
• Verificación de temperatura con pirómetro : Medir con pirómetro infrarrojo en carcasas de maza tras ciclo de descenso; temperatura máxima admisible 100 °C
• Medición de desgaste de discos : Retirar tapón de inspección en maza y medir vástago indicador con calibre; si supera 2,0 mm programar cambio de paquete

---

## Sistema Hidráulico Principal (slug: hidraulico)

### Equipamiento y Especificaciones
• Bombas principales : Bombas de pistones axiales de caudal variable Rexroth A11VLO con control de carga Load Sensing (LS)
• Presión de trabajo : 250 bar (3.625 psi) nominal en circuito de levante y volteo; presión de standby 35 bar
• Capacidad estanque : 310 L de aceite hidráulico ISO VG 46 (mina subterránea) o ISO VG 68; mirilla de nivel en estanque
• Válvula de alivio principal : Regulada a 275 bar (3.988 psi) en bloque de válvulas principal
• Filtración : Filtros de retorno de 10 micrones absolutos con indicador de saturación eléctrico en cabina

### Fallas Principales y Síntomas
• Balde no levanta con carga nominal de 21 ton : Presión de trabajo no supera 180 bar; válvula de alivio trabada o bomba con desgaste en pistones
• Movimientos hidráulicos lentos o entrecortados : Válvula de control LS descalibrada, aire en circuito o nivel bajo en estanque
• Cavitación o ruido excesivo en bomba principal : Malla de succión magnética tapada, manguera de aspiración colapsada o aceite degradado
• Temperatura de aceite hidráulico sobre 90 °C : Enfriador de aceite hidráulico con panal obstruido o válvula de bypass térmico trabada abierta

### Procedimientos de Verificación
• Medición de presiones en toma TP1 : Conectar manómetro 0-400 bar en toma TP1; verificar 35 bar en ralentí (standby) y 250 bar al llegar a tope de levante
• Verificación de presión de alivio : Accionar cilindro de volteo a tope con motor a 2.100 rpm; la presión debe cortar exactamente en 275 bar
• Inspección de malla y nivel de estanque : Con cilindros retraídos en piso plano, confirmar que el nivel cubra el 75% de la mirilla y revisar iman de fondo
• Chequeo de temperatura en enfriador : Medir con pirómetro entrada y salida del radiador hidráulico; debe existir un salto térmico de al menos 10 °C

---

## Balde y Cucharón (slug: balde)

### Equipamiento y Especificaciones
• Tipo de balde : Cucharón Sandvik de perfil bajo para roca dura, labios de desgaste en acero Hardox 500
• Capacidad colmada : 8,6 m³ (opcionales de 8,0 a 11,2 m³ según densidad de roca); carga útil 21.000 kg
• Cilindros de volteo : 1 cilindro central de volteo de gran diámetro con amortiguación de fin de carrera
• Tiempos de ciclo : Tiempo de elevación 8,4 s; tiempo de bajada 5,2 s; tiempo de descarga 2,2 s
• Pasadores y bujes : Pasadores tratados térmicamente con bujes de bronce ranurados para grasa de alta presión

### Fallas Principales y Síntomas
• Balde desciende solo con carga (deriva hidráulica) : Fuga interna por sellos del pistón en cilindro de levante o válvula de retención con desgaste
• Juego excesivo o golpeteo en articulación de balde : Desgaste en bujes y pasadores de cuchara (> 2,0 mm de holgura radial) por falta de engrase
• Balde no alcanza ángulo de descarga completo : Deformación mecánica en biela de vuelco o tope de cilindro de volteo fuera de ajuste
• Fisura en cordones de soldadura de labio : Fatiga estructural por impacto contra marina de frente de avance o sobrecarga

### Procedimientos de Verificación
• Prueba de deriva hidráulica : Elevar balde con 21 ton a 1 m del suelo; apagar motor y medir descenso con huincha durante 5 min; máximo admisible 10 mm
• Medición de juego en pasadores : Colocar reloj comparador en unión de balde y aplicar esfuerzo lateral con palanca; holgura máxima admisible 2,0 mm
• Prueba de velocidad de ciclos : Cronometrar 3 ciclos completos de levante y bajada; si levante supera 10 segundos, revisar caudal de bomba
• Inspección por tintes penetrantes : Limpiar zonas de anclaje de cilindros y esquinas de biela; aplicar revelador para detectar microfisuras

---

## Dirección y Articulación (slug: direccion)

### Equipamiento y Especificaciones
• Tipo de dirección : Hidráulica articulada con 2 cilindros de dirección de doble efecto controlados por joystick en cabina
• Presión nominal : 190 bar (2.755 psi) regulada por válvula prioritaria de dirección
• Sistema secundario : Dirección de emergencia accionada por motor eléctrico auxiliar según norma ISO 5010
• Ángulo de articulación : ±42,5° hacia ambos lados mediante perno rey central superior e inferior
• Engrase de pernos de articulación : Conexión a sistema centralizado de engrase automático con grasa NLGI 2 EP con MoS2

### Fallas Principales y Síntomas
• Dirección pesada o dura al maniobrar : Presión de dirección menor a 150 bar, válvula de prioridad trabada o bomba LS descalibrada
• Holgura excesiva o golpe en articulación central : Desgaste en bujes cónicos de perno rey (holgura radial > 1,5 mm)
• Movimiento oscilante o sin centro definido : Fuga interna en sellos de pistón de cilindros de giro o aire atrapado en circuito
• Alarma activa de dirección de emergencia : Falla de switch de presión de dirección secundaria o fusible de motor auxiliar quemado

### Procedimientos de Verificación
• Medición de presión de giro : Conectar manómetro 0-250 bar en toma TP de dirección; con motor a 1.500 rpm girar a tope; debe marcar 190 bar
• Chequeo de holgura en perno rey : Levantar ligeramente el equipo con balde y colocar comparador de cuadrante en articulación; holgura máxima 1,5 mm
• Prueba funcional de dirección secundaria : Con equipo detenido y motor apagado, accionar interruptor de emergencia y verificar giro de ruedas
• Purga de cilindros de dirección : Abrir purgadores de cilindros de dirección y ciclar de tope a tope hasta eliminar aire espumoso

---

## Transmisión y Ejes (slug: ejes)

### Equipamiento y Especificaciones
• Transmisión : Dana TE32 automática de 4 velocidades hacia adelante y 4 hacia atrás con convertidor C9000
• Ejes : Kessler D106 para trabajo pesado con diferencial de deslizamiento limitado y reductores planetarios
• Capacidad de aceite ejes : Aceite SAE 85W-140 API GL-5; 45 L por eje (90 L total)
• Capacidad de aceite transmisión : Aceite ATF Dexron III / Allison C-4; 55 L en transmisión y convertidor
• Presión de embragues : 16 a 19 bar en circuito de modulación de marchas de transmisión

### Fallas Principales y Síntomas
• Transmisión patina o golpea al enganchar marcha : Presión de embrague baja (< 14 bar), discos de embrague quemados o solenoide PWM sucio
• Temperatura de aceite de transmisión > 115 °C : Convertidor de par trabajando con patinaje excesivo o enfriador de aceite obstruido
• Ruido metálico o zumbido en diferenciales de eje : Falta de lubricante, holgura excesiva entre corona y piñón o rodamientos picados
• Pérdida de tracción en una rueda bajo carga : Discos de fricción del diferencial de deslizamiento limitado desgastados

### Procedimientos de Verificación
• Medición de presión de modulación : Conectar manómetro 0-25 bar en toma de presión principal de transmisión Dana; verificar 16 a 19 bar a 1.500 rpm
• Chequeo de nivel en mirilla : Verificar nivel de transmisión con motor en ralentí caliente (80 °C) en superficie plana
• Muestreo de aceite SOS : Extraer muestra de 100 ml de aceite de eje y transmisión; analizar ppm de hierro, cobre y bronce
• Inspección de juego de crucetas : Revisar con palanca holgura en crucetas y cojinete central del cardán; no debe existir juego perceptible

---

## Refrigeración y Temperatura (slug: temperatura)

### Equipamiento y Especificaciones
• Sistema de refrigeración : Radiador de núcleos modulares de alta disipación térmica con ventilador hidráulico proporcional reversible
• Capacidad de refrigerante : 65 L de refrigerante de larga duración OAT (Organic Acid Technology) al 50/50 con agua desmineralizada
• Termostatos de motor : Termostatos dobles; inicio de apertura a 82 °C y apertura completa a 93 °C
• Ventilador hidráulico : Modulado por válvula proporcional PWM según temperatura de refrigerante y aire de admisión
• Limpieza automática : Función de inversión de giro de ventilador (reversa) cada 30 minutos para expulsar polvo de mina

### Fallas Principales y Síntomas
• Temperatura de motor sobre 102 °C en rampa : Panales de radiador tapados con lodo y polvo de mina, o termostatos trabados cerrados
• Ventilador hidráulico no modula / gira lento : Falla en solenoide PWM de motor de ventilador o presión hidráulica insuficiente (< 140 bar)
• Pérdida continua de refrigerante sin fuga externa visible : Fuga interna en enfriador de aceite de motor o empaquetadura de culata con paso
• Falla en ciclo de reversa de ventilador : Válvula direccional de inversión trabada mecánicamente o relé de control desconectado

### Procedimientos de Verificación
• Limpieza por soplado e inversión de ventilador : Activar ciclo manual de reversa del ventilador en cabina; si persiste calor, limpiar panal con aire seco
• Medición de temperatura con pirómetro : Medir entrada y salida de mangueras de radiador; a 90 °C debe haber circulación activa y salto de 8 °C
• Prueba de estanqueidad de circuito : Instalar bomba de presión manual en boca de vaso de expansión; presurizar a 1,0 bar; debe sostener 5 min sin caída
• Medición de RPM de ventilador : Usar tacómetro óptico; a máxima demanda térmica debe alcanzar 1.850 rpm

---

## Sistema Eléctrico y Sensores (slug: electrico)

### Equipamiento y Especificaciones
• Tensión nominal : 24V DC con sistema de masa negativa y switch maestro LOTO con candado
• Alternador : Delco Remy de 28V y 150A con regulador de voltaje electrónico incorporado
• Baterías : 2 baterías de 12V conectadas en serie, 145 Ah de capacidad y 1.000 CCA de arranque en frío
• Alumbrado : Focos LED heavy duty de 5.000 lúmenes delanteros y traseros con protección contra impactos
• Protección : Módulo central de fusibles automotrices y disyuntores térmicos rearmeables en caja sellada IP67

### Fallas Principales y Síntomas
• Equipo no da arranque y se apaga el display : Voltaje de baterías menor a 21V, bornes sulfatados o switch maestro LOTO abierto
• Alternador no carga las baterías (< 25V en marcha) : Correa de alternador floja, regulador quemado o cable B+ de potencia cortado
• Código de falla activo por baja tensión : Caída de tensión superior a 3V en mazo de cables principal hacia módulos VCU
• Falla en parada de emergencia : Botón de golpe trabado o cable de lazo de seguridad cortado; impide arranque de motor

### Procedimientos de Verificación
• Medición de voltaje de baterías : Medir con multímetro en bornes; reposo mínimo 25,2V; con motor en marcha a 1.500 rpm debe marcar entre 27,5 y 28,5V
• Prueba de caída de tensión en arranque : Conectar multímetro en batería durante el arranque; la tensión no debe caer bajo 18V
• Inspección de switch de aislamiento LOTO : Verificar continuidad entre terminales principales; resistencia debe ser menor a 0,05 Ω
• Verificación de lazo de paradas de emergencia : Probar continuidad en serie de los 3 pulsadores (cabina, piso izquierdo y piso derecho)

---

## Neumáticos y Llantas (slug: neumaticos)

### Equipamiento y Especificaciones
• Dimensión de neumático : 29.5 R29 radiales para roca minera subterránea con banda de rodado extra profunda L-5
• Presión de inflado en frío : 90 psi (6,2 bar) delanteros; 85 psi (5,9 bar) traseros
• Llantas : Llantas desmontables de 5 piezas para minería subterránea con aros de seguridad
• Torque de tuercas de rueda : 700 Nm en tuercas de sujeción de maza en patrón de estrella cruzada
• Protección : Opcional de cadenas de protección de acero aleado para neumático en frente de carguío abrasivo

### Fallas Principales y Síntomas
• Presión baja de neumático : Fuga por válvula de inflado, o-ring de llanta reseco o corte en banda de rodado por roca afilada
• Sobrecalentamiento de neumático (> 85 °C) : Presión de inflado baja con alta velocidad en rampa o sobrecarga repetida
• Tuercas de rueda sueltas o perno roto : Torque insuficiente tras cambio de neumático o vibración por desbalanceo severo
• Desprendimiento de tacos o corte profundo en hombro : Trabajo en frente con roca sin limpiar o presión excesiva

### Procedimientos de Verificación
• Medición de presión con manómetro calibrado : Medir exclusivamente con neumático frío antes del turno; inflar con jaula de seguridad si está bajo 80 psi
• Control de temperatura con pirómetro : Medir temperatura en centro de banda y hombro; si supera 85 °C, reducir velocidad de ciclo de acarreo
• Torquímetro en tuercas de maza : Aplicar torquímetro calibrado a 700 Nm en todas las tuercas de las 4 ruedas tras 50 horas de montaje
• Inspección visual de cortes y rocas incrustadas : Retirar rocas trabadas entre tacos y medir profundidad de cortes con sonda métrica

---

## Suspensión y Chasis (slug: suspension)

### Equipamiento y Especificaciones
• Arquitectura : Eje trasero oscilante soportado en cuna con pernos rey de oscilación montados en bujes de bronce
• Ángulo de oscilación : ±10° de oscilación en eje trasero para mantener las 4 ruedas en contacto con el piso irregular
• Chasis : Estructuras soldadas en chapa de acero de alta resistencia y flexibilidad con nervaduras de refuerzo
• Amortiguación de oscilación : Topes de elastómero de alta densidad para absorción de impactos al límite de carrera
• Puntos de izaje y remolque : Argollas certificadas en chasis delantero y trasero para 60 toneladas de tracción

### Fallas Principales y Síntomas
• Golpeteo severo en oscilación de eje trasero : Desgaste en bujes de cuna de oscilación (> 2,5 mm de holgura) o topes de goma rotos
• Equipo inclinado hacia un lado en piso plano : Pasador de oscilación trabado sin lubricación o deformación estructural en soporte de cuna
• Fisuras en articulación central o soporte de cilindros : Fatiga de material por sobrecarga de balde o impacto contra caja de galería
• Falta de lubricación en muñones de oscilación : Graseras tapadas o línea de lubricación automática cortada

### Procedimientos de Verificación
• Medición de holgura en bujes de oscilación : Levantar eje trasero con gata hidráulica; medir con comparador de cuadrante el juego radial (máx. 2,0 mm)
• Inspección visual de topes de amortiguación : Revisar que los tacos de goma no estén aplastados ni presenten desgarros
• Prueba de lubricación centralizada : Accionar bomba manual de engrase y verificar purga de grasa fresca en ambos extremos del muñón
• Inspección con tintes penetrantes en chasis : Limpiar soldaduras en puntos de unión del bastidor central y verificar ausencia de fisuras

---

## Sensores, Pantalla y Diagnóstico (slug: sensores)

### Equipamiento y Especificaciones
• Sistema de control : Sandvik SICA (Sandvik Intelligent Control Architecture) con controlador principal y controladores de E/S
• Pantalla de cabina : Display táctil a color de 12" integrado en el panel del operador con navegación gráfica
• Red de comunicación : Bus CAN redundante según protocolo SAE J1939 a 250 kbps
• Sensores de proceso : Transmisores de presión piezoeléctricos 4-20 mA y sensores de temperatura tipo RTD PT100
• Sistema de pesaje integrado : Sensores de presión en cilindros de levante para pesaje dinámico de carga en balde

### Fallas Principales y Síntomas
• Código de alarma activo en pantalla SICA : Falla en componente monitoreado, cortocircuito en sensor o señal fuera de rango OEM
• Pantalla táctil no responde o se congela : Pérdida de comunicación en bus CAN, software desactualizado o caída de tensión en módulo VCU
• Lectura errática en sistema de pesaje de carga : Sensor de presión descalibrado en cilindro de levante o sensor de ángulo de balde dañado
• Pérdida total de comunicación en bus CAN : Resistencia de terminación dañada (debe ser 60 Ω) o cable trenzado CAN-H / CAN-L cortado

### Procedimientos de Verificación
• Lectura de códigos en menú de servicio : Ingresar a pantalla de diagnóstico SICA; registrar código SPN/FMI, estado activo e historial
• Medición de resistencia de bus CAN : Apagar switch general; medir con multímetro entre pines CAN-H y CAN-L; debe marcar entre 58 y 62 Ω
• Comprobación de alimentación de sensores : Medir con voltímetro entre pin de alimentación y masa del conector; debe registrar 24V DC o 5V regulados
• Calibración de sistema de pesaje : Efectuar procedimiento de tara con balde vacío a 1.500 rpm y posterior verificación con masa conocida de 21 ton
