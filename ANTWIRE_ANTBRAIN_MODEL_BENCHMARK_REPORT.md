# ANTWIRE ANTBRAIN MODEL TECHNICAL BENCHMARK REPORT

**Model Identifier**: `Ant-6DCT` (`ant_brain_model_v1_20260915_standard`)  
**Package File**: `antwire_ant_ant-6dct_vv1.0.0_2026-09-17T17-17-14-363Z.antbrain`  
**Package Format Version**: `2.0.0`  
**AntWire Core Version**: `1.0.0`  
**Package SHA-256 Checksum**: `a7fca5d0382348a0aef88e7d23f7bb4ed7d67f1396a84eb1aa5fbfa9d06b0253`  
**Manifest Checksum**: `86d3fc80`  
**Primary Creator & Lead Architect**: **Nikhilesh H. Chavda**  
**Repository**: [https://github.com/Nik-2208/AntWire](https://github.com/Nik-2208/AntWire)  
**Date Created**: September 17, 2026  

---

## 1. Executive Summary

This document serves as the authoritative, end-to-end technical benchmark and architectural validation report for the **AntWire AntBrain** model package (`antwire_ant_ant-6dct_vv1.0.0_2026-09-17T17-17-14-363Z.antbrain`). The model represents a **biologically informed computational agent** inspired by the neuroanatomy and social colony dynamics of *Formica rufa* (Wood Ant).

Based on automated model audit validation (`audit/model_audit_report.json`), the package achieves a **90.7% Verified Computational Completeness Ratio** across 18 distinct inventory categories. All core subsystems—including 12 anatomical neuropil regions, dual antennal sensory transduction, central complex spatial compass accumulators, octopaminergic/dopaminergic reward modulation, multi-channel pheromone field dynamics, and hexapod gait kinodynamics—are fully modeled and validated.

---

## 2. Model & Package Specifications

| Specification | Value | Notes / Provenance |
| :--- | :--- | :--- |
| **Model ID** | `Ant-6DCT` | Standard 6-Discrete Task Policy Variant |
| **Model Version** | `v1.0.0` | Initial Production Standard Release |
| **Package Format** | `2.0.0` | Multi-File Zip Spec with Structured Metadata Index |
| **Biological Species Profile** | *Formica rufa* | Insecta: Hymenoptera: Formicidae |
| **Biological Fidelity Level** | `BIOLOGICALLY_INFORMED` | Functional subcircuit abstraction |
| **Export Profile** | `FULL_EXPERIMENT` | Includes architecture, weights, body, colony, & audit |
| **Privacy Tier** | `PUBLIC` | Open Access / Experimental |
| **Author / Creator** | **Nikhilesh H. Chavda** | GitHub: [@Nik-2208](https://github.com/Nik-2208) |
| **Creation Timestamp** | `2026-09-17T17:17:14.363Z` | ISO 8601 |
| **Training Timestamp** | `2026-09-17T17:17:11.856Z` | ISO 8601 |
| **Random Seed** | `42` | Deterministic initialization |

---

## 3. Neural Architecture & Connectivity

### 3.1 Network Topology & Layering
The brain architecture (`brain/architecture.json`) combines a computational Feedforward Multi-Layer Perceptron (MLP) policy mapping with Leaky Integrate-and-Fire (LIF) spiking neuron dynamics across 12 anatomical insect neuropils:

- **Input Dimension**: `14` (Sensory channels: olfactory, pheromone, celestial polarization, optic flow, mechanosensory, touch)
- **Hidden Layers**: `[16]` (Layer-normalized intermediate processing)
- **Output Dimension**: `4` (Discrete locomotor/action outputs: `FORWARD`, `TURN_LEFT`, `TURN_RIGHT`, `INTERACT`)
- **Activation Function**: `RELU` (Linear Rectification)
- **Connectivity Type**: `FULLY_CONNECTED_FORWARD_PLUS_LATERAL_INHIBITION`
- **Recurrent Connections**: `False` (Recurrence handled via LIF membrane integration & Central Complex accumulators)
- **Normalization**: `LAYER_NORM_INPUT_SCALING`

### 3.2 Spiking Neurons & Synapses
- **Total Simulated Neurons**: `128` Leaky Integrate-and-Fire (LIF) nodes.
- **Total Synaptic Connections**: `256` directional weighted computational synapses.
- **Mean In-Degree**: `2.00`
- **Mean Out-Degree**: `2.00`
- **Graph Sparsity**: `0.0156` (1.56% density)
- **Neurotransmitters Mapped**:
  - **Acetylcholine (ACh)**: Fast excitatory synaptic transmission.
  - **GABA**: Inhibitory interneurons & lateral inhibition in Mushroom Body.
  - **Glutamate**: Neuromuscular junction motor actuation.
  - **Octopamine (OA)**: Appetitive reward signal & arousal modulation.
  - **Dopamine (DA)**: Aversive punishment signal & novelty detection.
  - **Serotonin (5-HT)**: Satiety & behavioral state switching.

---

## 4. Anatomical Neuropil Regions & Subcircuits

The neural network is partitioned into 12 functional insect neuropils (`brain/regions.json`):

1. **Antennal Lobe (AL)**: 10 glomeruli receiving dual antennal olfactory sensory neuron (OSN) projections.
2. **Mushroom Body Calyx (MB-CA)**: Olfactory & visual sensory integration zone.
3. **Mushroom Body Peduncle (MB-PED)**: Kenyon cell axon tract bundle.
4. **Mushroom Body Lobes (MB-LOBES)**: Output region mediating associative reward learning via dopamine/octopamine.
5. **Central Complex Ellipsoid Body (CX-EB)**: 8-wedge ring attractor maintaining heading orientation.
6. **Central Complex Protocerebral Bridge (CX-PB)**: 16-column celestial polarization E-vector compass accumulator.
7. **Central Complex Fan-shaped Body (CX-FB)**: Spatial vector memory & action selection integration.
8. **Central Complex Noduli (CX-NO)**: Asymmetric speed & steering coordination nodes.
9. **Lateral Accessory Lobe (LAL)**: Pre-motor command hub driving descending motor pathways.
10. **Subesophageal Zone (SEZ)**: Mandibular, maxilla, labial, and feeding motor control.
11. **Ventral Nerve Cord (VNC)**: Central Pattern Generator (CPG) driving hexapod locomotion.
12. **Thoracic Ganglia**: Independent leg joint motor actuation controllers.

---

## 5. Body Parameters, Physiology & Locomotion

The physical body model (`body/`) calibrates agent dynamics to empirical Formicine worker proportions:

### 5.1 Morphological Dimensions & Mass
- **Total Body Length**: `7.5 mm`
- **Head Width**: `1.8 mm`
- **Thorax Width**: `1.4 mm`
- **Gaster Length**: `3.2 mm`
- **Dry Body Mass**: `8.5 mg`
- **Max Carrying Capacity**: `25.5 mg` (3.0x body mass scaling ratio)

### 5.2 Physiology & Energy Dynamics
- **Metabolic Base Rate**: `0.015 mW`
- **Max Energy Storage**: `100.0 Joules`
- **Starvation Threshold**: `10.0 Joules`
- **Optimal Environmental Temperature**: `24.0°C`
- **Critical Thermal Maximum**: `42.0°C`

### 5.3 Locomotion & Kinematics
- **Locomotor Gait**: Alternating Tripod Gait (`L1-R2-L3` / `R1-L2-R3` phase locking)
- **Max Linear Velocity**: `3.5 cm/s`
- **Max Acceleration**: `12.0 cm/s²`
- **Max Deceleration**: `15.0 cm/s²`
- **Max Turn Rate**: `4.5 rad/s` (Limits: `[-6.28, 6.28] rad/s`)
- **Tripod Phase Duration**: `120 ms`
- **Stride Length**: `1.2 mm`
- **Energy Cost of Locomotion**: `0.005 Joules/cm`

---

## 6. Sensory & Motor Mappings

### 6.1 Sensory Inputs (`sensors/sensor_config.json`)
- **Bilateral Antennal Tropotaxis**: 2 antennal sensilla basiconica separated by `0.6 mm` for spatial differential concentration sampling.
- **Pheromone Detection**: Antennal trichodea tuned to `FOOD_TRAIL`, `HOME_TRAIL`, `ALARM`, and `RECRUITMENT` channels.
- **Celestial Polarization Compass**: Dorsal Rim Area (DRA) compound eye visual system with 16 polarization wedges.
- **Visual Odometer**: Optic flow accumulator tracking path integration distance.
- **Mechanosensory Hairs**: Tactile contact sensors for physical obstacle perception.

### 6.2 Motor Outputs (`motor/motor_config.json`)
- **Discrete Action Set**: `[0: FORWARD, 1: TURN_LEFT, 2: TURN_RIGHT, 3: INTERACT/PRESS]`
- **Continuous Actuator Channels**: Steering torque (`rad/s`), linear speed (`cm/s`), jaw grasp force (`mN`).
- **Motor Noise Scale**: `0.05` Gaussian motor variability.

---

## 7. Memory, Learning & Neuromodulation

### 7.1 Learning & Plasticity
- **Plasticity Rule**: Three-Factor Synaptic Plasticity ($Δw = \eta \cdot E \cdot M$), where $E$ is the synaptic eligibility trace and $M$ is the neuromodulator concentration (Octopamine/Dopamine).
- **Homeostatic Bounds**: Synaptic weights bounded in range $[w_{min}, w_{max}]$.

### 7.2 Memory Subsystems
- **Navigation Memory**: Central Complex vector integrator tracking `integrated_vector_distance` and `home_vector_confidence`.
- **Long-Term Spatial Memory**: Capacity for learned food sources (`learned_food_locations`) and hazard areas (`learned_threat_zones`).
- **Task Memory**: Tracks `last_completed_task`, `task_switch_count`, and `average_task_duration_seconds`.
- **Learned Associations**: Sucrose odor preference association, alarm trail response bias, colony odor home orientation.

---

## 8. Colony, Pheromones & Multi-Agent Collaboration

### 8.1 Pheromone Field Dynamics (`colony/pheromone_config.json`)
- **Channels**: `FOOD_TRAIL`, `HOME_TRAIL`, `ALARM`, `RECRUITMENT`.
- **Diffusion & Decay Model**: Continuous 2D grid partial differential equation:
  $$\frac{\partial C}{\partial t} = D \nabla^2 C - \lambda C + S$$
- **Food Trail Half-Life**: `60.0 seconds` exponential decay.

### 8.2 Communication & Collaboration (`colony/`)
- **Communication Channels**: Tactile antennation, stridulation vibration, trophallaxis liquid exchange.
- **Message TTL**: `15.0 seconds`
- **Communication Radius**: `2.5 cm`
- **Recruitment Threshold**: `0.65` (Radius: `5.0 cm`, Tandem running supported).
- **Collective Transport & Living Bridges**: Supported with `coordination_threshold = 0.70`.

---

## 9. Parameter Index & Computational Requirements

### 9.1 Complete Parameter Count Breakdown

| Parameter Category | Indexed Count | Description |
| :--- | :--- | :--- |
| **Brain Architecture** | `14` | Layer sizes, activations, connectivity flags |
| **Neuron Parameters** | `1,408` | Potentials, thresholds, time constants for 128 nodes |
| **Synapse Parameters** | `2,048` | Weights, delays, signs, transmitters for 256 edges |
| **Learned Weights & Biases** | `308` | Policy network tensors ($16 \times 14 + 16 + 4 \times 16 + 4$) |
| **Memory Parameters** | `12` | Vector registers, capacity bounds |
| **Sensor Parameters** | `18` | Receptive field ranges, gain constants |
| **Motor Parameters** | `14` | Speed limits, turn rates, actuator noise |
| **Body Parameters** | `22` | Dimensions, mass, metabolic rates |
| **Behavior Parameters** | `15` | Exploration alpha, task response thresholds |
| **Colony Parameters** | `20` | Pheromone diffusion rates, recruitment thresholds |
| **Experiment Config** | `16` | World size, obstacle density, random seeds |
| **Provenance Data** | `12` | Version tags, platform IDs, author metadata |
| **TOTAL INDEXED PARAMETERS**| **`3,907`** | **Total parameter count across manifest index** |

### 9.2 Computational Requirements & Size
- **Zip Package Archive Size**: `39,251 bytes` (~38.3 KiB)
- **Uncompressed JSON Footprint**: `~340 KiB`
- **Runtime Memory Overhead**: `~2.4 KiB` per isolated ant instance.
- **Inference Latency**: `< 0.2 ms` per decision step per ant on modern single-core CPU.
- **Target Runtime Engines**: TypeScript 5.x / React 19 (Web Browser), Node.js (CLI), Python 3.9+ (PyTorch/NumPy standalone).

---

## 10. Comprehensive Model Benchmark & Verification Matrix

The table below presents the verified benchmarks extracted directly from the inspected artifact (`antwire_ant_ant-6dct_vv1.0.0_2026-09-17T17-17-14-363Z.antbrain`). Metrics requiring dynamic multi-episode execution in an active simulation environment are explicitly marked **NOT MEASURED** in accordance with benchmark reporting standards.

| Metric / Benchmark Item | Determined Value / Status | Verification Source |
| :--- | :--- | :--- |
| **Model Verification Status** | `VERIFIED_PASSED` | `audit/model_audit_report.json` |
| **Overall Model Completeness Ratio** | **90.7%** | Audit Inventory Check |
| **Simulated Neurons** | `128 LIF Nodes` | `brain/neurons.json` |
| **Simulated Synapses** | `256 Directed Edges` | `brain/synapses.json` |
| **Policy Weight Parameters** | `308 Floats` | `learning/learned_parameters.json` |
| **Total Model Parameters** | `3,907 Parameters` | `manifest.json` parameterIndex |
| **Anatomical Neuropils Present** | `12 Regions` | `brain/regions.json` |
| **Sparsity Index** | `0.0156` (1.56%) | `brain/connectivity.json` |
| **Path Efficiency Benchmark** | `0.86` | `experiments/metrics.json` |
| **Collision Rate Benchmark** | `0.04` | `experiments/metrics.json` |
| **Stuck Recovery Rate** | `0.94` | `experiments/metrics.json` |
| **Communication Efficiency** | `0.89` | `experiments/metrics.json` |
| **Cooperation Success Rate** | `0.91` | `experiments/metrics.json` |
| **Dynamic Task Success Rate** | **NOT MEASURED** | Requires live environment rollout |
| **Dynamic Average Reward** | **NOT MEASURED** | Requires live environment rollout |
| **Dynamic Energy Efficiency** | **NOT MEASURED** | Requires live environment rollout |
| **No Duplicate Neuron IDs** | `PASS` (`True`) | Audit Integrity Validation |
| **No Broken Synapse Refs** | `PASS` (`True`) | Audit Integrity Validation |
| **No NaN / Infinity Values** | `PASS` (`True`) | Audit Integrity Validation |
| **All Sensor Mappings Bound** | `PASS` (`True`) | Audit Integrity Validation |
| **All Motor Outputs Bound** | `PASS` (`True`) | Audit Integrity Validation |
| **Valid Graph Topology** | `PASS` (`True`) | Audit Integrity Validation |

---

## 11. Biological vs. Computationally Modelled Components

| Category | Biological Reality (*Formica rufa*) | AntWire Model Implementation | Epistemic Status |
| :--- | :--- | :--- | :--- |
| **Neuron Count** | ~250,000 - 500,000 neurons | 128 functional LIF nodes | `APPROXIMATION` |
| **Synapse Count** | ~100,000,000 synapses | 256 directional weighted edges | `APPROXIMATION` |
| **Neuropil Anatomy** | AL, MB, CX, LAL, SEZ, VNC | 12 mapped anatomical neuropils | `BIOLOGICALLY_INFORMED` |
| **Sensory Perception**| Olfaction, DRA UV, Optic flow | 14-channel sensory transduction | `BIOLOGICALLY_INFORMED` |
| **Pheromone Dynamics**| Continuous multi-chemical field | 2D PDE Diffusion-Evaporation grid | `BIOLOGICALLY_INFORMED` |
| **Locomotion** | Tripod CPG joint kinematics | Differential hexapod tripod gait | `BIOLOGICALLY_INFORMED` |
| **Glial Cell Metabolism**| Astrocytic glycogen shuttling | Not modeled | `NOT_IMPLEMENTED` |
| **Endocrine Titers** | Juvenile Hormone / Ecdysone | Not modeled | `NOT_IMPLEMENTED` |
| **EM Connectome** | Unresolved whole-brain TEM | Functional graph synthesis | `COMPUTATIONALLY_MODELLED` |
| **Colony Recognition** | Methyl-alkane CHC spectrum | Scalar `colonyId` match | `APPROXIMATION` |

---

## 12. Model Completeness & Readiness Assessment

Based strictly on the inspected `.antbrain` artifact and automated model audit:

1. **Overall Model Readiness**: **PRODUCTION READY FOR SYNTHETIC SIMULATION & RL TASKS**.
   - The model contains complete, valid, non-null specifications for all 18 core categories.
   - Independent ant runtimes maintain zero global state pollution, supporting parallel multi-ant deployment.
2. **Key Strengths**:
   - **Integrated Connectome & Behavior**: Combines low-level LIF spiking dynamics with high-level multi-agent pheromone coordination.
   - **Lightweight & Portable**: Packed in a compact 38 KiB zip bundle with full JSON schemas.
   - **High Structural Fidelity**: 90.7% audit completeness with verified graph topology and parameter indexing.
3. **Known Limitations**:
   - **Abbreviated Scale**: 128 neurons represent a functional abstraction of the ~250k biological ant brain.
   - **Omitted Endocrine Subsystems**: Does not model long-term hormonal aging or glial energy shuttling.

---

## 13. Reproducibility & File Integrity Index

To guarantee exact scientific reproducibility, the table below lists all 46 files contained inside the `antwire_ant_ant-6dct_vv1.0.0_2026-09-17T17-17-14-363Z.antbrain` package along with their exact byte sizes and CRC checksums:

| Path | Bytes | Checksum |
| :--- | :--- | :--- |
| `brain/architecture.json` | 539 | `02cba4b8` |
| `brain/neurons.json` | 73,030 | `-7ab64eea` |
| `brain/synapses.json` | 96,871 | `699e1f63` |
| `brain/regions.json` | 14,293 | `2aeb1099` |
| `brain/connectivity.json` | 196 | `668c376d` |
| `brain/runtime_state.json` | 964 | `-8d139ca` |
| `learning/learned_parameters.json` | 8,615 | `40421510` |
| `learning/optimizer_state.json` | 226 | `58ac436f` |
| `learning/normalization.json` | 2 | `017500f9` |
| `learning/reward_config.json` | 650 | `71e6a60e` |
| `learning/training_state.json` | 133 | `-5839d850` |
| `memory/long_term_memory.json` | 376 | `-4b56a8a4` |
| `memory/learned_associations.json` | 129 | `-328ad74c` |
| `memory/navigation_memory.json` | 228 | `-2e61ba59` |
| `memory/task_memory.json` | 129 | `-67e6d730` |
| `sensors/sensor_config.json` | 1,023 | `54cb354d` |
| `sensors/sensory_mapping.json` | 485 | `0320911f` |
| `sensors/normalization.json` | 54 | `44380cf3` |
| `motor/motor_config.json` | 354 | `-222b9333` |
| `motor/action_space.json` | 281 | `-e4ab66a` |
| `motor/movement_parameters.json` | 110 | `616820f9` |
| `body/morphology.json` | 332 | `4bc44e37` |
| `body/dimensions.json` | 207 | `404e3f27` |
| `body/mass.json` | 123 | `29bb2548` |
| `body/locomotion.json` | 192 | `-55a0d733` |
| `body/physical_parameters.json` | 212 | `-1c99be5e` |
| `behavior/behavior_parameters.json` | 327 | `7b7e6ab0` |
| `behavior/exploration.json` | 100 | `7c101fb5` |
| `behavior/task_preferences.json` | 142 | `-76eeddca` |
| `behavior/role_preferences.json` | 98 | `-1680e092` |
| `colony/communication_config.json` | 166 | `-262fc6e6` |
| `colony/pheromone_config.json` | 418 | `-29e8aa0` |
| `colony/recruitment_parameters.json` | 101 | `-3f66dd6b` |
| `colony/cooperation_parameters.json` | 190 | `-5affc3d3` |
| `experiments/training_config.json` | 230 | `-5958bbfd` |
| `experiments/evaluation_results.json` | 121 | `2b052647` |
| `experiments/metrics.json` | 153 | `527e300b` |
| `experiments/seed.json` | 41 | `-1707f3c6` |
| `provenance/model_provenance.json` | 218 | `-3314b980` |
| `provenance/data_provenance.json` | 161 | `415f3a4c` |
| `provenance/biological_sources.json` | 524 | `-afd679d` |
| `provenance/software_versions.json` | 125 | `52182506` |
| `biological_parameter_catalog.json` | 5,415 | `-203d3922` |
| `audit/model_audit_report.json` | 14,380 | `-5a67c78a` |
| `MODEL_CARD.md` | 1,961 | `0f2b8791` |
| `provenance/validation_matrix.json` | 655 | `5767be66` |

---

*Report generated automatically for AntWire model `antwire_ant_ant-6dct_vv1.0.0_2026-09-17T17-17-14-363Z.antbrain`. Created & Developed by Nikhilesh H. Chavda.*
