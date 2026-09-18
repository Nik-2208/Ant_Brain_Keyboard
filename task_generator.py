import re
from typing import Dict, List, Any, Tuple, Optional

class TaskGenerator:
    """
    Configurable Task Generator supporting arbitrary Sentence Typing, Character Sequences,
    and Dual-Keyboard Parallel Tasks across the full standard keyboard.
    """

    @staticmethod
    def create_single_target_task(target_char: str = "E") -> List[Dict[str, Any]]:
        char = target_char if target_char else "E"
        return [{
            'task_id': f"TASK_SINGLE_1_{char}",
            'target_char': char,
            'target_key': char.upper(),
            'keyboard_id': 'KEYBOARD_A',
            'order': 1,
            'original_char': char
        }]

    @staticmethod
    def create_sentence_task(sentence: str = "Hello, world!", keyboard_id: str = "KEYBOARD_A") -> List[Dict[str, Any]]:
        """
        Deconstructs a target sentence into an exact sequence of character typing tasks.
        Maintains unique task IDs for repeated characters (e.g. 'l' in 'Hello').
        """
        if not sentence:
            sentence = "Hello, world!"

        tasks = []
        for idx, char in enumerate(sentence):
            tasks.append({
                'task_id': f"TASK_SENT_{idx+1}_{ord(char)}_{char}",
                'target_char': char,
                'target_key': char.upper() if char.isalnum() else f"SYM_{ord(char)}",
                'keyboard_id': keyboard_id,
                'order': idx + 1,
                'original_char': char
            })
        return tasks

    @staticmethod
    def create_word_sequence_task(sequence: str = "DECAF") -> List[Dict[str, Any]]:
        """Legacy helper for character sequences."""
        return TaskGenerator.create_sentence_task(sequence, keyboard_id='KEYBOARD_A')

    @staticmethod
    def create_dual_keyboard_tasks(sentence_a: str = "Hello", sentence_b: str = "World") -> List[Dict[str, Any]]:
        """Generates parallel tasks across Dual Keyboards."""
        tasks_a = TaskGenerator.create_sentence_task(sentence_a, keyboard_id='KEYBOARD_A')
        for t in tasks_a:
            t['task_id'] = f"KBD_A_{t['task_id']}"

        tasks_b = TaskGenerator.create_sentence_task(sentence_b, keyboard_id='KEYBOARD_B')
        for t in tasks_b:
            t['task_id'] = f"KBD_B_{t['task_id']}"

        return tasks_a + tasks_b
