import os
from dataclasses import dataclass, field
from typing import Dict, Tuple, List, Optional

@dataclass
class KeyboardTrainingConfig:
    # Training Loop Parameters
    episodes: int = 100000
    max_steps: int = 50
    learning_rate: float = 0.04
    gamma: float = 0.99
    sigma: float = 0.05               # Perturbation scale for NES over synapses
    population_size: int = 40
    checkpoint_interval: int = 5000
    seed: int = 42

    # Paths
    project_dir: str = field(default_factory=lambda: os.path.dirname(os.path.abspath(__file__)))
    model_dir: str = "ant_brain_model_v1_20260915_standard"
    output_model_path: str = "keyboard_policy_v1.json"
    checkpoints_dir: str = "checkpoints"
    trajectory_csv_path: str = "training_trajectories.csv"

    # Resume Settings
    resume: bool = False
    checkpoint_to_resume: Optional[str] = None

    # Default Keyboard Layout (3x2 grid)
    keyboard_layout: Dict[str, Tuple[float, float]] = field(default_factory=lambda: {
        'A': (0.0, 1.0), 'B': (1.0, 1.0), 'C': (2.0, 1.0),
        'D': (0.0, 0.0), 'E': (1.0, 0.0), 'F': (2.0, 0.0)
    })

    # Task & Curriculum Controls
    curriculum_enabled: bool = True
    current_phase: int = 1
    
    # Domain Randomization Options
    randomize_start: bool = False
    randomize_target: bool = True
    randomize_layout: bool = False
    obstacles_enabled: bool = False
    observation_noise: float = 0.0

    # Reward Formulation
    reward_correct_key: float = 1.0
    reward_wrong_key: float = -1.0
    reward_step_penalty: float = -0.01
    reward_unnecessary_movement: float = -0.01
    reward_timeout: float = -0.5
    reward_invalid_action: float = -0.05
    reward_completion_bonus: float = 1.0

    def get_full_path(self, relative_path: str) -> str:
        if os.path.isabs(relative_path):
            return relative_path
        return os.path.join(self.project_dir, relative_path)
