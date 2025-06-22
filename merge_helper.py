#!/usr/bin/env python3
import subprocess
import sys
import os

def run_git_command(cmd):
    """Run a git command and return the result"""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=".")
        return result.returncode, result.stdout, result.stderr
    except Exception as e:
        return 1, "", str(e)

def merge_changes():
    """Help merge the conflicting changes"""
    print("🔧 Git Merge Helper")
    print("=" * 50)
    
    # Check git status
    code, stdout, stderr = run_git_command("git status --porcelain")
    if code != 0:
        print(f"❌ Error checking git status: {stderr}")
        return
    
    print(f"📁 Modified files:")
    if stdout.strip():
        for line in stdout.strip().split('\n'):
            print(f"   {line}")
    else:
        print("   No modified files detected")
    
    # Stash local changes
    print("\n🔄 Stashing local changes...")
    code, stdout, stderr = run_git_command("git stash push -m 'Auto-stash before merge'")
    if code == 0:
        print("✅ Local changes stashed successfully")
    else:
        print(f"⚠️  Stash result: {stderr}")
    
    # Pull remote changes
    print("\n📥 Pulling remote changes...")
    code, stdout, stderr = run_git_command("git pull origin main")
    if code == 0:
        print("✅ Successfully pulled remote changes")
        print(stdout)
    else:
        print(f"❌ Pull failed: {stderr}")
        return
    
    # Pop the stash to apply local changes
    print("\n🔄 Applying local changes...")
    code, stdout, stderr = run_git_command("git stash pop")
    
    if code == 0:
        print("✅ Local changes applied successfully")
        if stdout:
            print(stdout)
    else:
        print(f"⚠️  Conflicts detected: {stderr}")
        print("\n🔍 Checking for merge conflicts...")
        
        # Check for conflict markers
        code, stdout, stderr = run_git_command("git diff --name-only --diff-filter=U")
        if stdout.strip():
            print("📝 Files with conflicts:")
            for file in stdout.strip().split('\n'):
                print(f"   - {file}")
            
            print("\n🛠️  Manual resolution needed:")
            print("   1. Edit the conflicted files")
            print("   2. Remove conflict markers (<<<<<<< ======= >>>>>>>)")
            print("   3. Run: git add <file>")
            print("   4. Run: git commit")
        else:
            print("✅ No conflicts - merge completed successfully!")
    
    # Final status
    print("\n📊 Final git status:")
    code, stdout, stderr = run_git_command("git status")
    print(stdout)

if __name__ == "__main__":
    merge_changes() 