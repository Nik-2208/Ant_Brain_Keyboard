import os
import json
import math
import random
import csv
import copy
import time
import sys
from typing import Dict, List, Any, Tuple, Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ant_brain_model_v1_20260915_standard.run_model import load_model, ExecutableAntBrain
from config import KeyboardTrainingConfig
from keyboard_environment import KeyboardEnv
from keyboard_adapter import KeyboardObservationAdapter, KeyboardActionAdapter
from checkpoint_manager import CheckpointManager

class TaskGenerator:
    """Configurable Task & Domain Randomizer for Progressive Curriculum Learning."""

    @staticmethod
    def get_phase_config(phase: int) -> Dict[str, Any]:
        configs = {
            1: {'randomize_start': False, 'randomize_target': True, 'randomize_layout': False, 'obstacles': False, 'dist_scale': 1.0, 'noise': 0.0},
            2: {'randomize_start': True,  'randomize_target': True, 'randomize_layout': False, 'obstacles': False, 'dist_scale': 1.0, 'noise': 0.0},
            3: {'randomize_start': True,  'randomize_target': True, 'randomize_layout': False, 'obstacles': False, 'dist_scale': 1.2, 'noise': 0.0},
            4: {'randomize_start': True,  'randomize_target': True, 'randomize_layout': True,  'obstacles': False, 'dist_scale': 1.2, 'noise': 0.0},
            5: {'randomize_start': True,  'randomize_target': True, 'randomize_layout': False, 'obstacles': True,  'dist_scale': 1.2, 'noise': 0.0},
            6: {'randomize_start': True,  'randomize_target': True, 'randomize_layout': False, 'obstacles': True,  'dist_scale': 1.8, 'noise': 0.0},
            7: {'randomize_start': True,  'randomize_target': True, 'randomize_layout': True,  'obstacles': True,  'dist_scale': 1.8, 'noise': 0.05},
            8: {'randomize_start': True,  'randomize_target': True, 'randomize_layout': True,  'obstacles': True,  'dist_scale': 2.2, 'noise': 0.08}
        }
        return configs.get(phase, configs[1])

