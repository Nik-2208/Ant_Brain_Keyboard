import math
import random
from typing import Dict, Tuple, List, Optional, Any, Union

class KeyTile:
    """Data-driven Key Tile definition."""
    def __init__(self, key_id: str, label: str, x: float, y: float, width: float = 0.6, height: float = 0.6, row: int = 0, col: int = 0):
        self.id = key_id
        self.label = label
        self.x = x
        self.y = y
        self.width = width
        self.height = height
        self.row = row
        self.col = col

    def contains(self, ant_x: float, ant_y: float) -> bool:
        """Precise bounding box collision detection preventing back-row / corridor clipping."""
        half_w = self.width / 2.0
        half_h = self.height / 2.0
        return (self.x - half_w <= ant_x <= self.x + half_w) and (self.y - half_h <= ant_y <= self.y + half_h)

class KeyboardLayout:
    """Data-driven Keyboard Layout Generator."""

    @staticmethod
    def get_standard_3x2() -> Dict[str, KeyTile]:
        return {
            'A': KeyTile('A', 'A', 0.0, 1.5, 0.5, 0.5, row=1, col=0),
            'B': KeyTile('B', 'B', 1.0, 1.5, 0.5, 0.5, row=1, col=1),
            'C': KeyTile('C', 'C', 2.0, 1.5, 0.5, 0.5, row=1, col=2),
            'D': KeyTile('D', 'D', 0.0, 0.0, 0.5, 0.5, row=0, col=0),
            'E': KeyTile('E', 'E', 1.0, 0.0, 0.5, 0.5, row=0, col=1),
            'F': KeyTile('F', 'F', 2.0, 0.0, 0.5, 0.5, row=0, col=2),
        }

    @staticmethod
    def get_dual_keyboards() -> Tuple[Dict[str, KeyTile], Dict[str, KeyTile]]:
        kbd_a = {
            'A_A': KeyTile('A_A', 'A', -2.0, 1.0, 0.6, 0.6, row=1, col=0),
            'A_B': KeyTile('A_B', 'B', -1.0, 1.0, 0.6, 0.6, row=1, col=1),
            'A_C': KeyTile('A_C', 'C',  0.0, 1.0, 0.6, 0.6, row=1, col=2),
            'A_D': KeyTile('A_D', 'D', -2.0, 0.0, 0.6, 0.6, row=0, col=0),
            'A_E': KeyTile('A_E', 'E', -1.0, 0.0, 0.6, 0.6, row=0, col=1),
            'A_F': KeyTile('A_F', 'F',  0.0, 0.0, 0.6, 0.6, row=0, col=2),
        }
        kbd_b = {
            'B_A': KeyTile('B_A', 'A', 2.0, 1.0, 0.6, 0.6, row=1, col=0),
            'B_B': KeyTile('B_B', 'B', 3.0, 1.0, 0.6, 0.6, row=1, col=1),
            'B_C': KeyTile('B_C', 'C', 4.0, 1.0, 0.6, 0.6, row=1, col=2),
            'B_D': KeyTile('B_D', 'D', 2.0, 0.0, 0.6, 0.6, row=0, col=0),
            'B_E': KeyTile('B_E', 'E', 3.0, 0.0, 0.6, 0.6, row=0, col=1),
            'B_F': KeyTile('B_F', 'F', 4.0, 0.0, 0.6, 0.6, row=0, col=2),
        }
        return kbd_a, kbd_b

