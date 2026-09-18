import os
import zipfile
import json
import math
import copy
from typing import Dict, List, Any, Tuple, Optional

class AntBrainPackage:
    """
    Authoritative Loader and Container for the AntWire `.antbrain` package.
    Parses manifest, architecture, biological neurons (128 nodes), synapses (256 edges),
    regions, learned parameters, sensors mapping, action space, memory, and runtime states.
    """

    EXPECTED_FILENAME = "antwire_ant_ant-6dct_vv1.0.0_2026-09-17T17-17-14-363Z.antbrain"

    def __init__(self, file_path_or_dir: Optional[str] = None):
        self.package_path = file_path_or_dir or self._find_default_package()
        self.manifest: Dict[str, Any] = {}
        self.architecture: Dict[str, Any] = {}
        self.neurons: List[Dict[str, Any]] = []
        self.synapses: List[Dict[str, Any]] = []
        self.regions: Dict[str, Any] = {}
        self.learned_params: Dict[str, Any] = {}
        self.sensor_config: Dict[str, Any] = {}
        self.sensory_mapping: Dict[str, Any] = {}
        self.action_space: Dict[str, Any] = {}
        self.motor_config: Dict[str, Any] = {}
        self.reward_config: Dict[str, Any] = {}
        self.training_state: Dict[str, Any] = {}
        self.optimizer_state: Dict[str, Any] = {}
        self.memory: Dict[str, Any] = {}
        self.body: Dict[str, Any] = {}
        self.colony: Dict[str, Any] = {}

        self._load_and_validate()

    def _find_default_package(self) -> str:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        exact_path = os.path.join(base_dir, self.EXPECTED_FILENAME)
        if os.path.exists(exact_path):
            return exact_path
        
        extracted_pkg = os.path.join(base_dir, "ant_brain_pkg")
        if os.path.exists(os.path.join(extracted_pkg, "manifest.json")):
            return extracted_pkg
            
        raise FileNotFoundError(
            f"CRITICAL: Exact authoritative brain package '{self.EXPECTED_FILENAME}' not found in {base_dir}!"
        )

    def _load_and_validate(self):
        if os.path.isdir(self.package_path):
            self._load_from_dir(self.package_path)
        elif zipfile.is_zipfile(self.package_path):
            self._load_from_zip(self.package_path)
        else:
            raise ValueError(f"Invalid .antbrain file format at: {self.package_path}")

        self._validate_package()

    def _load_from_zip(self, zip_path: str):
        with zipfile.ZipFile(zip_path, 'r') as z:
            def read_json(name: str) -> Any:
                if name in z.namelist():
                    return json.loads(z.read(name).decode('utf-8'))
                return None

            self.manifest = read_json('manifest.json') or {}
            self.architecture = read_json('brain/architecture.json') or {}
            self.neurons = read_json('brain/neurons.json') or []
            self.synapses = read_json('brain/synapses.json') or []
            self.regions = read_json('brain/regions.json') or {}
            self.learned_params = read_json('learning/learned_parameters.json') or {}
            self.sensor_config = read_json('sensors/sensor_config.json') or {}
            self.sensory_mapping = read_json('sensors/sensory_mapping.json') or {}
            self.action_space = read_json('motor/action_space.json') or {}
            self.motor_config = read_json('motor/motor_config.json') or {}
            self.reward_config = read_json('learning/reward_config.json') or {}
            self.training_state = read_json('learning/training_state.json') or {}
            self.optimizer_state = read_json('learning/optimizer_state.json') or {}

    def _load_from_dir(self, dir_path: str):
        def read_json(rel_path: str) -> Any:
            p = os.path.join(dir_path, rel_path)
            if os.path.exists(p):
                with open(p, 'r', encoding='utf-8') as f:
                    return json.load(f)
            return None

        self.manifest = read_json('manifest.json') or {}
        self.architecture = read_json('brain/architecture.json') or {}
        self.neurons = read_json('brain/neurons.json') or []
        self.synapses = read_json('brain/synapses.json') or []
        self.regions = read_json('brain/regions.json') or {}
        self.learned_params = read_json('learning/learned_parameters.json') or {}
        self.sensor_config = read_json('sensors/sensor_config.json') or {}
        self.sensory_mapping = read_json('sensors/sensory_mapping.json') or {}
        self.action_space = read_json('motor/action_space.json') or {}
        self.motor_config = read_json('motor/motor_config.json') or {}
        self.reward_config = read_json('learning/reward_config.json') or {}
        self.training_state = read_json('learning/training_state.json') or {}
        self.optimizer_state = read_json('learning/optimizer_state.json') or {}

    def _validate_package(self):
        # Validate manifest
        if not self.manifest:
            raise ValueError("Validation failed: missing manifest.json in .antbrain package.")
        
        # Check model and ant info
        ant_id = self.manifest.get("antId", "")
        if ant_id != "Ant-6DCT":
            raise ValueError(f"Validation failed: Unexpected antId '{ant_id}', expected 'Ant-6DCT'.")

        # Validate neurons & synapses
        if len(self.neurons) != 128:
            raise ValueError(f"Validation failed: Expected 128 neurons, found {len(self.neurons)}.")
        if len(self.synapses) != 256:
            raise ValueError(f"Validation failed: Expected 256 synapses, found {len(self.synapses)}.")

        # Validate learned parameters
        if "input_weights" not in self.learned_params or "output_weights" not in self.learned_params:
            raise ValueError("Validation failed: Learned weight tensors missing in learning/learned_parameters.json.")

        # Validate dimensions
        in_w = self.learned_params["input_weights"] # 16 x 14
        out_w = self.learned_params["output_weights"] # 4 x 16
        if len(in_w) != 16 or len(in_w[0]) != 14:
            raise ValueError(f"Validation failed: input_weights dimensions mismatch ({len(in_w)}x{len(in_w[0])} != 16x14).")
        if len(out_w) != 4 or len(out_w[0]) != 16:
            raise ValueError(f"Validation failed: output_weights dimensions mismatch ({len(out_w)}x{len(out_w[0])} != 4x16).")


