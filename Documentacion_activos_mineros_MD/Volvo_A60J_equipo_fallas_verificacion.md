---
activo: "Camión Articulado Volvo A60J"
tag_code: "TS-CAEX-0000300"
tipo: "Camión de apoyo"
fabricante: "Volvo Construction Equipment"
modelo: "A60J"
specs_generales:
  motor: "Volvo D16F / D16J 16,1 L; 6 cilindros; 495 kW (664 hp) a 1.800 rpm; par 3.200 Nm a 1.050 rpm"
  potencia: "495 kW (664 hp) @ 1.800 rpm"
  torque: "3.200 Nm @ 1.050 rpm"
  capacidad_nominal: "Carga útil de 55.000 kg (55 toneladas métricas)"
  capacidad_volumen: "Tolva colmada SAE 2:1 de 33,6 m³ (a ras 25,8 m³)"
  peso_operativo: "43.400 kg peso vacío; 98.400 kg peso bruto cargado"
  transmision: "Volvo PowerTronic planetaria automática de 9 marchas adelante y 3 reversas con convertidor lock-up"
  sistema_electrico: "24V DC con alternador 28V 120A y 2 baterías de 12V 170 Ah con desconectador maestro LOTO"
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

# Camión Articulado Volvo A60J — Ficha Técnica y Guía de Diagnóstico TAGSENSE

> **Ficha Técnica Maestra:** Parámetros cuantitativos oficiales, tolerancias de taller, causas raíces y procedimientos de comprobación en terreno para el camión articulado 6×6 Volvo A60J (55 t).

---

## Motor y Combustible (slug: motor)

### Equipamiento y Especificaciones
• Motor OEM : Volvo D16F / D16J turbodiésel con intercooler aire-aire, 6 cilindros en línea, 16,1 L de cilindrada
• Potencia y torque : 495 kW (664 hp) a 1.800 rpm; torque máximo 3.200 Nm a 1.050 rpm
• Capacidad fluido : Aceite de motor 15W-40 Volvo VDS-4.5 cárter húmedo 54 L; refrigerante OAT 50/50 75 L
• Presión de aceite : Mínimo 1,5 bar en ralentí caliente (85 °C); 3,8 a 5,2 bar a 1.800 rpm nominal
• Inyección y combustible : Inyectores bomba EUI de gestión electrónica EMS2 con presión hasta 2.000 bar; estanque diésel 750 L

### Fallas Principales y Síntomas
• Pérdida de potencia en subida con tolva cargada : Filtros de combustible obstruidos (> 15 inHg de restricción), fuga en mangueras de intercooler o sensor boost fallando
• Humo negro denso en aceleración : Cartuchos de admisión de aire saturados (> 22 inHg) o falla en válvula wastegate de turbocompresor
• Alarma de baja presión de aceite motor : Presión bajo 1,2 bar en ralentí; aceite degradado, dilución con diésel o sensor de presión descalibrado
• Arranque retardado o no parte en frío : Presencia de aire en circuito de combustible, baja carga de baterías (< 22V en arranque) o precalentador defectuoso

### Procedimientos de Verificación
• Purga del circuito de combustible : Conectar manguera en niple de purga sobre cabezal de filtro secundario; bombear cebador manual hasta salida sin burbujas
• Medición de restricción de admisión : Conectar vacuómetro en toma de admisión post-filtro; acelerar a 1.800 rpm; si supera 22 inHg sustituir cartucho primario
• Medición de presión de aceite : Instalar manómetro calibrado 0-10 bar en galería principal de bloque; comprobar mínimo 1,5 bar en ralentí a 85 °C
• Lectura de códigos EMS2 : Ingresar al menú de diagnóstico del display Contronics en cabina o conectar Volvo Tech Tool (VCADS)

---

## Frenos y Retardo (slug: frenos)