class CurriculumTrainer:
    """Scalable Curriculum Training Pipeline using ant_brain_model_v1_20260915_standard."""

    def __init__(self, config: KeyboardTrainingConfig):
        self.config = config
        self.checkpoint_mgr = CheckpointManager(config)
        self.env = KeyboardEnv(seed=config.seed)

        if config.seed is not None:
            random.seed(config.seed)

        self.start_episode = 1
        self.curriculum_phase = config.current_phase

        if config.resume and config.checkpoint_to_resume:
            print(f"Resuming training from checkpoint: {config.checkpoint_to_resume}")
            cp = self.checkpoint_mgr.load_checkpoint(config.checkpoint_to_resume)
            self.manifest = cp['manifest']
            self.neurons = cp['neurons']
            self.synapses = cp['synapses']
            self.start_episode = cp.get('episodeCount', 1) + 1
            self.curriculum_phase = cp.get('curriculumPhase', 1)
        else:
            print(f"Loading ant_brain_model_v1_20260915_standard from: {config.model_dir}")
            self.manifest, self.neurons, self.synapses = self.checkpoint_mgr.load_original_model()

        self.brain = ExecutableAntBrain(self.manifest, self.neurons, self.synapses)
        self.params = [s["weight"] for s in self.synapses]
        self.trajectory_file = self.config.get_full_path(self.config.trajectory_csv_path)

        if not os.path.exists(self.trajectory_file):
            with open(self.trajectory_file, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(['episode', 'step', 'timestamp', 'ant_x', 'ant_y', 'target', 'action_throttle', 'action_turn', 'reward', 'done', 'success', 'phase'])

    def set_flat_params(self, params: List[float]) -> None:
        for idx, s in enumerate(self.synapses):
            s["weight"] = params[idx]
        self.params = list(params)

    def run_training(self) -> None:
        print(f"\n==================================================")
        print(f"STARTING ANT KEYBOARD CURRICULUM TRAINING")
        print(f"Model            : {self.manifest['model_name']}")
        print(f"Neurons / Synapses: {len(self.neurons)} / {len(self.synapses)}")
        print(f"Target Episodes  : {self.config.episodes}")
        print(f"Start Episode    : {self.start_episode}")
        print(f"Trajectory File  : {self.trajectory_file}")
        print(f"==================================================\n")

        total_episodes = self.config.episodes
        pop_size = self.config.population_size
        sigma = self.config.sigma
        lr = self.config.learning_rate

        for episode in range(self.start_episode, total_episodes + 1):
            if self.config.curriculum_enabled:
                self.curriculum_phase = min(8, max(1, (episode // 12500) + 1))

            p_cfg = TaskGenerator.get_phase_config(self.curriculum_phase)

            noise_samples = []
            returns = []

            for _ in range(pop_size):
                noise = [random.gauss(0, 1) for _ in range(len(self.params))]

                # + Noise
                p_plus = [self.params[i] + sigma * noise[i] for i in range(len(self.params))]
                self.set_flat_params(p_plus)
                r_plus, _ = self._rollout_episode(p_cfg, log_trajectory=False, episode_num=episode)

                # - Noise
                p_minus = [self.params[i] - sigma * noise[i] for i in range(len(self.params))]
                self.set_flat_params(p_minus)
                r_minus, _ = self._rollout_episode(p_cfg, log_trajectory=False, episode_num=episode)

                noise_samples.append(noise)
                returns.append((r_plus, r_minus))

            # Apply Parameter Update to Synapse Weights
            for i in range(len(self.params)):
                grad = 0.0
                for k in range(pop_size):
                    r_p, r_m = returns[k]
                    grad += (r_p - r_m) * noise_samples[k][i]
                grad /= (2 * pop_size * sigma)
                self.params[i] += lr * grad

            self.set_flat_params(self.params)

            mean_reward, traj_records = self._rollout_episode(p_cfg, log_trajectory=True, episode_num=episode)
            self._append_trajectories(traj_records)

            if episode % 100 == 0 or episode == 1:
                print(f"Episode {episode:06d}/{total_episodes} | Phase {self.curriculum_phase} | Return: {mean_reward:+.3f} | Target: {self.env.target_key}")

            if episode % self.config.checkpoint_interval == 0 or episode == total_episodes:
                cp_filename = f"checkpoint_{episode:05d}.json"
                metrics = {'meanReward': mean_reward, 'episodesCompleted': episode}
                cp_path = self.checkpoint_mgr.save_checkpoint(
                    self.manifest, self.neurons, self.synapses, episode, self.curriculum_phase, metrics, cp_filename
                )
                print(f" [CHECKPOINT SAVED] -> {cp_path}")

        final_path = self.checkpoint_mgr.save_final_policy(
            self.manifest, self.neurons, self.synapses, total_episodes, self.curriculum_phase, {'episodesCompleted': total_episodes}
        )
        print(f"\n==================================================")
        print(f"TRAINING COMPLETE! FINAL MODEL SAVED TO:")
        print(f"{final_path}")
        print(f"==================================================")

    def _rollout_episode(self, p_cfg: Dict[str, Any], log_trajectory: bool = False, episode_num: int = 1) -> Tuple[float, List[List[Any]]]:
        start_pos = None
        if p_cfg['randomize_start']:
            start_pos = (random.uniform(-0.5, 2.5), random.uniform(-1.5, -0.5))

        layout = None
        if p_cfg['randomize_layout']:
            layout = {
                'D': (0.0, 1.0), 'E': (1.0, 1.0), 'F': (2.0, 1.0),
                'A': (0.0, 0.0), 'B': (1.0, 0.0), 'C': (2.0, 0.0)
            }

        obstacles = [(0.5, 0.5), (1.5, 0.5)] if p_cfg['obstacles'] else []

        env_state = self.env.reset(
            custom_start_pos=start_pos,
            obstacles=obstacles,
            layout_override=layout
        )

        self.brain.reset()
        total_r = 0.0
        traj_records = []
        timestamp = time.time()

        while not self.env.done:
            obs_dict = KeyboardObservationAdapter.get_observation_dict(env_state, noise_level=p_cfg['noise'])
            brain_output = self.brain.step(obs_dict)
            throttle, turn, dep_food, dep_home = KeyboardActionAdapter.process_action(brain_output)

            env_state, r, done, info = self.env.step([throttle, turn, dep_food, dep_home], config=self.config)
            total_r += r

            if log_trajectory:
                traj_records.append([
                    episode_num, env_state['step_count'], timestamp,
                    f"{env_state['ant_x']:.3f}", f"{env_state['ant_y']:.3f}",
                    env_state['target_key'], f"{throttle:.3f}", f"{turn:.3f}",
                    f"{r:.3f}", 1 if done else 0, 1 if info.get('correct', False) else 0,
                    self.curriculum_phase
                ])

        return total_r, traj_records

    def _append_trajectories(self, records: List[List[Any]]) -> None:
        if not records: return
        with open(self.trajectory_file, 'a', newline='') as f:
            writer = csv.writer(f)
            writer.writerows(records)
