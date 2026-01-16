# AI Copilot Instructions for Contains Studio Projects

This workspace contains **two distinct projects** that should be treated separately:

## Project Overview

### 1. **Contains Studio Dashboard** (Frontend)
- **Purpose**: Interactive AI Agent interface with department-based UI
- **Tech**: React 18, Vite, Tailwind CSS, Vercel deployment
- **Root**: `src/` and frontend config files

### 2. **Claude Code Usage Monitor** (Python CLI Tool)
- **Purpose**: Real-time terminal monitoring for Claude Code token usage with ML predictions
- **Tech**: Python 3.9+, Rich UI library, Pydantic validation, threading
- **Root**: `Claude-Code-Usage-Monitor/`

---

## Architecture & Key Patterns

### Dashboard Architecture (React)
- **Single-file component**: `App.jsx` (497 lines) - all logic in one component
- **Department structure**: 8 departments with agent definitions (Engineering, Design, Marketing, etc.)
- **State management**: `localStorage` for user session tracking (free analysis count, premium status)
- **Payment integration**: Stripe payment wall component for premium features
- **API integration**: Vercel serverless function (`api/chat.js`) calls Google Gemini API
- **Styling**: Tailwind CSS with gradient backgrounds and glass-morphism effects

**When modifying the dashboard**:
- Department data is statically defined in `App.jsx` - changes require React rebuild
- Agent payment wall shows after 3 free analyses
- All Agent configurations (name, title, description) flow to API for system prompts

### Claude Monitor Architecture (Python)
**Key principle**: Single Responsibility Principle (SRP) - each module has one clear purpose.

**Core layers**:
1. **CLI Layer** (`cli/main.py`): Argument parsing, workflow orchestration
2. **Monitoring Layer** (`monitoring/orchestrator.py`): Thread-based monitoring loop, callback registration
3. **Data Layer** (`data/`): Session aggregation, analysis, and token calculations
4. **UI Layer** (`ui/`): Rich terminal display with color-coded progress bars
5. **Core Models** (`core/models.py`): Pydantic dataclasses for type safety

**Data flow**:
- Claude writes usage data to `~/.claude/projects/*/conversations` (discovered via `discover_claude_data_paths()`)
- `DataManager` reads and caches this data
- `SessionMonitor` detects session boundaries (5-hour blocks, gaps)
- `UsageAggregator` computes totals, burn rates, and projections
- `DisplayController` renders real-time updates via Rich

**When extending the monitor**:
- Extend `SessionBlock` model in `core/models.py` for new metrics
- Register callbacks via `MonitoringOrchestrator.register_update_callback()`
- New token limit plans belong in `core/plans.py`
- Add tests to `src/tests/` - the project maintains 100+ test cases

---

## Developer Workflows

### Frontend Development
```bash
npm install          # Install dependencies
npm run dev         # Start Vite dev server (http://localhost:5173)
npm run build       # Production build (outputs to dist/)
vercel              # Deploy to Vercel (auto-detects vite.config.js)
```

### Python CLI Development
```bash
cd Claude-Code-Usage-Monitor
pip install -e .                    # Editable install for development
python -m claude_monitor --help     # Check CLI help
python -m pytest src/tests/         # Run all tests
python -m pytest src/tests/ -v      # Verbose test output
```

### Building Claude Monitor
- Uses `setuptools` (pyproject.toml defines build system)
- PyPI package: `claude-monitor` (installed via `pip install claude-monitor`)
- CLI entry point: `python -m claude_monitor` or `cmonitor` command

---

## Project-Specific Conventions

### Frontend
- **Localization**: All text strings are in Traditional Chinese with English fallbacks
- **Component structure**: No component extraction - single monolithic App.jsx
- **Event tracking**: Free tier limited to 3 analyses (tracked in localStorage)
- **Color scheme**: Gradient colors per department (Engineering=blue, Design=purple, Marketing=orange, etc.)
- **API contracts**: Gemini API expects `contents` array with `role: 'user'` format

### Claude Monitor
- **Models are immutable**: Use `@dataclass` from `core/models.py`, never modify after creation
- **Session blocks**: Always 5-hour windows; identified by `SessionBlock.id` (string)
- **Token types**: Always track separately: `input_tokens`, `output_tokens`, `cache_creation_tokens`, `cache_read_tokens`
- **Callbacks**: Async via `register_update_callback()` - use for real-time UI updates
- **Configuration**: `Settings` class uses `pydantic-settings` for environment-based config
- **Timezone handling**: Auto-detected system timezone; see `utils/timezone.py`

---

## Critical Integration Points

### Frontend-to-Backend
- **API endpoint**: `POST /api/chat` (Vercel serverless)
- **Request body**: `{ message, agentName, agentTitle, agentDesc }`
- **Response format**: Gemini API returns `candidates[0].content.parts[0].text`
- **Error handling**: API returns 400/500 with `{ error: string }` on failure

### Claude Monitor Data Discovery
- **Data paths**: Scanned from `~/.claude/projects/` (macOS/Linux) or environment-configured
- **File format**: JSON files in `conversations/` subdirectories
- **Cache TTL**: 5 seconds (configurable in `DataManager` constructor)

---

## Testing Patterns

**Frontend**: No automated tests currently (all manual or Vercel preview deployments).

**Claude Monitor**: Comprehensive test suite with patterns:
```python
# Tests live in src/tests/
# Run via: python -m pytest src/tests/test_*.py

# Mocking pattern:
from unittest.mock import patch, MagicMock
@patch('claude_monitor.data.reader.Path.expanduser')
def test_example(mock_path):
    mock_path.return_value.resolve.return_value = Path('/mock')
```

---

## When Adding Features

- **Frontend feature**: Edit `App.jsx`, rebuild with `npm run build`, deploy to Vercel
- **Monitor feature**: Create new class in appropriate `src/claude_monitor/` module, add tests, update imports in `__init__.py`
- **New plan type**: Add to `Plans` enum in `core/plans.py` and update `get_token_limit()` logic
- **New metric**: Extend `SessionBlock` dataclass with field, update aggregators, register UI callback

---

## Debugging Tips

**Frontend**: Use browser DevTools; check `localStorage` for premium status (`localStorage.getItem('isPaid')`)

**Claude Monitor**: 
- Enable logging: Set `CLAUDE_MONITOR_LOG_LEVEL=DEBUG`
- Check data paths: Run `python -m claude_monitor discover` (if available)
- Verify session blocks: Inspect `SessionMonitor._session_map` internals
- Mock file I/O in tests with `@patch('builtins.open')`