class ExecutableAntBrain:
    """
    Executable Ant Brain instance initialized from the authoritative .antbrain package.
    Integrates:
    - 128 LIF Spiking Neurons with biological resting potential (-65mV), threshold (-45mV), decay & refractories.
    - 256 STDP Weighted Synapses with excitatory/inhibitory neurotransmitter propagation.
    - 16x14 + 4x16 Trainable Policy MLP Tensors representing learned mushroom body / central complex transformations.
    - Fully independent runtime membrane potentials and spike registers per instance.
    """

    def __init__(self, package: AntBrainPackage):
        self.package = package
        self.manifest = package.manifest
        self.neurons = copy.deepcopy(package.neurons)
        self.synapses = copy.deepcopy(package.synapses)
        self.learned_params = copy.deepcopy(package.learned_params)

        # Trainable parameters
        self.input_weights = [list(row) for row in self.learned_params["input_weights"]]
        self.hidden_biases = list(self.learned_params["hidden_biases"])
        self.output_weights = [list(row) for row in self.learned_params["output_weights"]]
        self.output_biases = list(self.learned_params["output_biases"])

        # Per-agent independent LIF runtime state
        self.neuron_states: Dict[str, float] = {}
        self.spikes: Dict[str, bool] = {}
        self.refractory_states: Dict[str, float] = {}
        self.working_memory: List[float] = [0.0] * 8
        self.reset()

    def reset(self):
        for n in self.neurons:
            nid = n["id"]
            self.neuron_states[nid] = n.get("resting_potential", -65.0)
            self.spikes[nid] = False
            self.refractory_states[nid] = 0.0
        self.working_memory = [0.0] * 8

    def get_trainable_parameters(self) -> List[float]:
        """Returns flat vector of all trainable learned parameters."""
        flat = []
        for row in self.input_weights:
            flat.extend(row)
        flat.extend(self.hidden_biases)
        for row in self.output_weights:
            flat.extend(row)
        flat.extend(self.output_biases)
        return flat

    def set_trainable_parameters(self, flat_params: List[float]):
        """Sets flat vector of trainable learned parameters."""
        idx = 0
        for r in range(16):
            for c in range(14):
                self.input_weights[r][c] = flat_params[idx]
                idx += 1
        for i in range(16):
            self.hidden_biases[i] = flat_params[idx]
            idx += 1
        for r in range(4):
            for c in range(16):
                self.output_weights[r][c] = flat_params[idx]
                idx += 1
        for i in range(4):
            self.output_biases[i] = flat_params[idx]
            idx += 1

    def step(self, sensory_inputs: Dict[str, float], dt: float = 0.016) -> Dict[str, Any]:
        """
        Runs one step of closed-loop sensory inference:
        Sensory Inputs -> 14-dim observation -> LIF Sensory Propagation -> Synaptic Transmissions -> Policy Tensors -> Motor Output.
        """
        food_left = sensory_inputs.get("foodLeft", sensory_inputs.get("food_left", 0.0))
        food_center = sensory_inputs.get("foodCenter", sensory_inputs.get("food_center", 0.0))
        food_right = sensory_inputs.get("foodRight", sensory_inputs.get("food_right", 0.0))
        food_odor = sensory_inputs.get("foodOdorConcentration", sensory_inputs.get("food_odor", 0.5))
        energy = sensory_inputs.get("energy", 1.0)
        obstacle = sensory_inputs.get("obstacleCenter", 0.0)

        # 14-channel sensory observation vector
        obs_14 = [
            food_left, food_center, food_right,
            sensory_inputs.get("homeLeft", 0.0),
            sensory_inputs.get("homeCenter", 0.0),
            sensory_inputs.get("homeRight", 0.0),
            food_odor,
            sensory_inputs.get("nestOdorConcentration", 0.1),
            obstacle,
            sensory_inputs.get("predatorProximity", 0.0),
            energy,
            sensory_inputs.get("hunger", 0.5),
            sensory_inputs.get("carryingFoodAmount", 0.0),
            sensory_inputs.get("threatAvoidance", 0.0)
        ]

        # 1. LIF Sensory Depolarization (Antennal Lobe / Sensory Neurons 0-9)
        for i in range(min(10, len(self.neurons))):
            nid = self.neurons[i]["id"]
            if i in (0, 1, 2):
                drive = food_left * 25.0
            elif i in (3, 4, 5):
                drive = food_center * 30.0
            elif i in (6, 7, 8):
                drive = food_right * 25.0
            else:
                drive = food_odor * 20.0
            self.neuron_states[nid] += drive * dt

        # 2. Synaptic Transmissions (256 synapses)
        for s in self.synapses:
            if not s.get("enabled", True):
                continue
            pre = s["pre_neuron"]
            post = s["post_neuron"]
            if self.spikes.get(pre, False):
                weight = s.get("weight", 0.5)
                sign = 1.0 if s.get("type") == "EXCITATORY" else -1.0
                if post in self.neuron_states:
                    self.neuron_states[post] += sign * weight * 6.0

        # 3. Spike Generation & Membrane Leak
        fired_count = 0
        for n in self.neurons:
            nid = n["id"]
            thresh = n.get("threshold", -45.0)
            rest = n.get("resting_potential", -65.0)
            decay = n.get("decay", 0.1)

            if self.neuron_states[nid] >= thresh:
                self.spikes[nid] = True
                self.neuron_states[nid] = rest
                fired_count += 1
            else:
                self.spikes[nid] = False
                leak = (rest - self.neuron_states[nid]) * decay
                self.neuron_states[nid] += leak

        # 4. Learned Policy MLP Forward Pass (14 inputs -> 16 hidden ReLU -> 4 outputs)
        hidden = [0.0] * 16
        for h in range(16):
            s = self.hidden_biases[h]
            for inp_i in range(14):
                s += obs_14[inp_i] * self.input_weights[h][inp_i]
            hidden[h] = max(0.0, s) # ReLU

        out_4 = [0.0] * 4
        for o in range(4):
            s = self.output_biases[o]
            for h in range(16):
                s += hidden[h] * self.output_weights[o][h]
            out_4[o] = s

        # Continuous channels: [0]=throttle, [1]=turn, [2]=depFood, [3]=depHome
        # Merge with motor neuron pool spikes for biological fidelity
        left_motor_spikes = sum(1.0 for n in self.neurons[-10:-5] if self.spikes[n["id"]])
        right_motor_spikes = sum(1.0 for n in self.neurons[-5:] if self.spikes[n["id"]])
        bio_turn = (left_motor_spikes - right_motor_spikes) * 0.2

        raw_throttle = 0.5 + 0.5 * math.tanh(out_4[0])
        raw_turn = math.tanh(out_4[1] + bio_turn)

        return {
            "action": "MOVE_AND_STEER",
            "speed_throttle": max(0.1, min(1.0, raw_throttle)),
            "steering_bias": max(-1.0, min(1.0, raw_turn)),
            "spikes_fired": fired_count,
            "deposit_food_trail": max(0.0, min(1.0, math.tanh(out_4[2]))),
            "deposit_home_trail": max(0.0, min(1.0, math.tanh(out_4[3])))
        }

def load_authoritative_brain() -> Tuple[AntBrainPackage, ExecutableAntBrain]:
    """Single authoritative brain loader function."""
    pkg = AntBrainPackage()
    brain = ExecutableAntBrain(pkg)
    return pkg, brain
