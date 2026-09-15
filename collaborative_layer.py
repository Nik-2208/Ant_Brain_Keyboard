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
from ant_brain_model_v1_20260915_standard.run_model import load_model, ExecutableAntBrain
from keyboard_adapter import KeyboardObservationAdapter, KeyboardActionAdapter

class TaskClaim:
    """Represents a unique task instance in the multi-agent colony system."""
    def __init__(self, task_id: str, target_key: str, order: int = 1, keyboard_id: str = "KEYBOARD_A"):
        self.task_id = task_id          # e.g., TASK_SEQ_1_D or TASK_INST_A#1
        self.target_key = target_key    # D, E, C, A, F
        self.order = order              # Sequence position (1-indexed)
        self.keyboard_id = keyboard_id
        self.claimed_by: Optional[int] = None
        self.status = "PENDING"          # PENDING, CLAIMED, IN_PROGRESS, COMPLETED
        self.last_activity = time.time()
        self.claim_timeout = 8.0        # Seconds before stale claim is automatically unlocked

    def is_expired(self) -> bool:
        if self.status in ["CLAIMED", "IN_PROGRESS"]:
            return (time.time() - self.last_activity) > self.claim_timeout
        return False

class CommunicationHub:
    """Colony Communication & Atomic Task Allocation Layer."""

    def __init__(self):
        self.tasks: Dict[str, TaskClaim] = {}
        self.agent_positions: Dict[int, Tuple[float, float]] = {}
        self.agent_statuses: Dict[int, str] = {}
        self.signal_events: List[Dict[str, Any]] = []
        self.ordering_mode: str = "ORDERED"  # ORDERED or PARALLEL

    def set_ordering_mode(self, mode: str) -> None:
        self.ordering_mode = mode.upper()

    def announce_task(self, task_id: str, target_key: str, order: int = 1, keyboard_id: str = "KEYBOARD_A") -> TaskClaim:
        claim = TaskClaim(task_id, target_key, order, keyboard_id)
        self.tasks[task_id] = claim
        self.signal_events.append({
            'type': 'ANNOUNCE',
            'task_id': task_id,
            'target_key': target_key,
            'order': order,
            'keyboard_id': keyboard_id,
            'timestamp': time.time()
        })
        return claim



    def get_unlocked_order(self, keyboard_id: str = "KEYBOARD_A") -> int:
        """In ORDERED mode, return lowest uncompleted order index."""
        kbd_tasks = [t for t in self.tasks.values() if t.keyboard_id == keyboard_id]
        if not kbd_tasks:
            return 1
        uncompleted = [t.order for t in kbd_tasks if t.status != "COMPLETED"]
        return min(uncompleted) if uncompleted else 999

    def reserve_task_atomic(self, ant_id: int, ant_pos: Tuple[float, float], keyboard_id: str = "KEYBOARD_A") -> Optional[TaskClaim]:
        """Atomically find & reserve best pending task for ant based on distance and ordering mode."""
        self.check_and_release_timeouts()

        allowed_tasks = [t for t in self.tasks.values() if t.keyboard_id == keyboard_id and t.status == "PENDING"]
        
        if self.ordering_mode == "ORDERED":
            unlocked_order = self.get_unlocked_order(keyboard_id)
            allowed_tasks = [t for t in allowed_tasks if t.order == unlocked_order]

        if not allowed_tasks:
            return None

        # Sort candidate tasks by distance to ant position
        def task_distance(t: TaskClaim) -> float:
            key_x, key_y = self.get_key_pos_estimate(t.target_key, t.keyboard_id)
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
            'target_key': selected_task.target_key,
            'timestamp': time.time()
        })

        return selected_task

    def update_task_progress(self, ant_id: int, task_id: str, status: str = "IN_PROGRESS") -> None:
        if task_id in self.tasks:
            t = self.tasks[task_id]
            if t.claimed_by == ant_id:
                t.status = status
                t.last_activity = time.time()

    def release_task(self, ant_id: int, task_id: str, completed: bool = False) -> None:
        if task_id in self.tasks:
            task = self.tasks[task_id]
            if task.claimed_by == ant_id:
                if completed:
                    task.status = "COMPLETED"
                else:
                    task.status = "PENDING"
                    task.claimed_by = None
                task.last_activity = time.time()
                self.signal_events.append({
                    'type': 'RELEASE',
                    'ant_id': ant_id,
                    'task_id': task_id,
                    'completed': completed,
                    'timestamp': time.time()
                })

    def check_and_release_timeouts(self) -> List[str]:
        """Failure recovery: release tasks claimed by inactive or timed-out ants."""
        released = []
        for t in self.tasks.values():
            if t.is_expired():
                t.status = "PENDING"
                t.claimed_by = None
                t.last_activity = time.time()
                released.append(t.task_id)
                self.signal_events.append({
                    'type': 'TIMEOUT_RELEASE',
                    'task_id': t.task_id,
                    'timestamp': time.time()
                })
        return released

    def get_key_pos_estimate(self, key_char: str, keyboard_id: str) -> Tuple[float, float]:
        key_map_a = {'A': (0.0, 1.5), 'B': (1.0, 1.5), 'C': (2.0, 1.5), 'D': (0.0, 0.0), 'E': (1.0, 0.0), 'F': (2.0, 0.0)}
        key_map_b = {'A': (2.0, 1.5), 'B': (3.0, 1.5), 'C': (4.0, 1.5), 'D': (2.0, 0.0), 'E': (3.0, 0.0), 'F': (4.0, 0.0)}
        if keyboard_id == "KEYBOARD_B":
            return key_map_b.get(key_char, (3.0, 0.0))
        return key_map_a.get(key_char, (1.0, 0.0))

    def recruit(self, task_id: str, requesting_ant_id: int) -> None:
        self.signal_events.append({
            'type': 'RECRUIT',
            'from_ant_id': requesting_ant_id,
            'task_id': task_id,
            'timestamp': time.time()
        })

    def coordinate(self, ant_id: int, pos: Tuple[float, float], status: str) -> None:
        self.agent_positions[ant_id] = pos
        self.agent_statuses[ant_id] = status

    def clear(self):
        self.tasks.clear()
        self.agent_positions.clear()
        self.agent_statuses.clear()
        self.signal_events.clear()

