import re

with open('/Users/mukulogi/Oshi-Link/src/app/page.tsx', 'r') as f:
    content = f.read()

print('--- Count ---')
for char in ['{', '}', '(', ')', '<', '>', '`', '"', "'"]:
    print(f"{char} : {content.count(char)}")

lines = content.split('\n')
in_backtick = False
for i, line in enumerate(lines):
    if line.count('`') % 2 != 0:
        in_backtick = not in_backtick
        print(f"Backtick toggle at L{i+1}")

if in_backtick:
    print("ERROR: Unclosed backtick!")

balance = 0
for i, line in enumerate(lines):
    for char in line:
        if char == '{': balance += 1
        if char == '}': balance -= 1
        if balance < 0:
            print(f"Negative balance at L{i+1}")
            balance = 0
print(f"Final balance: {balance}")
