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
from ant_brain_loader import AntBrainPackage, ExecutableAntBrain
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
    """Scalable Curriculum Training Pipeline using the authoritative AntWire .antbrain package."""

    def __init__(self, config: KeyboardTrainingConfig):
        self.config = config
        self.checkpoint_mgr = CheckpointManager(config)
        self.env = KeyboardEnv(seed=config.seed)

        if config.seed is not None:
            random.seed(config.seed)

        self.start_episode = 1
        self.curriculum_phase = config.current_phase

        print(f"Loading authoritative AntBrainPackage from: {config.model_file}")
        self.package = self.checkpoint_mgr.load_original_package()
        self.brain = ExecutableAntBrain(self.package)

        if config.resume and config.checkpoint_to_resume:
            print(f"Resuming training from checkpoint: {config.checkpoint_to_resume}")
            cp = self.checkpoint_mgr.load_checkpoint(config.checkpoint_to_resume)
            if 'trainable_params' in cp:
                self.brain.set_trainable_parameters(cp['trainable_params'])
            self.start_episode = cp.get('episodeCount', 1) + 1
            self.curriculum_phase = cp.get('curriculumPhase', 1)

        self.params = self.brain.get_trainable_parameters()
        self.trajectory_file = self.config.get_full_path(self.config.trajectory_csv_path)

        if not os.path.exists(self.trajectory_file):
            with open(self.trajectory_file, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(['episode', 'step', 'timestamp', 'ant_x', 'ant_y', 'target', 'action_throttle', 'action_turn', 'reward', 'done', 'success', 'phase'])

    def set_flat_params(self, params: List[float]) -> None:
        self.brain.set_trainable_parameters(params)
        self.params = list(params)

    def run_training(self) -> None:
        print(f"\n==================================================")
        print(f"STARTING ANT KEYBOARD CURRICULUM TRAINING")
        print(f"Model Manifest   : {self.package.manifest.get('antId')} ({self.package.manifest.get('modelVersion')})")
        print(f"Neurons / Synapses: {len(self.package.neurons)} / {len(self.package.synapses)}")
        print(f"Trainable Weights: {len(self.params)} Parameters")
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
                candidate_params = [p + sigma * n for p, n in zip(self.params, noise)]
                self.brain.set_trainable_parameters(candidate_params)

                ep_reward, _ = self.evaluate_episode(p_cfg, log_trajectory=(episode % 500 == 0))
                noise_samples.append(noise)
                returns.append(ep_reward)

            # Natural Evolution Strategy Gradient Step
            mean_ret = sum(returns) / len(returns)
            std_ret = math.sqrt(sum((r - mean_ret) ** 2 for r in returns) / max(1, len(returns) - 1)) + 1e-8
            normalized_returns = [(r - mean_ret) / std_ret for r in returns]

            grad = [0.0] * len(self.params)
            for i in range(len(self.params)):
                for p_idx in range(pop_size):
                    grad[i] += normalized_returns[p_idx] * noise_samples[p_idx][i]
                grad[i] /= (pop_size * sigma)

            new_params = [p + lr * g for p, g in zip(self.params, grad)]
            self.set_flat_params(new_params)

            if episode % 500 == 0 or episode == 1:
                eval_reward, success = self.evaluate_episode(p_cfg, log_trajectory=True, record_csv=True, ep_num=episode)
                print(f"[Episode {episode:6d} | Phase {self.curriculum_phase}] Mean Reward: {mean_ret:6.2f} | Eval Reward: {eval_reward:6.2f} | Success: {'YES' if success else 'NO'}")

            if episode % self.config.checkpoint_interval == 0:
                cp_name = f"checkpoint_ep_{episode}_phase_{self.curriculum_phase}.json"
                cp_path = self.checkpoint_mgr.save_checkpoint(
                    self.package,
                    self.params,
                    episode,
                    self.curriculum_phase,
                    {'mean_reward': mean_ret, 'eval_reward': eval_reward},
                    cp_name
                )
                print(f"[*] Checkpoint saved at episode {episode}: {cp_name}")

        final_path = self.checkpoint_mgr.save_final_policy(
            self.package,
            self.params,
            total_episodes,
            self.curriculum_phase,
            {'final_mean_reward': mean_ret}
        )
        print(f"\n[+] Training Complete! Final policy saved to: {final_path}")

    def evaluate_episode(self, p_cfg: Dict[str, Any], log_trajectory: bool = False, record_csv: bool = False, ep_num: int = 0) -> Tuple[float, bool]:
        target_k = random.choice(list(self.env.layout.keys())) if p_cfg['randomize_target'] else 'E'
        start_x = random.uniform(0.0, 2.0) if p_cfg['randomize_start'] else 1.0
        start_y = random.uniform(-1.2, -0.6) if p_cfg['randomize_start'] else -0.8
        start_theta = random.uniform(0, math.pi) if p_cfg['randomize_start'] else (math.pi / 2)

        env_state = self.env.reset(
            target_key=target_k,
            custom_start_pos=(start_x, start_y),
            custom_start_theta=start_theta
        )
        self.brain.reset()

        total_r = 0.0
        step_idx = 0
        success = False
        csv_rows = []

        while not self.env.done:
            step_idx += 1
            obs_dict = KeyboardObservationAdapter.get_observation_dict(env_state, noise_level=p_cfg['noise'])
            brain_out = self.brain.step(obs_dict)
            throttle, turn, _, _ = KeyboardActionAdapter.process_action(brain_out)

            env_state, r, done, info = self.env.step([throttle, turn], config=self.config)
            total_r += r

            if info.get('correct', False):
                success = True

            if record_csv:
                csv_rows.append([
                    ep_num, step_idx, time.time(),
                    env_state['ant_x'], env_state['ant_y'],
                    env_state['target_key'], throttle, turn,
                    r, done, success, self.curriculum_phase
                ])

        if record_csv and csv_rows:
            with open(self.trajectory_file, 'a', newline='') as f:
                writer = csv.writer(f)
                writer.writerows(csv_rows)

        return total_r, success
