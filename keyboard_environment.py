import math
import random
from typing import Dict, Tuple, List, Optional, Any, Union

class KeyTile:
    """Standard Full Keyboard Key Tile definition with exact geometry & bounding box collision."""
    def __init__(
        self,
        key_id: str,
        label: str,
        x: float,
        y: float,
        width: float = 0.55,
        height: float = 0.55,
        row: int = 0,
        col: int = 0,
        char: Optional[str] = None,
        shift_char: Optional[str] = None,
        is_modifier: bool = False
    ):
        self.id = key_id
        self.label = label
        self.x = x
        self.y = y
        self.width = width
        self.height = height
        self.row = row
        self.col = col
        self.char = char if char is not None else label.lower()
        self.shift_char = shift_char if shift_char is not None else label.upper()
        self.is_modifier = is_modifier

    def contains(self, ant_x: float, ant_y: float) -> bool:
        """Precise bounding box collision detection."""
        half_w = self.width / 2.0
        half_h = self.height / 2.0
        return (self.x - half_w <= ant_x <= self.x + half_w) and (self.y - half_h <= ant_y <= self.y + half_h)

    def matches_char(self, target_char: str) -> bool:
        """Checks if pressing this key produces the target character directly or as primary key."""
        if target_char == ' ' and self.id == 'SPACE':
            return True
        if target_char == '\n' and self.id in ['ENTER', 'RETURN']:
            return True
        if target_char == '\t' and self.id == 'TAB':
            return True
        if self.char == target_char or self.shift_char == target_char or self.label.upper() == target_char.upper():
            return True
        return False


