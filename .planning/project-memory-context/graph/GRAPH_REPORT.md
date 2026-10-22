# Graph Report - mosapro  (2026-10-22)

## Corpus Check
- 50 files · ~34,676 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 258 nodes · 494 edges · 21 communities (17 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `666b2fa0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]

## God Nodes (most connected - your core abstractions)
1. `getPool()` - 22 edges
2. `ensureDbInitialized()` - 21 edges
3. `compilerOptions` - 16 edges
4. `getAuthenticatedSessionUser()` - 16 edges
5. `getActiveSurveySchema()` - 11 edges
6. `getAllSurveyResponses()` - 9 edges
7. `getAllContactSubmissions()` - 9 edges
8. `authenticateUserAccount()` - 8 edges
9. `listAllUsers()` - 8 edges
10. `flushOfflineQueues()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `getActiveSurveySchema()`  [EXTRACTED]
  src/app/api/v1/survey/route.ts → src/lib/db/postgres.ts
- `GET()` --calls--> `getAuthenticatedSessionUser()`  [EXTRACTED]
  src/app/api/v1/admin/export/route.ts → src/lib/auth/auth.ts
- `GET()` --calls--> `getAuthenticatedSessionUser()`  [EXTRACTED]
  src/app/api/v1/admin/stats/route.ts → src/lib/auth/auth.ts
- `GET()` --calls--> `getAuthenticatedSessionUser()`  [EXTRACTED]
  src/app/api/v1/admin/survey/route.ts → src/lib/auth/auth.ts
- `PUT()` --calls--> `getAuthenticatedSessionUser()`  [EXTRACTED]
  src/app/api/v1/admin/survey/route.ts → src/lib/auth/auth.ts

## Communities (21 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (29): dependencies, lucide-react, next, pg, react, react-dom, xlsx, zod (+21 more)

### Community 1 - "Community 1"
Cohesion: 0.13
Nodes (26): deleteTestUsersByEmailPrefix(), getUserById(), corsHeaders, POST(), ensureDbInitialized(), getPool(), BatchSyncResult, deleteTestRecordsByPrefix() (+18 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 3 - "Community 3"
Cohesion: 0.14
Nodes (19): MosaproUser, HospitalServiceCombobox(), HospitalServiceComboboxProps, ensureDatabaseExists(), getActiveSurveySchema(), updateActiveSurveySchema(), StoredContactSubmission, SurveyStatsSummary (+11 more)

### Community 4 - "Community 4"
Cohesion: 0.15
Nodes (13): getMunicipiosByRegion(), MunicipioPBA, MUNICIPIOS_PBA, normalizeRegionCode(), REGION_MUNICIPIOS_MAP, REGIONES_SANITARIAS, RegionSanitaria, MunicipioAutocomplete() (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.17
Nodes (17): approveUserAccount(), authenticateUserAccount(), deleteUserAccount(), getAuthenticatedSessionUser(), getAuthSecret(), hashPassword(), listAllUsers(), registerUserAccount() (+9 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (24): MosaproHeader(), MosaproHeaderProps, PriorityGrid(), PriorityGridProps, RANKS, BUILTIN_QUESTION_IDS, SurveyWizard(), SurveyWizardProps (+16 more)

### Community 7 - "Community 7"
Cohesion: 0.20
Nodes (10): EMBEDDING_DIMENSIONS, EMBEDDING_MODEL, EMBEDDING_POOLING, MEMORY_DB_PATH, PMC_PROJECT_ROOT, npx, @aabadin/agent-memory-mcp, @aabadin/project-memory-context (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.25
Nodes (8): EMBEDDING_CACHE_PATH, MEMORY_DB_PATH, PMC_PROJECT_ROOT, npx, @aabadin/agent-memory-mcp, @aabadin/project-memory-context, agent-memory, pmc-query

### Community 9 - "Community 9"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, lang, name, short_name, start_url (+1 more)

### Community 10 - "Community 10"
Cohesion: 0.29
Nodes (6): CLI Reference, Files, How It Works, PMC Setup Guide, Quick Start, Requirements

### Community 11 - "Community 11"
Cohesion: 0.33
Nodes (5): Contract, Loading protocol, Skill Registry — mosapro, Skills, Sources scanned

### Community 12 - "Community 12"
Cohesion: 0.50
Nodes (3): Log, Specs, Tasks

## Knowledge Gaps
- **98 isolated node(s):** `@aabadin/agent-memory-mcp`, `MEMORY_DB_PATH`, `EMBEDDING_CACHE_PATH`, `@aabadin/project-memory-context`, `PMC_PROJECT_ROOT` (+93 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getPool()` connect `Community 1` to `Community 3`, `Community 5`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `ensureDbInitialized()` connect `Community 1` to `Community 3`, `Community 5`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `getAuthenticatedSessionUser()` connect `Community 5` to `Community 1`, `Community 3`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `@aabadin/agent-memory-mcp`, `MEMORY_DB_PATH`, `EMBEDDING_CACHE_PATH` to the rest of the system?**
  _98 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.12685560053981107 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._