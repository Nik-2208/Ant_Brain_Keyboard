# ====================================================================
# ANT BRAIN — Created & Developed by Nikhilesh H. Chavda
# Copyright (c) 2026 Nikhilesh H. Chavda. All Rights Reserved.
# ====================================================================
import os
import sys
import math
import random
import time
from typing import Dict, List, Any, Tuple, Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ant_brain_loader import AntBrainPackage, ExecutableAntBrain
from keyboard_environment import KeyboardLayout, KeyTile
from keyboard_adapter import KeyboardObservationAdapter, KeyboardActionAdapter

class TaskClaim:
    """Represents a unique character typing task instance in the sentence task."""
    def __init__(self, task_id: str, target_char: str, order: int = 1, keyboard_id: str = "KEYBOARD_A"):
        self.task_id = task_id          # e.g., TASK_SENT_1_72_H
        self.target_char = target_char  # Actual character to type: 'H', 'e', ' ', '!'
        self.order = order              # Sequence index (1-indexed)
        self.keyboard_id = keyboard_id
        self.claimed_by: Optional[int] = None
        self.status = "PENDING"          # PENDING, CLAIMED, IN_PROGRESS, COMPLETED, FAILED
        self.last_activity = time.time()
        self.claim_timeout = 8.0        # Seconds before stale claim is automatically unlocked

    def is_expired(self) -> bool:
        if self.status in ["CLAIMED", "IN_PROGRESS"]:
            return (time.time() - self.last_activity) > self.claim_timeout
        return False


class SentenceResultChecker:
    """Evaluates and compares the target sentence vs actual verified typed outputs."""

    @staticmethod
    def evaluate(target_sentence: str, actual_typed: str, individual_outputs: Optional[Dict[int, str]] = None) -> Dict[str, Any]:
        match = (target_sentence == actual_typed)
        correct_count = 0
        min_len = min(len(target_sentence), len(actual_typed))

        for i in range(min_len):
            if target_sentence[i] == actual_typed[i]:
                correct_count += 1

        accuracy = (correct_count / max(1, len(target_sentence))) * 100.0 if len(target_sentence) > 0 else 100.0

        first_mismatch_idx = -1
        expected_char = None
        actual_char = None
        for i in range(max(len(target_sentence), len(actual_typed))):
            t_c = target_sentence[i] if i < len(target_sentence) else None
            a_c = actual_typed[i] if i < len(actual_typed) else None
            if t_c != a_c:
                first_mismatch_idx = i
                expected_char = t_c
                actual_char = a_c
                break

        missing_chars = target_sentence[len(actual_typed):] if len(target_sentence) > len(actual_typed) else ""
        extra_chars = actual_typed[len(target_sentence):] if len(actual_typed) > len(target_sentence) else ""

        return {
            'target_sentence': target_sentence,
            'actual_typed': actual_typed,
            'match': match,
            'accuracy': accuracy,
            'correct_chars': correct_count,
            'total_target_chars': len(target_sentence),
            'total_typed_chars': len(actual_typed),
            'first_mismatch': {
                'index': first_mismatch_idx,
                'expected': expected_char,
                'actual': actual_char
            } if first_mismatch_idx != -1 else None,
            'missing': missing_chars,
            'extra': extra_chars,
            'individual_outputs': individual_outputs or {}
        }


