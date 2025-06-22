import subprocess

commands = [
    ['git', 'add', 'backend/src/games/debate/debate_game.py'],
    ['git', 'status', '--short'],
    ['git', 'commit', '-m', 'Resolve merge conflict in debate_game.py - keep remote version with max_tokens'],
    ['git', 'status']
]

for cmd in commands:
    print(f"\n>>> Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    print(f"Exit code: {result.returncode}")
    if result.stdout:
        print("STDOUT:", result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr) 