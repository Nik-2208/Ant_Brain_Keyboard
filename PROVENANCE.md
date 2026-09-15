# ANT BRAIN — MODEL & DATA PROVENANCE

## Overview

This document describes the origin, creation, transformation, and scientific positioning of the model data and simulation assets used in **ANT BRAIN**.

---

## 🧠 Model Definition: `ant_brain_model_v1_20260915_standard`

- **Model Identifier**: `ant_brain_model_v1_20260915_standard`
- **Creator / Maintainer**: Nikhilesh H. Chavda
- **Classification**: Project-developed computational model.
- **Node Count**: 128 Leaky Integrate-and-Fire (LIF) modeled neuron definitions mapped across 16 neuropil region abstractions.
- **Synapse Count**: 256/512 modeled synaptic transmission connections with directional weights and transmission delays.
- **3D Embedding**: Modelled anatomical coordinate mapping inspired by *Formica rufa* insect neuropil layout.

---

## 🧬 Biological Integrity & Scientific Disclaimer

1. **Modelled Abstraction**: `ant_brain_model_v1_20260915_standard` is a **biologically informed computational abstraction**, not a direct reconstruction or scan of a biological ant connectome.
2. **No Claim of Biological Connectome Reconstruction**: The model nodes and weights were generated and trained via computational multi-agent reinforcement learning and LIF spiking formulations for engineering experiments.
3. **No Direct Biological Data Scanning**: No biological ant brain tissue scans or electron-microscopy connectome datasets were directly copied into this repository.

---

## 🛠️ Transformations & Adaptation History

- **Maze Baseline Weights (`original_413_step_policy.json`)**: Initial policy weights trained on spatial navigation tasks.
- **Keyboard Adaptation Checkpoint (`keyboard_ant_policy.json`)**: Adapted policy weights for discrete 3D spatial target key interactions.
- **Multi-Agent Execution**: Each ant in the simulation executes a dedicated, isolated LIF brain runtime state (`SimAntAgent.brain`) instantiated from `ant_brain_model_v1_20260915_standard`.

---

## 📄 License & Attribution

- **Original Project Model**: Created and developed by Nikhilesh H. Chavda. Released under the [MIT License](LICENSE).
- **AI Development Tools**: AI coding assistants may have been utilized as development and formatting tools during implementation. Project architecture, concept, experimentation, code validation, and responsibility belong to Nikhilesh H. Chavda.