### Equipamiento y Especificaciones
• Frenos de servicio : Frenos húmedos multidisco totalmente sellados y refrigerados por aceite en los tres ejes (6 ruedas)
• Sistema de retardo : Retardador hidráulico variable integrado en transmisión más freno de motor VEB (Volvo Engine Brake) de 375 kW
• Presión de aplicación : Circuito hidráulico de frenos a 140 bar asistido por acumuladores de nitrógeno precargados a 80 bar
• Freno de estacionamiento : Frenos de resorte aplicados y liberados por presión hidráulica (SAHR) en eje motriz intermedio
• Fluido de enfriamiento de frenos : Aceite ATF o fluido húmedo Volvo WB101 / WB102 con circuito de enfriamiento forzado

### Fallas Principales y Síntomas
• Pérdida de capacidad de retardo en bajada : Válvula solenoide de retardador atascada, bajo nivel de fluido o sobrecalentamiento de aceite (> 115 °C)
• Alarma de baja presión en acumuladores de freno : Presión cae bajo 110 bar; pérdida de precarga de nitrógeno o fuga interna en válvula moduladora
• Freno de estacionamiento no libera : Presión hidráulica insuficiente (< 90 bar) en solenoide de liberación o resorte SAHR trabado
• Temperatura excesiva en discos húmedos : Arrastre mecánico por desgaste excesivo de placas o recirculación de aceite bloqueada

### Procedimientos de Verificación
• Verificación de precarga de acumuladores : Despresurizar circuito con pedal de freno (30 accionamientos con motor apagado); medir precarga con kit de nitrógeno
• Medición de presión de frenado : Conectar manómetros de 0-250 bar en tomas de test de eje delantero y tándem; verificar 140 ± 5 bar a pedal a fondo
• Verificación de temperatura de aceite de frenos : Monitorear sensor en Contronics; temperatura en operación normal debe oscilar entre 65 y 95 °C
• Prueba funcional de freno de estacionamiento : En pendiente de 15% con equipo cargado, aplicar freno de estacionamiento; verificar retención sin deslizamiento

---

## Dirección y Articulación (slug: direccion)

### Equipamiento y Especificaciones
• Tipo de dirección : Dirección hidrostática con bastidor articulado mediante 2 cilindros de doble efecto
• Ángulo de articulación : ±45° mediante rótula central sobredimensionada con rodamientos cónicos lubricados por grasa
• Presión de trabajo : 240 bar (24 MPa) suministrada por bombas de pistones axiales con detección de carga (load sensing)
• Dirección secundaria : Bomba de dirección de emergencia accionada por transmisión para maniobra segura ante parada imprevista de motor
• Fluido de dirección : Compartido con el sistema hidráulico principal (ISO VG 46 / Volvo Super Hydraulic Oil)

### Fallas Principales y Síntomas
• Dirección dura o pesada a bajas revoluciones : Válvula de prioridad de dirección trabada, baja presión de bomba standby (< 30 bar) o fuga en orbitrol
• Juego excesivo o cabeceo en articulación central : Desgaste en bujes y pasadores de rótula (> 2,0 mm de holgura radial) o tuerca de ajuste floja
• Respuesta lenta al girar volante : Fuga interna en sellos de pistón de cilindros de articulación o presencia de aire en circuito
• Alarma de falla en dirección secundaria : Sensor de flujo o presión de bomba de emergencia abierto o bomba auxiliar descebada

### Procedimientos de Verificación
• Medición de presión de dirección : Conectar manómetro de 0-350 bar en toma de test en bloque de dirección; llevar a tope mecánico y verificar 240 bar
• Medición de holgura en articulación central : Levantar ligeramente con gata hidráulica; medir con comparador de carátula juego vertical y radial (límite 2,0 mm)
• Prueba funcional de dirección secundaria : Desconectar ignición rodando a baja velocidad (5 km/h) en pista despejada; comprobar maniobrabilidad de emergencia
• Purga de aire en circuito de dirección : Girar volante de tope a tope 10 veces lentamente con motor a ralentí hasta recorrido uniforme

---

## Sistema Hidráulico Principal (slug: hidraulico)

