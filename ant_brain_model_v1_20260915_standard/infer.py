#!/usr/bin/env python3
"""
ANT BRAIN — Single-Agent & Multi-Agent Inference Simulator
"""

import json
from run_model import load_model, ExecutableAntBrain

def run_multi_agent():
    manifest, neurons, synapses = load_model(".")
    print(f"Spawning 5 collaborative digital ants with brain: {manifest['model_name']}")

    ants = [ExecutableAntBrain(manifest, neurons, synapses) for _ in range(5)]
    for step in range(5):
        print(f"--- Sim Tick {step+1} ---")
        for i, ant in enumerate(ants):
            obs = {"food_left": random_food()}
            res = ant.step(obs)
            print(f"Ant #{i+1}: Action={res['action']} Throttle={res['speed_throttle']:.2f}")

def random_food():
    import random
    return random.random()

if __name__ == "__main__":
    run_multi_agent()
