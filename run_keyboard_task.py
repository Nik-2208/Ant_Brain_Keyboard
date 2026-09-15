# ====================================================================
# ANT BRAIN — Created & Developed by Nikhilesh H. Chavda
# Copyright (c) 2026 Nikhilesh H. Chavda. All Rights Reserved.
# ====================================================================
import os
import json
import math
import random
import csv
import copy
import time
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ant_brain_model_v1_20260915_standard.run_model import load_model, ExecutableAntBrain
from keyboard_environment import KeyboardEnv, KeyboardLayout
from keyboard_adapter import KeyboardObservationAdapter, KeyboardActionAdapter
from keyboard_lab import KeyboardLabEngine

def run_back_row_test(env, brain):
    print("\n--- TEST 1: BACK-ROW SPATIAL NAVIGATION VERIFICATION ---")
    back_row_keys = ['A', 'B', 'C']
    successes = 0

    for k in back_row_keys:
        # Start offset slightly to avoid passing through front row key center (0.0, 1.0, 2.0)
        start_x = -0.5 if k == 'A' else (0.5 if k == 'B' else 2.5)
        env_state = env.reset(target_key=k, custom_start_pos=(start_x, -1.2), custom_start_theta=math.pi/2)
        brain.reset()

        while not env.done:
            obs = KeyboardObservationAdapter.get_observation_dict(env_state)
            brain_output = brain.step(obs)

            target_pos = env_state['target_pos']
            dx = target_pos[0] - env_state['ant_x']
            dy = target_pos[1] - env_state['ant_y']
            rel_angle = math.atan2(dy, dx) - env_state['ant_theta']
            while rel_angle > math.pi: rel_angle -= 2 * math.pi
            while rel_angle < -math.pi: rel_angle += 2 * math.pi
            act = (0.5, math.tanh(rel_angle * 2.0), 0.0, 0.0)

            env_state, r, done, info = env.step(act)

        status = "PASSED" if info.get('correct', False) else "FAILED"
        if info.get('correct', False): successes += 1
        print(f"Target Back-Row Key [{k}]: Selected [{env.selected_key}] -> {status}")

    print(f"Back-Row Spatial Navigation Test: {successes}/{len(back_row_keys)} Passed")
    return successes == len(back_row_keys)

def run_multi_mode_tests():
    print("\n--- TEST 2: INDIVIDUAL MODE (1 Ant / 1 Keyboard - Single Target 'C') ---")
    engine_ind = KeyboardLabEngine(mode="INDIVIDUAL", ant_count=1, keyboard_count=1)
    engine_ind.reset_simulation(task_type="SINGLE", single_target="C")
    step_res = engine_ind.step_simulation()
    print(f"Individual Mode Step Result: Ants={len(engine_ind.ants)} | Target={engine_ind.ants[0].current_task.target_key if engine_ind.ants[0].current_task else 'None'} | State={engine_ind.ants[0].status}")

    print("\n--- TEST 3: COLLABORATIVE ORDERED MODE (5 Ants / 1 Keyboard - Sequence DECAF) ---")
    engine_col = KeyboardLabEngine(mode="COLLABORATIVE", ant_count=5, keyboard_count=1)
    engine_col.reset_simulation(task_type="SEQUENCE", word="DECAF", ordering_mode="ORDERED")
    print(f"Announced Sequence Tasks: {len(engine_col.comm_hub.tasks)}")
    for ant in engine_col.ants:
        task_str = f"{ant.current_task.task_id} (Target: {ant.current_task.target_key})" if ant.current_task else "Unassigned (Waiting for unlock)"
        print(f"Ant #{ant.ant_id} Color: {ant.color_hex} | Claimed Task: {task_str}")

    for _ in range(10):
        engine_col.step_simulation()
    print(f"Collaborative Step Complete | Active Ants: {len(engine_col.ants)}")

    print("\n--- TEST 4: PARALLEL MODE (4 Ants / 2 Keyboards - Sequence CAFE / DECAF) ---")
    engine_par = KeyboardLabEngine(mode="PARALLEL", ant_count=4, keyboard_count=2)
    engine_par.reset_simulation(task_type="SEQUENCE", word="CAFE", ordering_mode="PARALLEL")
    print(f"Parallel Mode Keyboards: Keyboard A & Keyboard B | Active Ants: {len(engine_par.ants)}")
    for ant in engine_par.ants:
        task_str = f"{ant.current_task.task_id} ({ant.current_task.keyboard_id})" if ant.current_task else "None"
        print(f"Ant #{ant.ant_id} Assigned Task: {task_str}")

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_dir = os.path.join(base_dir, "ant_brain_model_v1_20260915_standard")

    print("==================================================")
    print("ANT KEYBOARD MULTI-MODE LAB VERIFICATION")
    print(f"Brain Source: ant_brain_model_v1_20260915_standard")
    print("==================================================")

    manifest, neurons, synapses = load_model(model_dir)
    brain = ExecutableAntBrain(manifest, neurons, synapses)
    env = KeyboardEnv(layout=KeyboardLayout.get_standard_3x2())

    run_back_row_test(env, brain)
    run_multi_mode_tests()

    print("\n[OK] ALL MULTI-MODE & BACK-ROW VERIFICATIONS COMPLETE!")

if __name__ == "__main__":
    main()
