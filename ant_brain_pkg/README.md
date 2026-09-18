# ANTWIRE — Complete Computational Ant Brain / Agent Package

**Agent ID**: `Ant-6DCT`  
**Model Version**: `v1.0.0`  
**Package Format**: `2.0.0`  
**Profile**: `FULL_EXPERIMENT`  
**Species Profile**: `Formica rufa`  
**Created & Developed by**: **Nikhilesh H. Chavda**  
**Repository**: [https://github.com/Nik-2208/AntWire](https://github.com/Nik-2208/AntWire)  
**Profile**: [LinkedIn Profile](https://www.linkedin.com/in/nikhilesh-chavda-2b779533a/)

---

## 1. Scientific & Engineering Scope

> **Important Scientific Notice**:  
> This package is a complete export of the parameters and state represented by the AntWire computational model. It is not a complete export of every parameter of a living biological ant. Biological systems contain many variables that are unknown, species-specific, context-dependent, or not represented by this computational model.

This package represents a **complete, portable export of the AntWire artificial-ant computational organism**.
It distinguishes:
- `BIOLOGICALLY INSPIRED`: Neuropil anatomy, sensory tropotaxis, alternating tripod gait, response thresholds.
- `MODELLED`: Spiking neural networks, path integration accumulators, pheromone chemical diffusion.
- `LEARNED`: Trained neural network weights, associative memory tables, task preferences.
- `RUNTIME`: Membrane potentials, current goal state, dynamic energy levels.
- `METADATA`: Provenance, random seeds, hardware compatibility.

---

## 2. Package Architecture

```text
antbrain/
├── manifest.json              # Master package index & cryptographic checksums
├── biological_parameter_catalog.json # Scientific parameter honesty catalog
│
├── brain/
│   ├── architecture.json      # Network dimensions, activations, topology
│   ├── neurons.json           # Populated 3D neurons, resting potentials, transmitters
│   ├── synapses.json          # Directed synaptic edges, weights, delays
│   ├── regions.json           # Anatomical neuropil atlas (AL, MB, CX, SEZ, VNC)
│   ├── connectivity.json      # Connectivity graph statistics & sparsity
│   └── runtime_state.json     # Active potentials & working memory
│
├── learning/
│   ├── learned_parameters.json # Trained weight tensors (Input -> Hidden -> Output)
│   ├── optimizer_state.json   # Adam optimizer momentum, LR schedule
│   ├── normalization.json     # Sensory scaling statistics
│   ├── reward_config.json     # Explicit reward shaping matrix
│   └── training_state.json    # Step counters, return history
│
├── memory/
│   ├── long_term_memory.json  # Learned food and threat spatial caches
│   ├── learned_associations.json # Chemical-stimulus valence associations
│   ├── navigation_memory.json # Central complex path integration vector
│   └── task_memory.json       # Historical task duration & switches
│
├── sensors/
│   ├── sensor_config.json     # Dual antennae, polarization, mechanosensation
│   ├── sensory_mapping.json   # Observation vector index -> brain input
│   └── normalization.json     # Input clipping parameters
│
├── motor/
│   ├── motor_config.json      # Thoracic CPG, acceleration, turning limits
│   ├── action_space.json      # Discrete actions & continuous throttle/steering
│   └── movement_parameters.json # Tripodal phase timing & stride
│
├── body/
│   ├── morphology.json        # Body segments & appendages
│   ├── dimensions.json        # Morphometric mm proportions
│   ├── mass.json              # mg mass & 3x load carrying limit
│   ├── locomotion.json        # Tripod coordination pairs
│   └── physical_parameters.json # Thermal & energetic bounds
│
├── behavior/
│   ├── behavior_parameters.json # Exploration/exploitation balance
│   ├── exploration.json       # Levy flight / correlated random walk
│   ├── task_preferences.json  # Utility values for foraging, digging, nursing
│   └── role_preferences.json  # Caste switching thresholds
│
├── colony/
│   ├── communication_config.json # Antennation, trophallaxis, stridulation
│   ├── pheromone_config.json  # Evaporation rates & diffusion constants
│   ├── recruitment_parameters.json # Tandem running & recruitment radius
│   └── cooperation_parameters.json # Living bridges & multi-ant transport
│
├── experiments/
│   ├── training_config.json   # Training hyperparameter manifest
│   ├── evaluation_results.json # Measured benchmark results
│   ├── metrics.json           # Path efficiency, collision rate
│   └── seed.json              # Seed for deterministic replication
│
├── provenance/
│   ├── model_provenance.json  # Training history and lineage
│   ├── data_provenance.json   # Training curriculum
│   ├── biological_sources.json # Literature citations (DOI references)
│   └── software_versions.json # AntWire engine versions
│
└── README.md
```

---

## 3. How to Run & Verify

### In AntWire Browser Simulator
1. Open the AntWire simulation.
2. Navigate to **Training Lab** or **Colony**.
3. Click **LOAD ANT (.antbrain)**.
4. Select this `.antbrain` file.
5. The agent will be restored with 100% parameter fidelity into the simulation or training loop.

### Offline Standalone Python Execution
```bash
# Run closed-loop inference
python run_model.py

# Inspect connectome and biological catalog
python inspect.py

# Continue reinforcement learning
python train.py

# Simulate multi-agent cooperative swarm
python infer.py
```

## 4. Author & Attribution

**AntWire** is created and developed by **Nikhilesh H. Chavda**.  
All rights reserved / Open Ant Brain Research License.
