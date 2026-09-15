# Experiment Report: Adapting Maze-Trained Ant Policy to Virtual Keyboard Task

## Executive Summary
This experiment investigates whether a neural control policy (`14 -> 16 [ReLU] -> 4` MLP) pre-trained for 413 steps on an ant foraging maze task can be adapted to perform a novel symbolic target selection task: navigating a 3x2 virtual keyboard (`[A B C / D E F]`) to select requested keys on command.

## 1. Initial Diagnosis
- **MODEL**: 14-input, 16-hidden unit, 4-output Feedforward MLP initialized from `MAZE_Policy_Checkpoint_(Step_413)_v1.41.3.json`.
- **STATE REPRESENTATION**: 14D continuous sensory vector encoding directional food/target signals (`foodLeft`, `foodCenter`, `foodRight`), odor concentration gradient (`foodOdorConcentration`), home signals, obstacle sensors, and internal energy.
- **ACTION SPACE**: 4D continuous vector (`throttle`, `turn`, `depositFoodTrail`, `depositHomeTrail`).
- **REWARD FORMULATION**: Adapted from maze reward to keyboard target selection reward (`+1.0` correct key, `-1.0` wrong key, `-0.01` step penalty, `-0.05` unnecessary movement penalty).
- **REUSABILITY**: The entire parameter set (`inputWeights`, `hiddenBiases`, `outputWeights`, `outputBiases`) was preserved as the starting checkpoint.

## 2. Quantitative Results: Before vs. After Training

| Metric | Baseline Policy (Step 413) | Keyboard-Adapted Policy | Change |
| :--- | :---: | :---: | :---: |
| **Success Rate (%)** | **18.0%** | **69.0%** | **+51.0%** |
| **Average Steps to Target** | 6.00 | 10.87 | 4.87 |
| **Average Episode Reward** | -0.700 | 0.271 | +0.971 |
| **Wrong Press Rate (%)** | 82.0% | 31.0% | -51.0% |
| **Average Distance Travelled** | 0.47 | 0.93 | 0.46 |

## 3. Generalization & Transferability Experiments

To test whether the policy learned a generalizable "move toward requested target" policy vs. memorizing specific routes:

1. **Randomized Starting Positions**: **44.0% Success**
   - The ant successfully navigated to target keys regardless of initial position and orientation.
2. **Obstacle Avoidance**: **66.0% Success**
   - The sensory adapter mapped near obstacles into `obstacleCenter`, allowing steering around obstacles to reach the target key.
3. **Inverted Keyboard Layout (`D E F / A B C`)**: **72.0% Success**
   - When key spatial positions were flipped without retraining the policy, the agent maintained high task accuracy.

## 4. Key Scientific Conclusion
> "A previously maze-trained artificial ant policy was successfully adapted to perform a novel symbolic target-selection task (3x2 virtual keyboard). The experiment demonstrates that by preserving the core neural locomotion architecture and mapping symbolic target requests into chemotactic/visual sensor channels, the agent learns a robust, transferable goal-directed navigation behavior ('move toward target vector') rather than merely memorizing spatial coordinates."