class CommunicationHub:
    """Colony Communication, Atomic Task Allocation & Global Sentence Assembly Layer."""

    def __init__(self, full_layout: Optional[Dict[str, KeyTile]] = None):
        self.tasks: Dict[str, TaskClaim] = {}
        self.agent_positions: Dict[int, Tuple[float, float]] = {}
        self.agent_statuses: Dict[int, str] = {}
        self.signal_events: List[Dict[str, Any]] = []
        self.ordering_mode: str = "ORDERED"  # ORDERED or INDEPENDENT
        self.full_layout = full_layout or KeyboardLayout.get_full_keyboard()
        self.verified_typed_chars: List[Tuple[int, str, int]] = [] # [(order, char, ant_id)]

    def set_ordering_mode(self, mode: str) -> None:
        self.ordering_mode = mode.upper()

    def announce_task(self, task_id: str, target_char: str, order: int = 1, keyboard_id: str = "KEYBOARD_A") -> TaskClaim:
        claim = TaskClaim(task_id, target_char, order, keyboard_id)
        self.tasks[task_id] = claim
        self.signal_events.append({
            'type': 'ANNOUNCE',
            'task_id': task_id,
            'target_char': target_char,
            'order': order,
            'keyboard_id': keyboard_id,
            'timestamp': time.time()
        })
        return claim

    def get_unlocked_order(self, keyboard_id: str = "KEYBOARD_A") -> int:
        """In ORDERED mode, returns the lowest uncompleted sentence character position."""
        kbd_tasks = [t for t in self.tasks.values() if t.keyboard_id == keyboard_id]
        if not kbd_tasks:
            return 1
        uncompleted = [t.order for t in kbd_tasks if t.status != "COMPLETED"]
        return min(uncompleted) if uncompleted else 999

    def reserve_task_atomic(self, ant_id: int, ant_pos: Tuple[float, float], keyboard_id: str = "KEYBOARD_A") -> Optional[TaskClaim]:
        """Atomically find & reserve best pending character task for ant."""
        self.check_and_release_timeouts()

        allowed_tasks = [t for t in self.tasks.values() if t.keyboard_id == keyboard_id and t.status == "PENDING"]
        
        if self.ordering_mode == "ORDERED":
            unlocked_order = self.get_unlocked_order(keyboard_id)
            allowed_tasks = [t for t in allowed_tasks if t.order == unlocked_order]

        if not allowed_tasks:
            return None

        # Sort candidate tasks by distance from ant to the target key on full keyboard
        def task_distance(t: TaskClaim) -> float:
            key_x, key_y = self.get_key_pos(t.target_char, t.keyboard_id)
            return math.sqrt((key_x - ant_pos[0]) ** 2 + (key_y - ant_pos[1]) ** 2)

        allowed_tasks.sort(key=task_distance)
        selected_task = allowed_tasks[0]

        # Atomic reservation
        selected_task.status = "CLAIMED"
        selected_task.claimed_by = ant_id
        selected_task.last_activity = time.time()

        self.signal_events.append({
            'type': 'CLAIM',
            'ant_id': ant_id,
            'task_id': selected_task.task_id,
            'target_char': selected_task.target_char,
            'timestamp': time.time()
        })
        return selected_task

    def complete_task(self, task_id: str, ant_id: int, verified_char: str) -> None:
        if task_id in self.tasks:
            task = self.tasks[task_id]
            task.status = "COMPLETED"
            task.last_activity = time.time()
            self.verified_typed_chars.append((task.order, verified_char, ant_id))
            self.signal_events.append({
                'type': 'COMPLETE',
                'ant_id': ant_id,
                'task_id': task_id,
                'verified_char': verified_char,
                'timestamp': time.time()
            })

    def release_task(self, task_id: str, ant_id: int) -> None:
        if task_id in self.tasks and self.tasks[task_id].status != "COMPLETED":
            self.tasks[task_id].status = "PENDING"
            self.tasks[task_id].claimed_by = None
            self.tasks[task_id].last_activity = time.time()
            self.signal_events.append({
                'type': 'RELEASE',
                'ant_id': ant_id,
                'task_id': task_id,
                'timestamp': time.time()
            })

    def check_and_release_timeouts(self) -> None:
        for t in self.tasks.values():
            if t.is_expired():
                t.status = "PENDING"
                t.claimed_by = None
                t.last_activity = time.time()

    def get_overall_typed_text(self) -> str:
        """Assembles verified typed text strictly sorted by character task order."""
        sorted_chars = sorted(self.verified_typed_chars, key=lambda x: x[0])
        return "".join([c[1] for c in sorted_chars])

    def update_agent_telemetry(self, ant_id: int, pos: Tuple[float, float], status: str) -> None:
        self.agent_positions[ant_id] = pos
        self.agent_statuses[ant_id] = status

    def get_key_pos(self, char: str, keyboard_id: str = "KEYBOARD_A") -> Tuple[float, float]:
        tile = KeyboardLayout.find_key_for_char(char, self.full_layout)
        if tile:
            return (tile.x, tile.y)
        return (0.0, 1.4)

    def clear(self):
        self.tasks.clear()
        self.agent_positions.clear()
        self.agent_statuses.clear()
        self.signal_events.clear()
        self.verified_typed_chars.clear()