### Equipamiento y Especificaciones
• Bombas principales : 4 bombas de pistones axiales de caudal variable (270 L/min total a 2.100 rpm) con control load sensing
• Presión de alivio principal : 250 bar (25 MPa) en circuito de implementos y levante
• Estanque hidráulico : 260 L de capacidad con mirilla óptica de nivel en chasis frontal y respiradero con filtro desecante
• Fluido recomendado : Aceite hidráulico antidesgaste ISO VG 46 / Volvo Hydraulic Oil 98620
• Filtración hidráulica : Filtro de retorno de fibra de vidrio de 10 micrones absolutos con sensor de saturación eléctrica

### Fallas Principales y Síntomas
• Elevación lenta de tolva cargada : Baja presión en válvula de alivio principal (< 230 bar), desgaste en bomba de implementos o bypass en carrete de mando
• Sobrecalentamiento de fluido hidráulico : Temperatura de estanque superior a 90 °C; enfriador tapado con lodo/polvo o recirculación continua por alivio
• Emulsión o espuma blanca en mirilla de estanque : Ingreso de agua o succión de aire por abrazadera suelta en línea de aspiración de bomba
• Ruido de cavitación en bombas hidráulicas : Malla de succión colmatada, nivel de aceite bajo marca MIN o fluido de viscosidad inadecuada

### Procedimientos de Verificación
• Comprobación de nivel y mirilla : Estacionar en piso plano con cilindros de tolva completamente retraídos; aceite debe cubrir centro de mirilla
• Calibración de presiones standby y alivio : Conectar manómetro 0-400 bar en toma LS; medir standby (32 ± 2 bar) y presión máxima (250 ± 5 bar)
• Monitoreo de caída de presión en filtro de retorno : Acelerar motor con aceite a 50 °C; verificar caída < 1,5 bar; si la luz piloto enciende, reemplazar filtro
• Toma de muestra de aceite hidráulico : Extraer 100 ml con bomba de vacío de toma minimess intermedia; enviar a análisis de conteo de partículas ISO 4406

---

## Sistema Eléctrico, Baterías y Sensores (slug: electrico)

### Equipamiento y Especificaciones
• Tensión nominal : 24V DC con negativo a chasis
• Alternador : 28V, 120A con regulador de voltaje incorporado y protección contra sobretensiones
• Baterías : 2 unidades de 12V 170 Ah conectadas en serie, libres de mantención y montadas en compartimento amortiguado
• Desconectador maestro : Interruptor bipolar de corte general accesible a nivel de piso con aldaba para candado LOTO
• Red de comunicación : Bus de datos múltiple CAN J1939 enlazando EMS (motor), Contronics (chasis/cabina) y V-ECU (transmisión)

### Fallas Principales y Síntomas
• Descarga de baterías tras detención de turno : Corriente parásita superior a 150 mA; convertidor 24/12V o módulo de radio/GPS en cortocircuito
• Caída de tensión en arranque (< 20V) : Bornes sulfatados, masa de motor floja o celda de batería comunicada
• Fallas intermitentes en red CAN bus : Resistencia de terminación fuera de rango (debe medir 60 ohmios entre CAN-H y CAN-L con baterías desconectadas)
• Alarma de alternador en Contronics : Tensión de carga bajo 26,5V o superior a 29,5V; falla en diodos o correa desajustada

### Procedimientos de Verificación
• Medición de tensión de flotación de alternador : Con motor a 1.500 rpm y luces encendidas, medir tensión en bornes; debe estar entre 27,8V y 28,5V
• Prueba de resistencia de red CAN bus : Desconectar baterías; medir con multímetro en pines C y D del conector OBD; confirmar 60 ± 3 ohmios
• Prueba de consumo parásito : Conectar amperímetro en serie con borne negativo de batería con llave en OFF; corriente residual debe ser < 0,10 A
• Verificación de apriete de bornes y masas : Aplicar torque de 12 Nm en bornes de batería y 45 Nm en pernos de masa de chasis y motor

---

## Transmisión, Convertidor y Ejes (slug: ejes)

