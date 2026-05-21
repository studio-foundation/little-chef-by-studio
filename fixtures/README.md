# Fixtures SSE

Fixtures de runs réels `recipe-developer` capturées pour le replay frontend.

## Structure

Chaque fichier `runs/<id>-<slug>.json` contient :

- `id` — numéro du run (01–10)
- `slug` — identifiant lisible
- `input` — l'input envoyé au pipeline
- `captured_at` — date de capture (ISO 8601)
- `duration_ms` — durée totale du run
- `events` — séquence d'events SSE avec timestamps relatifs (`offset_ms`)

### Types d'events

| event | Description |
|-------|-------------|
| `pipeline_start` | Début du run |
| `stage_start` | Début d'un stage |
| `stage_context` | Contexte injecté dans le stage |
| `stage_complete` | Fin d'un stage (avec status et durée) |
| `pipeline_complete` | Fin du run |

## Recapturer une fixture

Prérequis : clés API dans `.studio/config.yaml` (Anthropic + Tavily).

```bash
# Recapturer toutes les fixtures
npx tsx scripts/capture-fixture.ts

# Recapturer uniquement la fixture #3
npx tsx scripts/capture-fixture.ts --only=3

# Recapturer plusieurs fixtures
npx tsx scripts/capture-fixture.ts --only=1,5,9
```

Coût estimé : ~0.50–1 $ par run (modèle Anthropic + recherche Tavily).

## Format complet d'une fixture

```json
{
  "id": "01",
  "slug": "pad-thai-vegan",
  "input": {
    "dish_name": "Pad Thai vegan",
    "constraints": ["sans produits animaux", "temps de préparation max 30 minutes", "pour 4 personnes"]
  },
  "captured_at": "2026-05-20T14:30:00.000Z",
  "duration_ms": 45231,
  "events": [
    { "offset_ms": 0, "event": "pipeline_start", "pipeline_name": "recipe-developer" },
    { "offset_ms": 120, "event": "stage_start", "stage_name": "culinary-research", "stage_index": 0, "total_stages": 7, "max_attempts": 3 },
    { "offset_ms": 8400, "event": "stage_complete", "stage_name": "culinary-research", "status": "success", "duration_ms": 8280 }
  ]
}
```
