import os
import subprocess

# Simple git operations
try:
    print("Stashing changes...")
    result = subprocess.run(['git', 'stash'], capture_output=True, text=True)
    print(f"Stash: {result.returncode}")
    if result.stdout: print(result.stdout)
    if result.stderr: print(result.stderr)
    
    print("\nPulling latest...")
    result = subprocess.run(['git', 'pull', 'origin', 'main'], capture_output=True, text=True)
    print(f"Pull: {result.returncode}")
    if result.stdout: print(result.stdout)
    if result.stderr: print(result.stderr)
    
    print("\nApplying stash...")
    result = subprocess.run(['git', 'stash', 'pop'], capture_output=True, text=True)
    print(f"Stash pop: {result.returncode}")
    if result.stdout: print(result.stdout)
    if result.stderr: print(result.stderr)
    
    print("\nFinal status...")
    result = subprocess.run(['git', 'status', '--short'], capture_output=True, text=True)
    print(f"Status: {result.returncode}")
    if result.stdout: print(result.stdout)
    if result.stderr: print(result.stderr)
    
except Exception as e:
    print(f"Error: {e}") 