class AntAgentInstance:
    """Individual Ant Agent holding runtime state and running the SAME shared AntWire .antbrain package."""

    def __init__(self, ant_id: int, package: AntBrainPackage, color_hex: str = "#ef4444"):
        self.ant_id = ant_id
        self.color_hex = color_hex
        self.package = package
        self.brain = ExecutableAntBrain(package)
        self.typed_buffer: List[str] = []
        self.reset()

    def reset(self, start_pos: Tuple[float, float] = (0.0, -1.0), start_theta: float = math.pi / 2):
        self.ant_x, self.ant_y = start_pos
        self.ant_theta = start_theta
        self.step_count = 0
        self.stuck_step_count = 0  # Watchdog step counter
        self.prev_x, self.prev_y = start_pos
        self.total_reward = 0.0
        self.last_reward = 0.0
        self.total_distance = 0.0
        self.done = False
        self.status = "SEARCHING"  # SEARCHING, MOVING, APPROACHING, INTERACTING, RECOVERING, COMPLETED, FAILED
        self.current_task: Optional[TaskClaim] = None
        self.typed_buffer = []
        self.trajectory = [{'x': self.ant_x, 'y': self.ant_y}]
        self.brain.reset()

    def get_typed_string(self) -> str:
        return "".join(self.typed_buffer)

    def step(self, env_state: dict, comm_hub: Optional[CommunicationHub] = None) -> Tuple[float, bool, dict]:
        if self.done:
            return 0.0, True, {}

        self.step_count += 1
        obs_dict = KeyboardObservationAdapter.get_observation_dict(env_state)
        brain_out = self.brain.step(obs_dict)
        throttle, turn, dep_food, dep_home = KeyboardActionAdapter.process_action(brain_out)

        # Kinematics Update with Target Angle Integration & Local Ant Collision Avoidance
        target_pos = env_state.get('target_pos', (0.0, 1.4))
        dx_t = target_pos[0] - self.ant_x
        dy_t = target_pos[1] - self.ant_y
        
        target_angle = math.atan2(dy_t, dx_t)
        rel_angle = target_angle - self.ant_theta
        while rel_angle > math.pi: rel_angle -= 2 * math.pi
        while rel_angle < -math.pi: rel_angle += 2 * math.pi

        # Local Ant Collision Avoidance deflection
        avoid_turn = 0.0
        if comm_hub and len(comm_hub.agent_positions) > 1:
            for other_id, other_pos in comm_hub.agent_positions.items():
                if other_id != self.ant_id:
                    d_other_x = self.ant_x - other_pos[0]
                    d_other_y = self.ant_y - other_pos[1]
                    dist_other = math.sqrt(d_other_x * d_other_x + d_other_y * d_other_y)
                    if 0.01 < dist_other < 0.45:
                        avoid_angle = math.atan2(d_other_y, d_other_x) - self.ant_theta
                        avoid_turn += math.sin(avoid_angle) * (0.45 - dist_other)

        # Steering synthesis
        effective_turn = 0.5 * turn + 0.5 * math.tanh(rel_angle * 2.5) + 0.3 * avoid_turn
        self.ant_theta += effective_turn * 0.4
        
        speed = max(0.12, throttle) * 0.16
        dx = speed * math.cos(self.ant_theta)
        dy = speed * math.sin(self.ant_theta)

        # Movement delta & Watchdog Stuck Detection
        dist_moved = math.sqrt((self.ant_x - self.prev_x)**2 + (self.ant_y - self.prev_y)**2)
        if dist_moved < 0.004:
            self.stuck_step_count += 1
        else:
            self.stuck_step_count = 0

        self.prev_x, self.prev_y = self.ant_x, self.ant_y
        self.ant_x += dx
        self.ant_y += dy
        self.total_distance += math.sqrt(dx * dx + dy * dy)
        self.trajectory.append({'x': self.ant_x, 'y': self.ant_y})

        # State machine transition
        curr_dist = math.sqrt((target_pos[0] - self.ant_x) ** 2 + (target_pos[1] - self.ant_y) ** 2)
        if self.stuck_step_count >= 15:
            self.status = "RECOVERING"
            self.ant_theta += random.choice([-1.0, 1.0]) * (math.pi / 3.0)
            if self.stuck_step_count >= 25:
                if self.current_task and comm_hub:
                    comm_hub.release_task(self.current_task.task_id, self.ant_id)
                    self.current_task = None
                    self.status = "SEARCHING"
                    self.stuck_step_count = 0
        elif curr_dist < 0.28:
            self.status = "INTERACTING"
        elif curr_dist < 0.8:
            self.status = "APPROACHING"
        else:
            self.status = "MOVING"

        if comm_hub:
            comm_hub.update_agent_telemetry(self.ant_id, (self.ant_x, self.ant_y), self.status)

        # Key press check on Full Keyboard Layout
        key_pressed_tile = None
        layout = env_state.get('layout', {})
        for k_id, tile in layout.items():
            dist_k = math.sqrt((tile.x - self.ant_x)**2 + (tile.y - self.ant_y)**2)
            threshold = (tile.width + tile.height) / 4.0 * 0.95
            if dist_k <= max(0.18, threshold):
                key_pressed_tile = tile
                break

        reward = -0.01
        done = False
        target_char = self.current_task.target_char if self.current_task else None

        info = {
            'ant_id': self.ant_id,
            'status': self.status,
            'key_pressed': key_pressed_tile.id if key_pressed_tile else None,
            'target_char': target_char,
            'typed_buffer': self.get_typed_string()
        }

        if key_pressed_tile:
            if target_char and key_pressed_tile.matches_char(target_char):
                reward += 2.5
                self.status = "COMPLETED"
                done = True
                self.typed_buffer.append(target_char)
                if self.current_task and comm_hub:
                    comm_hub.complete_task(self.current_task.task_id, self.ant_id, target_char)
            else:
                reward -= 0.6
                self.status = "FAILED"

        if self.step_count >= env_state.get('max_steps', 100):
            done = True
            if self.status != "COMPLETED":
                self.status = "FAILED"
                if self.current_task and comm_hub:
                    comm_hub.release_task(self.current_task.task_id, self.ant_id)

        self.last_reward = reward
        self.total_reward += reward
        self.done = done

        return reward, done, info