class AntAgentInstance:
    """Individual Ant Agent holding runtime state and running the SAME shared ant_brain_model_v1_20260915_standard."""

    def __init__(self, ant_id: int, manifest: dict, neurons: list, synapses: list, color_hex: str = "#ef4444"):
        self.ant_id = ant_id
        self.color_hex = color_hex
        self.brain = ExecutableAntBrain(manifest, neurons, synapses)
        self.reset()

    def reset(self, start_pos: Tuple[float, float] = (1.0, -0.8), start_theta: float = math.pi / 2):
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
        self.trajectory = [{'x': self.ant_x, 'y': self.ant_y}]
        self.brain.reset()

    def step(self, env_state: dict, comm_hub: Optional[CommunicationHub] = None) -> Tuple[float, bool, dict]:
        if self.done:
            return 0.0, True, {}

        self.step_count += 1
        obs_dict = KeyboardObservationAdapter.get_observation_dict(env_state)
        brain_out = self.brain.step(obs_dict)
        throttle, turn, dep_food, dep_home = KeyboardActionAdapter.process_action(brain_out)

        # Kinematics Update with Target Angle Integration & Local Ant Collision Avoidance
        target_pos = env_state.get('target_pos', (1.0, 0.0))
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
                    if 0.01 < dist_other < 0.45:  # Collision proximity boundary
                        avoid_angle = math.atan2(d_other_y, d_other_x) - self.ant_theta
                        avoid_turn += math.sin(avoid_angle) * (0.45 - dist_other)

        # Combine brain turn readout with relative bearing steering and collision avoidance
        effective_turn = 0.5 * turn + 0.4 * math.tanh(rel_angle * 2.0) + 0.3 * avoid_turn
        self.ant_theta += effective_turn * 0.4
        
        speed = max(0.12, throttle) * 0.15
        dx = speed * math.cos(self.ant_theta)
        dy = speed * math.sin(self.ant_theta)

        # Movement delta & Watchdog Stuck Detection
        dist_moved = math.sqrt((self.ant_x - self.prev_x)**2 + (self.ant_y - self.prev_y)**2)
        if dist_moved < 0.005:
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
            # Watchdog Recovery: Re-steer away from deadlock
            self.ant_theta += math.pi * 0.5
            self.stuck_step_count = 0
            if comm_hub and self.current_task:
                comm_hub.release_task(self.ant_id, self.current_task.task_id, completed=False)
                self.current_task = None
        elif curr_dist <= 0.3:
            self.status = "INTERACTING"
        elif curr_dist <= 1.0:
            self.status = "APPROACHING"
        else:
            self.status = "MOVING"

        if comm_hub:
            comm_hub.coordinate(self.ant_id, (self.ant_x, self.ant_y), self.status)

        reward = -0.01
        correct_press = False
        wrong_press = False

        # Collision with target key tile
        target_key = env_state['target_key']
        layout = env_state['layout']

        for k_id, tile in layout.items():
            if tile.contains(self.ant_x, self.ant_y):
                self.done = True
                if k_id == target_key or tile.label == target_key:
                    reward += 1.0
                    correct_press = True
                    self.status = "COMPLETED"
                else:
                    reward -= 1.0
                    wrong_press = True
                    self.status = "FAILURE"
                break

        if not self.done and self.step_count >= env_state.get('max_steps', 50):
            self.done = True
            reward -= 0.5
            self.status = "FAILURE"

        self.last_reward = reward
        self.total_reward += reward

        info = {
            'ant_id': self.ant_id,
            'target_key': target_key,
            'correct': correct_press,
            'wrong': wrong_press,
            'steps': self.step_count,
            'distance': self.total_distance,
            'throttle': throttle,
            'turn': turn
        }

        return reward, self.done, info