### Equipamiento y Especificaciones
• Transmisión : Volvo PowerTronic planetaria totalmente automática con 9 marchas adelante y 3 marchas reversa
• Convertidor de par : Convertidor monofásico con embrague de acoplamiento directo lock-up automático en todas las marchas
• Ejes y tracción : Tracción permanente 6×6 con ejes pórticos sobredimensionados AHW71; bloqueos 100% transversales y longitudinal
• Capacidad de fluido : Aceite de transmisión 50 L Volvo AT102; aceite de diferenciales y mandos 60 L por eje (SAE 85W-140 API GL-5)
• Presión de modulación de embragues : 18 bar (1,8 MPa) controlada por válvulas proporcionales electrohidráulicas

### Fallas Principales y Síntomas
• Golpe o tirón brusco en cambios de marcha : Descalibración de embragues de transmisión, bajo nivel de fluido o sensor de velocidad defectuoso
• No engrana marcha adelante o reversa : Presión de control de transmisión bajo 14 bar, solenoide de cambio quemado o traba de estacionamiento activa
• Sobrecalentamiento de convertidor (> 120 °C) : Deslizamiento excesivo por lock-up que no engancha en pendientes o enfriador obstruido
• Ruido metálico o zumbido en ejes tándem : Nivel de aceite bajo en diferenciales, desgaste en corona-piñón o rodamientos de cubo dañados

### Procedimientos de Verificación
• Calibración de embragues de transmisión : Con motor a 1.200 rpm y temperatura de aceite a 70 °C, ejecutar rutina de auto-calibración en Contronics
• Medición de presión de línea de transmisión : Instalar manómetro 0-30 bar en toma de presión principal; verificar 18 ± 1 bar constante
• Verificación de niveles en diferenciales y cubos de rueda : Con equipo nivelado, retirar tapones de nivel; el aceite debe rozar el borde inferior de rosca
• Inspección de respiraderos de ejes : Limpiar y verificar que válvulas de venteo no estén tapadas de barro para evitar fugas por retenes de cubo

---

## Refrigeración y Temperatura (slug: temperatura)

### Equipamiento y Especificaciones
• Ventilador de refrigeración : Accionamiento hidrostático de velocidad variable según demanda térmica con inversión automática para limpieza
• Termostatos de motor : 2 unidades con inicio de apertura a 82 °C y apertura completa a 92 °C
• Radiador y post-enfriador : Núcleos de aluminio de paso amplio con protección anticorrosiva para ambiente minero
• Capacidad de refrigerante : 75 L de refrigerante Volvo VCS (OAT orgánico al 50/50 listo para usar)
• Umbrales de protección : Alarma de advertencia en cabina a 102 °C; reducción automática de torque por VCU a 106 °C

### Fallas Principales y Síntomas
• Sobrecalentamiento de motor en ciclo cargado : Panal de radiador tapado con polvo/polvillo, ventilador girando a baja velocidad o termostato trabado cerrado
• Consumo o pérdida de refrigerante sin fuga visible : Fuga interna en enfriador de aceite de motor, enfriador de EGR o empaque de culata
• Ventilador no invierte giro en ciclo de limpieza : Solenoide de inversión de válvula de motor hidráulico inoperante o señal interrumpida
• Motor no alcanza temperatura óptima (< 75 °C) : Termostatos atascados en posición abierta; causa dilución de aceite con combustible

### Procedimientos de Verificación
• Prueba de velocidad de ventilador hidrostático : Medir con tacómetro óptico; a máxima demanda térmica debe alcanzar 1.750 ± 50 rpm
• Medición de concentración de refrigerante : Con refractómetro óptico, comprobar punto de congelación a -37 °C (concentración 50% glicol)
• Limpieza y soplado de núcleo de radiador : Desactivar motor, aplicar aire a presión (máx. 4 bar) en sentido opuesto al flujo de aire
• Prueba de presión de estanque de expansión : Instalar bomba de presurización con manómetro; presurizar a 1,2 bar; debe retener presión por 10 minutos

---

## Sensores, Pantalla y Diagnóstico (slug: sensores)

