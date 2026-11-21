# S1 spike: SelfJev as a local Jev stand-in

Spike run 20.11.2026 on Jan's Mac (Apple M4, 24 GB, Docker Desktop arm64). Model: `hf.co/Jwuthrich/selfjev-4b-vision-GGUF:Q4_K_M` only, through `selfjev[ollama]==0.4.2`. Request: the spec's "Jev call" (`docs/specs/F1-profiling.md`), `state` = expected facts from the mock bank table + 5 quiz answers, questions verbatim.

**Verdict: the API is a drop-in match, the speed is not.** Every response passed the spec's acceptance rule and roles and life stages matched the fallback rules 5/5. One categorisation takes ~35 s on the M4 GPU and ~146 s on 4 CPU cores in Docker, against the spec's 4 s read timeout.

## Numbers

| run | customer | wall time | peak memory | schema ok | role | life stage | focus areas (noul ≥ 0.5) | fallback rules give |
|---|---|---|---|---|---|---|---|---|
| native (Metal) | lena | 34.8 s | 3.9 GB Ollama RSS | yes | novice 0.98 | student 0.90 | saving .97, debt .96, investing .82, risk .80 | novice, student, debt/saving/risk |
| native | tom | 35.5 s | 3.9 GB | yes | intermediate 0.94 | young-professional 0.98 | investing .70, risk .69 | intermediate, young-professional, investing |
| native | marco | 36.8 s | 3.9 GB | yes | intermediate 0.98 | family 0.99 | investing .87, saving .83, risk .78 | intermediate, family, saving |
| native | ingrid | 34.3 s | 3.9 GB | yes | advanced 0.99 | pre-retirement 0.94 | investing .67, risk .56 | advanced, pre-retirement, retirement |
| Docker CPU, 4 cores, 5 GB cap | tom | 146.0 s | 4.62 GiB of 5 GiB (`docker stats`) | yes | intermediate 0.93 | young-professional 0.97 | investing .69, risk .69 | intermediate, young-professional, investing |

- Docker ran Tom only: at ~146 s a customer and ~4 min server warm-up, all four would have blown the 60-minute time box. Tom's Docker answers match native to two decimals, so the quant behaves the same on CPU.
- Server start (`/health` answering): about 4 min in Docker, because `selfjev serve` warms up with ~50 model calls before it listens. Natively it took roughly one to two minutes (not timed exactly).
- Prompt processing in Docker: 35–46 tokens/s (llama.cpp log). Each request is ~510 input tokens.
- System free memory (`memory_pressure`) went from 44 % at the start to a low of **27 %** while the native model was loaded, below the 30 % limit set for this spike. I unloaded it, rechecked (61 %, the low reading was mmap page cache), and ran the four requests. The Docker run never dropped below 45 %.

### Do the answers make sense
- **Role and life stage**: 5/5 match the fallback rules, with probabilities ≥ 0.90.
- **Focus areas**: skewed. `focus_investing` and `focus_risk` come out ≥ 0.55 for everyone, `focus_retirement` never reaches 0.5. Ingrid (58, pre-retirement) gets no retirement focus (0.31), and Marco (tight family budget, 1–3 months of buffer) gets investing above saving. Tom looks right; Lena gets the expected debt and saving but also investing (0.82) despite two overdraft months. Rewording the five noul instructions is the first thing to try.

## Why it is slow
The Ollama engine scores one candidate per Ollama call: the request above makes 3 (role) + 4 (life stage) + 5 (noul) = 12 `/api/generate` calls. Each one re-processes the whole ~510-token state. The SelfJev docs claim Ollama's prefix cache shares the state between calls, but this model is a hybrid Qwen3.5 (recurrent layers), and llama.cpp logs `erased invalidated context checkpoint` and `cached n_tokens = 0` on every call. Native calls take 2–3.4 s each, so ~35 s a request. The single-pass "tree" engine that avoids this needs an NVIDIA GPU.

## Schema differences from Jev
- Same route (`POST /v1/systemone`, also `/v1/decisions`, `/api/alpha/decisions`), same answer shapes: `choice` with `choice`, `confidence`, `probabilities` (sum 1, keys = the criteria); `noul` with `noul`. Our acceptance rule passed on all 5 responses with no adapter code.
- Extra top-level `id` (`dec_…`). `model` is always `"selfjev-4b"`, whatever the request sends (`jev-latest` here); `Profile.model` stores it verbatim, which is what we want.
- `usage.output_tokens` is always 0.
- `state` as a JSON object works: SelfJev's compat layer turns it into JSON text. Our object-shaped `state` needs no change.
- Auth: no key needed unless the server sets `SELFJEV_API_KEYS`; our client already omits the header for a blank key. Note that with a blank key the spec skips the call only for the **default** base URL, so pointing `jev.base-url` at SelfJev does call it.
- `selfjev serve --engine ollama` sends `num_ctx = --max-length` (default 32768) with every call, overriding `OLLAMA_CONTEXT_LENGTH`. Pass `--max-length 8192`.
- The `[ollama]` extra is light (fastapi, uvicorn, httpx, pydantic, ~25 small wheels); no torch or CUDA. Python ≥ 3.12; 3.14 worked.
- The GGUF lists at 2.8 GB on the SelfJev site but pulls as 3.5 GB (`ollama list`), vision projector included.

