import re

with open('/Users/mukulogi/Oshi-Link/src/app/page.tsx', 'r') as f:
    lines = f.readlines()

balance = 0
for i in range(496, len(lines)):
    line = lines[i]
    # Rough check for opening divs (ignoring multi-line but let's be careful)
    line_opens = len(re.findall(r'<div(?![^>]*/>)', line))
    line_closes = line.count('</div>')
    
    balance += (line_opens - line_closes)
    if line_opens != 0 or line_closes != 0:
        print(f"L{i+1:3}: {balance:3} | {line.strip()[:50]}")

print(f"Final App balance: {balance}")