### Equipamiento y Especificaciones
• Display de operador : Pantalla a color Volvo Contronics de alta resolución con navegación por teclado y menú de mantenimiento
• Sistema de pesaje integrado : Volvo On-Board Weighing (OBW) con sensores de deformación en chasis y presión en suspensión
• Sensores críticos : Presión y temperatura de aceite motor, presión de sobrealimentación, nivel y temperatura de aceite hidráulico, posición de tolva
• Red telemática : Módulo CareTrack con antena GSM/GPS para transmisión satelital de códigos y horómetro
• Puerto de diagnóstico : Conector OBD de 16 pines en consola derecha de cabina para enlace con software VCADS Pro

### Fallas Principales y Síntomas
• Pantalla Contronics no enciende o se apaga intermitente : Falla en fusible F12, relay maestro de cabina o conector posterior de display suelto
• Pesaje OBW marca error o lectura errónea (> 10% desviación) : Sensor de presión de suspensión delantera descalibrado o puente de galgas golpeado
• Código activo permanente de sensor de temperatura : Cableado en circuito abierto (resistencia infinita) o sensor NTC sulfatado
• Falso aviso de nivel de aceite hidráulico bajo : Boya magnética trabada con impurezas en estanque o cable de señal aterrizado a chasis

### Procedimientos de Verificación
• Calibración del sistema OBW : Vaciar tolva en terreno plano; seleccionar "Calibración de Tara Cero" en menú Contronics; confirmar con peso patrón
• Prueba de sensores resistivos con multímetro : Desconectar sensor; medir resistencia en frío y caliente comparando con curva de fabricante
• Verificación de líneas de alimentación a sensores (5V) : Medir con multímetro entre pin de alimentación y tierra del sensor; verificar 5,0 ± 0,1V DC
• Reseteo y borrado de códigos históricos : Una vez corregida la anomalía, borrar códigos almacenados mediante contraseña de técnico en Contronics

---

## Neumáticos y Llantas (slug: neumaticos)

### Equipamiento y Especificaciones
• Medida de neumático : 33.25 R29 radiales de base ancha con banda de rodado para roca y alta tracción
• Llantas : Llantas de acero desmontables de 5 piezas tipo 29-27.00/3.5
• Presión de inflado en frío : Delanteros 4,5 bar (65 psi); Tándem trasero intermedio y posterior 4,8 bar (70 psi)
• Torque de apriete de tuercas : 650 Nm aplicados en secuencia de cruz utilizando multiplicador de torque calibrado
• Carga máxima por neumático : 17.500 kg a velocidad máxima de faena de 50 km/h

### Fallas Principales y Síntomas
• Desgaste irregular o escalonado en tren delantero : Desalineación de convergencia, presión incorrecta o bujes de barra estabilizadora con holgura
• Presión baja continua en neumático : Pérdida por oring de llanta de 5 piezas, válvula con suciedad o fisura en banda de rodadura
• Sobrecalentamiento de neumático (> 85 °C en carcasa) : Presión insuficiente de trabajo o sobrecarga continua sobre las 55 toneladas
• Tuercas de rueda flojas o con estrías dañadas : Apriete sin torquímetro o reutilización de tuercas fatigadas

### Procedimientos de Verificación
• Medición de presión de inflado : Con neumáticos fríos y manómetro calibrado, verificar 4,5 bar en eje delantero y 4,8 bar en ejes traseros
• Apriete y re-torqueteo de ruedas : Aplicar 650 Nm en patrón cruzado tras las primeras 50 horas de montaje de neumático nuevo
• Inspección visual de banda y flancos : Buscar cortes profundos, desprendimiento de tacos o deformaciones en alambres de talón
• Verificación de holgura en pivotes de rueda : Mover rueda con palanca apoyada en piso; holgura máxima no debe exceder 1,5 mm

---

## Suspensión y Chasis (slug: suspension)