## Go / no-go
- **(a) Teammates in Docker on CPU: no-go.** 146 s per categorisation on 4 M4 cores, 4.6 GiB used out of a 5 GiB cap, ~4 min to start, and the `ollama/ollama` image is 7.15 GB on disk. The loading screen's 10 s client timeout and the 4 s Jev read timeout would turn every call into a fallback.
- **(b) Oracle Ampere A1 (4 ARM cores, 24 GB, no GPU): no-go for a live call.** It runs the same CPU-only llama.cpp path as the Docker run; its Neoverse-N1 cores are slower per core than the M4's, so expect 146 s or more per request (estimated, not measured). Memory is not the problem: 24 GB holds it easily.
- **What does work**: native on a Mac, schema-valid, ~35 s. It could produce real model answers for the four fixed demo customers offline, to be replayed as recorded responses, if the team wants "real model output" in the demo without a TypeSafe key. That is a team call; the backend would then need a way to serve recorded responses, which the spec does not have today.

## Commands that worked
Scratch directory outside the repo; Ollama 0.40.16 from Homebrew.

```sh
OLLAMA_MAX_LOADED_MODELS=1 OLLAMA_NUM_PARALLEL=1 OLLAMA_KEEP_ALIVE=2m OLLAMA_CONTEXT_LENGTH=8192 ollama serve &
ollama pull hf.co/Jwuthrich/selfjev-4b-vision-GGUF:Q4_K_M        # ~25 min on this connection

python3 -m venv venv
venv/bin/pip install "selfjev[ollama]==0.4.2"
venv/bin/selfjev serve --engine ollama --ollama-model hf.co/Jwuthrich/selfjev-4b-vision-GGUF:Q4_K_M \
  --max-length 8192 --port 8000 &
curl -sf localhost:8000/health
```

Docker, reusing the downloaded model and the already present `ollama/ollama` image; SelfJev itself stayed on the host and pointed at the container:

```sh
docker run -d --name selfjev-spike --memory=5g --cpus=4 -p 127.0.0.1:11435:11434 \
  -v ~/.ollama/models:/root/.ollama/models:ro -e OLLAMA_NOPRUNE=1 \
  -e OLLAMA_MAX_LOADED_MODELS=1 -e OLLAMA_NUM_PARALLEL=1 -e OLLAMA_KEEP_ALIVE=2m -e OLLAMA_CONTEXT_LENGTH=8192 \
  ollama/ollama:latest
venv/bin/selfjev serve --engine ollama --ollama-model hf.co/Jwuthrich/selfjev-4b-vision-GGUF:Q4_K_M \
  --ollama-host http://127.0.0.1:11435 --max-length 8192 --port 8001 &
```

`OLLAMA_NOPRUNE=1` keeps Ollama from pruning blobs in the read-only mount at start-up.

Request (Tom; the other customers swap `facts` and `answers`, `questions` is the spec's block verbatim):

```sh
curl -s localhost:8000/v1/systemone -H 'Content-Type: application/json' -d '{
  "model": "jev-latest",
  "state": {
    "facts": {"ageBand": "26-34", "incomeBand": "3.5-5k", "cashBufferMonths": "6+", "savingsRate": "20%+",
              "savesRegularly": false, "overdraftMonths": 0, "holdsInvestments": false, "hasMortgage": false, "hasInsurance": false},
    "answers": [
      {"questionId": "q-emergency", "prompt": "How many months of spending should an emergency fund cover?", "answer": "3 to 6 months", "correct": true},
      {"questionId": "q-inflation", "prompt": "Your savings earn 1% while inflation is 3%. What happens to what your money can buy?", "answer": "It goes down", "correct": true},
      {"questionId": "q-diversify", "prompt": "Which is usually less risky: one company'"'"'s shares or a fund holding hundreds of companies?", "answer": "One company'"'"'s shares", "correct": false},
      {"questionId": "q-compound", "prompt": "You invest 100 EUR at 10% a year and leave the interest in. How much after 2 years?", "answer": "Exactly 120 EUR", "correct": false},
      {"questionId": "q-overdraft", "prompt": "What does an overdraft on your current account usually cost compared with a normal loan?", "answer": "More interest", "correct": true}]},
  "questions": { ... }
}'
```

Quiz scores used: Lena 1/5, Tom 3/5, Marco 3/5, Ingrid 5/5. The fallback-rule column above applies the spec's rules to those scores.

## Cleanup
Servers stopped, container `selfjev-spike` removed, venv deleted, model removed with `ollama rm` (no-go). The `ollama/ollama` image was already on the machine and stays. Free disk: 17 GB before, 20 GB after (other processes moved it between 15 and 26 GB during the run). Free memory: 44 % before, 53 % after.
