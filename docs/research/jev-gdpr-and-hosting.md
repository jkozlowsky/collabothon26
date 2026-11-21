# Jev: GDPR and self-hosting options

Research note, 20.11.2026. Decision for now: keep the hosted TypeSafe Jev API (spec `docs/specs/F1-profiling.md`); revisit when production or the pitch needs it. Switching provider is one property: `jev.base-url`.

## Hosted Jev (TypeSafe AI)
- **Hosted only.** No published weights, no self-hosting or on-prem page in the docs. The enterprise FAQ asks "Can we run Jev in our own VPC or on-premises?"; its answer did not render, so ask TypeSafe directly.
- **DPA**: EU SCCs (Module 2, Module 3 where relevant), Irish law, UK addendum, breach notice within 72 h, audits once per 12 months. It applies only once the customer agreement is signed. Retention: "as long as necessary".
- **Retention and training**: zero data retention only for enterprise customers; TypeSafe states it does not train on customer inputs. A SOC 2 Type II report is available on request via the Trust Center.
- **Region**: no EU region found. The SCCs imply a third-country transfer; secondary sources say US West Coast.

## GDPR reading for us
- **Demo**: personas are fictional, so no personal data is processed.
- **Production**: legal with a legal basis (consent naming TypeSafe AI and the profiling, already in the spec), a signed DPA, and SCCs for the transfer. Art. 22 most likely does not apply, since the profile only picks lessons and has no legal or similarly significant effect. Transparency about profiling (Art. 13(2)(f)) still applies.
- **Cheap hardening if needed**: data minimisation in Jev's `state`. Send bands instead of raw amounts (age 55–64, income 3–5k, savings > 50k) and product flags, never a name or id.

## Self-hostable, Jev-compatible alternatives (same `/v1/systemone` shape: `noul` / `choice` / `score`)
| option | license | Apple Silicon | quality (vendor or author claims) |
|---|---|---|---|
| Cloudflare Clef (27B) / clef-flash (9B) | Apache 2.0, weights on Hugging Face | no documented path; documented runtimes are NVIDIA (SGLang in Docker, Transformers on CUDA) | best documented; "fully Jev-API compatible" |
| SelfJev (4B) | Apache 2.0 (maker's claim) | yes, via Ollama (GGUF 2.8–4.6 GB) | 96.1% vs Jev 97.2% on its own test set; Jev route not verified |
| jeff (GLiFormer 400M) | MIT | yes (MPS); `/v1/systemone` per README | clearly weaker: 75.5% vs 90.5% on AG News (author's benchmark) |

Hosted Clef on Cloudflare Workers AI has zero data retention but a different endpoint (`/ai/run/@cf/cloudflare/clef`) and no documented region pinning.

Not verified: Bevel "eu/jev" (Germany-hosted, Jev-compatible), the SelfJev GitHub license, TypeSafe's subprocessor list.

## Pitch line
"In production the decision model runs in the bank's own datacenter (Clef, Apache 2.0, same API). Switching is one configuration property."

## Sources
- TypeSafe: https://typesafe.ai/enterprise, https://typesafe.ai/legal/data-processing, https://docs.typesafe.ai/legal.md, https://docs.typesafe.ai/llms.txt
- Cloudflare: https://blog.cloudflare.com/clef-decision-models/, https://huggingface.co/Cloudflare/clef, https://huggingface.co/Cloudflare/clef-flash, https://developers.cloudflare.com/workers-ai/models/clef/
- SelfJev: https://www.selfjev.dev/docs/ollama/, https://www.producthunt.com/posts/selfjev
- jeff: https://github.com/logan-markewich/jeff
- Secondary: https://innfactory.ai/en/ai-models/typesafe-jev/, https://horadecodar.com.br/?p=47570, https://levelup.gitconnected.com/the-risks-of-using-jev-ai-in-enterprise-software-5d39ffc72842
