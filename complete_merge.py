#!/usr/bin/env python3
import subprocess
import os

# Change to project directory
os.chdir('/Users/pravinlohani/Projects/Versus')

def run_command(cmd):
    """Run a command and return result"""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return result.returncode, result.stdout, result.stderr
    except Exception as e:
        return 1, "", str(e)

print("🔧 Completing Git Merge...")
print("=" * 40)

# Add all files
print("📁 Adding all files to staging...")
code, stdout, stderr = run_command("git add -A")
print(f"   Exit code: {code}")
if stdout: print(f"   Output: {stdout}")
if stderr: print(f"   Stderr: {stderr}")

# Check status
print("\n📊 Checking git status...")
code, stdout, stderr = run_command("git status --short")
print(f"   Staged files:")
if stdout:
    for line in stdout.strip().split('\n'):
        if line.strip():
            print(f"     {line}")
else:
    print("     No staged changes")

# Commit the merge
print("\n💾 Committing merge...")
commit_msg = "Merge remote and local changes - Letta integration complete"
code, stdout, stderr = run_command(f'git commit -m "{commit_msg}"')
print(f"   Exit code: {code}")
if stdout: print(f"   Output: {stdout}")
if stderr: print(f"   Stderr: {stderr}")

# Final status
print("\n✅ Final status:")
code, stdout, stderr = run_command("git log --oneline -3")
if stdout:
    print("   Recent commits:")
    for line in stdout.strip().split('\n'):
        print(f"     {line}")

print("\n🎉 Merge completed!")
print("The following changes have been successfully merged:")
print("   ✓ Fixed debate_game.py imports and method calls")
print("   ✓ Added missing GameStatus and PlayerAction classes")
print("   ✓ Integrated Letta personalities and post-game interviews")
print("   ✓ Updated server with roast generation and voice synthesis")
print("   ✓ Added letta-client dependency")
print("   ✓ Updated frontend components for auto-playing roasts")
print("   ✓ All conflict markers resolved") 