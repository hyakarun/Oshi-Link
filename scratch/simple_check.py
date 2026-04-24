# Minimalist Balance Checker
with open('/Users/mukulogi/Oshi-Link/src/app/page.tsx', 'r') as f:
    lines = f.readlines()

balance = 0
for i, line in enumerate(lines):
    # Ignore self-closing divs
    opens = line.count('<div ') + line.count('<div>') - line.count('/>')
    # This is rough but let's see
    closes = line.count('</div>')
    
    balance += (opens - closes)
    if opens != 0 or closes != 0:
        print(f"L{i+1:3}: {balance:3} | {line.strip()[:50]}")

print(f"Final: {balance}")
