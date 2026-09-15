#!/usr/bin/env python3
import sys
import os
import argparse

from config import KeyboardTrainingConfig
from trainer import CurriculumTrainer

def main():
    parser = argparse.ArgumentParser(description="Ant Keyboard Multi-Agent Training Lab CLI")

    parser.add_argument("--episodes", type=int, default=100000, help="Total training episodes (default: 100000)")
    parser.add_argument("--mode", type=str, default="INDIVIDUAL", choices=["INDIVIDUAL", "COLLABORATIVE", "PARALLEL"], help="Simulation mode")
    parser.add_argument("--ants", type=int, default=1, help="Number of ant agents (1-6)")
    parser.add_argument("--keyboards", type=int, default=1, help="Number of keyboards (1-2)")
    parser.add_argument("--resume", type=str, default="", help="Path to checkpoint JSON file to resume from")
    parser.add_argument("--checkpoint-interval", type=int, default=5000, help="Checkpoint saving interval")
    parser.add_argument("--lr", type=float, default=0.04, help="Learning rate")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--phase", type=int, default=1, help="Starting curriculum phase [1-8]")

    args = parser.parse_args()

    config = KeyboardTrainingConfig(
        episodes=args.episodes,
        checkpoint_interval=args.checkpoint_interval,
        learning_rate=args.lr,
        seed=args.seed,
        current_phase=args.phase
    )

    if args.resume:
        config.resume = True
        config.checkpoint_to_resume = args.resume

    print(f"==================================================")
    print(f"ANT KEYBOARD TRAINING LAB")
    print(f"Mode         : {args.mode}")
    print(f"Ant Count    : {args.ants}")
    print(f"Keyboards    : {args.keyboards}")
    print(f"Model Source : {config.model_dir}")
    print(f"==================================================")

    trainer = CurriculumTrainer(config)
    trainer.run_training()

if __name__ == "__main__":
    main()
