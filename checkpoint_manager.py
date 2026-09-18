import os
import json
import copy
import sys
from typing import Dict, Any, Tuple

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ant_brain_loader import AntBrainPackage, ExecutableAntBrain

class CheckpointManager:
    """Manages saving, loading, and checkpointing for the authoritative AntWire .antbrain package."""

    def __init__(self, config: Any):
        self.config = config
        self.checkpoints_dir = config.get_full_path(config.checkpoints_dir)
        os.makedirs(self.checkpoints_dir, exist_ok=True)
        self.model_file = config.get_full_path(config.model_file)

    def load_original_package(self) -> AntBrainPackage:
        return AntBrainPackage(self.model_file)

    def load_checkpoint(self, checkpoint_path: str) -> Dict[str, Any]:
        full_path = self.config.get_full_path(checkpoint_path)
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"Checkpoint file not found at: {full_path}")
        with open(full_path, 'r') as f:
            data = json.load(f)
        return data

    def save_checkpoint(
        self,
        package: AntBrainPackage,
        trainable_params: list,
        episode: int,
        curriculum_phase: int,
        metrics: Dict[str, Any],
        filename: str
    ) -> str:
        data = {
            'manifest': copy.deepcopy(package.manifest),
            'architecture': copy.deepcopy(package.architecture),
            'trainable_params': copy.deepcopy(trainable_params),
            'trainingStep': episode,
            'episodeCount': episode,
            'curriculumPhase': curriculum_phase,
            'metrics': metrics
        }
        full_path = self.config.get_full_path(os.path.join(self.config.checkpoints_dir, filename))
        with open(full_path, 'w') as f:
            json.dump(data, f, indent=2)
        return full_path

    def save_final_policy(
        self,
        package: AntBrainPackage,
        trainable_params: list,
        episode: int,
        curriculum_phase: int,
        metrics: Dict[str, Any]
    ) -> str:
        data = {
            'manifest': copy.deepcopy(package.manifest),
            'architecture': copy.deepcopy(package.architecture),
            'trainable_params': copy.deepcopy(trainable_params),
            'trainingStep': episode,
            'episodeCount': episode,
            'curriculumPhase': curriculum_phase,
            'metrics': metrics
        }
        full_path = self.config.get_full_path(self.config.output_model_path)
        with open(full_path, 'w') as f:
            json.dump(data, f, indent=2)
        return full_path
