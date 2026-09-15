import random
from typing import Dict, List, Any, Tuple

VALID_KEYS = {'A', 'B', 'C', 'D', 'E', 'F'}

class TaskGenerator:
    """Configurable Task Generator for Single-Key, A-F Word-Sequences, and Dual-Keyboard Parallel Tasks."""

    @staticmethod
    def create_single_target_task(target_key: str = "E") -> List[Dict[str, Any]]:
        target = target_key.upper() if target_key.upper() in VALID_KEYS else "E"
        return [{
            'task_id': f"TASK_SINGLE_1_{target}",
            'target_key': target,
            'keyboard_id': 'KEYBOARD_A'
        }]

    @staticmethod
    def create_word_sequence_task(sequence: str = "FACE") -> List[Dict[str, Any]]:
        cleaned = [c.upper() for c in sequence if c.upper() in VALID_KEYS]
        if not cleaned:
            cleaned = ['F', 'A', 'C', 'E']

        tasks = []
        for idx, char in enumerate(cleaned):
            tasks.append({
                'task_id': f"TASK_SEQ_{idx+1}_{char}",
                'target_key': char,
                'keyboard_id': 'KEYBOARD_A',
                'order': idx + 1,
                'original_char': char
            })
        return tasks

    @staticmethod
    def create_dual_keyboard_tasks(word_a: str = "FACE", word_b: str = "CAFE") -> List[Dict[str, Any]]:
        tasks_a = TaskGenerator.create_word_sequence_task(word_a)
        for t in tasks_a:
            t['keyboard_id'] = 'KEYBOARD_A'
            t['task_id'] = f"KBD_A_{t['task_id']}"

        tasks_b = TaskGenerator.create_word_sequence_task(word_b)
        for t in tasks_b:
            t['keyboard_id'] = 'KEYBOARD_B'
            t['task_id'] = f"KBD_B_{t['task_id']}"

        return tasks_a + tasks_b
