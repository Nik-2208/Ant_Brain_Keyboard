#!/usr/bin/env python3
"""
ANT BRAIN — Connectome & Neuron Inspector
"""

import json
import sys

def inspect():
    with open("neurons/neurons.json", "r") as f:
        neurons = json.load(f)
    with open("synapses/synapses.json", "r") as f:
        synapses = json.load(f)

    print("=" * 50)
    print(f"CONNECTOME SUMMARY: {len(neurons)} Neurons | {len(synapses)} Synapses")
    print("=" * 50)
    print("First 5 Neurons:")
    for n in neurons[:5]:
        print(f"  [{n['id']}] Region: {n['region']} | Type: {n['cell_type']} | Transmitter: {n['neurotransmitter']}")

    print("-" * 50)
    print("First 5 Synapses:")
    for s in synapses[:5]:
        print(f"  [{s['synapse_id']}] {s['pre_neuron_id']} -> {s['post_neuron_id']} (Weight: {s['weight']}, Type: {s['type']})")

if __name__ == "__main__":
    inspect()