class KeyboardEnv:
    """Data-driven Keyboard Environment supporting arbitrary layouts, bounding box collision, and multi-ant physics."""

    def __init__(
        self,
        layout: Optional[Dict[str, KeyTile]] = None,
        max_steps: int = 50,
        default_start_pos: Tuple[float, float] = (1.0, -0.8),
        default_start_theta: float = math.pi / 2,
        seed: Optional[int] = None
    ):
        self.max_steps = max_steps
        self.default_start_pos = default_start_pos
        self.default_start_theta = default_start_theta
        self.layout = layout or KeyboardLayout.get_standard_3x2()

        if seed is not None:
            random.seed(seed)

        self.reset()

    def set_layout(self, new_layout: Dict[str, KeyTile]) -> None:
        self.layout = new_layout

    def reset(
        self,
        target_key: Optional[str] = None,
        custom_start_pos: Optional[Tuple[float, float]] = None,
        custom_start_theta: Optional[float] = None,
        obstacles: Optional[List[Tuple[float, float]]] = None
    ) -> Dict[str, Any]:
        if target_key and target_key in self.layout:
            self.target_key = target_key
        else:
            self.target_key = random.choice(list(self.layout.keys()))

        target_tile = self.layout[self.target_key]
        self.target_pos = (target_tile.x, target_tile.y)

        if custom_start_pos:
            self.ant_x, self.ant_y = custom_start_pos
        else:
            self.ant_x, self.ant_y = self.default_start_pos

        if custom_start_theta is not None:
            self.ant_theta = custom_start_theta
        else:
            self.ant_theta = self.default_start_theta

        self.step_count = 0
        self.total_reward = 0.0
        self.done = False
        self.selected_key = None
        self.total_distance = 0.0
        self.obstacles = obstacles or []

        self.prev_dist = math.sqrt(
            (self.target_pos[0] - self.ant_x) ** 2 + (self.target_pos[1] - self.ant_y) ** 2
        )

        return self._get_state()

    def _get_state(self) -> Dict[str, Any]:
        return {
            'ant_x': self.ant_x,
            'ant_y': self.ant_y,
            'ant_theta': self.ant_theta,
            'target_key': self.target_key,
            'target_pos': self.target_pos,
            'step_count': self.step_count,
            'max_steps': self.max_steps,
            'obstacles': self.obstacles,
            'layout': self.layout
        }

    def step(self, action: List[float], config: Any = None) -> Tuple[Dict[str, Any], float, bool, Dict[str, Any]]:
        if self.done:
            return self._get_state(), 0.0, True, {}

        self.step_count += 1
        throttle = action[0] if len(action) > 0 else 0.0
        turn = action[1] if len(action) > 1 else 0.0

        # Kinematics Update
        self.ant_theta += turn * 0.4
        speed = max(0.0, throttle) * 0.15
        dx = speed * math.cos(self.ant_theta)
        dy = speed * math.sin(self.ant_theta)

        self.ant_x += dx
        self.ant_y += dy
        self.total_distance += math.sqrt(dx * dx + dy * dy)

        curr_dist = math.sqrt(
            (self.target_pos[0] - self.ant_x) ** 2 + (self.target_pos[1] - self.ant_y) ** 2
        )

        reward = config.reward_step_penalty if config else -0.01

        # Penalty if ant moves away from target
        if curr_dist > self.prev_dist + 0.001:
            reward += config.reward_unnecessary_movement if config else -0.01

        self.prev_dist = curr_dist

        correct_press = False
        wrong_press = False

        # Exact Proximity Collision Check for Key Press (Fixes Back-Row Bug!)
        for k_id, tile in self.layout.items():
            dist_to_key = math.sqrt((tile.x - self.ant_x) ** 2 + (tile.y - self.ant_y) ** 2)
            if dist_to_key <= 0.20:
                self.selected_key = k_id
                self.done = True
                if k_id == self.target_key or tile.label == self.target_key:
                    reward += config.reward_correct_key if config else 1.0
                    reward += config.reward_completion_bonus if config else 1.0
                    correct_press = True
                else:
                    reward += config.reward_wrong_key if config else -1.0
                    wrong_press = True
                break

        if not self.done and self.step_count >= self.max_steps:
            self.done = True
            reward += config.reward_timeout if config else -0.5

        self.total_reward += reward
        info = {
            'target_key': self.target_key,
            'selected_key': self.selected_key,
            'correct': correct_press,
            'wrong': wrong_press,
            'steps': self.step_count,
            'distance': self.total_distance
        }

        return self._get_state(), reward, self.done, info