class KeyboardLayout:
    """Canonical Standard Full Keyboard (ANSI 104-Key / 60% Layout with F-keys) and coordinate normalizer."""

    @staticmethod
    def get_full_keyboard() -> Dict[str, KeyTile]:
        r"""
        Builds complete 6-row standard keyboard layout:
        Row 5: Esc, F1-F12
        Row 4: `~, 1-0, -, =, Backspace
        Row 3: Tab, Q-P, [, ], \, Enter
        Row 2: CapsLock, A-L, ;, ', Enter
        Row 1: Shift_L, Z-M, ,, ., /, Shift_R
        Row 0: Ctrl_L, Win, Alt_L, Space, Alt_R, Fn, Ctrl_R
        """
        keys: Dict[str, KeyTile] = {}

        # Row 5: Function Keys (y = 3.5)
        keys['ESC'] = KeyTile('ESC', 'Esc', -4.2, 3.5, width=0.5, height=0.45, row=5, col=0)
        f_keys = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12']
        for i, fk in enumerate(f_keys):
            # spacing clusters
            cluster_offset = (i // 4) * 0.25
            keys[fk] = KeyTile(fk, fk, -3.4 + (i * 0.58) + cluster_offset, 3.5, width=0.5, height=0.45, row=5, col=i+1)

        # Row 4: Number / Symbol Row (y = 2.8)
        num_defs = [
            ('`', '`', '~'), ('1', '1', '!'), ('2', '2', '@'), ('3', '3', '#'), ('4', '4', '$'),
            ('5', '5', '%'), ('6', '6', '^'), ('7', '7', '&'), ('8', '8', '*'), ('9', '9', '('),
            ('0', '0', ')'), ('-', '-', '_'), ('=', '=', '+')
        ]
        start_x_r4 = -4.2
        for i, (k_id, char, shift_char) in enumerate(num_defs):
            keys[k_id] = KeyTile(
                k_id, k_id, start_x_r4 + (i * 0.6), 2.8,
                width=0.52, height=0.52, row=4, col=i,
                char=char, shift_char=shift_char
            )
        keys['BACKSPACE'] = KeyTile('BACKSPACE', '⌫', start_x_r4 + (13 * 0.6) + 0.2, 2.8, width=0.92, height=0.52, row=4, col=13, is_modifier=True)

        # Row 3: QWERTY Row (y = 2.1)
        start_x_r3 = -4.0
        keys['TAB'] = KeyTile('TAB', 'Tab', -4.25, 2.1, width=0.75, height=0.52, row=3, col=0, char='\t', is_modifier=True)
        qwerty_defs = [
            ('Q', 'Q', 'q'), ('W', 'W', 'w'), ('E', 'E', 'e'), ('R', 'R', 'r'), ('T', 'T', 't'),
            ('Y', 'Y', 'y'), ('U', 'U', 'u'), ('I', 'I', 'i'), ('O', 'O', 'o'), ('P', 'P', 'p'),
            ('[', '[', '{'), (']', ']', '}'), ('\\', '\\', '|')
        ]
        for i, (k_id, label, char) in enumerate(qwerty_defs):
            shift_c = label if label.isalpha() else ({'[': '{', ']': '}', '\\': '|'}.get(k_id, label))
            keys[k_id] = KeyTile(
                k_id, label, -3.5 + (i * 0.6), 2.1,
                width=0.52, height=0.52, row=3, col=i+1,
                char=char, shift_char=shift_c
            )

        # Row 2: Home Row (y = 1.4)
        keys['CAPS'] = KeyTile('CAPS', 'Caps', -4.2, 1.4, width=0.85, height=0.52, row=2, col=0, is_modifier=True)
        home_defs = [
            ('A', 'A', 'a'), ('B_ALT', 'S', 's'), ('D_ALT', 'D', 'd'), ('F_ALT', 'F', 'f'),
            ('G', 'G', 'g'), ('H', 'H', 'h'), ('J', 'J', 'j'), ('K', 'K', 'k'), ('L', 'L', 'l'),
            (';', ';', ':'), ("'", "'", '"')
        ]
        # Standard names: A, S, D, F, G, H, J, K, L, ;, '
        home_canonical = [
            ('A', 'A', 'a', 'A'), ('S', 'S', 's', 'S'), ('D', 'D', 'd', 'D'), ('F', 'F', 'f', 'F'),
            ('G', 'G', 'g', 'G'), ('H', 'H', 'h', 'H'), ('J', 'J', 'j', 'J'), ('K', 'K', 'k', 'K'),
            ('L', 'L', 'l', 'L'), (';', ';', ';', ':'), ("'", "'", "'", '"')
        ]
        for i, (k_id, label, char, shift_c) in enumerate(home_canonical):
            keys[k_id] = KeyTile(
                k_id, label, -3.4 + (i * 0.6), 1.4,
                width=0.52, height=0.52, row=2, col=i+1,
                char=char, shift_char=shift_c
            )
        keys['ENTER'] = KeyTile('ENTER', 'Enter ↵', 3.4, 1.4, width=1.05, height=0.52, row=2, col=12, char='\n', is_modifier=True)

        # Row 1: Bottom Row (y = 0.7)
        keys['SHIFT_L'] = KeyTile('SHIFT_L', 'Shift ⇧', -4.1, 0.7, width=1.05, height=0.52, row=1, col=0, is_modifier=True)
        bottom_defs = [
            ('Z', 'Z', 'z', 'Z'), ('X', 'X', 'x', 'X'), ('C', 'C', 'c', 'C'), ('V', 'V', 'v', 'V'),
            ('B', 'B', 'b', 'B'), ('N', 'N', 'n', 'N'), ('M', 'M', 'm', 'M'),
            (',', ',', ',', '<'), ('.', '.', '.', '>'), ('/', '/', '/', '?')
        ]
        for i, (k_id, label, char, shift_c) in enumerate(bottom_defs):
            keys[k_id] = KeyTile(
                k_id, label, -3.2 + (i * 0.6), 0.7,
                width=0.52, height=0.52, row=1, col=i+1,
                char=char, shift_char=shift_c
            )
        keys['SHIFT_R'] = KeyTile('SHIFT_R', 'Shift ⇧', 3.3, 0.7, width=1.2, height=0.52, row=1, col=11, is_modifier=True)

        # Row 0: Modifier & Space Row (y = 0.0)
        keys['CTRL_L'] = KeyTile('CTRL_L', 'Ctrl', -4.2, 0.0, width=0.7, height=0.52, row=0, col=0, is_modifier=True)
        keys['WIN_L'] = KeyTile('WIN_L', '❖', -3.45, 0.0, width=0.6, height=0.52, row=0, col=1, is_modifier=True)
        keys['ALT_L'] = KeyTile('ALT_L', 'Alt', -2.8, 0.0, width=0.6, height=0.52, row=0, col=2, is_modifier=True)
        keys['SPACE'] = KeyTile('SPACE', 'SPACE', 0.1, 0.0, width=3.2, height=0.52, row=0, col=3, char=' ', shift_char=' ')
        keys['ALT_R'] = KeyTile('ALT_R', 'Alt', 2.8, 0.0, width=0.6, height=0.52, row=0, col=4, is_modifier=True)
        keys['FN'] = KeyTile('FN', 'Fn', 3.45, 0.0, width=0.6, height=0.52, row=0, col=5, is_modifier=True)
        keys['CTRL_R'] = KeyTile('CTRL_R', 'Ctrl', 4.15, 0.0, width=0.7, height=0.52, row=0, col=6, is_modifier=True)

        return keys

    @staticmethod
    def get_standard_3x2() -> Dict[str, KeyTile]:
        """A-F backward-compatible sub-layout."""
        return {
            'A': KeyTile('A', 'A', 0.0, 1.5, 0.5, 0.5, row=1, col=0, char='a', shift_char='A'),
            'B': KeyTile('B', 'B', 1.0, 1.5, 0.5, 0.5, row=1, col=1, char='b', shift_char='B'),
            'C': KeyTile('C', 'C', 2.0, 1.5, 0.5, 0.5, row=1, col=2, char='c', shift_char='C'),
            'D': KeyTile('D', 'D', 0.0, 0.0, 0.5, 0.5, row=0, col=0, char='d', shift_char='D'),
            'E': KeyTile('E', 'E', 1.0, 0.0, 0.5, 0.5, row=0, col=1, char='e', shift_char='E'),
            'F': KeyTile('F', 'F', 2.0, 0.0, 0.5, 0.5, row=0, col=2, char='f', shift_char='F'),
        }

    @staticmethod
    def get_dual_keyboards() -> Tuple[Dict[str, KeyTile], Dict[str, KeyTile]]:
        kbd_a = KeyboardLayout.get_full_keyboard()
        kbd_b = {}
        for k_id, tile in kbd_a.items():
            kbd_b[f"B_{k_id}"] = KeyTile(
                f"B_{k_id}", tile.label, tile.x + 9.5, tile.y,
                width=tile.width, height=tile.height, row=tile.row, col=tile.col,
                char=tile.char, shift_char=tile.shift_char, is_modifier=tile.is_modifier
            )
        return kbd_a, kbd_b

    @staticmethod
    def find_key_for_char(char: str, layout: Dict[str, KeyTile]) -> Optional[KeyTile]:
        """Finds the KeyTile responsible for typing a given character."""
        # Exact match
        for tile in layout.values():
            if tile.matches_char(char):
                return tile
        # Fallback to uppercase
        for tile in layout.values():
            if tile.label.upper() == char.upper():
                return tile
        return None


class KeyboardEnv:
    """Full Keyboard Environment supporting complete keyboard navigation, collisions, and verified typing."""

    def __init__(
        self,
        layout: Optional[Dict[str, KeyTile]] = None,
        max_steps: int = 150,
        default_start_pos: Tuple[float, float] = (0.0, -1.0),
        default_start_theta: float = math.pi / 2,
        seed: Optional[int] = None
    ):
        self.max_steps = max_steps
        self.default_start_pos = default_start_pos
        self.default_start_theta = default_start_theta
        self.layout = layout or KeyboardLayout.get_full_keyboard()

        if seed is not None:
            random.seed(seed)

        self.reset()

    def set_layout(self, new_layout: Dict[str, KeyTile]) -> None:
        self.layout = new_layout

    def reset(
        self,
        target_char: Optional[str] = None,
        custom_start_pos: Optional[Tuple[float, float]] = None,
        custom_start_theta: Optional[float] = None,
        obstacles: Optional[List[Tuple[float, float]]] = None
    ) -> Dict[str, Any]:
        self.target_char = target_char or 'E'
        target_tile = KeyboardLayout.find_key_for_char(self.target_char, self.layout)
        if target_tile:
            self.target_key = target_tile.id
            self.target_pos = (target_tile.x, target_tile.y)
        else:
            self.target_key = list(self.layout.keys())[0]
            self.target_pos = (self.layout[self.target_key].x, self.layout[self.target_key].y)

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
            'target_char': getattr(self, 'target_char', 'E'),
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
        pressed_char = None

        # Exact Proximity Collision Check for Key Press on full keyboard layout
        for k_id, tile in self.layout.items():
            dist_to_key = math.sqrt((tile.x - self.ant_x) ** 2 + (tile.y - self.ant_y) ** 2)
            threshold = (tile.width + tile.height) / 4.0 * 0.95
            if dist_to_key <= max(0.18, threshold):
                self.selected_key = k_id
                pressed_char = tile.char if self.target_char.islower() else tile.shift_char
                self.done = True
                if tile.matches_char(self.target_char) or k_id == self.target_key:
                    reward += config.reward_correct_key if config else 2.0
                    reward += config.reward_completion_bonus if config else 1.0
                    correct_press = True
                else:
                    reward += config.reward_wrong_key if config else -0.5
                    wrong_press = True
                break

        if not self.done and self.step_count >= self.max_steps:
            self.done = True
            reward += config.reward_timeout if config else -0.5

        self.total_reward += reward
        info = {
            'target_char': self.target_char,
            'target_key': self.target_key,
            'selected_key': self.selected_key,
            'pressed_char': pressed_char,
            'correct': correct_press,
            'wrong': wrong_press,
            'steps': self.step_count,
            'distance': self.total_distance
        }

        return self._get_state(), reward, self.done, info
