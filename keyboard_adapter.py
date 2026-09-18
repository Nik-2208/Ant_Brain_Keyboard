import math
import random
from typing import Dict, List, Any, Tuple, Union

class KeyboardObservationAdapter:
    """Converts raw keyboard environment state into the 14-channel observation dictionary expected by the AntWire .antbrain package."""

    @staticmethod
    def get_observation_dict(env_state: Dict[str, Any], noise_level: float = 0.0) -> Dict[str, float]:
        ant_x = env_state['ant_x']
        ant_y = env_state['ant_y']
        ant_theta = env_state['ant_theta']
        target_pos = env_state['target_pos']
        step_count = env_state['step_count']
        max_steps = env_state['max_steps']
        obstacles = env_state.get('obstacles', [])

        dx = target_pos[0] - ant_x
        dy = target_pos[1] - ant_y
        dist = math.sqrt(dx * dx + dy * dy)

        target_angle = math.atan2(dy, dx)
        rel_angle = target_angle - ant_theta
        while rel_angle > math.pi: rel_angle -= 2 * math.pi
        while rel_angle < -math.pi: rel_angle += 2 * math.pi

        food_center = max(0.0, math.cos(rel_angle))
        food_left = max(0.0, math.sin(-rel_angle)) if rel_angle < 0 else 0.0
        food_right = max(0.0, math.sin(rel_angle)) if rel_angle > 0 else 0.0
        food_odor = 1.0 / (1.0 + dist)

        obstacle_center = 0.0
        for ox, oy in obstacles:
            if math.sqrt((ant_x - ox) ** 2 + (ant_y - oy) ** 2) < 0.4:
                obstacle_center = 1.0
                break

        energy = float(max_steps - step_count) / float(max_steps)

        if noise_level > 0.0:
            food_left = max(0.0, min(1.0, food_left + random.gauss(0, noise_level)))
            food_center = max(0.0, min(1.0, food_center + random.gauss(0, noise_level)))
            food_right = max(0.0, min(1.0, food_right + random.gauss(0, noise_level)))
            food_odor = max(0.0, min(1.0, food_odor + random.gauss(0, noise_level)))

        return {
            'foodLeft': food_left,
            'foodCenter': food_center,
            'foodRight': food_right,
            'food_left': food_left,
            'food_center': food_center,
            'food_right': food_right,
            'homeLeft': 0.0,
            'homeCenter': 0.0,
            'homeRight': 0.0,
            'foodOdorConcentration': food_odor,
            'food_odor': food_odor,
            'nestOdorConcentration': 0.1,
            'obstacleCenter': obstacle_center,
            'predatorProximity': 0.0,
            'energy': energy,
            'hunger': 0.5,
            'carryingFoodAmount': 0.0,
            'threatAvoidance': 0.0
        }

    @staticmethod
    def get_observation_array(obs_dict: Dict[str, float]) -> List[float]:
        return [
            obs_dict['foodLeft'], obs_dict['foodCenter'], obs_dict['foodRight'],
            obs_dict['homeLeft'], obs_dict['homeCenter'], obs_dict['homeRight'],
            obs_dict['foodOdorConcentration'], obs_dict['nestOdorConcentration'],
            obs_dict['obstacleCenter'], obs_dict['predatorProximity'],
            obs_dict['energy'], obs_dict['hunger'], obs_dict['carryingFoodAmount'], obs_dict['threatAvoidance']
        ]

class KeyboardActionAdapter:
    """Maps output dict from ExecutableAntBrain.step() into kinematic control variables [throttle, turn, depFood, depHome]."""

    @staticmethod
    def process_action(brain_output: Dict[str, Any]) -> Tuple[float, float, float, float]:
        throttle = brain_output.get("speed_throttle", 0.5)
        turn = brain_output.get("steering_bias", 0.0)
        dep_food = brain_output.get("deposit_food_trail", 0.0)
        dep_home = brain_output.get("deposit_home_trail", 0.0)
        return throttle, turn, dep_food, dep_home
