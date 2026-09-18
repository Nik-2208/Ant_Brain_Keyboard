# ANTWIRE MODEL CARD: FORAGE Policy Trained_AntWire_Brain_Step_0

## 1. Model Details
- **Model Identifier**: `Ant-6DCT`
- **Model Version**: `v1.0.0`
- **Model Architecture**: Multi-Neuropil Biologically Informed Connectome (AL, MB, CX, LAL, SEZ, VNC)
- **Profile**: `FULL_EXPERIMENT`
- **Author & Developer**: **Nikhilesh H. Chavda**
- **GitHub**: [https://github.com/Nik-2208](https://github.com/Nik-2208)
- **LinkedIn**: [https://www.linkedin.com/in/nikhilesh-chavda-2b779533a/](https://www.linkedin.com/in/nikhilesh-chavda-2b779533a/)
- **License**: MIT / Open Ant Neuroscience Model License
- **Copyright**: © 2026 Nikhilesh H. Chavda

## 2. Intended Use
- **Primary Use**: Computational insect neuroscience research, biological agent simulations, collective foraging benchmarks, and embodied multi-agent reinforcement learning.
- **Out-of-Scope**: Do NOT claim this is an experimentally measured full biological ant connectome. AntWire uses FlyWire as an architectural/visualization inspiration, not a claim of biological equivalence.

## 3. Scientific Fidelity & Evidence Tiers
This model explicitly separates:
- `BIOLOGICALLY MEASURED`: Microglomerular volumes (*Ooceraea biroi* volume EM).
- `BIOLOGICALLY INFORMED`: Central Complex 16-wedge ring attractor & Mushroom Body sparse Kenyon cells.
- `COMPUTATIONALLY MODELLED`: Tripodal locomotion kinematic mapping and abstract trail reaction-diffusion.
- `LEARNED`: Synaptic plasticity weights modulated by Octopamine (Reward) and Dopamine (Punishment).

## 4. Neuron & Synaptic Dynamics
- **Neuron Model**: Leaky Integrate-and-Fire with Spike-Frequency Adaptation (LIF-A) & Rate-coded Continuous Transduction.
- **Synaptic Rules**: 3-Factor Neuromodulated STDP with eligibility traces.
- **Parameter Categories**: `TRAINABLE`, `FROZEN`, `STRUCTURAL`, `DERIVED`, `BIOLOGICALLY_CONSTRAINED`.

## 5. Quantitative Metrics
- **Mean Reward**: 0.00
- **Task Success Rate**: 0.0%
- **Episodes Completed**: 30
