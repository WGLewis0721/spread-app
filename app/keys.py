import random,string
ALPH=string.ascii_uppercase+string.digits
def make():
    while True:
        a="".join(random.choice(ALPH) for _ in range(4))
        b="".join(random.choice(ALPH) for _ in range(4))
        if a=="0000": continue
        if sum(ord(c) for c in a+b)%7==0: return f"SPR-{a}-{b}"
if __name__=="__main__":
    for _ in range(20): print(make())
