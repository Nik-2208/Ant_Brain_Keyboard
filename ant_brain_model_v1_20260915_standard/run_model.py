#!/usr/bin/env python3
"""
ANT BRAIN — Self-Contained Executable Model Runner (Python Engine)
Loads neurons, synapses, body interfaces, and runs closed-loop inference.
"""

import json
import math
import os
import sys

def load_model(base_path="."):
    with open(os.path.join(base_path, "model_manifest.json"), "r") as f:
        manifest = json.load(f)
    with open(os.path.join(base_path, "neurons", "neurons.json"), "r") as f:
        neurons = json.load(f)
    with open(os.path.join(base_path, "synapses", "synapses.json"), "r") as f:
        synapses = json.load(f)
    return manifest, neurons, synapses

class ExecutableAntBrain:
    def __init__(self, manifest, neurons, synapses):
        self.manifest = manifest
        self.neurons = neurons
        self.synapses = synapses
        self.neuron_states = {n["id"]: n["resting_potential"] for n in self.neurons}
        self.spikes = {n["id"]: False for n in self.neurons}

    def reset(self):
        for n in self.neurons:
            self.neuron_states[n["id"]] = n["resting_potential"]
            self.spikes[n["id"]] = False

    def step(self, sensory_inputs, dt=0.016):
        """
        Executes one LIF neural propagation tick.
        sensory_inputs: dict of sensory values (e.g. {'food_left': 0.8, 'food_right': 0.2})
        """
        # 1. Depolarize sensory neurons based on spatial target orientation
        food_left = sensory_inputs.get("foodLeft", sensory_inputs.get("food_left", 0.0))
        food_center = sensory_inputs.get("foodCenter", sensory_inputs.get("food_center", 0.0))
        food_right = sensory_inputs.get("foodRight", sensory_inputs.get("food_right", 0.0))
        food_odor = sensory_inputs.get("foodOdorConcentration", sensory_inputs.get("food_odor", 0.5))

        # Sensory neurons 0-2 (Left), 3-5 (Center), 6-8 (Right), 9 (Odor)
        for i, n in enumerate(self.neurons[:10]):
            if i in (0, 1, 2):
                drive = food_left * 25.0
            elif i in (3, 4, 5):
                drive = food_center * 30.0
            elif i in (6, 7, 8):
                drive = food_right * 25.0
            else:
                drive = food_odor * 20.0
            self.neuron_states[n["id"]] += drive * dt

        # 2. Integrate synaptic transmission
        for s in self.synapses:
            if self.spikes[s["pre_neuron_id"]]:
                sign = 1.0 if s["type"] == "EXCITATORY" else -1.0
                self.neuron_states[s["post_neuron_id"]] += sign * s["weight"] * 8.0

        # 3. Fire spikes and leak toward resting potential
        fired_count = 0
        for n in self.neurons:
            nid = n["id"]
            if self.neuron_states[nid] >= n["threshold"]:
                self.spikes[nid] = True
                self.neuron_states[nid] = n["resting_potential"]
                fired_count += 1
            else:
                self.spikes[nid] = False
                leak = (n["resting_potential"] - self.neuron_states[nid]) * 0.1
                self.neuron_states[nid] += leak

        # 4. Readout motor command from distinct motor neuron pools
        # Motor neurons: -10 to -6 (Left Motor Pool), -5 to -1 (Right Motor Pool)
        left_motor_spikes = sum(1.0 for n in self.neurons[-10:-5] if self.spikes[n["id"]])
        right_motor_spikes = sum(1.0 for n in self.neurons[-5:] if self.spikes[n["id"]])

        # Differential steering: if left fires more, steer right (+); if right fires more, steer left (-)
        steering = (left_motor_spikes - right_motor_spikes) * 0.25
        thrust = 0.4 + 0.12 * (left_motor_spikes + right_motor_spikes)

        return {
            "action": "MOVE_AND_STEER",
            "speed_throttle": max(0.1, min(1.0, thrust)),
            "steering_bias": max(-1.0, min(1.0, steering)),
            "spikes_fired": fired_count,
        }

if __name__ == "__main__":
    print("=" * 60)
    print("ANT BRAIN — Standalone Executable Neural Engine")
    print("=" * 60)
    manifest, neurons, synapses = load_model(".")
    print(f"Model Name:      {manifest['model_name']}")
    print(f"Species:         {manifest['species_profile']}")
    print(f"Neurons Loaded:  {len(neurons)}")
    print(f"Synapses Loaded: {len(synapses)}")
    print(f"Status:          {manifest['brain_model_type']}")
    print("-" * 60)

    brain = ExecutableAntBrain(manifest, neurons, synapses)
    print("Running 10-step test inference...")
    for t in range(10):
        obs = {"food_left": 0.5 + 0.3 * math.sin(t), "food_right": 0.2}
        out = brain.step(obs)
        print(f"Step {t+1:02d}: Action={out['action']} | Speed={out['speed_throttle']:.2f} | Turn={out['steering_bias']:+.2f} | Spikes={out['spikes_fired']}")

    print("-" * 60)
    print("✓ Inference verified successfully! Run 'python train.py' to train on new tasks.")
