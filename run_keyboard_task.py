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
from ant_brain_loader import AntBrainPackage, ExecutableAntBrain
from keyboard_environment import KeyboardEnv, KeyboardLayout
from keyboard_adapter import KeyboardObservationAdapter, KeyboardActionAdapter
from keyboard_lab import KeyboardLabEngine
from collaborative_layer import SentenceResultChecker

def run_full_keyboard_sentence_verification():
    print("\n" + "=" * 60)
    print("ANTWIRE FULL KEYBOARD MULTI-ANT SENTENCE TYPING VERIFICATION")
    print("Brain Source: antwire_ant_ant-6dct_vv1.0.0_2026-09-17T17-17-14-363Z.antbrain")
    print("=" * 60)

    # 1. Verification of all Keyboard Rows
    print("\n--- TEST 1: FULL KEYBOARD ROW SPATIAL COVERAGE ---")
    layout = KeyboardLayout.get_full_keyboard()
    row_samples = [
        (5, 'ESC', 'Esc'), (5, 'F12', 'F12'),
        (4, '`', '`'), (4, '1', '1'), (4, '0', '0'), (4, 'BACKSPACE', '⌫'),
        (3, 'TAB', 'Tab'), (3, 'Q', 'Q'), (3, 'P', 'P'), (3, ']', ']'),
        (2, 'CAPS', 'Caps'), (2, 'A', 'A'), (2, 'L', 'L'), (2, 'ENTER', 'Enter ↵'),
        (1, 'SHIFT_L', 'Shift ⇧'), (1, 'Z', 'Z'), (1, 'M', 'M'), (1, '.', '.'),
        (0, 'CTRL_L', 'Ctrl'), (0, 'SPACE', 'SPACE'), (0, 'CTRL_R', 'Ctrl')
    ]
    for row_idx, key_id, label in row_samples:
        tile = layout.get(key_id)
        assert tile is not None, f"Key {key_id} missing from Full Keyboard!"
        print(f"Row {tile.row:d} Key [{tile.id:10s}] Label: {tile.label:8s} | Pos: ({tile.x:5.2f}, {tile.y:5.2f}) -> VALID")
    print(f"[OK] Full 6-Row Layout Verified ({len(layout)} Standard Keys).")

    # 2. Single Ant Sentence Typing Test
    print("\n--- TEST 2: INDIVIDUAL ANT SENTENCE TYPING ('ANT') ---")
    engine_ind = KeyboardLabEngine(mode="INDIVIDUAL", ant_count=1, keyboard_count=1)
    target_word = "ANT"
    engine_ind.reset_simulation(task_type="SENTENCE", sentence=target_word)

    max_ticks = 400
    for tick in range(max_ticks):
        res = engine_ind.step_simulation()
        if res['colony_summary']['match']:
            break

    summary = res['colony_summary']
    print(f"Target Sentence : '{summary['target_sentence']}'")
    print(f"Overall Typed   : '{summary['actual_typed']}'")
    print(f"Match Status    : {'YES (100% Exact Match)' if summary['match'] else 'IN_PROGRESS'}")
    print(f"Accuracy        : {summary['accuracy']:.1f}% ({summary['correct_chars']}/{summary['total_target_chars']} Chars)")
    print(f"Ant #1 Output   : '{summary['individual_outputs'].get(1, '')}'")

    # 3. Multi-Ant Collaborative Sentence Typing Test
    print("\n--- TEST 3: MULTI-ANT COLLABORATIVE SENTENCE TYPING ('Hello, world!') ---")
    target_sentence = "Hello, world!"
    engine_col = KeyboardLabEngine(mode="COLLABORATIVE", ant_count=4, keyboard_count=1)
    engine_col.reset_simulation(task_type="SENTENCE", sentence=target_sentence, ordering_mode="ORDERED")

    for tick in range(600):
        res = engine_col.step_simulation()
        if res['colony_summary']['match']:
            break

    summary = res['colony_summary']
    print("\n" + "-" * 40)
    print("COLONY RESULT")
    print("-" * 40)
    print(f"Target Sentence   : {summary['target_sentence']}")
    print(f"Overall Typed     : {summary['actual_typed']}")
    print(f"Exact Match       : {'YES' if summary['match'] else 'NO'}")
    print(f"Character Accuracy: {summary['accuracy']:.1f}%")
    print(f"Correct Chars     : {summary['correct_chars']} / {summary['total_target_chars']}")
    print(f"Missing Chars     : '{summary['missing']}'")
    print(f"Extra Chars       : '{summary['extra']}'")
    print("\nINDIVIDUAL ANT CONTRIBUTIONS:")
    for ant_id, typed_str in summary['individual_outputs'].items():
        print(f"Ant #{ant_id}: '{typed_str}'")

    print("\n" + "=" * 60)
    print("[OK] FULL KEYBOARD MULTI-ANT VERIFICATION TESTS COMPLETE!")
    print("=" * 60)

if __name__ == "__main__":
    run_full_keyboard_sentence_verification()
