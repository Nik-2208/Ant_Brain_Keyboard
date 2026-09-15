import os
import sys
import math
import random
import time
from typing import Dict, List, Any, Tuple, Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ant_brain_model_v1_20260915_standard.run_model import load_model
from keyboard_environment import KeyboardEnv, KeyboardLayout, KeyTile
from collaborative_layer import CommunicationHub, AntAgentInstance, TaskClaim
from task_generator import TaskGenerator

ANT_COLORS = ["#ef4444", "#00f2fe", "#00e676", "#ffaa00", "#9d4edd", "#ff2a85"]

class KeyboardLabEngine:
    """Multi-Mode Keyboard Lab Engine supporting INDIVIDUAL, COLLABORATIVE, and PARALLEL modes."""

    def __init__(self, mode: str = "INDIVIDUAL", ant_count: int = 1, keyboard_count: int = 1, model_dir: str = "ant_brain_model_v1_20260915_standard"):
        self.mode = mode.upper()
        self.ant_count = max(1, min(6, ant_count))
        self.keyboard_count = max(1, min(2, keyboard_count))
        self.model_dir = model_dir

        self.manifest, self.neurons, self.synapses = load_model(self.model_dir)
        self.comm_hub = CommunicationHub()

        self.setup_environment()

    def setup_environment(self):
        self.comm_hub.clear()
        if self.keyboard_count == 2 or self.mode == "PARALLEL":
            kbd_a, kbd_b = KeyboardLayout.get_dual_keyboards()
            self.env_a = KeyboardEnv(layout=kbd_a, default_start_pos=(-1.0, -0.8))
            self.env_b = KeyboardEnv(layout=kbd_b, default_start_pos=(3.0, -0.8))
        else:
            self.env_a = KeyboardEnv(layout=KeyboardLayout.get_standard_3x2(), default_start_pos=(1.0, -0.8))
            self.env_b = None

        # Instantiate Ants using SAME model package
        self.ants: List[AntAgentInstance] = []
        for i in range(self.ant_count):
            color = ANT_COLORS[i % len(ANT_COLORS)]
            ant = AntAgentInstance(i + 1, self.manifest, self.neurons, self.synapses, color_hex=color)
            self.ants.append(ant)

    def reset_simulation(self, task_type: str = "SINGLE", word: str = "DECAF", single_target: str = "E", ordering_mode: str = "ORDERED"):
        self.comm_hub.clear()
        self.comm_hub.set_ordering_mode(ordering_mode)

        if self.mode == "PARALLEL":
            tasks = TaskGenerator.create_dual_keyboard_tasks(word_a=word, word_b="CAFE")
        elif task_type == "SEQUENCE":
            tasks = TaskGenerator.create_word_sequence_task(word)
        else:
            tasks = TaskGenerator.create_single_target_task(single_target)

        for t in tasks:
            self.comm_hub.announce_task(t['task_id'], t['target_key'], t.get('order', 1), t.get('keyboard_id', 'KEYBOARD_A'))

        # Reset ant positions and theta
        for i, ant in enumerate(self.ants):
            if self.mode == "PARALLEL" and i >= self.ant_count // 2:
                start_x, start_y = 3.0 + (i * 0.2), -0.8
            else:
                start_x, start_y = (1.0 - (len(self.ants) - 1) * 0.2) + (i * 0.4), -0.8
            ant.reset(start_pos=(start_x, start_y), start_theta=math.pi / 2)

            # Atomically reserve best available task
            claimed = self.comm_hub.reserve_task_atomic(ant.ant_id, (ant.ant_x, ant.ant_y))
            if claimed:
                ant.current_task = claimed
                ant.status = "APPROACHING"

    def step_simulation(self) -> Dict[str, Any]:
        results = []
        all_done = True

        for ant in self.ants:
            if ant.done:
                results.append({'ant_id': ant.ant_id, 'done': True, 'reward': 0.0})
                continue

            all_done = False
            # Determine target and active env
            target_key = "E"
            env = self.env_a

            if ant.current_task:
                target_key = ant.current_task.target_key
                if ant.current_task.keyboard_id == "KEYBOARD_B" and self.env_b:
                    env = self.env_b
            else:
                # Try to claim pending task if unassigned
                claimed = self.comm_hub.reserve_task_atomic(ant.ant_id, (ant.ant_x, ant.ant_y))
                if claimed:
                    ant.current_task = claimed
                    ant.status = "APPROACHING"
                    target_key = claimed.target_key

            env_state = env.reset(target_key=target_key, custom_start_pos=(ant.ant_x, ant.ant_y), custom_start_theta=ant.ant_theta)
            r, done, info = ant.step(env_state, comm_hub=self.comm_hub)

            if ant.current_task:
                self.comm_hub.update_task_progress(ant.ant_id, ant.current_task.task_id, "IN_PROGRESS" if not done else "COMPLETED")

            if done and ant.current_task:
                self.comm_hub.release_task(ant.ant_id, ant.current_task.task_id, completed=info.get('correct', False))
                ant.current_task = None
                
                # Auto-claim next available task
                if self.mode in ["COLLABORATIVE", "PARALLEL"]:
                    next_task = self.comm_hub.reserve_task_atomic(ant.ant_id, (ant.ant_x, ant.ant_y))
                    if next_task:
                        ant.current_task = next_task
                        ant.done = False
                        ant.status = "APPROACHING"

            results.append({'ant_id': ant.ant_id, 'reward': r, 'done': done, 'info': info})

        return {
            'all_done': all_done,
            'results': results,
            'pending_tasks': len([t for t in self.comm_hub.tasks.values() if t.status == "PENDING"]),
            'claimed_tasks': len([t for t in self.comm_hub.tasks.values() if t.status in ["CLAIMED", "IN_PROGRESS"]]),
            'completed_tasks': len([t for t in self.comm_hub.tasks.values() if t.status == "COMPLETED"])
        }
