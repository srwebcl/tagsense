# TAGSENSE — Paleta de colores oficial

## 1. Identidad visual

La identidad visual de **TAGSENSE** se construye sobre cuatro pilares:

- **Negro carbón:** base oscura, sobria e industrial.
- **Marfil tecnológico:** contraste claro para el logotipo y la comunicación.
- **Cobre industrial:** color distintivo del isotipo y de los elementos de interacción.
- **Naranja cobrizo:** acento luminoso para destacar elementos puntuales.

La dirección visual recomendada es **industrial, tecnológica, premium y minimalista**, apropiada para una marca orientada a la minería y la industria en Chile.

> **Importante:** los códigos HEX de este documento son valores de referencia extraídos visualmente de las imágenes adjuntas. Los reflejos, las sombras y los efectos tridimensionales del isotipo producen variaciones de tono. Para una identidad consistente, se recomienda utilizar los colores planos definidos en esta guía.

## 2. Colores corporativos principales

### 2.1. Negro carbón

- **HEX:** `#17191A`
- **RGB:** `23, 25, 26`
- **Uso:** color base para fondos, encabezados, navegación y secciones principales.
- **Función visual:** aporta solidez, contraste y una estética industrial.

### 2.2. Marfil tecnológico

- **HEX:** `#E8E8D8`
- **RGB:** `232, 232, 216`
- **Uso:** color del logotipo, títulos, textos destacados y elementos gráficos sobre fondos oscuros.
- **Función visual:** aporta claridad y contraste sin recurrir al blanco puro.

### 2.3. Cobre industrial

- **HEX:** `#D07838`
- **RGB:** `208, 120, 56`
- **Uso:** botones, enlaces, íconos, indicadores técnicos y llamadas a la acción.
- **Función visual:** representa el tono principal del isotipo y funciona como acento corporativo.

### 2.4. Naranja cobrizo

- **HEX:** `#F08840`
- **RGB:** `240, 136, 64`
- **Uso:** detalles, estados activos, gráficos y elementos que requieran mayor visibilidad.
- **Función visual:** variante más luminosa para destacar elementos puntuales.

## 3. Colores complementarios

### 3.1. Marrón grafito

- **HEX:** `#241D16`
- **Uso:** interior del isotipo, tarjetas oscuras y superficies secundarias.

### 3.2. Gris industrial

- **HEX:** `#343638`
- **Uso:** bordes, paneles, divisores y fondos alternativos.

### 3.3. Gris mineral

- **HEX:** `#A7A79B`
- **Uso:** textos secundarios y descripciones sobre fondos oscuros.

### 3.4. Marfil claro

- **HEX:** `#F5F4EA`
- **Uso:** fondos claros, documentos, fichas técnicas y áreas de lectura.

## 4. Tabla resumen de colores

| Nombre | HEX | RGB | Uso principal |
|---|---|---|---|
| Negro carbón | `#17191A` | `23, 25, 26` | Fondos principales |
| Marfil tecnológico | `#E8E8D8` | `232, 232, 216` | Logotipo, títulos y textos destacados |
| Cobre industrial | `#D07838` | `208, 120, 56` | Botones y elementos destacados |
| Naranja cobrizo | `#F08840` | `240, 136, 64` | Acentos luminosos y estados activos |
| Marrón grafito | `#241D16` | No especificado | Interior del isotipo y superficies oscuras |
| Gris industrial | `#343638` | No especificado | Bordes, paneles y divisores |
| Gris mineral | `#A7A79B` | No especificado | Textos secundarios |
| Marfil claro | `#F5F4EA` | No especificado | Fondos claros y documentos |

## 5. Distribución recomendada para la web

| Color | Aplicación | Proporción orientativa |
|---|---|---:|
| Negro carbón | Fondos principales | 50 % |
| Marfil tecnológico | Textos y títulos | 30 % |
| Cobre industrial | Botones y elementos destacados | 10 % |
| Gris industrial y gris mineral | Superficies y textos secundarios | 10 % |

Estas proporciones son una guía de diseño, no una especificación original del logotipo. Deben ajustarse según las necesidades de cada página o soporte.

## 6. Aplicación visual de referencia

Una composición de referencia para la marca puede utilizar:

- Fondo negro carbón `#17191A`.
- Nombre de marca en marfil tecnológico `#E8E8D8`.
- Punto final del logotipo en cobre industrial `#D07838`.
- Textos secundarios en gris mineral `#A7A79B`.
- Botones principales en cobre industrial `#D07838`, con texto negro carbón `#17191A`.
- Bordes y separadores en gris industrial `#343638`.

Texto de ejemplo para una interfaz:

**TAGSENSE.**  
*TECNOLOGÍA · IDENTIFICACIÓN · INDUSTRIA*

Botón de ejemplo: **Solicitar información técnica →**

Esta composición es una referencia visual; el texto descriptivo no constituye necesariamente un eslogan oficial de la marca.

## 7. Variables CSS oficiales de referencia

Las siguientes variables pueden incorporarse en proyectos desarrollados con Next.js, Astro.js o CSS convencional.

```css
:root {
  /* Colores corporativos TAGSENSE */
  --color-primary: #17191A;
  --color-secondary: #E8E8D8;
  --color-accent: #D07838;
  --color-accent-bright: #F08840;

  /* Colores complementarios */
  --color-graphite-brown: #241D16;
  --color-industrial-gray: #343638;
  --color-mineral-gray: #A7A79B;
  --color-ivory-light: #F5F4EA;

  /* Aplicación en la interfaz */
  --background: var(--color-primary);
  --foreground: var(--color-secondary);
  --button-background: var(--color-accent);
  --button-foreground: var(--color-primary);
  --border-color: var(--color-industrial-gray);
}
```

## 8. Recomendaciones de uso

1. Mantener el negro carbón y el marfil como base constante de la identidad.
2. Reservar el cobre industrial para acciones importantes, botones, enlaces e indicadores.
3. Utilizar el naranja cobrizo solo cuando se necesite un acento más luminoso.
4. Evitar incorporar azules eléctricos, verdes u otros colores que no formen parte de la paleta sin una decisión de marca expresa.
5. Priorizar colores planos en interfaces digitales para asegurar consistencia entre pantallas.
6. Reservar los efectos metálicos, reflejos y sombras para piezas gráficas donde aporten valor, sin depender de ellos para identificar los colores de la marca.
7. Revisar el contraste entre texto y fondo en cada componente, especialmente en textos pequeños y botones.
8. Usar los tonos complementarios para jerarquizar la información sin competir con el logotipo.

## 9. Resumen ejecutivo

La paleta de TAGSENSE combina una base oscura industrial con un marfil cálido y acentos cobrizos.

- **Color base:** `#17191A`
- **Color claro principal:** `#E8E8D8`
- **Acento corporativo:** `#D07838`
- **Acento luminoso:** `#F08840`

El resultado buscado es una identidad coherente, reconocible y profesional, con una estética tecnológica e industrial. Los valores se consideran una **paleta digital de referencia** basada en el material visual proporcionado; para definir una especificación de marca definitiva conviene validar los colores con los archivos originales del logotipo en formato vectorial.