### Equipamiento y Especificaciones
• Suspensión delantera : Sistema hidroneumático autonivelante con 2 cilindros acumuladores de gas/aceite y control activo de cabeceo
• Suspensión trasera tándem : Sistema oscilante tipo bogie libre de mantenimiento con soportes de caucho y barras de torsión
• Chasis frontal y posterior : Vigas en cajón cerrado de acero de alta resistencia soldado con soldadura robótica de penetración completa
• Capacidad de oscilación del tándem : ±15° de recorrido articular para mantener tracción permanente en terrenos abruptos
• Presión de nitrógeno en cilindros delanteros : 65 bar precarga de fábrica; presión de aceite en reposo 110 bar

### Fallas Principales y Síntomas
• Suspensión delantera rígida o sin amortiguación : Acumulador delantero descargado de nitrógeno o cilindro hidroneumático trancado
• Inclinación lateral permanente del chasis frontal : Válvula de nivelación automática descalibrada o varillaje mecánico doblado
• Golpes secos en eje tándem al pasar por baches : Cojinetes de goma de soporte bogie desgastados o pernos de fijación cortados
• Fisuras en zona de unión de articulación : Fatiga estructural por sobrecarga o impactos reiterados en botadero

### Procedimientos de Verificación
• Medición de altura de suspensión delantera : Medir distancia entre tope de goma y chasis con equipo vacío; debe ser 80 ± 5 mm
• Verificación de precarga de nitrógeno en acumuladores : Aislar circuito hidráulico y medir con manómetro de precarga (debe ser 65 bar)
• Inspección con líquidos penetrantes en chasis : Aplicar revelador en soldaduras de articulación y soportes de cilindros de volteo
• Torque de pernos de suspensión : Verificar apriete de pernos de barras estabilizadoras y soportes de bogie a 780 Nm

---

## Tolva y Levante (slug: tolva)

### Equipamiento y Especificaciones
• Capacidad nominal : Carga útil de 55.000 kg (55 t) métricas
• Capacidad volumétrica : 25,8 m³ a ras; 33,6 m³ colmada SAE 2:1
• Material de la tolva : Acero antidesgaste Hardox 450 (piso 16 mm, laterales y compuerta 14 mm de espesor)
• Cilindros de elevación : 2 cilindros de simple etapa de doble efecto montados en el exterior del bastidor
• Tiempos de ciclo : Tiempo de elevación a 65°: 12 segundos; tiempo de descenso: 10 segundos

### Fallas Principales y Síntomas
• Descenso lento de la tolva : Válvula de regeneración o retorno trabada, o estrangulador de bajada mal calibrado
• Desvío o desalineación al subir tolva : Desgaste desparejo en sellos de cilindros o deformación en pasador principal de pivote
• Tolva no retiene posición elevada : Fuga interna en válvula de retención piloto o sellos de pistón de cilindros con fuga
• Deformación o desgaste crítico en piso de tolva : Desgaste de plancha inferior a 8 mm por impacto de rocas de alto tonelaje

### Procedimientos de Verificación
• Medición de tiempo de volteo : Con motor a 1.800 rpm y aceite a temperatura, cronometrar subida (12 s máx.) y bajada (10 s máx.)
• Comprobación de fuga en cilindros de volteo : Elevar tolva a 45°; trabar mecánicamente con cable de seguridad; desconectar manguera de retorno y medir goteo
• Medición de espesor de planchas de tolva : Utilizar medidor ultrasónico de espesores en 10 puntos de la tolva; cambiar liner si espesor < 8 mm
• Lubricación de pasadores de pivote y cilindros : Aplicar grasa de litio NLGI 2 EP en las 4 graseras de los cilindros y pasadores principales

---

## Fuentes Oficiales y Límites

- Manual de Taller y Reparaciones: Volvo Construction Equipment — Articulated Hauler A60H / A60J Service Manual.
- Catálogo de Especificaciones OEM y Capacidades: Volvo CE Global Mining & Hauling Systems.
- Seguridad en Operación y Mantenimiento: Aplicar protocolo de bloqueo y etiquetado LOTO en interruptor maestro de 24V y calzar cuñas en ruedas antes de intervenir.
- No ingresar bajo la tolva elevada sin colocar previamente los cables y pasadores mecánicos de retención de seguridad OEM.
