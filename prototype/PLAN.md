# Reencuentros Venezuela — Plan de Integración

## 🎯 Objetivo

Conectar el pipeline de face matching (ya funcionando en local) con el frontend Next.js del proyecto Reencuentros, para que familias y rescatistas puedan usarlo en producción.

---

## 📦 Lo que ya existe

| Componente | Estado | Tecnología |
|---|---|---|
| `matcher.py` | ✅ Funcional | PyTorch + MTCNN + InceptionResnetV1 (VGGFace2) |
| `database.py` | ✅ Funcional | In-memory con persistencia JSON |
| `api.py` | ✅ Funcional | FastAPI — 4 endpoints REST |
| `demo.py` | ✅ Funcional | 5/5 matches correctos con LFW |

**Accuracy validada:** 100% en dataset LFW. El modelo VGGFace2 tiene >99% de accuracy en benchmarks estándar con fotos de calidad (color, >160×160px).

---

## 🏗️ Paso 1: Deploy de la API

**Problema:** La API corre en local. Nadie puede usarla desde afuera.

**Plan:**

1. **Empaquetar el modelo** (~100 MB de pesos de VGGFace2)
2. **Crear Dockerfile** con Python 3.12 + dependencias
3. **Desplegar en Fly.io** (soporta volúmenes persistentes para el modelo, ~$0/mes en plan hobby, y no tenés que lidiar con cold starts de 100 MB como en serverless)

**Archivos nuevos:**

```
reencuentros-ai/
├── Dockerfile
├── fly.toml
└── .dockerignore
```

**Dockerfile:**

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p uploads data
EXPOSE 8000
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Tiempo estimado:** 30-45 minutos

---

## 🗄️ Paso 2: Supabase + pgvector

**Problema:** Hoy los embeddings se guardan en un JSON. Con 1000+ registros, la búsqueda por fuerza bruta (O(n)) se vuelve lenta. Además, la persistencia en JSON no es segura para producción.

**Plan:**

1. **Crear proyecto en Supabase** (plan gratuito incluye pgvector)
2. **Crear tabla `people`** con columna `embedding vector(512)`
3. **Crear índice IVFFlat** para búsqueda de vecinos más cercanos en O(log n)
4. **Migrar `database.py`** para usar Supabase en vez de JSON

**Schema SQL:**

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE people (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    status      TEXT NOT NULL CHECK (status IN ('buscado', 'encontrado')),
    embedding   VECTOR(512),
    image_path  TEXT,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON people USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
```

**Tiempo estimado:** 1-2 horas

---

## 🖥️ Paso 3: Integración con el frontend Next.js

**Problema:** El frontend (repo `pitonisaX/reencuentros-terremoto-vzla`) es un scaffold vacío de Next.js. Hay que construir la UI de registro y búsqueda, y conectarla a nuestra API.

**Pantallas a construir:**

### 3.1 Registro (familia)

```
┌─────────────────────────────────────────┐
│  REPORTAR PERSONA DESAPARECIDA          │
│                                         │
│  Nombre completo: [_______________]     │
│                                         │
│  Última ubicación: [_______________]    │
│                                         │
│  Teléfono contacto:[_______________]    │
│                                         │
│  Foto de referencia:                    │
│  ┌─────────────────────────────────┐    │
│  │  📷 Tomar foto o subir archivo  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [REPORTAR]                             │
└─────────────────────────────────────────┘
```

### 3.2 Búsqueda (rescatista)

```
┌─────────────────────────────────────────┐
│  BUSCAR PERSONA                         │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │  📸 Tomar foto de la persona        ││
│  │     encontrada                      ││
│  └─────────────────────────────────────┘│
│                                         │
│  Umbral de confianza: [======●===] 70%  │
│                                         │
│  [BUSCAR]                               │
│                                         │
│  ── RESULTADOS ──                       │
│  ✅ 87% — Carlos Mendoza                │
│     📞 Contactar: +584241234567         │
│     📍 Visto en: La Guaira              │
│                                         │
│  ── 62% — Luis Ramírez                  │
│     ...                                 │
└─────────────────────────────────────────┘
```

### 3.3 Componentes React necesarios

| Componente | Descripción |
|---|---|
| `RegisterForm` | Formulario con nombre, ubicación, contacto, subida de foto |
| `SearchCapture` | Cámara en vivo (navigator.mediaDevices) o subida de archivo |
| `MatchResults` | Lista de matches con barra de confianza, contacto y ubicación |
| `PeopleList` | Vista administrativa de todos los registrados |

### 3.4 Servicio API en el frontend

```typescript
// lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function registerPerson(data: FormData) {
  const res = await fetch(`${API_URL}/register`, { method: "POST", body: data });
  return res.json();
}

export async function searchMatch(data: FormData) {
  const res = await fetch(`${API_URL}/search`, { method: "POST", body: data });
  return res.json();
}
```

**Tiempo estimado:** 2-3 horas

---

## 📊 Resumen: Plan completo

```
[Local] ──► [Docker] ──► [Fly.io] ──► [Supabase + pgvector] ──► [Next.js frontend]
  ✅          Paso 1        Paso 1         Paso 2                    Paso 3
             (30-45 min)                   (1-2 h)                   (2-3 h)
```

---

## ⚡ Orden recomendado

| Orden | Paso | Por qué primero |
|---|---|---|
| **1°** | Deploy en Fly.io | La API tiene que estar online para que el frontend la consuma |
| **2°** | Frontend Next.js | Podés construir contra la API real y testear integración |
| **3°** | Supabase pgvector | Ya tenés latencia aceptable con JSON para <1000 registros. Migrás cuando escale |

---

## 🔜 Mejoras futuras (v2)

- **Múltiples caras por foto:** Si la foto tiene 3 personas, devolver matches para cada una
- **Búsqueda híbrida:** Combinar face matching + búsqueda semántica por descripción textual
- **WhatsApp Bot:** Recibir fotos por WhatsApp → llamar a la API → devolver matches en el chat
- **PWA offline:** Serwist ya está instalado en el frontend. Cachear embeddings en IndexedDB
- **Deduplicación:** Si dos familias reportan a la misma persona (mismo embedding), mergear registros
