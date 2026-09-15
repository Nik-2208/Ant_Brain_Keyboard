# CHANGELOG

All notable changes to **ANT BRAIN** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v0.1.0] — 2026-09-15

### Added
- Initial experimental open-source release of **ANT BRAIN**.
- Created and developed by **Nikhilesh H. Chavda**.
- 3D WebGL Multi-Agent & Parallel Keypad Simulation powered by Three.js.
- Executable Leaky Integrate-and-Fire (LIF) spiking neural network runtime (`ant_brain_model_v1_20260915_standard`).
- Decentralized Adaptive Ant Colony Architecture with local utility evaluation, dynamic roles (`FORAGER`, `EXPLORER`, `BUILDER`, etc.), and negotiation.
- Pheromone Stigmergy Engine (`PheromoneField`) with continuous exponential decay across `FOOD`, `HOME`, `RECRUITMENT`, `DANGER`, `EXPLORE`, and `TASK` channels.
- Local range-filtered messaging channel (`ColonyCommunicationChannel`) with expiring TTLs.
- Authoritative per-ant isolated reward engine (`AuthoritativeRewardEngine`).
- Real-time Observability Hub & "Why is this ant doing this?" Intent Inspector.
