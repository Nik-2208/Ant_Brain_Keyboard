import os
import sys
import math
import random
import time
from typing import Dict, List, Any, Tuple, Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ant_brain_loader import AntBrainPackage
from keyboard_environment import KeyboardEnv, KeyboardLayout, KeyTile
from collaborative_layer import CommunicationHub, AntAgentInstance, TaskClaim, SentenceResultChecker
from task_generator import TaskGenerator

ANT_COLORS = ["#ef4444", "#00f2fe", "#00e676", "#ffaa00", "#9d4edd", "#ff2a85"]

class KeyboardLabEngine:
    """
    Multi-Mode Full Keyboard Lab Engine supporting INDIVIDUAL, COLLABORATIVE, and PARALLEL sentence typing
    using the authoritative AntWire .antbrain package.
    """

    def __init__(
        self,
        mode: str = "COLLABORATIVE",
        ant_count: int = 3,
        keyboard_count: int = 1,
        model_file: Optional[str] = None
    ):
        self.mode = mode.upper()
        self.ant_count = max(1, min(6, ant_count))
        self.keyboard_count = max(1, min(2, keyboard_count))

        self.package = AntBrainPackage(model_file)
        self.full_layout = KeyboardLayout.get_full_keyboard()
        self.comm_hub = CommunicationHub(self.full_layout)
        self.target_sentence = "Hello, world!"

        self.setup_environment()

    def setup_environment(self):
        self.comm_hub.clear()
        if self.keyboard_count == 2 or self.mode == "PARALLEL":
            kbd_a, kbd_b = KeyboardLayout.get_dual_keyboards()
            self.env_a = KeyboardEnv(layout=kbd_a, default_start_pos=(-1.0, -1.0), max_steps=120)
            self.env_b = KeyboardEnv(layout=kbd_b, default_start_pos=(8.5, -1.0), max_steps=120)
        else:
            self.env_a = KeyboardEnv(layout=self.full_layout, default_start_pos=(0.0, -1.0), max_steps=120)
            self.env_b = None

        # Instantiate independent ant agents using the SAME model package
        self.ants: List[AntAgentInstance] = []
        for i in range(self.ant_count):
            color = ANT_COLORS[i % len(ANT_COLORS)]
            ant = AntAgentInstance(i + 1, self.package, color_hex=color)
            self.ants.append(ant)

    def reset_simulation(
        self,
        task_type: str = "SENTENCE",
        sentence: str = "Hello, world!",
        single_target: str = "E",
        ordering_mode: str = "ORDERED"
    ):
        self.target_sentence = sentence if sentence else "Hello, world!"
        self.comm_hub.clear()
        self.comm_hub.set_ordering_mode(ordering_mode)

        if self.mode == "PARALLEL":
            tasks = TaskGenerator.create_dual_keyboard_tasks(sentence_a=sentence, sentence_b="WORLD")
        elif task_type in ["SENTENCE", "SEQUENCE"]:
            tasks = TaskGenerator.create_sentence_task(self.target_sentence)
        else:
            tasks = TaskGenerator.create_single_target_task(single_target)

        for t in tasks:
            self.comm_hub.announce_task(
                t['task_id'],
                t['target_char'],
                t.get('order', 1),
                t.get('keyboard_id', 'KEYBOARD_A')
            )

        # Reset each ant with independent start positions
        for i, ant in enumerate(self.ants):
            if self.mode == "PARALLEL" and i >= self.ant_count // 2:
                start_x, start_y = 8.5 + (i * 0.4), -1.0
            else:
                start_x = ((i - (len(self.ants) - 1) / 2.0) * 1.5)
                start_y = -1.0
            ant.reset(start_pos=(start_x, start_y), start_theta=math.pi / 2)

            # Atomically reserve first available character task
            claimed = self.comm_hub.reserve_task_atomic(ant.ant_id, (ant.ant_x, ant.ant_y))
            if claimed:
                ant.current_task = claimed
                ant.status = "APPROACHING"

    def step_simulation(self) -> Dict[str, Any]:
        results = []
        all_done = True

        for ant in self.ants:
            if ant.done:
                # If ant completed previous task but sentence tasks remain, assign next unlocked task
                next_task = self.comm_hub.reserve_task_atomic(ant.ant_id, (ant.ant_x, ant.ant_y))
                if next_task:
                    ant.current_task = next_task
                    ant.done = False
                    ant.step_count = 0
                    ant.status = "APPROACHING"
                    all_done = False
                else:
                    results.append({'ant_id': ant.ant_id, 'done': True, 'reward': 0.0, 'typed': ant.get_typed_string()})
                    continue
            else:
                all_done = False

            # Determine active environment
            env = self.env_a
            target_char = "E"
            if ant.current_task:
                target_char = ant.current_task.target_char
                if ant.current_task.keyboard_id == "KEYBOARD_B" and self.env_b:
                    env = self.env_b
            else:
                claimed = self.comm_hub.reserve_task_atomic(ant.ant_id, (ant.ant_x, ant.ant_y))
                if claimed:
                    ant.current_task = claimed
                    ant.status = "APPROACHING"
                    target_char = claimed.target_char

            # Find target key coordinates on the full keyboard layout
            target_tile = KeyboardLayout.find_key_for_char(target_char, env.layout)
            target_pos = (target_tile.x, target_tile.y) if target_tile else (0.0, 1.4)

            env_state = {
                'ant_x': ant.ant_x,
                'ant_y': ant.ant_y,
                'ant_theta': ant.ant_theta,
                'target_pos': target_pos,
                'target_char': target_char,
                'step_count': ant.step_count,
                'max_steps': 120,
                'layout': env.layout
            }

            reward, done, info = ant.step(env_state, comm_hub=self.comm_hub)
            results.append({
                'ant_id': ant.ant_id,
                'reward': reward,
                'done': done,
                'info': info,
                'x': ant.ant_x,
                'y': ant.ant_y,
                'status': ant.status,
                'typed': ant.get_typed_string()
            })

        overall_typed = self.comm_hub.get_overall_typed_text()
        colony_summary = SentenceResultChecker.evaluate(
            self.target_sentence,
            overall_typed,
            {ant.ant_id: ant.get_typed_string() for ant in self.ants}
        )

        return {
            'all_done': all_done,
            'overall_typed': overall_typed,
            'colony_summary': colony_summary,
            'ant_results': results
        }
